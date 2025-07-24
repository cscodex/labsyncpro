import React, { useState, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import jsPDF from 'jspdf';
import './DatabaseSchemaModal.css';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  maxLength: number | null;
  constraintType: string | null;
  referencedTable: string | null;
  referencedColumn: string | null;
}

interface Table {
  name: string;
  columns: Column[];
}

interface DatabaseSchema {
  tables: Table[];
  rowCounts: { [tableName: string]: number };
  totalTables: number;
  generatedAt: string;
}

interface DatabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseSchemaModal: React.FC<DatabaseSchemaModalProps> = ({ isOpen, onClose }) => {
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [commonFields, setCommonFields] = useState<Map<string, string[]>>(new Map());
  const { showError } = useNotification();

  useEffect(() => {
    if (isOpen && !schema) {
      fetchSchema();
    }
  }, [isOpen]);

  // Analyze common fields across tables
  const analyzeCommonFields = (tables: Table[]) => {
    const fieldOccurrences = new Map<string, string[]>();

    // Count occurrences of each field name across tables
    tables.forEach(table => {
      table.columns.forEach(column => {
        const fieldName = column.name.toLowerCase();
        if (!fieldOccurrences.has(fieldName)) {
          fieldOccurrences.set(fieldName, []);
        }
        fieldOccurrences.get(fieldName)!.push(table.name);
      });
    });

    // Filter to only include fields that appear in multiple tables
    const commonFieldsMap = new Map<string, string[]>();
    fieldOccurrences.forEach((tableNames, fieldName) => {
      if (tableNames.length > 1) {
        commonFieldsMap.set(fieldName, tableNames);
      }
    });

    setCommonFields(commonFieldsMap);
  };

  // Get CSS class for column based on its properties
  const getColumnClass = (column: Column, tableName: string) => {
    const fieldName = column.name.toLowerCase();

    // Primary key gets highest priority
    if (column.constraintType === 'PRIMARY KEY') {
      return 'primary-key';
    }

    // Foreign key
    if (column.constraintType === 'FOREIGN KEY') {
      return 'foreign-key';
    }

    // Common fields with specific patterns
    if (commonFields.has(fieldName)) {
      if (fieldName.includes('id') || fieldName.endsWith('_id')) {
        return 'common-id';
      }
      if (fieldName.includes('name') || fieldName === 'title' || fieldName === 'description') {
        return 'common-name';
      }
      if (fieldName.includes('date') || fieldName.includes('time') || fieldName.includes('created') || fieldName.includes('updated')) {
        return 'common-date';
      }
      if (fieldName.includes('status') || fieldName.includes('state') || fieldName.includes('active')) {
        return 'common-status';
      }
      if (fieldName.includes('user') || fieldName.includes('student') || fieldName.includes('instructor') || fieldName.includes('admin')) {
        return 'common-user';
      }
      if (fieldName.includes('file') || fieldName.includes('filename') || fieldName.includes('path')) {
        return 'common-file';
      }
    }

    return 'regular';
  };

