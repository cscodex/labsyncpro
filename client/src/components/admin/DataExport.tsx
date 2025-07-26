import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './DataExport.css';

interface ExportFilters {
  classId?: string;
  assignmentId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

interface Class {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  name: string;
}

const DataExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assignments' | 'grades' | 'submissions'>('assignments');
  const [exporting, setExporting] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filters, setFilters] = useState<ExportFilters>({});
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchClasses();
    fetchAssignments();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch('/api/assignments/created', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleExport = async (type: 'assignments' | 'grades' | 'submissions') => {
    setExporting(true);

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/export/${type}?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Get filename from response headers or create default
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1].replace(/"/g, '')
          : `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully`, 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key: keyof ExportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const renderFilters = () => (
    <div className="export-filters">
      <h4>📊 Export Filters</h4>
      <div className="filters-grid">
        <div className="filter-group">
          <label htmlFor="classFilter">Class:</label>
          <select
            id="classFilter"
            value={filters.classId || ''}
            onChange={(e) => handleFilterChange('classId', e.target.value)}
          >
            <option value="">All Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>

        {activeTab !== 'assignments' && (
          <div className="filter-group">
            <label htmlFor="assignmentFilter">Assignment:</label>
            <select
              id="assignmentFilter"
              value={filters.assignmentId || ''}
              onChange={(e) => handleFilterChange('assignmentId', e.target.value)}
            >
              <option value="">All Assignments</option>
              {assignments.map(assignment => (
                <option key={assignment.id} value={assignment.id}>{assignment.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="statusFilter">Status:</label>
          <select
            id="statusFilter"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">End Date:</label>
          <input
            type="date"
            id="endDate"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button 
            className="btn-secondary"
            onClick={clearFilters}
            type="button"
          >
            🗑️ Clear Filters
          </button>
        </div>
      </div>
    </div>
  );

  const renderExportSection = (type: 'assignments' | 'grades' | 'submissions', title: string, description: string, icon: string) => (
    <div className="export-section">
      <div className="export-header">
        <h3>{icon} {title}</h3>
        <p>{description}</p>
      </div>

      {renderFilters()}

      <div className="export-actions">
        <button
          className="btn-primary export-button"
          onClick={() => handleExport(type)}
          disabled={exporting}
        >
          {exporting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              <LoadingSpinner size="small" message="" />
              Exporting...
            </div>
          ) : (
            `📥 Export ${title}`
          )}
        </button>
      </div>

      <div className="export-info">
        <h5>📋 Export Includes:</h5>
        <ul>
          {type === 'assignments' && (
            <>
              <li>Assignment title and description</li>
              <li>Class and assignee information</li>
              <li>Scheduled dates and deadlines</li>
              <li>Assignment status and creator</li>
            </>
          )}
          {type === 'grades' && (
            <>
              <li>Student information and scores</li>
              <li>Assignment details and feedback</li>
              <li>Grading dates and grader information</li>
              <li>Submission status and timing</li>
            </>
          )}
          {type === 'submissions' && (
            <>
              <li>Student and assignment information</li>
              <li>Submission dates and file paths</li>
              <li>Submission and grading status</li>
              <li>Deadline compliance information</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="data-export">
      <div className="page-header">
        <h1>📊 Data Export</h1>
        <p>Export assignments, grades, and submissions data to CSV format</p>
      </div>

      <div className="export-tabs">
        <button 
          className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          📋 Assignments
        </button>
        <button 
          className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveTab('grades')}
        >
          📈 Grades
        </button>
        <button 
          className={`tab-button ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          📄 Submissions
        </button>
      </div>

      <div className="export-content">
        {activeTab === 'assignments' && renderExportSection(
          'assignments',
          'Assignments Export',
          'Export assignment data including schedules, assignees, and status information.',
          '📋'
        )}

        {activeTab === 'grades' && renderExportSection(
          'grades',
          'Grades Export',
          'Export grading records with student scores, feedback, and performance data.',
          '📈'
        )}

        {activeTab === 'submissions' && renderExportSection(
          'submissions',
          'Submissions Export',
          'Export submission data including file information, timing, and grading status.',
          '📄'
        )}
      </div>
    </div>
  );
};

export default DataExport;
