# LabSyncPro Testing Documentation

## Overview
This document outlines the comprehensive testing strategy for LabSyncPro, including unit tests, integration tests, and edge case scenarios for all API endpoints.

## Testing Framework
- **Backend**: Jest + Supertest for API testing
- **Frontend**: Jest + React Testing Library
- **Database**: Supabase with test data

## Test Categories

### 1. Authentication & Authorization Tests
- User registration with valid/invalid data
- Login with correct/incorrect credentials
- JWT token validation and expiration
- Role-based access control (admin, instructor, student)
- Password reset functionality

### 2. User Management Tests
- CRUD operations for users
- Student ID validation (8-character requirement)
- Email uniqueness validation
- User activation/deactivation
- Profile updates

### 3. Dashboard & Statistics Tests
- Dashboard stats retrieval
- Class count and listing
- Student count aggregation
- Computer inventory statistics
- Empty data handling

### 4. Lab Management Tests
- Lab listing with capacity information
- Computer status tracking
- Lab availability checking
- Sample data fallback scenarios

### 5. Class Management Tests
- Class CRUD operations
- Class assignment retrieval
- Student-class relationships
- Group management within classes

### 6. Capacity Management Tests
- Student-group relationships
- Seat assignments
- Lab capacity tracking
- Unassigned student queries

### 7. Assignment Management Tests
- Assignment creation and distribution
- PDF file upload handling
- Assignment status updates
- Deadline management
- Student submissions

### 8. File Upload Tests
- PDF file validation
- File size limits (10MB)
- Supabase Storage integration
- File metadata handling

### 9. Error Handling Tests
- 400 Bad Request scenarios
- 401 Unauthorized access
- 404 Not Found resources
- 500 Internal Server Error handling
- Database connection failures

### 10. Edge Cases
- Empty database scenarios
- Large dataset handling
- Concurrent user operations
- Network timeout scenarios
- Invalid UUID parameters

## Test Data Setup
- Sample users (admin, instructor, students)
- Sample classes and groups
- Sample labs and equipment
- Sample assignments and submissions
- Test file uploads

## Running Tests
```bash
# Run all tests
npm run test:all

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Run tests in watch mode
npm test -- --watch
```

## Test Environment Setup
1. Set up test database with sample data
2. Configure test environment variables
3. Mock external services (email, file storage)
4. Set up test authentication tokens

## Continuous Integration
- Automated testing on pull requests
- Code coverage reporting
- Performance benchmarking
- Security vulnerability scanning

## Test Coverage Goals
- Minimum 80% code coverage
- 100% coverage for critical paths
- All API endpoints tested
- All error scenarios covered

## Current Test Status

### Unit Tests ✅
- **Total Tests**: 28
- **Passed**: 26 (92.8%)
- **Failed**: 2 (7.2%)
- **Test Suites**: 2 (validation, utils)

#### Test Results Summary:
- ✅ **Validation Functions**: Email, Student ID, Password, UUID, Role, Date validation
- ✅ **Utility Functions**: Data transformation, Date formatting, String utilities, Array utilities
- ✅ **Data Transformation**: snake_case ↔ camelCase conversion
- ✅ **Date Formatting**: DD-MMM-YYYY format, deadline calculations
- ✅ **String Utilities**: Sanitization, truncation, unique ID generation
- ✅ **Array Utilities**: Chunking, deduplication, sorting

#### Failed Tests (Minor Issues):
- 2 date formatting edge cases (being fixed)

### Integration Tests 🚧
- **API Endpoints**: Ready for testing (auth, dashboard, labs, capacity, classes)
- **Database Integration**: Sample data responses implemented
- **Authentication Flow**: Test users and tokens configured

### Test Coverage 📊
- **Current Coverage**: 0% (unit tests don't cover actual routes yet)
- **Target Coverage**: 80%
- **Critical Paths**: Authentication, data validation, API responses

### Test Files Created:
1. `tests/unit/validation.test.js` - Input validation functions
2. `tests/unit/utils.test.js` - Utility function tests
3. `tests/auth.test.js` - Authentication endpoint tests (ready)
4. `tests/dashboard.test.js` - Dashboard API tests (ready)
5. `tests/labs.test.js` - Lab management tests (ready)
6. `tests/capacity.test.js` - Capacity management tests (ready)
7. `tests/classes.test.js` - Classes API tests (ready)

### Test Infrastructure:
- ✅ Jest configuration with coverage reporting
- ✅ Test environment setup with sample data
- ✅ Global setup/teardown hooks
- ✅ Test data seeder for consistent test data
- ✅ Custom test runner with multiple options