  const fetchSchema = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/database-schema', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch database schema');
      }

      const data = await response.json();
      setSchema(data);
      analyzeCommonFields(data.tables);
    } catch (error) {
      console.error('Error fetching schema:', error);
      showError('Error', 'Failed to load database schema');
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = schema?.tables.filter(table =>
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.columns.some(col => col.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const generatePDF = () => {
    if (!schema) return;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Database Schema Report', margin, yPosition);
    yPosition += 15;

    // Generation info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date(schema.generatedAt).toLocaleString()}`, margin, yPosition);
    yPosition += 5;
    pdf.text(`Total Tables: ${schema.totalTables}`, margin, yPosition);
    yPosition += 15;

    // Color legend
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Column Color Legend:', margin, yPosition);
    yPosition += 8;

    const legendItems = [
      { label: 'Primary Key', color: [220, 252, 231] },
      { label: 'ID Fields', color: [219, 234, 254] },
      { label: 'Names', color: [254, 249, 195] },
      { label: 'Dates', color: [243, 232, 255] },
      { label: 'Status', color: [252, 231, 243] },
      { label: 'Users', color: [220, 252, 231] },
      { label: 'Files', color: [254, 226, 226] },
      { label: 'Foreign Key', color: [219, 234, 254] }
    ];

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    legendItems.forEach((item, index) => {
      const x = margin + (index % 2) * (contentWidth / 2);
      const y = yPosition + Math.floor(index / 2) * 6;

      // Color box
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.rect(x, y - 3, 8, 4, 'F');

      // Label
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.label, x + 10, y);
    });

    yPosition += Math.ceil(legendItems.length / 2) * 6 + 10;

    // Tables
    filteredTables.forEach((table) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      // Table name
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${table.name} (${table.rowCount} rows)`, margin, yPosition);
      yPosition += 10;

      // Column headers
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      const colWidth = contentWidth / 4;
      pdf.text('Column', margin, yPosition);
      pdf.text('Type', margin + colWidth, yPosition);
      pdf.text('Constraints', margin + colWidth * 2, yPosition);
      pdf.text('Default', margin + colWidth * 3, yPosition);
      yPosition += 6;

      // Columns
      pdf.setFont('helvetica', 'normal');
      table.columns.forEach((column) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin;
        }

        // Column name with background color based on type
        const columnClass = getColumnClass(column, table.name);
        let bgColor = [245, 245, 245]; // default gray

        if (columnClass.includes('primary-key')) bgColor = [220, 252, 231];
        else if (columnClass.includes('common-id')) bgColor = [219, 234, 254];
        else if (columnClass.includes('common-name')) bgColor = [254, 249, 195];
        else if (columnClass.includes('common-date')) bgColor = [243, 232, 255];
        else if (columnClass.includes('common-status')) bgColor = [252, 231, 243];
        else if (columnClass.includes('common-user')) bgColor = [220, 252, 231];
        else if (columnClass.includes('common-file')) bgColor = [254, 226, 226];
        else if (columnClass.includes('foreign-key')) bgColor = [219, 234, 254];

        // Background rectangle for column name
        pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        pdf.rect(margin, yPosition - 3, colWidth - 2, 5, 'F');

        // Text
        pdf.setTextColor(0, 0, 0);
        pdf.text(column.name, margin + 1, yPosition);

        // Type
        let type = column.type;
        if (column.maxLength) type += `(${column.maxLength})`;
        pdf.text(type, margin + colWidth, yPosition);

        // Constraints
        let constraints = '';
        if (column.constraintType === 'PRIMARY KEY') constraints = 'PK';
        else if (column.constraintType === 'FOREIGN KEY') constraints = 'FK';
        else if (column.constraintType === 'UNIQUE') constraints = 'UQ';
        if (column.referencedTable) {
          constraints += ` → ${column.referencedTable}.${column.referencedColumn}`;
        }
        pdf.text(constraints, margin + colWidth * 2, yPosition);

        // Default
        pdf.text(column.default || '-', margin + colWidth * 3, yPosition);

        yPosition += 5;
      });

      yPosition += 8;
    });

    // Save the PDF
    const fileName = `database_schema_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const getConstraintBadge = (column: Column) => {
    if (column.constraintType === 'PRIMARY KEY') {
      return <span className="constraint-badge primary-key">PK</span>;
    }
    if (column.constraintType === 'FOREIGN KEY') {
      return <span className="constraint-badge foreign-key">FK</span>;
    }
    if (column.constraintType === 'UNIQUE') {
      return <span className="constraint-badge unique">UQ</span>;
    }
    return null;
  };

  const formatType = (column: Column) => {
    let type = column.type;
    if (column.maxLength) {
      type += `(${column.maxLength})`;
    }
    if (!column.nullable) {
      type += ' NOT NULL';
    }
    return type;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="database-schema-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Database Schema</h2>
          <div className="header-actions">
            <button
              className="pdf-download-button"
              onClick={generatePDF}
              disabled={!schema}
              title="Download PDF"
            >
              📄 Download PDF
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-spinner">Loading database schema...</div>
          ) : schema ? (
            <>
              <div className="schema-summary">
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Tables:</span>
                    <span className="stat-value">{schema.totalTables}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Generated:</span>
                    <span className="stat-value">
                      {new Date(schema.generatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="color-legend">
                  <h4>Column Color Legend:</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <span className="column-name primary-key">Primary Key</span>
                      <span className="legend-description">Primary key columns</span>
                    </div>
                    <div className="legend-item">
                      <span className="column-name common-id">ID Fields</span>
                      <span className="legend-description">ID and reference fields</span>
                    </div>
                    <div className="legend-item">
                      <span className="column-name common-name">Names</span>
                      <span className="legend-description">Name, title, description fields</span>
                    </div>
                    <div className="legend-item">
                      <span className="column-name common-date">Dates</span>
                      <span className="legend-description">Date, time, created, updated fields</span>
                    </div>
                    <div className="legend-item">
                      <span className="column-name common-status">Status</span>
                      <span className="legend-description">Status, state, active fields</span>
                    </div>
                    <div className="legend-item">
                      <span className="column-name foreign-key">Foreign Key</span>
                      <span className="legend-description">Foreign key columns</span>
                    </div>
                  </div>
                </div>

                <div className="search-container">
                  <input
                    type="text"
                    placeholder="Search tables or columns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>

              <div className="schema-content">
                <div className="tables-list">
                  <h3>Tables ({filteredTables.length})</h3>
                  {filteredTables.map(table => (
                    <div
                      key={table.name}
                      className={`table-item ${selectedTable === table.name ? 'selected' : ''}`}
                      onClick={() => setSelectedTable(selectedTable === table.name ? null : table.name)}
                    >
                      <div className="table-header">
                        <span className="table-name">{table.name}</span>
                        <div className="table-info">
                          <span className="column-count">{table.columns.length} columns</span>
                          <span className="row-count">
                            {schema.rowCounts[table.name] || 0} rows
                          </span>
                        </div>
                      </div>

                      {selectedTable === table.name && (
                        <div className="table-details">
                          <div className="columns-header">
                            <span>Column</span>
                            <span>Type</span>
                            <span>Constraints</span>
                            <span>Default</span>
                          </div>
                          {table.columns.map(column => (
                            <div key={column.name} className="column-row">
                              <span className={`column-name ${getColumnClass(column, table.name)}`}>{column.name}</span>
                              <span className="column-type">{formatType(column)}</span>
                              <span className="column-constraints">
                                {getConstraintBadge(column)}
                                {column.referencedTable && (
                                  <span className="reference-info">
                                    → {column.referencedTable}.{column.referencedColumn}
                                  </span>
                                )}
                              </span>
                              <span className="column-default">
                                {column.default || '-'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="error-message">Failed to load database schema</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          {schema && (
            <button 
              className="btn btn-primary" 
              onClick={() => {
                const dataStr = JSON.stringify(schema, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `database-schema-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export Schema
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseSchemaModal;
