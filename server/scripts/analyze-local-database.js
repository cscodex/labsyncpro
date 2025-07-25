const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DatabaseAnalyzer {
  constructor() {
    this.results = {
      assignments: [],
      submissions: [],
      summary: {},
      fileAnalysis: {},
      errors: []
    };
  }

  // Check if database tables exist
  async checkTablesExist() {
    try {
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('created_assignments', 'submissions', 'users', 'classes', 'groups')
        ORDER BY table_name;
      `;
      
      const result = await query(tablesQuery);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      console.error('Error checking tables:', error);
      return [];
    }
  }

  // Analyze assignments with files
  async analyzeAssignments() {
    try {
      const assignmentsQuery = `
        SELECT 
          ca.id,
          ca.name,
          ca.description,
          ca.pdf_filename,
          ca.pdf_path,
          ca.status,
          ca.created_at,
          u.first_name || ' ' || u.last_name as created_by_name,
          CASE 
            WHEN ca.pdf_filename IS NOT NULL THEN 'HAS_FILE'
            ELSE 'NO_FILE'
          END as file_status
        FROM created_assignments ca
        LEFT JOIN users u ON ca.created_by = u.id
        ORDER BY ca.created_at DESC;
      `;

      const result = await query(assignmentsQuery);
      this.results.assignments = result.rows;

      // Check if files actually exist on disk
      for (let assignment of this.results.assignments) {
        if (assignment.pdf_path) {
          const fullPath = path.join(__dirname, '../../', assignment.pdf_path);
          assignment.file_exists_on_disk = fs.existsSync(fullPath);
          
          if (assignment.file_exists_on_disk) {
            try {
              const stats = fs.statSync(fullPath);
              assignment.file_size_bytes = stats.size;
              assignment.file_size_mb = (stats.size / (1024 * 1024)).toFixed(2);
              assignment.file_modified = stats.mtime;
            } catch (err) {
              assignment.file_error = err.message;
            }
          }
        }
      }

      return this.results.assignments;
    } catch (error) {
      console.error('Error analyzing assignments:', error);
      this.results.errors.push(`Assignments analysis failed: ${error.message}`);
      return [];
    }
  }

  // Analyze submissions with files
  async analyzeSubmissions() {
    try {
      const submissionsQuery = `
        SELECT 
          s.id,
          s.schedule_id,
          s.submission_type,
          s.file_path,
          s.text_content,
          s.status,
          s.submitted_at,
          s.created_at,
          u.first_name || ' ' || u.last_name as student_name,
          u.student_id,
          sch.title as assignment_title,
          CASE 
            WHEN s.file_path IS NOT NULL THEN 'HAS_FILE'
            ELSE 'NO_FILE'
          END as file_status
        FROM submissions s
        LEFT JOIN users u ON s.student_id = u.id
        LEFT JOIN schedules sch ON s.schedule_id = sch.id
        WHERE s.submission_type IN ('file', 'both')
        ORDER BY s.submitted_at DESC;
      `;

      const result = await query(submissionsQuery);
      this.results.submissions = result.rows;

      // Check if files actually exist on disk
      for (let submission of this.results.submissions) {
        if (submission.file_path) {
          const fullPath = path.join(__dirname, '../../', submission.file_path);
          submission.file_exists_on_disk = fs.existsSync(fullPath);
          
          if (submission.file_exists_on_disk) {
            try {
              const stats = fs.statSync(fullPath);
              submission.file_size_bytes = stats.size;
              submission.file_size_mb = (stats.size / (1024 * 1024)).toFixed(2);
              submission.file_modified = stats.mtime;
              submission.filename = path.basename(submission.file_path);
            } catch (err) {
              submission.file_error = err.message;
            }
          }
        }
      }

      return this.results.submissions;
    } catch (error) {
      console.error('Error analyzing submissions:', error);
      this.results.errors.push(`Submissions analysis failed: ${error.message}`);
      return [];
    }
  }

  // Get database summary statistics
  async getDatabaseSummary() {
    try {
      const summaryQueries = [
        {
          name: 'total_users',
          query: 'SELECT COUNT(*) as count FROM users'
        },
        {
          name: 'total_assignments',
          query: 'SELECT COUNT(*) as count FROM created_assignments'
        },
        {
          name: 'assignments_with_files',
          query: 'SELECT COUNT(*) as count FROM created_assignments WHERE pdf_filename IS NOT NULL'
        },
        {
          name: 'total_submissions',
          query: 'SELECT COUNT(*) as count FROM submissions'
        },
        {
          name: 'submissions_with_files',
          query: 'SELECT COUNT(*) as count FROM submissions WHERE file_path IS NOT NULL'
        },
        {
          name: 'total_classes',
          query: 'SELECT COUNT(*) as count FROM classes WHERE is_active = true'
        },
        {
          name: 'total_groups',
          query: 'SELECT COUNT(*) as count FROM groups WHERE is_active = true'
        }
      ];

      for (let queryObj of summaryQueries) {
        try {
          const result = await query(queryObj.query);
          this.results.summary[queryObj.name] = parseInt(result.rows[0].count);
        } catch (err) {
          this.results.summary[queryObj.name] = 0;
          this.results.errors.push(`Failed to get ${queryObj.name}: ${err.message}`);
        }
      }

      return this.results.summary;
    } catch (error) {
      console.error('Error getting database summary:', error);
      return {};
    }
  }

  // Analyze file types and sizes
  analyzeFiles() {
    const fileAnalysis = {
      assignments: {
        total_files: 0,
        files_exist: 0,
        files_missing: 0,
        total_size_mb: 0,
        file_types: {},
        largest_file: null,
        smallest_file: null
      },
      submissions: {
        total_files: 0,
        files_exist: 0,
        files_missing: 0,
        total_size_mb: 0,
        file_types: {},
        largest_file: null,
        smallest_file: null
      }
    };

    // Analyze assignment files
    this.results.assignments.forEach(assignment => {
      if (assignment.pdf_filename) {
        fileAnalysis.assignments.total_files++;
        
        if (assignment.file_exists_on_disk) {
          fileAnalysis.assignments.files_exist++;
          fileAnalysis.assignments.total_size_mb += parseFloat(assignment.file_size_mb || 0);
          
          const ext = path.extname(assignment.pdf_filename).toLowerCase();
          fileAnalysis.assignments.file_types[ext] = (fileAnalysis.assignments.file_types[ext] || 0) + 1;
          
          // Track largest/smallest files
          const sizeBytes = assignment.file_size_bytes;
          if (!fileAnalysis.assignments.largest_file || sizeBytes > fileAnalysis.assignments.largest_file.size) {
            fileAnalysis.assignments.largest_file = {
              name: assignment.pdf_filename,
              size: sizeBytes,
              size_mb: assignment.file_size_mb
            };
          }
          if (!fileAnalysis.assignments.smallest_file || sizeBytes < fileAnalysis.assignments.smallest_file.size) {
            fileAnalysis.assignments.smallest_file = {
              name: assignment.pdf_filename,
              size: sizeBytes,
              size_mb: assignment.file_size_mb
            };
          }
        } else {
          fileAnalysis.assignments.files_missing++;
        }
      }
    });

    // Analyze submission files
    this.results.submissions.forEach(submission => {
      if (submission.file_path) {
        fileAnalysis.submissions.total_files++;
        
        if (submission.file_exists_on_disk) {
          fileAnalysis.submissions.files_exist++;
          fileAnalysis.submissions.total_size_mb += parseFloat(submission.file_size_mb || 0);
          
          const ext = path.extname(submission.filename || '').toLowerCase();
          fileAnalysis.submissions.file_types[ext] = (fileAnalysis.submissions.file_types[ext] || 0) + 1;
          
          // Track largest/smallest files
          const sizeBytes = submission.file_size_bytes;
          if (!fileAnalysis.submissions.largest_file || sizeBytes > fileAnalysis.submissions.largest_file.size) {
            fileAnalysis.submissions.largest_file = {
              name: submission.filename,
              size: sizeBytes,
              size_mb: submission.file_size_mb
            };
          }
          if (!fileAnalysis.submissions.smallest_file || sizeBytes < fileAnalysis.submissions.smallest_file.size) {
            fileAnalysis.submissions.smallest_file = {
              name: submission.filename,
              size: sizeBytes,
              size_mb: submission.file_size_mb
            };
          }
        } else {
          fileAnalysis.submissions.files_missing++;
        }
      }
    });

    this.results.fileAnalysis = fileAnalysis;
    return fileAnalysis;
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n🔍 DATABASE ANALYSIS REPORT');
    console.log('=' .repeat(50));

    // Database Summary
    console.log('\n📊 DATABASE SUMMARY:');
    console.log(`   Users: ${this.results.summary.total_users || 0}`);
    console.log(`   Classes: ${this.results.summary.total_classes || 0}`);
    console.log(`   Groups: ${this.results.summary.total_groups || 0}`);
    console.log(`   Total Assignments: ${this.results.summary.total_assignments || 0}`);
    console.log(`   Assignments with Files: ${this.results.summary.assignments_with_files || 0}`);
    console.log(`   Total Submissions: ${this.results.summary.total_submissions || 0}`);
    console.log(`   Submissions with Files: ${this.results.summary.submissions_with_files || 0}`);

    // File Analysis
    console.log('\n📁 FILE ANALYSIS:');
    
    console.log('\n   📚 ASSIGNMENTS:');
    const assignmentFiles = this.results.fileAnalysis.assignments;
    console.log(`      Total Files: ${assignmentFiles.total_files}`);
    console.log(`      Files Exist: ${assignmentFiles.files_exist}`);
    console.log(`      Files Missing: ${assignmentFiles.files_missing}`);
    console.log(`      Total Size: ${assignmentFiles.total_size_mb.toFixed(2)} MB`);
    
    if (Object.keys(assignmentFiles.file_types).length > 0) {
      console.log('      File Types:');
      Object.entries(assignmentFiles.file_types).forEach(([ext, count]) => {
        console.log(`         ${ext}: ${count} files`);
      });
    }

    console.log('\n   📝 SUBMISSIONS:');
    const submissionFiles = this.results.fileAnalysis.submissions;
    console.log(`      Total Files: ${submissionFiles.total_files}`);
    console.log(`      Files Exist: ${submissionFiles.files_exist}`);
    console.log(`      Files Missing: ${submissionFiles.files_missing}`);
    console.log(`      Total Size: ${submissionFiles.total_size_mb.toFixed(2)} MB`);
    
    if (Object.keys(submissionFiles.file_types).length > 0) {
      console.log('      File Types:');
      Object.entries(submissionFiles.file_types).forEach(([ext, count]) => {
        console.log(`         ${ext}: ${count} files`);
      });
    }

    // Migration Readiness
    console.log('\n🚀 MIGRATION READINESS:');
    const totalFiles = assignmentFiles.files_exist + submissionFiles.files_exist;
    const totalSize = assignmentFiles.total_size_mb + submissionFiles.total_size_mb;
    const missingFiles = assignmentFiles.files_missing + submissionFiles.files_missing;

    console.log(`   Files Ready for Migration: ${totalFiles}`);
    console.log(`   Total Size to Migrate: ${totalSize.toFixed(2)} MB`);
    console.log(`   Missing Files (will be skipped): ${missingFiles}`);
    
    if (totalSize > 15000) { // 15GB in MB
      console.log('   ⚠️  WARNING: Total size exceeds Google Drive free limit (15GB)');
    } else {
      console.log('   ✅ Total size fits within Google Drive free limit (15GB)');
    }

    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log('Analysis complete! 🎉\n');
  }

  // Run complete analysis
  async runAnalysis() {
    console.log('🔍 Starting database analysis...\n');

    try {
      // Check if tables exist
      const tables = await this.checkTablesExist();
      console.log('📋 Found tables:', tables.join(', '));

      if (tables.length === 0) {
        console.log('❌ No tables found! Make sure your database is set up correctly.');
        return;
      }

      // Get summary statistics
      await this.getDatabaseSummary();

      // Analyze assignments
      if (tables.includes('created_assignments')) {
        await this.analyzeAssignments();
      }

      // Analyze submissions
      if (tables.includes('submissions')) {
        await this.analyzeSubmissions();
      }

      // Analyze files
      this.analyzeFiles();

      // Generate report
      this.generateReport();

      return this.results;

    } catch (error) {
      console.error('💥 Analysis failed:', error);
      throw error;
    }
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new DatabaseAnalyzer();
  analyzer.runAnalysis()
    .then(() => {
      console.log('Database analysis completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Database analysis failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseAnalyzer;
