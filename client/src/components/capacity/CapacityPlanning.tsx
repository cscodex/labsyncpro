import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useConfirmation } from '../../hooks/useConfirmation';
import './CapacityPlanning.css';

interface Lab {
  id: string;
  name: string;
  total_computers: number;
  total_seats: number;
  location: string;
}

interface Computer {
  id: string;
  computer_name: string;
  computer_number: number;
  is_functional: boolean;
  specifications: any;
  assignment_id?: string;
  group_id?: string;
  user_id?: string;
  group_name?: string;
  first_name?: string;
  last_name?: string;
  student_id?: string;
}

interface Seat {
  id: string;
  seat_number: number;
  is_available: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  grade: number;
  stream: string;
  capacity: number;
  group_count: number;
  student_count: number;
  schedule_count: number;
}

interface Group {
  id: string;
  name: string;
  class_id: string;
  max_members: number;
  member_count: number;
  leader_name: string;
  description?: string;
  members: GroupMember[];
}

interface GroupMember {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string;
  role: 'leader' | 'member';
}

interface SeatAssignment {
  id: string;
  user_id: string;
  group_id?: string;
  seat_number: number;
  student_name: string;
  student_id: string;
  group_name?: string;
}

interface ComputerAssignment {
  id: string;
  group_id?: string;
  user_id?: string;
  computer_id: string;
  computer_name: string;
  assignment_type: 'group' | 'individual';
  group_name?: string;
  student_name?: string;
}

