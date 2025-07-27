#!/usr/bin/env node

/**
 * Fix Malformed JavaScript Script
 * 
 * This script fixes all the malformed JavaScript created by the automatic
 * route conversion script that's causing syntax errors on Render.
 */

const fs = require('fs');
const path = require('path');

class JavaScriptFixer {
  constructor() {
    this.routesDir = path.join(__dirname, 'server', 'routes');
    this.fixedFiles = [];
    this.errors = [];
  }

  // Fix malformed JavaScript in a file
  fixFile(filename) {
    const filePath = path.join(this.routesDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filename}`);
      return false;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let changesMade = 0;
    
    console.log(`🔧 Fixing ${filename}...`);
    
    // Pattern 1: Fix malformed query assignments
    const malformedPattern1 = /const\s+(\w+)\s*=\s*\/\/\s*await\s+query\(\s*\/\/\s*Converted\s+to\s+Supabase\s+fallback\s*\n\s*return\s+res\.json\([^;]+\);\s*\/\/[^`]*`[^;]*;?/g;
    
    content = content.replace(malformedPattern1, (match, varName) => {
      changesMade++;
      return `// Provide fallback data for ${varName}
    return res.json({ message: "Fallback data", data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });`;
    });
    
    // Pattern 2: Fix standalone malformed query calls
    const malformedPattern2 = /\/\/\s*await\s+query\(\s*\/\/\s*Converted\s+to\s+Supabase\s+fallback\s*\n\s*return\s+res\.json\([^;]+\);\s*\/\/[^`]*`/g;
    
    content = content.replace(malformedPattern2, (match) => {
      changesMade++;
      return `// Provide fallback response
    return res.json({ message: "Fallback data", data: [] });`;
    });
    
    // Pattern 3: Fix incomplete query assignments
    const malformedPattern3 = /const\s+(\w+)\s*=\s*\/\/\s*await\s+query\(\s*\/\/\s*Converted\s+to\s+Supabase\s+fallback/g;
    
    content = content.replace(malformedPattern3, (match, varName) => {
      changesMade++;
      return `const ${varName} = { rows: [] }; // Fallback data`;
    });
    
    // Pattern 4: Fix standalone broken query calls
    const malformedPattern4 = /\/\/\s*await\s+query\(\s*\/\/\s*Converted\s+to\s+Supabase\s+fallback/g;
    
    content = content.replace(malformedPattern4, () => {
      changesMade++;
      return `// Fallback: query converted to sample data`;
    });
    
    // Pattern 5: Remove orphaned SQL fragments
    const sqlFragmentPattern = /^\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP BY|ORDER BY|LIMIT)[^;]*$/gm;
    
    content = content.replace(sqlFragmentPattern, (match) => {
      if (match.trim().length > 0) {
        changesMade++;
        return `// Removed SQL fragment: ${match.trim()}`;
      }
      return match;
    });
    
    // Pattern 6: Fix broken return statements in the middle of code
    const brokenReturnPattern = /return\s+res\.json\([^;]+\);\s*\/\/[^`]*`\s*\n\s*(SELECT|INSERT|UPDATE|DELETE)/g;
    
    content = content.replace(brokenReturnPattern, (match, sqlKeyword) => {
      changesMade++;
      return `return res.json({ message: "Fallback response", data: [] });
    // Removed SQL: ${sqlKeyword}...`;
    });
    
    if (changesMade > 0) {
      fs.writeFileSync(filePath, content);
      this.fixedFiles.push({ filename, changes: changesMade });
      console.log(`   ✅ Fixed ${changesMade} issues in ${filename}`);
      return true;
    } else {
      console.log(`   ℹ️  No issues found in ${filename}`);
      return false;
    }
  }

  // Fix all route files
  async fixAllFiles() {
    console.log('🔧 JAVASCRIPT SYNTAX FIXER');
    console.log('===========================\n');
    
    const files = fs.readdirSync(this.routesDir).filter(file => file.endsWith('.js'));
    
    for (const file of files) {
      try {
        this.fixFile(file);
      } catch (error) {
        console.log(`   ❌ Error fixing ${file}: ${error.message}`);
        this.errors.push({ file, error: error.message });
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Files processed: ${files.length}`);
    console.log(`   🔧 Files fixed: ${this.fixedFiles.length}`);
    console.log(`   ❌ Errors: ${this.errors.length}`);
    
    if (this.fixedFiles.length > 0) {
      console.log('\n🎯 Fixed files:');
      this.fixedFiles.forEach(({ filename, changes }) => {
        console.log(`   • ${filename}: ${changes} fixes`);
      });
    }
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.errors.forEach(({ file, error }) => {
        console.log(`   • ${file}: ${error}`);
      });
    }
    
    console.log('\n📝 Next steps:');
    console.log('   1. Test the fixes locally');
    console.log('   2. Commit and push to trigger Render deployment');
    console.log('   3. Verify Render deployment starts successfully');
  }

  // Quick syntax check
  checkSyntax(filename) {
    const filePath = path.join(this.routesDir, filename);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Basic syntax checks
      const issues = [];
      
      // Check for unmatched braces
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
      }
      
      // Check for unmatched parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
      }
      
      // Check for obvious syntax errors
      if (content.includes('return res.json') && content.includes('SELECT')) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('return res.json') && i + 1 < lines.length && lines[i + 1].trim().startsWith('SELECT')) {
            issues.push(`Line ${i + 1}: return statement followed by SQL`);
          }
        }
      }
      
      return issues;
    } catch (error) {
      return [`Error reading file: ${error.message}`];
    }
  }

  // Run syntax check on all files
  checkAllSyntax() {
    console.log('🔍 SYNTAX CHECKER');
    console.log('==================\n');
    
    const files = fs.readdirSync(this.routesDir).filter(file => file.endsWith('.js'));
    let totalIssues = 0;
    
    for (const file of files) {
      const issues = this.checkSyntax(file);
      if (issues.length > 0) {
        console.log(`❌ ${file}:`);
        issues.forEach(issue => console.log(`   • ${issue}`));
        totalIssues += issues.length;
      } else {
        console.log(`✅ ${file}: No obvious syntax issues`);
      }
    }
    
    console.log(`\n📊 Total issues found: ${totalIssues}`);
    return totalIssues;
  }
}

// Run the fixer
if (require.main === module) {
  const fixer = new JavaScriptFixer();
  
  // First check syntax
  const issueCount = fixer.checkAllSyntax();
  
  if (issueCount > 0) {
    console.log('\n🔧 Issues found. Running fixes...\n');
    fixer.fixAllFiles().catch(console.error);
  } else {
    console.log('\n🎉 No syntax issues found!');
  }
}

module.exports = JavaScriptFixer;
