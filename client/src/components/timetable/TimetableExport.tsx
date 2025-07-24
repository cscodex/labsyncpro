import React, { useState } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { timetableService } from '../../services/timetableService';
import type { TimetableVersion, TimetableSchedule, Period } from '../../types/timetable';

interface TimetableExportProps {
  schedules: TimetableSchedule[];
  periods: Period[];
  activeVersion: TimetableVersion | null;
}

interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: 'current-week' | 'current-month' | 'custom';
  customStartDate: string;
  customEndDate: string;
  includeDetails: boolean;
  groupBy: 'lab' | 'instructor' | 'class' | 'none';
  orientation: 'portrait' | 'landscape';
  paperSize: 'a4' | 'a3' | 'letter';
}

const TimetableExport: React.FC<TimetableExportProps> = ({
  schedules,
  periods,
  activeVersion
}) => {
  const { showNotification } = useNotification();
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    dateRange: 'current-week',
    customStartDate: '',
    customEndDate: '',
    includeDetails: true,
    groupBy: 'none',
    orientation: 'landscape',
    paperSize: 'a4'
  });

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // Get schedules based on date range
      const exportSchedules = await getSchedulesForExport();
      
      switch (exportOptions.format) {
        case 'pdf':
          await exportToPDF(exportSchedules);
          break;
        case 'csv':
          await exportToCSV(exportSchedules);
          break;
        case 'excel':
          await exportToExcel(exportSchedules);
          break;
      }
      
      showNotification('Timetable exported successfully', 'success');
      setShowExportModal(false);
      
    } catch (err) {
      console.error('Export failed:', err);
      showNotification('Failed to export timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getSchedulesForExport = async (): Promise<TimetableSchedule[]> => {
    let startDate: string;
    let endDate: string;
    
    const today = new Date();
    
    switch (exportOptions.dateRange) {
      case 'current-week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        break;
        
      case 'current-month':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = endOfMonth.toISOString().split('T')[0];
        break;
        
      case 'custom':
        startDate = exportOptions.customStartDate;
        endDate = exportOptions.customEndDate;
        break;
        
      default:
        return schedules;
    }
    
    return await timetableService.getTimetableSchedules({
      startDate,
      endDate
    });
  };

  const exportToPDF = async (exportSchedules: TimetableSchedule[]) => {
    // Create a simple HTML table for PDF generation
    const htmlContent = generateHTMLTable(exportSchedules);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Timetable Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e293b; margin-bottom: 10px; }
            .header-info { margin-bottom: 20px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .group-header { background-color: #3b82f6; color: white; font-weight: bold; }
            .footer { margin-top: 20px; font-size: 12px; color: #64748b; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Timetable Schedule</h1>
          ${activeVersion ? `
            <div class="header-info">
              <p><strong>Version:</strong> ${activeVersion.version_number} - ${activeVersion.version_name}</p>
              <p><strong>Effective from:</strong> ${timetableService.formatDate(activeVersion.effective_from)}</p>
            </div>
          ` : ''}
          ${htmlContent}
          <div class="footer">
            Generated on ${new Date().toLocaleString()}
          </div>
          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Print PDF</button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const generateHTMLTable = (exportSchedules: TimetableSchedule[]): string => {
    const groupedSchedules = groupSchedules(exportSchedules);
    let html = '';

    for (const [groupKey, groupSchedules] of Object.entries(groupedSchedules)) {
      if (exportOptions.groupBy !== 'none') {
        html += `<h3>${groupKey}</h3>`;
      }

      html += `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Period</th>
              <th>Time</th>
              <th>Session</th>
              <th>Type</th>
              <th>Lab</th>
              <th>Instructor</th>
              <th>Class</th>
              ${exportOptions.includeDetails ? '<th>Status</th><th>Notes</th>' : ''}
            </tr>
          </thead>
          <tbody>
      `;

      groupSchedules.forEach(schedule => {
        html += `
          <tr>
            <td>${timetableService.formatDate(schedule.schedule_date)}</td>
            <td>${timetableService.getDayName(new Date(schedule.schedule_date).getDay())}</td>
            <td>${schedule.period_name}</td>
            <td>${timetableService.formatTime(schedule.start_time)} - ${timetableService.formatTime(schedule.end_time)}</td>
            <td>${schedule.session_title}</td>
            <td>${schedule.session_type}</td>
            <td>${schedule.lab_name || 'N/A'}</td>
            <td>${schedule.instructor_name || 'N/A'}</td>
            <td>${schedule.class_name || 'N/A'}</td>
            ${exportOptions.includeDetails ? `<td>${schedule.status}</td><td>${schedule.notes || ''}</td>` : ''}
          </tr>
        `;
      });

      html += `
          </tbody>
        </table>
      `;
    }

    return html;
  };

  const exportToCSV = async (exportSchedules: TimetableSchedule[]) => {
    const headers = [
      'Date', 'Day', 'Period', 'Start Time', 'End Time', 'Session Title', 
      'Session Type', 'Lab', 'Instructor', 'Class', 'Group', 'Status'
    ];
    
    if (exportOptions.includeDetails) {
      headers.push('Description', 'Student Count', 'Max Capacity', 'Notes');
    }
    
    const csvData = [
      headers,
      ...exportSchedules.map(schedule => {
        const row = [
          schedule.schedule_date,
          timetableService.getDayName(new Date(schedule.schedule_date).getDay()),
          schedule.period_name,
          schedule.start_time,
          schedule.end_time,
          schedule.session_title,
          schedule.session_type,
          schedule.lab_name || '',
          schedule.instructor_name || '',
          schedule.class_name || '',
          schedule.group_name || '',
          schedule.status
        ];
        
        if (exportOptions.includeDetails) {
          row.push(
            schedule.session_description || '',
            schedule.student_count.toString(),
            schedule.max_capacity?.toString() || '',
            schedule.notes || ''
          );
        }
        
        return row;
      })
    ];
    
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timetable_${exportOptions.dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = async (exportSchedules: TimetableSchedule[]) => {
    // For Excel export, we'll use CSV format with .xlsx extension
    // In a real implementation, you'd use a library like xlsx
    await exportToCSV(exportSchedules);
    showNotification('Excel export saved as CSV format', 'info');
  };

  const groupSchedules = (exportSchedules: TimetableSchedule[]): Record<string, TimetableSchedule[]> => {
    if (exportOptions.groupBy === 'none') {
      return { 'All Schedules': exportSchedules };
    }
    
    return exportSchedules.reduce((groups, schedule) => {
      let groupKey: string;
      
      switch (exportOptions.groupBy) {
        case 'lab':
          groupKey = schedule.lab_name || 'No Lab';
          break;
        case 'instructor':
          groupKey = schedule.instructor_name || 'No Instructor';
          break;
        case 'class':
          groupKey = schedule.class_name || 'No Class';
          break;
        default:
          groupKey = 'All';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(schedule);
      
      return groups;
    }, {} as Record<string, TimetableSchedule[]>);
  };

  const handleQuickExport = async (format: 'pdf' | 'csv') => {
    try {
      setLoading(true);

      // Set quick options temporarily
      const originalOptions = { ...exportOptions };
      setExportOptions(prev => ({
        ...prev,
        format,
        dateRange: 'current-week',
        includeDetails: false,
        groupBy: 'none'
      }));

      const exportSchedules = schedules;

      if (format === 'pdf') {
        await exportToPDF(exportSchedules);
      } else {
        await exportToCSV(exportSchedules);
      }

      // Restore original options
      setExportOptions(originalOptions);

      showNotification(`Timetable exported as ${format.toUpperCase()}`, 'success');

    } catch (err) {
      console.error('Quick export failed:', err);
      showNotification('Failed to export timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timetable-export">
      {/* Quick Export Buttons */}
      <div className="quick-export-buttons">
        <button
          className="btn btn-outline"
          onClick={() => handleQuickExport('pdf')}
          disabled={loading}
          title="Quick PDF Export"
        >
          <i className="fas fa-file-pdf"></i>
          PDF
        </button>
        
        <button
          className="btn btn-outline"
          onClick={() => handleQuickExport('csv')}
          disabled={loading}
          title="Quick CSV Export"
        >
          <i className="fas fa-file-csv"></i>
          CSV
        </button>
        
        <button
          className="btn btn-outline"
          onClick={() => setShowExportModal(true)}
          disabled={loading}
          title="Advanced Export Options"
        >
          <i className="fas fa-download"></i>
          Export
        </button>
      </div>

      {/* Advanced Export Modal */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-content export-modal">
            <div className="modal-header">
              <h3>Export Timetable</h3>
              <button
                className="close-btn"
                onClick={() => setShowExportModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="export-options">
                <div className="form-group">
                  <label>Export Format</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="format"
                        value="pdf"
                        checked={exportOptions.format === 'pdf'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'pdf'
                        }))}
                      />
                      PDF Document
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="format"
                        value="csv"
                        checked={exportOptions.format === 'csv'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'csv'
                        }))}
                      />
                      CSV Spreadsheet
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="format"
                        value="excel"
                        checked={exportOptions.format === 'excel'}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          format: e.target.value as 'excel'
                        }))}
                      />
                      Excel Workbook
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Date Range</label>
                  <select
                    value={exportOptions.dateRange}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      dateRange: e.target.value as any
                    }))}
                  >
                    <option value="current-week">Current Week</option>
                    <option value="current-month">Current Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {exportOptions.dateRange === 'custom' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={exportOptions.customStartDate}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          customStartDate: e.target.value
                        }))}
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={exportOptions.customEndDate}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          customEndDate: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Group By</label>
                  <select
                    value={exportOptions.groupBy}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      groupBy: e.target.value as any
                    }))}
                  >
                    <option value="none">No Grouping</option>
                    <option value="lab">Laboratory</option>
                    <option value="instructor">Instructor</option>
                    <option value="class">Class</option>
                  </select>
                </div>

                {exportOptions.format === 'pdf' && (
                  <>
                    <div className="form-group">
                      <label>Page Orientation</label>
                      <div className="radio-group">
                        <label className="radio-label">
                          <input
                            type="radio"
                            name="orientation"
                            value="portrait"
                            checked={exportOptions.orientation === 'portrait'}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              orientation: e.target.value as 'portrait'
                            }))}
                          />
                          Portrait
                        </label>
                        <label className="radio-label">
                          <input
                            type="radio"
                            name="orientation"
                            value="landscape"
                            checked={exportOptions.orientation === 'landscape'}
                            onChange={(e) => setExportOptions(prev => ({
                              ...prev,
                              orientation: e.target.value as 'landscape'
                            }))}
                          />
                          Landscape
                        </label>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Paper Size</label>
                      <select
                        value={exportOptions.paperSize}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          paperSize: e.target.value as any
                        }))}
                      >
                        <option value="a4">A4</option>
                        <option value="a3">A3</option>
                        <option value="letter">Letter</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeDetails}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeDetails: e.target.checked
                      }))}
                    />
                    Include detailed information (descriptions, notes, capacity)
                  </label>
                </div>
              </div>

              <div className="export-preview">
                <h4>Export Preview</h4>
                <div className="preview-info">
                  <p><strong>Format:</strong> {exportOptions.format.toUpperCase()}</p>
                  <p><strong>Date Range:</strong> {exportOptions.dateRange.replace('-', ' ')}</p>
                  <p><strong>Schedules:</strong> {schedules.length} sessions</p>
                  {exportOptions.groupBy !== 'none' && (
                    <p><strong>Grouped by:</strong> {exportOptions.groupBy}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowExportModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={loading || (exportOptions.dateRange === 'custom' && (!exportOptions.customStartDate || !exportOptions.customEndDate))}
              >
                {loading ? 'Exporting...' : 'Export Timetable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableExport;
