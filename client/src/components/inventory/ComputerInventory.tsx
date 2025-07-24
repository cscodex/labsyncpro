import React, { useState, useEffect } from 'react';
import './ComputerInventory.css';

interface Computer {
  id: string;
  computer_name: string;
  computer_number: number;
  specifications: any;
  is_functional: boolean;
  status: 'functional' | 'in_repair' | 'maintenance' | 'retired' | 'offline';
  condition_notes?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  lab_name: string;
  lab_location: string;
  current_status: string;
  assignment_id?: string;
  current_schedule?: string;
  scheduled_date?: string;
  created_at: string;
  updated_at?: string;
}

interface ComputerInventoryProps {}

const ComputerInventory: React.FC<ComputerInventoryProps> = () => {
  const [computers, setComputers] = useState<Computer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    labId: '',
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedComputer, setSelectedComputer] = useState<Computer | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchComputers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await fetch(`/api/inventory/computers?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch computers');
      }

      const data = await response.json();
      setComputers(data.computers);
      setPagination(prev => ({
        ...prev,
        ...data.pagination
      }));
    } catch (error) {
      console.error('Error fetching computers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComputers();
  }, [pagination.page, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDetails = async (computer: Computer) => {
    try {
      const response = await fetch(`/api/inventory/computers/${computer.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedComputer({ ...computer, ...data.computer });
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching computer details:', error);
    }
  };

  if (loading) {
    return (
      <div className="inventory-loading">
        <div className="loading-spinner"></div>
        <p>Loading computer inventory...</p>
      </div>
    );
  }

  return (
    <div className="computer-inventory">
      <div className="inventory-header">
        <h1>Computer Inventory</h1>
        <p>Manage and monitor computer assets across all laboratories</p>
      </div>

      {/* Filters */}
      <div className="inventory-filters">
        <div className="filter-group">
          <label>Search:</label>
          <input
            type="text"
            placeholder="Search by computer name or lab..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="functional">Functional</option>
            <option value="assigned">Assigned</option>
            <option value="in_repair">In Repair</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Computer Table */}
      <div className="inventory-table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Computer</th>
              <th>Lab</th>
              <th>Status</th>
              <th>Specifications</th>
              <th>Last Maintenance</th>
              <th>Current Assignment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {computers.map((computer) => (
              <tr key={computer.id}>
                <td>
                  <div className="computer-info">
                    <strong>{computer.computer_name}</strong>
                    <small>#{computer.computer_number}</small>
                  </div>
                </td>
                <td>
                  <div className="lab-info">
                    <strong>{computer.lab_name}</strong>
                    <small>{computer.lab_location}</small>
                  </div>
                </td>
                <td>
                  <span 
                    className={`status-badge status-${getStatusColor(computer.current_status)}`}
                  >
                    {getStatusLabel(computer.current_status)}
                  </span>
                </td>
                <td>
                  <div className="specs-summary">
                    {computer.specifications?.cpu && (
                      <div>{computer.specifications.cpu}</div>
                    )}
                    {computer.specifications?.ram && (
                      <div>{computer.specifications.ram}</div>
                    )}
                  </div>
                </td>
                <td>{formatDate(computer.last_maintenance_date)}</td>
                <td>
                  {computer.current_schedule ? (
                    <div className="assignment-info">
                      <strong>{computer.current_schedule}</strong>
                      <small>{formatDate(computer.scheduled_date)}</small>
                    </div>
                  ) : (
                    <span className="no-assignment">Not assigned</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleViewDetails(computer)}
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {pagination.page} of {pagination.pages} ({pagination.total} computers)
          </span>
          
          <button
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}

      {/* Computer Details Modal */}
      {showDetails && selectedComputer && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedComputer.computer_name} Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDetails(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="computer-details">
                <div className="detail-section">
                  <h3>Basic Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Computer Name:</label>
                      <span>{selectedComputer.computer_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className={`status-badge status-${getStatusColor(selectedComputer.current_status)}`}>
                        {getStatusLabel(selectedComputer.current_status)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <label>Lab:</label>
                      <span>{selectedComputer.lab_name}</span>
                    </div>
                    <div className="detail-item">
                      <label>Location:</label>
                      <span>{selectedComputer.lab_location}</span>
                    </div>
                  </div>
                </div>

                {selectedComputer.specifications && (
                  <div className="detail-section">
                    <h3>Specifications</h3>
                    <div className="detail-grid">
                      {Object.entries(selectedComputer.specifications).map(([key, value]) => (
                        <div key={key} className="detail-item">
                          <label>{key.toUpperCase()}:</label>
                          <span>{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="detail-section">
                  <h3>Maintenance Information</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Last Maintenance:</label>
                      <span>{formatDate(selectedComputer.last_maintenance_date)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Next Maintenance:</label>
                      <span>{formatDate(selectedComputer.next_maintenance_date)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Purchase Date:</label>
                      <span>{formatDate(selectedComputer.purchase_date)}</span>
                    </div>
                    <div className="detail-item">
                      <label>Warranty Expiry:</label>
                      <span>{formatDate(selectedComputer.warranty_expiry)}</span>
                    </div>
                  </div>
                </div>

                {selectedComputer.condition_notes && (
                  <div className="detail-section">
                    <h3>Condition Notes</h3>
                    <p>{selectedComputer.condition_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComputerInventory;
