// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { timetableAPI, classesAPI, usersAPI, labsAPI } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import jsPDF from 'jspdf';
import './Timetable.css';

interface TimeSlot {
  id: string;
  slot_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  is_active: boolean;
}

interface TimetableEntry {
  id: string;
  week_start_date: string;
  day_of_week: number;
  time_slot_id: string;
  class_id: string;
  subject: string;
  instructor_id: string;
  lab_id: string;
  notes: string;
  slot_number: number;
  start_time: string;
  end_time: string;
  is_break: boolean;
  class_name: string;
  grade: number;
  stream: string;
  instructor_first_name: string;
  instructor_last_name: string;
  lab_name: string;
}

interface Class {
  id: string;
  name: string;
  grade: number;
  stream: string;
}

interface Instructor {
  id: string;
  first_name: string;
  last_name: string;
}

interface Lab {
  id: string;
  name: string;
}

const Timetable: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{day: number, slotId: string} | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  
  const { showSuccess, showError } = useNotification();

  // Days of the week (1=Monday, 7=Sunday)
  const daysOfWeek = [
    { number: 1, name: 'Monday', short: 'Mon' },
    { number: 2, name: 'Tuesday', short: 'Tue' },
    { number: 3, name: 'Wednesday', short: 'Wed' },
    { number: 4, name: 'Thursday', short: 'Thu' },
    { number: 5, name: 'Friday', short: 'Fri' },
    { number: 6, name: 'Saturday', short: 'Sat' },
    { number: 7, name: 'Sunday', short: 'Sun' }
  ];

  useEffect(() => {
    fetchData();
  }, [currentWeek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Calculate Monday of current week
      const monday = getMonday(currentWeek);
      
      const [timeSlotsRes, entriesRes, classesRes, instructorsRes, labsRes] = await Promise.all([
        timetableAPI.getTimeSlots(),
        timetableAPI.getWeeklyTimetable({ week_start: monday.toISOString().split('T')[0] }),
        classesAPI.getClasses(),
        usersAPI.getUsers({ role: 'instructor' }),
        labsAPI.getLabs()
      ]);

      setTimeSlots(timeSlotsRes.data.timeSlots || []);
      setEntries(entriesRes.data.entries || []);
      setClasses(classesRes.data.classes || []);
      setInstructors(instructorsRes.data.users || []);
      setLabs(labsRes.data.labs || []);
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      showError('Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDateForDay = (dayNumber: number): Date => {
    const monday = getMonday(currentWeek);
    const date = new Date(monday);
    date.setDate(monday.getDate() + (dayNumber - 1));
    return date;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  const getEntryForCell = (dayNumber: number, slotId: string): TimetableEntry | undefined => {
    return entries.find(entry => 
      entry.day_of_week === dayNumber && entry.time_slot_id === slotId
    );
  };

  const handleCellClick = (dayNumber: number, slotId: string, timeSlot: TimeSlot) => {
    if (timeSlot.is_break) return; // Don't allow editing break slots
    
    const existingEntry = getEntryForCell(dayNumber, slotId);
    if (existingEntry) {
      setEditingEntry(existingEntry);
    } else {
      setSelectedCell({ day: dayNumber, slotId });
      setEditingEntry(null);
    }
    setShowEntryModal(true);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) {
      return;
    }

    try {
      await timetableAPI.deleteEntry(entryId);
      showSuccess('Timetable entry deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
      showError('Failed to delete timetable entry');
    }
  };

  const generateClassSchedulePDF = async (classId: string, className: string) => {
    try {
      const monday = getMonday(currentWeek);
      const weekStartDate = monday.toISOString().split('T')[0];

      const response = await timetableAPI.getClassSchedule(classId, {
        week_start: weekStartDate
      });

      const classSchedule = response.data.schedule || [];

      // Create PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Class Schedule', pageWidth / 2, 20, { align: 'center' });

      // Class info
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Class: ${className}`, 20, 35);
      pdf.text(`Week of: ${formatDate(monday)}`, 20, 45);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 20, 55);

      // Table headers
      let yPos = 75;
      const colWidths = [25, 35, 35, 40, 40, 25];
      const headers = ['Day', 'Time', 'Subject', 'Instructor', 'Lab', 'Notes'];

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');

      let xPos = 20;
      headers.forEach((header, index) => {
        pdf.rect(xPos, yPos - 5, colWidths[index], 10);
        pdf.text(header, xPos + 2, yPos);
        xPos += colWidths[index];
      });

      // Table data
      pdf.setFont('helvetica', 'normal');
      yPos += 10;

      if (classSchedule.length === 0) {
        pdf.text('No classes scheduled for this week', 20, yPos + 10);
      } else {
        classSchedule.forEach((entry: any) => {
          const dayName = getDayName(entry.day_of_week);
          const timeSlot = `${entry.start_time.slice(0, 5)}-${entry.end_time.slice(0, 5)}`;
          const instructor = entry.instructor_first_name ?
            `${entry.instructor_first_name} ${entry.instructor_last_name}` : '';

          const rowData = [
            dayName,
            timeSlot,
            entry.subject || '',
            instructor,
            entry.lab_name || '',
            entry.notes || ''
          ];

          xPos = 20;
          rowData.forEach((data, index) => {
            pdf.rect(xPos, yPos - 5, colWidths[index], 10);

            // Truncate text if too long
            let text = data;
            if (text.length > 15) {
              text = text.substring(0, 12) + '...';
            }

            pdf.text(text, xPos + 2, yPos);
            xPos += colWidths[index];
          });

          yPos += 10;

          // Add new page if needed
          if (yPos > pageHeight - 30) {
            pdf.addPage();
            yPos = 30;
          }
        });
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Generated by LabSyncPro Timetable System', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Download PDF
      const fileName = `${className.replace(/[^a-zA-Z0-9]/g, '_')}_Schedule_${weekStartDate}.pdf`;
      pdf.save(fileName);

      showSuccess('Class schedule PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Failed to generate class schedule PDF');
    }
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayNumber] || '';
  };

  const lectureSlots = timeSlots.filter(slot => !slot.is_break);

  if (loading) {
    return (
      <div className="timetable-loading">
        <div className="loading-spinner"></div>
        <p>Loading timetable...</p>
      </div>
    );
  }

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <div className="timetable-title">
          <span className="title-icon">📅</span>
          <h1>Weekly Timetable</h1>
        </div>
        
        <div className="timetable-controls">
          <button 
            className="btn btn-secondary"
            onClick={() => goToCurrentWeek()}
          >
            Current Week
          </button>
          
          <div className="week-navigation">
            <button
              className="btn btn-outline"
              onClick={() => navigateWeek('prev')}
            >
              <span>◀</span>
              Previous
            </button>
            
            <span className="current-week">
              Week of {formatDate(getMonday(currentWeek))}
            </span>
            
            <button
              className="btn btn-outline"
              onClick={() => navigateWeek('next')}
            >
              Next
              <span>▶</span>
            </button>
          </div>
          
          <button
            className="btn btn-primary"
            onClick={() => {
              // TODO: Implement settings modal for timetable configuration
              showError('Settings functionality coming soon!');
            }}
          >
            <span>⚙️</span>
            Settings
          </button>
        </div>
      </div>

      <div className="timetable-grid-container">
        <div className="timetable-grid">
          {/* Header row with time slots */}
          <div className="timetable-header-row">
            <div className="day-header">
              <div className="header-content">
                <span>Day/Date</span>
              </div>
            </div>
            {lectureSlots.map(slot => (
              <div key={slot.id} className="time-header">
                <div className="time-slot">
                  <span>🕐</span>
                  <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Days rows */}
          {daysOfWeek.map(day => (
            <div key={day.number} className={`timetable-row ${day.number === 7 ? 'sunday-row' : ''}`}>
              <div className={`day-cell ${day.number === 7 ? 'sunday-cell' : ''}`}>
                <div className="day-content">
                  <div className="day-name">{day.name}</div>
                  <div className="day-date">
                    {formatDate(getDateForDay(day.number))}
                  </div>
                </div>
              </div>
              
              {lectureSlots.map(slot => {
                const entry = getEntryForCell(day.number, slot.id);
                return (
                  <div 
                    key={`${day.number}-${slot.id}`}
                    className={`timetable-cell ${entry ? 'has-entry' : 'empty-cell'} ${day.number === 7 ? 'sunday-cell' : ''}`}
                    onClick={() => handleCellClick(day.number, slot.id, slot)}
                  >
                    {entry ? (
                      <div className="entry-content">
                        <div className="entry-class">{entry.class_name}</div>
                        {entry.subject && <div className="entry-subject">{entry.subject}</div>}
                        {entry.instructor_first_name && (
                          <div className="entry-instructor">
                            {entry.instructor_first_name} {entry.instructor_last_name}
                          </div>
                        )}
                        {entry.lab_name && <div className="entry-lab">{entry.lab_name}</div>}

                        <div className="entry-actions">
                          <button
                            className="action-btn download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateClassSchedulePDF(entry.class_id, entry.class_name);
                            }}
                            title="Download Class Schedule PDF"
                          >
                            <span>📥</span>
                          </button>
                          <button
                            className="action-btn edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEntry(entry);
                              setShowEntryModal(true);
                            }}
                            title="Edit Entry"
                          >
                            <span>✏️</span>
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEntry(entry.id);
                            }}
                            title="Delete Entry"
                          >
                            <span>🗑️</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-content">
                        <span className="add-icon">➕</span>
                        <span>Add Class</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Entry Modal */}
      {showEntryModal && (
        <TimetableEntryModal
          isOpen={showEntryModal}
          onClose={() => {
            setShowEntryModal(false);
            setSelectedCell(null);
            setEditingEntry(null);
          }}
          entry={editingEntry}
          selectedCell={selectedCell}
          currentWeek={currentWeek}
          classes={classes}
          instructors={instructors}
          labs={labs}
          onSave={fetchData}
          getDayName={getDayName}
          timeSlots={timeSlots}
        />
      )}
    </div>
  );
};

// Timetable Entry Modal Component
interface TimetableEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimetableEntry | null;
  selectedCell: {day: number, slotId: string} | null;
  currentWeek: Date;
  classes: Class[];
  instructors: Instructor[];
  labs: Lab[];
  onSave: () => void;
  getDayName: (dayNumber: number) => string;
  timeSlots: TimeSlot[];
}

const TimetableEntryModal: React.FC<TimetableEntryModalProps> = ({
  isOpen,
  onClose,
  entry,
  selectedCell,
  currentWeek,
  classes,
  instructors,
  labs,
  onSave,
  getDayName,
  timeSlots
}) => {
  const [formData, setFormData] = useState({
    class_id: '',
    subject: '',
    instructor_id: '',
    lab_id: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  // Helper functions
  const getTimeSlotDetails = (slotId: string) => {
    return timeSlots.find(slot => slot.id === slotId);
  };

  const getDateForDay = (dayNumber: number) => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    const targetDate = new Date(startOfWeek);
    targetDate.setDate(startOfWeek.getDate() + dayNumber - 1);
    return targetDate;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  useEffect(() => {
    if (entry) {
      setFormData({
        class_id: entry.class_id || '',
        subject: entry.subject || '',
        instructor_id: entry.instructor_id || '',
        lab_id: entry.lab_id || '',
        notes: entry.notes || ''
      });
    } else {
      setFormData({
        class_id: '',
        subject: '',
        instructor_id: '',
        lab_id: '',
        notes: ''
      });
    }
  }, [entry]);

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.class_id) {
      showError('Please select a class');
      return;
    }

    setLoading(true);
    try {
      const monday = getMonday(currentWeek);
      const weekStartDate = monday.toISOString().split('T')[0];

      if (entry) {
        // Update existing entry
        await timetableAPI.updateEntry(entry.id, formData);
        showSuccess('Timetable entry updated successfully');
      } else if (selectedCell) {
        // Create new entry
        const entryData = {
          week_start_date: weekStartDate,
          day_of_week: selectedCell.day,
          time_slot_id: selectedCell.slotId,
          ...formData
        };
        await timetableAPI.createEntry(entryData);
        showSuccess('Timetable entry created successfully');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving timetable entry:', error);
      if (error.response?.status === 409) {
        showError('A timetable entry already exists for this slot');
      } else {
        showError('Failed to save timetable entry');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{entry ? 'Edit' : 'Add'} Timetable Entry</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {selectedCell && (
            <div className="form-info">
              <p><strong>Day:</strong> {getDayName(selectedCell.day)}</p>
              <p><strong>Date:</strong> {formatDate(getDateForDay(selectedCell.day))}</p>
              {(() => {
                const timeSlot = getTimeSlotDetails(selectedCell.slotId);
                return timeSlot ? (
                  <p><strong>Time:</strong> {timeSlot.start_time.slice(0, 5)} - {timeSlot.end_time.slice(0, 5)}</p>
                ) : null;
              })()}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="class_id">Class *</label>
            <select
              id="class_id"
              value={formData.class_id}
              onChange={(e) => setFormData({...formData, class_id: e.target.value})}
              required
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Grade {cls.grade} - {cls.stream})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              placeholder="Enter subject name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="instructor_id">Instructor</label>
            <select
              id="instructor_id"
              value={formData.instructor_id}
              onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
            >
              <option value="">Select Instructor</option>
              {instructors.map(instructor => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.first_name} {instructor.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lab_id">Lab</label>
            <select
              id="lab_id"
              value={formData.lab_id}
              onChange={(e) => setFormData({...formData, lab_id: e.target.value})}
            >
              <option value="">Select Lab</option>
              {labs.map(lab => (
                <option key={lab.id} value={lab.id}>
                  {lab.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes (optional)"
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (entry ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Timetable;
