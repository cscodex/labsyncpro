# LabSyncPro API Documentation

This document provides comprehensive information about the LabSyncPro REST API endpoints, request/response formats, and authentication methods.

## Base URL

```
http://localhost:5000/api
```

## Authentication

LabSyncPro uses JWT (JSON Web Token) based authentication. Include the token in the Authorization header for protected endpoints.

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Authentication Endpoints

### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student" // student, teacher, admin
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "student",
      "studentId": "12345678"
    }
  },
  "message": "Login successful"
}
```

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "student",
  "studentId": "12345678", // Required for students
  "classId": "uuid" // Required for students
}
```

### GET /auth/verify
Verify JWT token validity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "student"
    }
  }
}
```

### POST /auth/logout
Logout user and invalidate token.

**Headers:** `Authorization: Bearer <token>`

## User Management

### GET /users
Get all users (Admin only).

**Query Parameters:**
- `role` (optional): Filter by role
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

### GET /users/:id
Get user by ID.

### PUT /users/:id
Update user information.

### DELETE /users/:id
Delete user account (Admin only).

## Laboratory Management

### GET /labs
Get all laboratories.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Computer Lab 1",
      "location": "Ground Floor",
      "capacity": 50,
      "computers": 15,
      "equipment": [
        {
          "type": "Projector",
          "quantity": 1,
          "status": "working"
        }
      ],
      "availability": "available"
    }
  ]
}
```

### GET /labs/:id
Get laboratory by ID.

### POST /labs
Create new laboratory (Admin only).

**Request Body:**
```json
{
  "name": "Computer Lab 3",
  "location": "Second Floor",
  "capacity": 40,
  "computers": 20,
  "equipment": [
    {
      "type": "Projector",
      "quantity": 1,
      "status": "working"
    }
  ]
}
```

### PUT /labs/:id
Update laboratory information.

### DELETE /labs/:id
Delete laboratory (Admin only).

## Class Management

### GET /classes
Get all classes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "11 NM A",
      "grade": 11,
      "stream": "Non-Medical",
      "section": "A",
      "students": 45,
      "teacher": "Teacher Name"
    }
  ]
}
```

### POST /classes
Create new class (Admin only).

### PUT /classes/:id
Update class information.

### DELETE /classes/:id
Delete class (Admin only).

## Schedule Management

### GET /schedules
Get schedules based on user role.

**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD)
- `labId` (optional): Filter by laboratory
- `classId` (optional): Filter by class

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Python Programming Assignment",
      "description": "Complete the data structures assignment",
      "labId": "uuid",
      "classId": "uuid",
      "teacherId": "uuid",
      "startTime": "2024-01-15T09:00:00Z",
      "endTime": "2024-01-15T11:00:00Z",
      "type": "practical",
      "assignments": [
        {
          "studentId": "uuid",
          "seatNumber": 15,
          "computerNumber": "CL1-PC-015"
        }
      ]
    }
  ]
}
```

### POST /schedules
Create new schedule (Teacher/Admin only).

**Request Body:**
```json
{
  "title": "Database Design Lab",
  "description": "Design and implement a database schema",
  "labId": "uuid",
  "classId": "uuid",
  "startTime": "2024-01-20T10:00:00Z",
  "endTime": "2024-01-20T12:00:00Z",
  "type": "practical",
  "assignments": [
    {
      "studentId": "uuid",
      "seatNumber": 1,
      "computerNumber": "CL1-PC-001"
    }
  ]
}
```

### PUT /schedules/:id
Update schedule.

### DELETE /schedules/:id
Delete schedule.

## Submission Management

### GET /submissions
Get submissions based on user role.

**Query Parameters:**
- `scheduleId` (optional): Filter by schedule
- `studentId` (optional): Filter by student
- `status` (optional): Filter by status

### POST /submissions
Create new submission.

**Request Body:**
```json
{
  "scheduleId": "uuid",
  "title": "Assignment Solution",
  "description": "My solution to the programming assignment",
  "textContent": "print('Hello World')",
  "files": ["file1.py", "file2.txt"] // File names after upload
}
```

### POST /submissions/upload
Upload files for submission.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `files`: Multiple files
- `submissionId` (optional): Existing submission ID

### GET /submissions/:id
Get submission by ID.

### PUT /submissions/:id
Update submission.

### DELETE /submissions/:id
Delete submission.

### GET /submissions/:id/files
Get submission files.

### GET /submissions/:id/download/:filename
Download specific file from submission.

## Grading Management

### GET /grades
Get grades based on user role.

**Query Parameters:**
- `studentId` (optional): Filter by student
- `scheduleId` (optional): Filter by schedule
- `classId` (optional): Filter by class

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "submissionId": "uuid",
      "studentId": "uuid",
      "teacherId": "uuid",
      "score": 85,
      "maxScore": 100,
      "feedback": "Good work! Consider optimizing the algorithm.",
      "gradedAt": "2024-01-16T14:30:00Z"
    }
  ]
}
```

### POST /grades
Create new grade (Teacher/Admin only).

**Request Body:**
```json
{
  "submissionId": "uuid",
  "score": 90,
  "maxScore": 100,
  "feedback": "Excellent implementation with good documentation."
}
```

### PUT /grades/:id
Update grade.

### DELETE /grades/:id
Delete grade.

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

## Rate Limiting

API requests are limited to:
- **Authentication endpoints**: 5 requests per minute
- **File upload endpoints**: 10 requests per minute
- **Other endpoints**: 100 requests per minute

## File Upload Specifications

### Supported File Types
- Documents: PDF, DOC, DOCX, TXT, RTF
- Images: JPG, JPEG, PNG, GIF, BMP
- Archives: ZIP, RAR, 7Z
- Code: JS, TS, PY, JAVA, CPP, C, HTML, CSS
- Data: JSON, XML, CSV

### File Size Limits
- **Individual file**: 10 MB maximum
- **Total submission**: 50 MB maximum
- **Batch upload**: 20 files maximum

### File Naming
- Use descriptive names
- Avoid special characters except underscore and hyphen
- Maximum filename length: 255 characters

## Webhooks (Future Feature)

LabSyncPro will support webhooks for real-time notifications:

- `submission.created` - New submission received
- `grade.assigned` - Grade assigned to submission
- `schedule.created` - New schedule created
- `user.registered` - New user registration

## SDK and Libraries

Official SDKs will be available for:
- JavaScript/TypeScript
- Python
- Java
- C#

## Support

For API support:
- **Documentation**: Check this guide and inline code comments
- **Issues**: Report bugs via GitHub issues
- **Contact**: Email the development team
- **Status**: Check API status at `/health` endpoint

---

This API documentation is version 1.0 and subject to updates. Check the changelog for recent modifications.
