import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import './GradeScaleModal.css';

interface GradeScale {
  id: string;
  gradeLetter: string;
  minPercentage: number;
  maxPercentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GradeScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const GradeScaleModal: React.FC<GradeScaleModalProps> = ({ isOpen, onClose, onSave }) => {
  const { showError, showSuccess } = useNotification();
  const [gradeScales, setGradeScales] = useState<GradeScale[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingScale, setEditingScale] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchGradeScales();
    }
  }, [isOpen]);

  const fetchGradeScales = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/grade-scales', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Transform snake_case to camelCase
        const transformedScales = (data.gradeScales || []).map((scale: any) => ({
          id: scale.id,
          gradeLetter: scale.grade_letter || '',
          minPercentage: scale.min_percentage || 0,
          maxPercentage: scale.max_percentage || 0,
          isActive: scale.is_active || false,
          createdAt: scale.created_at || '',
          updatedAt: scale.updated_at || ''
        }));
        setGradeScales(transformedScales);
      } else {
        showError('Failed to fetch grade scales', 'Unable to load grade scale data');
      }
    } catch (error) {
      console.error('Error fetching grade scales:', error);
      showError('Error fetching grade scales', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateGradeScale = async (id: string, updates: Partial<GradeScale>) => {
    try {
      setSaving(true);

      // Transform camelCase to snake_case for API
      const apiUpdates = {
        grade_letter: updates.gradeLetter,
        min_percentage: updates.minPercentage,
        max_percentage: updates.maxPercentage,
        is_active: updates.isActive
      };

      const response = await fetch(`/api/grade-scales/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(apiUpdates)
      });

      if (response.ok) {
        showSuccess('Grade scale updated', 'Grade scale updated successfully');
        fetchGradeScales();
        setEditingScale(null);
      } else {
        const errorData = await response.json();
        showError('Update failed', errorData.error || 'Failed to update grade scale');
      }
    } catch (error) {
      console.error('Error updating grade scale:', error);
      showError('Update error', 'Network error occurred while updating grade scale');
    } finally {
      setSaving(false);
    }
  };

  const handleScaleUpdate = (id: string, field: keyof GradeScale, value: any) => {
    setGradeScales(prev => prev.map(scale => 
      scale.id === id ? { ...scale, [field]: value } : scale
    ));
  };

  const saveScale = (scale: GradeScale) => {
    // Validate ranges
    if (scale.minPercentage < 0 || scale.maxPercentage > 100 || scale.minPercentage >= scale.maxPercentage) {
      showError('Invalid range', 'Percentage range must be between 0-100 and min must be less than max');
      return;
    }

    updateGradeScale(scale.id, {
      gradeLetter: scale.gradeLetter,
      minPercentage: scale.minPercentage,
      maxPercentage: scale.maxPercentage,
      isActive: scale.isActive
    });
  };

  const handleSave = () => {
    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="grade-scale-modal-overlay">
      <div className="grade-scale-modal">
        <div className="modal-header">
          <h2>Grade Scale Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading grade scales...</p>
            </div>
          ) : (
            <div className="grade-scales-container">
              <div className="grade-scales-header">
                <h3>Current Grade Scale</h3>
                <p>Configure the grade letter ranges for automatic grade calculation</p>
              </div>

              <div className="grade-scales-table">
                <div className="table-header">
                  <div className="header-cell">Grade Letter</div>
                  <div className="header-cell">Min %</div>
                  <div className="header-cell">Max %</div>
                  <div className="header-cell">Active</div>
                  <div className="header-cell">Actions</div>
                </div>

                {gradeScales.map((scale) => (
                  <div key={scale.id} className="table-row">
                    <div className="table-cell">
                      {editingScale === scale.id ? (
                        <input
                          type="text"
                          value={scale.gradeLetter || ''}
                          onChange={(e) => handleScaleUpdate(scale.id, 'gradeLetter', e.target.value)}
                          className="grade-input"
                          maxLength={3}
                        />
                      ) : (
                        <span className="grade-letter-display">{scale.gradeLetter || ''}</span>
                      )}
                    </div>
                    
                    <div className="table-cell">
                      {editingScale === scale.id ? (
                        <input
                          type="number"
                          value={scale.minPercentage || 0}
                          onChange={(e) => handleScaleUpdate(scale.id, 'minPercentage', parseFloat(e.target.value) || 0)}
                          className="percentage-input"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      ) : (
                        <span>{scale.minPercentage || 0}%</span>
                      )}
                    </div>
                    
                    <div className="table-cell">
                      {editingScale === scale.id ? (
                        <input
                          type="number"
                          value={scale.maxPercentage || 0}
                          onChange={(e) => handleScaleUpdate(scale.id, 'maxPercentage', parseFloat(e.target.value) || 0)}
                          className="percentage-input"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      ) : (
                        <span>{scale.maxPercentage || 0}%</span>
                      )}
                    </div>
                    
                    <div className="table-cell">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={scale.isActive || false}
                          onChange={(e) => {
                            handleScaleUpdate(scale.id, 'isActive', e.target.checked);
                            if (editingScale !== scale.id) {
                              // Send all required fields when updating isActive
                              updateGradeScale(scale.id, {
                                gradeLetter: scale.gradeLetter,
                                minPercentage: scale.minPercentage,
                                maxPercentage: scale.maxPercentage,
                                isActive: e.target.checked
                              });
                            }
                          }}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    
                    <div className="table-cell">
                      {editingScale === scale.id ? (
                        <div className="edit-actions">
                          <button
                            className="save-btn"
                            onClick={() => saveScale(scale)}
                            disabled={saving}
                          >
                            ✅
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => {
                              setEditingScale(null);
                              fetchGradeScales(); // Reset changes
                            }}
                            disabled={saving}
                          >
                            ❌
                          </button>
                        </div>
                      ) : (
                        <button
                          className="edit-btn"
                          onClick={() => setEditingScale(scale.id)}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grade-scale-info">
                <h4>Grade Scale Information</h4>
                <ul>
                  <li>Grade ranges should not overlap</li>
                  <li>All percentages from 0-100 should be covered</li>
                  <li>Only active grade scales are used for calculation</li>
                  <li>Changes take effect immediately for new grades</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default GradeScaleModal;
