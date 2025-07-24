# 📊 CSV Export System Documentation

## Overview
The CSV Export System allows administrators and instructors to export assignments, grades, and submissions data in CSV format for analysis, reporting, and record-keeping purposes.

## 🎯 Features

### **Export Types**
1. **📋 Assignments Export** - Assignment data with schedules and assignees
2. **📈 Grades Export** - Grading records with student performance data  
3. **📄 Submissions Export** - Submission data with file information and status

### **Access Control**
- **Administrators**: Full access to all export types
- **Instructors**: Full access to all export types
- **Students**: No access (restricted by middleware)

### **Export Locations**
1. **Dedicated Export Page**: `/data-export` - Comprehensive export interface
2. **Assignment Management**: Export buttons integrated into existing interfaces
3. **Grades Management**: Export buttons in grading interface

## 🔧 Technical Implementation

### **Backend API Endpoints**
```
GET /api/export/assignments    - Export assignments data
GET /api/export/grades         - Export grades data  
GET /api/export/submissions    - Export submissions data
```

### **Query Parameters (Filters)**
- `classId` - Filter by specific class
- `assignmentId` - Filter by specific assignment (grades/submissions only)
- `status` - Filter by assignment/submission status
- `startDate` - Filter by date range start
- `endDate` - Filter by date range end

### **Response Format**
- **Content-Type**: `text/csv`
- **Content-Disposition**: `attachment; filename="[type]_export_[date].csv"`
- **File Naming**: `assignments_export_2025-07-06.csv`

## 📋 Export Data Fields

### **Assignments Export**
```csv
assignment_title,assignment_description,class_name,assignee,assignee_type,
scheduled_date_formatted,deadline_formatted,status,created_by,assignment_created
```

### **Grades Export**  
```csv
assignment_title,class_name,student_name,student_id,student_email,score,
max_score,percentage,feedback,graded_by,graded_date,submitted_date,
submission_type,assignment_deadline,submission_status
```

### **Submissions Export**
```csv
assignment_title,class_name,student_name,student_id,student_email,
submission_type,submitted_date,deadline,submission_status,grading_status,
score,max_score,response_file_path,output_file_path
```

## 🎨 Frontend Components

### **Main Export Page** (`/data-export`)
- **Location**: `client/src/components/admin/DataExport.tsx`
- **Features**: 
  - Tabbed interface for different export types
  - Advanced filtering options
  - Real-time export with progress indicators
  - Export instructions and field descriptions

### **Reusable Export Button** 
- **Location**: `client/src/components/common/ExportButton.tsx`
- **Usage**: Can be embedded in any component
- **Props**:
  ```typescript
  interface ExportButtonProps {
    exportType: 'assignments' | 'grades' | 'submissions';
    filters?: Record<string, string | undefined>;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'secondary' | 'outline';
    children?: React.ReactNode;
  }
  ```

### **Integration Points**
1. **Assignment Management**: Export assignments with current filters
2. **Grades Interface**: Export grades and submissions with class filters
3. **Navigation Menu**: Direct access to export page for admins/instructors

## 🔒 Security Features

### **Authentication & Authorization**
- JWT token required for all export endpoints
- Role-based access control (admin/instructor only)
- Student access blocked by middleware

### **Data Protection**
- Parameterized queries prevent SQL injection
- Input validation and sanitization
- CSV escaping for special characters

### **File Handling**
- No temporary files stored on server
- Direct streaming to client
- Automatic memory cleanup

## 📊 Usage Examples

### **Basic Export (No Filters)**
```javascript
// Export all assignments
GET /api/export/assignments

// Export all grades  
GET /api/export/grades

// Export all submissions
GET /api/export/submissions
```

### **Filtered Export**
```javascript
// Export assignments for specific class
GET /api/export/assignments?classId=123

// Export grades for date range
GET /api/export/grades?startDate=2025-01-01&endDate=2025-07-06

// Export submissions by status
GET /api/export/submissions?status=completed&classId=123
```

### **Component Usage**
```tsx
// Basic export button
<ExportButton exportType="assignments" />

// Export with filters
<ExportButton 
  exportType="grades"
  filters={{ classId: selectedClass, status: 'graded' }}
  size="lg"
  variant="primary"
>
  📈 Export Class Grades
</ExportButton>
```

## 🎯 Use Cases

### **Academic Reporting**
- Export semester grades for academic records
- Generate assignment completion reports
- Analyze submission patterns and timing

### **Performance Analysis**
- Track student performance across assignments
- Identify struggling students or classes
- Monitor grading consistency

### **Administrative Tasks**
- Backup academic data
- Prepare reports for administration
- Integrate with external systems

### **Quality Assurance**
- Audit grading practices
- Verify assignment distribution
- Check submission compliance

## 🔄 Error Handling

### **Client-Side**
- Loading states during export
- User-friendly error messages
- Automatic retry mechanisms
- Progress indicators

### **Server-Side**
- Comprehensive error logging
- Graceful failure handling
- Input validation
- Database connection management

## 📱 Responsive Design

### **Desktop**
- Full-featured export interface
- Advanced filtering options
- Multiple export buttons

### **Mobile**
- Simplified export interface
- Touch-friendly buttons
- Responsive filter layout
- Optimized for smaller screens

## 🚀 Future Enhancements

### **Planned Features**
- Excel (.xlsx) export format
- Scheduled exports
- Email delivery of exports
- Custom field selection
- Export templates
- Bulk export operations

### **Performance Optimizations**
- Streaming large datasets
- Pagination for exports
- Background processing
- Caching mechanisms

## 📞 Support

For technical support or feature requests related to the CSV Export System:
- Check the application logs for error details
- Verify user permissions and authentication
- Ensure database connectivity
- Review filter parameters for validity

The CSV Export System provides a comprehensive solution for data export needs in the LabSyncPro application, supporting various academic and administrative workflows with robust security and user-friendly interfaces.