const CapacityPlanning: React.FC = () => {
  // Hooks
  const { showSuccess, showError, showWarning } = useNotification();
  const { confirm, ConfirmationComponent } = useConfirmation();

  // State management
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
  const [computerAssignments, setComputerAssignments] = useState<ComputerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'seats' | 'computers'>('seats');

  // Group Management State
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  // Student Assignment Overlay State
  const [showStudentAssignmentOverlay, setShowStudentAssignmentOverlay] = useState(false);
  const [assigningSeatId, setAssigningSeatId] = useState<string>('');
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLab) {
      fetchLabClasses();
      fetchLabResources();
    }
  }, [selectedLab]);

  useEffect(() => {
    if (selectedClass && selectedLab) {
      fetchClassAssignments();
    }
  }, [selectedClass, selectedLab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Fetch labs
      const labsResponse = await fetch('/api/labs', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const labsData = await labsResponse.json();
      setLabs(labsData.labs || []);

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLabClasses = async () => {
    if (!selectedLab) return;

    try {
      // Fetch classes that are assigned to the selected lab
      const classesResponse = await fetch(`/api/classes?labId=${selectedLab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const classesData = await classesResponse.json();
      setClasses(classesData.classes || []);

      // Reset selected class when lab changes
      setSelectedClass('');
      setGroups([]);
      setComputerAssignments([]);
      setSeatAssignments([]); // Clear seat assignments when lab changes
    } catch (error) {
      console.error('Error fetching lab classes:', error);
    }
  };

  const fetchClassAssignments = async () => {
    if (!selectedClass || !selectedLab) return;

    try {
      // Fetch students and groups for the selected class
      const studentsResponse = await fetch(`/api/capacity/students-groups/${selectedClass}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const studentsData = await studentsResponse.json();

      if (studentsData.groups) {
        setGroups(studentsData.groups);
      }

      // Fetch class assignments
      const response = await fetch(`/api/classes/${selectedClass}/assignments?labId=${selectedLab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (data.assignments) {
        setComputerAssignments(data.assignments);
      }

      // Refresh seat assignments for the new class
      fetchSeatAssignments();
    } catch (error) {
      console.error('Error fetching class assignments:', error);
    }
  };

  const fetchLabResources = async () => {
    if (!selectedLab) return;

    try {
      // Fetch lab details including computers and seats
      const response = await fetch(`/api/labs/${selectedLab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();

      if (data.lab) {
        setComputers(data.lab.computers || []);
        setSeats(data.lab.seats || []);
      }

      // Only fetch seat assignments if we have a class selected
      if (selectedClass) {
        fetchSeatAssignments();
      } else {
        // Clear seat assignments if no class is selected
        setSeatAssignments([]);
      }

    } catch (error) {
      console.error('Error fetching lab resources:', error);
    }
  };

  const generateSeatName = (labName: string, seatNumber: number): string => {
    const labCode = labName.includes('Computer Lab 1') ? 'CL1' :
                   labName.includes('Computer Lab 2') ? 'CL2' :
                   labName.includes('Programming Lab') ? 'PL' : 'RL';
    return `${labCode}-CR-${seatNumber.toString().padStart(3, '0')}`;
  };

  const getSeatStatus = (seat: any, assignment: any) => {
    // Check if seat is under maintenance (you can add maintenance logic here)
    if (!seat.is_available) {
      return 'maintenance';
    }

    // Check if seat is assigned/reserved
    if (assignment) {
      return 'reserved';
    }

    // Default to available
    return 'available';
  };



  const fetchSeatAssignments = async () => {
    if (!selectedLab) return;

    try {
      let url = `/api/capacity/labs/${selectedLab}/seat-assignments`;
      
      // If we have a selected class, get the schedule for this class/lab combination
      if (selectedClass) {
        const scheduleResponse = await fetch(`/api/schedules?classId=${selectedClass}&labId=${selectedLab}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (scheduleResponse.ok) {
          const schedules = await scheduleResponse.json();
          
          if (schedules.schedules && schedules.schedules.length > 0) {
            const scheduleId = schedules.schedules[0].id;
            url += `?scheduleId=${scheduleId}`;
          }
        }
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      setSeatAssignments(data);
    } catch (error) {
      console.error('Error fetching seat assignments:', error);
    }
  };

  const assignComputerToGroup = async (groupId: string, computerId: string) => {
    try {
      // First, we need to find or create a schedule for this class/lab combination
      const scheduleResponse = await fetch(`/api/schedules?classId=${selectedClass}&labId=${selectedLab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      let scheduleId = null;
      if (scheduleResponse.ok) {
        const schedules = await scheduleResponse.json();
        if (schedules.schedules && schedules.schedules.length > 0) {
          scheduleId = schedules.schedules[0].id;
        }
      }

      // If no schedule exists, create a default one
      if (!scheduleId) {
        const createScheduleResponse = await fetch('/api/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            title: `Capacity Planning - ${classes.find(c => c.id === selectedClass)?.name}`,
            description: 'Auto-generated schedule for capacity planning',
            labId: selectedLab,
            classId: selectedClass,
            scheduledDate: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00'
          })
        });

        if (createScheduleResponse.ok) {
          const newSchedule = await createScheduleResponse.json();
          scheduleId = newSchedule.schedule.id;
        } else {
          showError('Schedule Creation Failed', 'Failed to create schedule for assignment. Please try again.');
          return;
        }
      }

      // Now create the assignment
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          schedule_id: scheduleId,
          group_id: groupId,
          assigned_computer: computerId,
          assignment_type: 'group'
        })
      });

      if (response.ok) {
        // Refresh assignments
        fetchClassAssignments();
        showSuccess('Computer Assigned', 'Computer has been successfully assigned to the group.');
      } else {
        const error = await response.json();
        showError('Assignment Failed', error.error || 'Failed to assign computer. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning computer:', error);
      showError('Network Error', 'Unable to connect to the server. Please check your connection and try again.');
    }
  };

  const assignSeatToStudent = async (studentId: string, seatId: string) => {
    try {
      // First, we need to find or create a schedule for this class/lab combination
      const scheduleResponse = await fetch(`/api/schedules?classId=${selectedClass}&labId=${selectedLab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      let scheduleId = null;
      if (scheduleResponse.ok) {
        const schedules = await scheduleResponse.json();
        if (schedules.schedules && schedules.schedules.length > 0) {
          scheduleId = schedules.schedules[0].id;
        }
      }

      // If no schedule exists, create a default one
      if (!scheduleId) {
        const createScheduleResponse = await fetch('/api/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            title: `Capacity Planning - ${classes.find(c => c.id === selectedClass)?.name}`,
            description: 'Auto-generated schedule for capacity planning',
            labId: selectedLab,
            classId: selectedClass,
            scheduledDate: new Date().toISOString().split('T')[0],
            startTime: '09:00',
            endTime: '17:00'
          })
        });

        if (createScheduleResponse.ok) {
          const newSchedule = await createScheduleResponse.json();
          scheduleId = newSchedule.schedule.id;
        } else {
          showError('Schedule Creation Failed', 'Failed to create schedule for assignment. Please try again.');
          return;
        }
      }

      const response = await fetch('/api/capacity/seat-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_id: studentId,
          seat_id: seatId,
          schedule_id: scheduleId
        })
      });

      if (response.ok) {
        // Refresh seat assignments
        fetchSeatAssignments();
        showSuccess('Seat Assigned', 'Seat has been successfully assigned to the student.');
      } else {
        const error = await response.json();
        showError('Assignment Failed', error.error || 'Failed to assign seat. Please try again.');
      }
    } catch (error) {
      console.error('Error assigning seat:', error);
      showError('Network Error', 'Unable to connect to the server. Please check your connection and try again.');
    }
  };

  // Group Management Functions

  const updateGroup = async (groupId: string, groupData: { name: string; maxMembers: number; description?: string }) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          groupName: groupData.name,
          maxMembers: groupData.maxMembers,
          description: groupData.description
        })
      });

      if (response.ok) {
        fetchClassAssignments();
        setShowEditGroupModal(false);
        setEditingGroup(null);
        showSuccess('Group Updated', 'Group has been successfully updated.');
      } else {
        const error = await response.json();
        showError('Update Failed', error.error || 'Failed to update group. Please try again.');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      showError('Network Error', 'Unable to connect to the server. Please check your connection and try again.');
    }
  };





  const openStudentAssignmentOverlay = async (seatId: string) => {
    setAssigningSeatId(seatId);

    if (!selectedClass || !selectedLab) {
      showWarning('Selection Required', 'Please select both a class and lab first before assigning seats.');
      return;
    }

    try {
      // First, get the schedule for this class/lab combination
      let scheduleId = null;
      const scheduleResponse = await fetch(`/api/schedules?classId=${selectedClass}&labId=${selectedLab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (scheduleResponse.ok) {
        const schedules = await scheduleResponse.json();
        if (schedules.schedules && schedules.schedules.length > 0) {
          scheduleId = schedules.schedules[0].id;
        }
      }

      // Fetch unassigned students from the new API endpoint
      let url = `/api/capacity/unassigned-students/${selectedClass}/${selectedLab}`;
      if (scheduleId) {
        url += `?scheduleId=${scheduleId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Unassigned students from API:', data.unassignedStudents);
        setUnassignedStudents(data.unassignedStudents || []);
      } else {
        console.error('Failed to fetch unassigned students');
        setUnassignedStudents([]);
      }
    } catch (error) {
      console.error('Error fetching unassigned students:', error);
      setUnassignedStudents([]);
    }

    setShowStudentAssignmentOverlay(true);
  };

  const assignSeatToSelectedStudent = async (studentId: string) => {
    if (!assigningSeatId) return;
    
    try {
      await assignSeatToStudent(studentId, assigningSeatId);
      setShowStudentAssignmentOverlay(false);
      setAssigningSeatId('');
      setUnassignedStudents([]);
    } catch (error) {
      console.error('Error assigning seat:', error);
    }
  };



  const unassignComputerFromGroup = async (groupId: string) => {
    const confirmed = await confirm({
      title: 'Unassign Computer',
      message: 'Are you sure you want to unassign the computer from this group? This action cannot be undone.',
      confirmText: 'Unassign',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) {
      return;
    }

    try {
      const assignment = computerAssignments.find(a => a.group_id === groupId);
      if (!assignment) return;

      const response = await fetch(`/api/capacity/computer-assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchClassAssignments();
        showSuccess('Computer Unassigned', 'Computer has been successfully unassigned from the group.');
      } else {
        const error = await response.json();
        showError('Unassignment Failed', error.error || 'Failed to unassign computer. Please try again.');
      }
    } catch (error) {
      console.error('Error unassigning computer:', error);
      showError('Network Error', 'Unable to connect to the server. Please check your connection and try again.');
    }
  };

  const unassignSeat = async (assignmentId: string) => {
    const confirmed = await confirm({
      title: 'Unassign Seat',
      message: 'Are you sure you want to unassign this seat? This action cannot be undone.',
      confirmText: 'Unassign',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/capacity/seat-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        fetchLabResources();
        showSuccess('Seat Unassigned', 'Seat has been successfully unassigned.');
      } else {
        const error = await response.json();
        showError('Unassignment Failed', error.error || 'Failed to unassign seat. Please try again.');
      }
    } catch (error) {
      console.error('Error unassigning seat:', error);
      showError('Network Error', 'Unable to connect to the server. Please check your connection and try again.');
    }
  };

  if (loading) {
    return <div className="loading">Loading capacity planning...</div>;
  }

  const selectedLabData = Array.isArray(labs) ? labs.find(lab => lab.id === selectedLab) : undefined;

  return (
    <div className="capacity-planning">
      <div className="capacity-header">
        <h1>Capacity Planning</h1>
        <p>Assign students to seats and groups to computers</p>
      </div>

      <div className="capacity-controls">
        <div className="control-group">
          <label htmlFor="lab-select">Select Lab:</label>
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
          >
            <option value="">Choose a lab...</option>
            {Array.isArray(labs) && labs.map(lab => (
              <option key={lab.id} value={lab.id}>
                {lab.name} - {lab.location}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="class-select">Select Class:</label>
          <select
            id="class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Choose a class...</option>
            {Array.isArray(classes) && classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.stream})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedLab && selectedLabData && (
        <div className="lab-info">
          <h2>{selectedLabData.name}</h2>
          <div className="lab-stats">
            <div className="stat">
              <span className="stat-label">Total Computers:</span>
              <span className="stat-value">{selectedLabData.total_computers}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Seats:</span>
              <span className="stat-value">{selectedLabData.total_seats}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Location:</span>
              <span className="stat-value">{selectedLabData.location}</span>
            </div>
          </div>
        </div>
      )}

      {selectedLab && (
        <div className="capacity-tabs">
          <button
            className={`tab-button ${activeTab === 'seats' ? 'active' : ''}`}
            onClick={() => setActiveTab('seats')}
          >
            Seat Assignments
          </button>
          <button
            className={`tab-button ${activeTab === 'computers' ? 'active' : ''}`}
            onClick={() => setActiveTab('computers')}
          >
            Computer Assignments
          </button>
        </div>
      )}

      {selectedLab && activeTab === 'seats' && (
        <div className="seats-section">
          <h3>Seat Assignments</h3>
          {selectedClass ? (
            <>
              <div className="seats-grid">
            {Array.isArray(seats) && seats.map(seat => {
              const assignment = Array.isArray(seatAssignments) ? seatAssignments.find(a => a.seat_number === seat.seat_number) : undefined;
              const seatName = generateSeatName(selectedLabData?.name || '', seat.seat_number);
              const seatStatus = getSeatStatus(seat, assignment);

              return (
                <div
                  key={seat.id}
                  className={`seat-card seat-${seatStatus}`}
                >
                  <div className="seat-icon">💺</div>
                  <div className="seat-name">{seatName}</div>
                  <div className="seat-number">Seat {seat.seat_number}</div>
                  {assignment ? (
                    <div className="assignment-info">
                      <div className="student-name">{assignment.student_name}</div>
                      <div className="student-id">{assignment.student_id}</div>
                      <button
                        className="unassign-btn"
                        onClick={() => unassignSeat(assignment.id)}
                      >
                        Unassign
                      </button>
                    </div>
                  ) : (
                    <div className={`status-indicator status-${seatStatus}`}>
                      {seatStatus === 'maintenance' ? 'Under Maintenance' :
                       seatStatus === 'reserved' ? 'Reserved' : 'Available'}
                      {seatStatus === 'available' && (
                        <button
                          className="assign-seat-btn"
                          onClick={() => openStudentAssignmentOverlay(seat.id)}
                        >
                          Assign Student
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            </>
          ) : (
            <div className="no-class-selected">
              <p>Please select a class to view seat assignments.</p>
            </div>
          )}
        </div>
      )}

      {selectedLab && activeTab === 'computers' && (
        <div className="computers-section">
          <h3>Computer Assignments - {classes.find(c => c.id === selectedClass)?.name || 'Select a Class'}</h3>

          {selectedClass ? (
            <div className="computer-assignment-container">
              {/* Groups Table */}
              <div className="groups-table-section">
                <h4>Groups and Computer Assignments</h4>

                {groups.length === 0 ? (
                  <div className="no-groups">
                    <p>No groups found for this class.</p>
                  </div>
                ) : (
                  <div className="groups-table-container">
                    <table className="groups-table">
                      <thead>
                        <tr>
                          <th>Group Name</th>
                          <th>Members</th>
                          <th>Member Count</th>
                          <th>Assigned Computer</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map(group => {
                          const assignment = computerAssignments.find(a => a.group_id === group.id);
                          const availableComputers = computers.filter(c =>
                            c.is_functional &&
                            !computerAssignments.find(a => a.computer_name === c.computer_name)
                          );

                          return (
                            <tr key={group.id} className="group-row">
                              <td className="group-name-cell">
                                <div className="group-name">{group.name}</div>
                                <div className="group-description">{group.description || 'No description'}</div>
                              </td>

                              <td className="members-cell">
                                <div className="members-list">
                                  {group.members.map((member) => (
                                    <div key={member.id} className="member-item">
                                      <span className="member-name">
                                        {member.first_name} {member.last_name}
                                      </span>
                                      <span className="member-id">({member.student_id})</span>
                                      {member.role === 'leader' && (
                                        <span className="leader-badge">Leader</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>

                              <td className="member-count-cell">
                                <span className="count-badge">{group.member_count}</span>
                              </td>

                              <td className="computer-assignment-cell">
                                {assignment ? (
                                  <div className="assigned-computer-info">
                                    <div className="computer-name">{assignment.computer_name}</div>
                                    <div className="assignment-status">Assigned</div>
                                  </div>
                                ) : (
                                  <div className="no-assignment-info">
                                    <span className="no-computer-text">No computer assigned</span>
                                  </div>
                                )}
                              </td>

                              <td className="actions-cell">
                                {assignment ? (
                                  <button
                                    className="unassign-btn"
                                    onClick={() => unassignComputerFromGroup(group.id)}
                                  >
                                    Unassign
                                  </button>
                                ) : (
                                  <div className="assignment-controls">
                                    {availableComputers.length > 0 ? (
                                      <div className="computer-dropdown-container">
                                        <select
                                          className="computer-dropdown"
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              assignComputerToGroup(group.id, e.target.value);
                                              e.target.value = ''; // Reset dropdown
                                            }
                                          }}
                                          defaultValue=""
                                        >
                                          <option value="" disabled>Select Computer</option>
                                          {availableComputers.map(computer => (
                                            <option key={computer.id} value={computer.id}>
                                              {computer.computer_name} (#{computer.computer_number})
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ) : (
                                      <span className="no-computers-available">No computers available</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Available Computers Summary */}
              <div className="computers-summary-section">
                <h4>Computer Status Summary - {classes.find(c => c.id === selectedClass)?.name || 'Selected Class'}</h4>
                <div className="computers-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Computers:</span>
                    <span className="stat-value">{computers.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Available:</span>
                    <span className="stat-value available">
                      {computers.filter(c =>
                        c.is_functional &&
                        !computerAssignments.find(a => a.computer_name === c.computer_name && a.computer_name)
                      ).length}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Assigned:</span>
                    <span className="stat-value assigned">
                      {computerAssignments.filter(assignment => assignment.computer_name).length}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Under Maintenance:</span>
                    <span className="stat-value maintenance">
                      {computers.filter(c => !c.is_functional).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-class-selected">
              <p>Please select a class to view computer assignments and groups.</p>
            </div>
          )}
        </div>
      )}



      {/* Edit Group Modal */}
      {showEditGroupModal && editingGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Group</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowEditGroupModal(false);
                  setEditingGroup(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                updateGroup(editingGroup.id, {
                  name: formData.get('groupName') as string,
                  maxMembers: parseInt(formData.get('maxMembers') as string),
                  description: formData.get('description') as string
                });
              }}>
                <div className="form-group">
                  <label htmlFor="editGroupName">Group Name:</label>
                  <input
                    type="text"
                    id="editGroupName"
                    name="groupName"
                    defaultValue={editingGroup.name}
                    required
                    placeholder="Enter group name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editMaxMembers">Max Members:</label>
                  <input
                    type="number"
                    id="editMaxMembers"
                    name="maxMembers"
                    min="1"
                    max="10"
                    defaultValue={editingGroup.max_members}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editDescription">Description (Optional):</label>
                  <textarea
                    id="editDescription"
                    name="description"
                    defaultValue={editingGroup.description || ''}
                    placeholder="Enter group description"
                    rows={3}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => {
                    setShowEditGroupModal(false);
                    setEditingGroup(null);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="primary">
                    Update Group
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}



      {/* Student Assignment Overlay */}
      {showStudentAssignmentOverlay && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Assign Student to Seat</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowStudentAssignmentOverlay(false);
                  setAssigningSeatId('');
                  setUnassignedStudents([]);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="students-selection">
                <h4>Select a student to assign:</h4>
                {unassignedStudents.length > 0 ? (
                  <div className="students-grid">
                    {unassignedStudents.map(student => (
                      <div
                        key={student.id}
                        className="student-option"
                      >
                        <div className="student-info">
                          <div className="student-name">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="student-id">
                            ID: {student.student_id || 'N/A'}
                          </div>
                        </div>
                        <button
                          className="assign-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            assignSeatToSelectedStudent(student.id);
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-students">
                    <p>No unassigned students available in the selected class.</p>
                    <p>All students from this class have already been assigned to seats.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationComponent />
    </div>
  );
};

export default CapacityPlanning;
