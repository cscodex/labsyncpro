import React, { useState, useEffect } from 'react';
import { labsAPI } from '../../services/api';
import ComputerInventory from '../inventory/ComputerInventory';
import LoadingSpinner from '../common/LoadingSpinner';
import './Labs.css';

interface Lab {
  id: string;
  name: string;
  total_computers: number;
  total_seats: number;
  location: string;
  equipment?: string[];
  is_active: boolean;
  computer_count: number;
  functional_computers: number;
  maintenance_computers: number;
  assigned_computers: number;
  available_computers: number;
}

interface Computer {
  id: string;
  computer_name: string;
  computer_number: number;
  status: string;
  current_status: string;
  specifications: any;
  condition_notes?: string;
  last_maintenance_date?: string;
}

const Labs: React.FC = () => {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [labComputers, setLabComputers] = useState<Computer[]>([]);
  const [showInventory, setShowInventory] = useState(false);

  // Demo data for when backend is not available
  const demoLabs: Lab[] = [
    {
      id: '1',
      name: 'Lab 1',
      totalComputers: 15,
      totalSeats: 50,
      location: 'Computer Science Building - Ground Floor',
      equipment: ['Projector', 'Whiteboard', 'Air Conditioning', 'WiFi'],
      isActive: true,
      availableComputers: 12,
      availableSeats: 45
    },
    {
      id: '2',
      name: 'Lab 2',
      totalComputers: 19,
      totalSeats: 50,
      location: 'Computer Science Building - First Floor',
      equipment: ['Smart Board', 'Projector', 'Air Conditioning', 'WiFi'],
      isActive: true,
      availableComputers: 16,
      availableSeats: 42
    }
  ];

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setLoading(true);
        const response = await labsAPI.getLabs();
        // The API returns data in response.data.labs format
        const labsData = response.data.labs || response.data;

        // Transform the API data to match our interface
        const transformedLabs = labsData.map((lab: any) => ({
          id: lab.id,
          name: lab.name,
          totalComputers: lab.total_computers,
          totalSeats: lab.total_seats,
          location: lab.location,
          equipment: lab.equipment || [],
          isActive: lab.is_active,
          availableComputers: lab.functional_computers || lab.total_computers,
          availableSeats: lab.total_seats - Math.floor(Math.random() * 10), // Mock available seats
          functionalComputers: lab.functional_computers,
          maintenanceComputers: lab.maintenance_computers,
          assignedComputers: lab.assigned_computers
        }));

        setLabs(transformedLabs);
      } catch (error) {
        if (import.meta.env.MODE === 'development') {
          console.error('Error fetching labs:', error);
          console.warn('Using demo data for labs');
        }
        setLabs(demoLabs);
      } finally {
        setLoading(false);
      }
    };

    fetchLabs();
  }, []);

  const fetchLabComputers = async (labId: string) => {
    try {
      const response = await fetch(`/api/inventory/computers?labId=${labId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLabComputers(data.computers);
      }
    } catch (error) {
      console.error('Error fetching lab computers:', error);
    }
  };

  const handleViewDetails = async (lab: Lab) => {
    setSelectedLab(lab);
    await fetchLabComputers(lab.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'functional': return 'green';
      case 'assigned': return 'blue';
      case 'in_repair': return 'orange';
      case 'maintenance': return 'yellow';
      case 'retired': return 'gray';
      case 'offline': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'functional': return 'Functional';
      case 'assigned': return 'Assigned';
      case 'in_repair': return 'In Repair';
      case 'maintenance': return 'Maintenance';
      case 'retired': return 'Retired';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        size="large"
        message="Loading labs..."
      />
    );
  }

  // Safety check to ensure labs is an array
  const labsArray = Array.isArray(labs) ? labs : [];

  if (showInventory) {
    return (
      <div className="labs">
        <div className="labs-header">
          <button
            className="btn btn-secondary"
            onClick={() => setShowInventory(false)}
          >
            ← Back to Labs
          </button>
          <h1>Computer Inventory</h1>
        </div>
        <ComputerInventory />
      </div>
    );
  }

  return (
    <div className="labs">
      <div className="labs-header">
        <div className="header-content">
          <div>
            <h1>Laboratory Management</h1>
            <p>Monitor and manage computer labs, equipment, and resources</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowInventory(true)}
          >
            View Computer Inventory
          </button>
        </div>
      </div>

      <div className="labs-content">
        {labsArray.length === 0 ? (
          <div className="no-labs">
            <p>No labs available at the moment.</p>
          </div>
        ) : (
          <div className="labs-grid">
            {labsArray.map((lab) => (
            <div key={lab.id} className="lab-card">
              <div className="lab-card-header">
                <h3>{lab.name}</h3>
                <div className={`lab-status ${lab.is_active ? 'active' : 'inactive'}`}>
                  {lab.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className="lab-capacity">
                <div className="capacity-info">
                  <strong>Capacity:</strong> {lab.total_computers} computers, {lab.total_seats} seats
                </div>
              </div>

              <div className="lab-stats">
                <div className="stat">
                  <div className="stat-value">{lab.functional_computers}/{lab.computer_count}</div>
                  <div className="stat-label">Functional Computers</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{lab.assigned_computers}</div>
                  <div className="stat-label">Currently Assigned</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{lab.maintenance_computers}</div>
                  <div className="stat-label">Under Maintenance</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{lab.available_computers}</div>
                  <div className="stat-label">Available</div>
                </div>
              </div>

              <div className="lab-location">
                <strong>Location:</strong> {lab.location || 'Not specified'}
              </div>

              {lab.equipment && lab.equipment.length > 0 && (
                <div className="lab-equipment">
                  <strong>Equipment:</strong>
                  <div className="equipment-tags">
                    {lab.equipment.map((item, index) => (
                      <span key={index} className="equipment-tag">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="lab-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleViewDetails(lab)}
                >
                  View Details
                </button>
                <button className="btn btn-secondary">Schedule</button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Lab Details Modal */}
      {selectedLab && (
        <div className="modal-overlay" onClick={() => setSelectedLab(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedLab.name} - Computer Details</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedLab(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="lab-overview">
                <div className="overview-stats">
                  <div className="overview-stat">
                    <span className="stat-number">{selectedLab.totalComputers}</span>
                    <span className="stat-label">Total Computers</span>
                  </div>
                  <div className="overview-stat">
                    <span className="stat-number">{selectedLab.functionalComputers || 0}</span>
                    <span className="stat-label">Functional</span>
                  </div>
                  <div className="overview-stat">
                    <span className="stat-number">{selectedLab.assignedComputers || 0}</span>
                    <span className="stat-label">Assigned</span>
                  </div>
                  <div className="overview-stat">
                    <span className="stat-number">{selectedLab.maintenanceComputers || 0}</span>
                    <span className="stat-label">Maintenance</span>
                  </div>
                </div>
              </div>

              <div className="computers-list">
                <h3>Computer Status</h3>
                {labComputers.length > 0 ? (
                  <div className="computers-grid">
                    {labComputers.map((computer) => (
                      <div key={computer.id} className="computer-card">
                        <div className="computer-header">
                          <strong>{computer.computer_name}</strong>
                          <span
                            className={`status-badge status-${getStatusColor(computer.current_status)}`}
                          >
                            {getStatusLabel(computer.current_status)}
                          </span>
                        </div>

                        {computer.specifications && (
                          <div className="computer-specs">
                            {computer.specifications.cpu && (
                              <div className="spec-item">
                                <span>CPU:</span> {computer.specifications.cpu}
                              </div>
                            )}
                            {computer.specifications.ram && (
                              <div className="spec-item">
                                <span>RAM:</span> {computer.specifications.ram}
                              </div>
                            )}
                          </div>
                        )}

                        {computer.condition_notes && (
                          <div className="computer-notes">
                            <small>{computer.condition_notes}</small>
                          </div>
                        )}

                        {computer.last_maintenance_date && (
                          <div className="maintenance-date">
                            <small>Last maintenance: {new Date(computer.last_maintenance_date).toLocaleDateString()}</small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Loading computer details...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Labs;
