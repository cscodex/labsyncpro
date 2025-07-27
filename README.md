# LabSyncPro - Laboratory Management System

A comprehensive laboratory management system built with React, Node.js, and Supabase for educational institutions to manage computer labs, text-based coding assignments, schedules, and student activities. Students submit their code and output through copy-paste interface instead of file uploads.

## 🚀 Features

### Core Functionality
- **Laboratory Management**: Monitor and manage multiple computer labs with real-time availability tracking
- **Student Management**: Handle student registration with 8-digit IDs and group organization (3-4 members per group)
- **Academic Structure**: Support for 10 classes across grades 11-12 (6 Non-Medical, 2 Medical, 2 Commerce)
- **Scheduling System**: Create and manage lab sessions with seat/computer assignments
- **Submission System**: Handle both file uploads and text submissions with version control
- **Grading System**: Comprehensive grading interface with feedback and score tracking
- **Authentication**: JWT-based authentication with role-based access control
- **Demo Mode**: Fallback system for frontend functionality when backend is unavailable

### Technical Features
- **Real-time Updates**: Live status updates for lab availability and assignments
- **File Management**: Secure file upload and download system
- **Responsive Design**: Mobile-first responsive interface
- **Data Validation**: Comprehensive input validation and error handling
- **Testing Suite**: Comprehensive test coverage with Vitest and React Testing Library

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript and Vite
- **Routing**: React Router for navigation
- **State Management**: React Context API with localStorage persistence
- **Styling**: CSS Modules with responsive design
- **HTTP Client**: Axios with request/response interceptors
- **Testing**: Vitest with React Testing Library

### Backend (Node.js + Express)
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database**: PostgreSQL with UUID primary keys
- **File Handling**: Multer for file uploads
- **Validation**: Express-validator for input validation
- **Security**: CORS, helmet, and rate limiting

### Database (PostgreSQL)
- **Users**: Authentication and role management
- **Labs**: Laboratory information and equipment tracking
- **Classes**: Academic structure and student organization
- **Schedules**: Lab session scheduling and assignments
- **Submissions**: Student work submissions with file attachments
- **Grades**: Grading and feedback system

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd LabSyncPro
```

2. **Install backend dependencies**
```bash
cd server
npm install
```

3. **Database Setup**
```bash
# Create PostgreSQL database
createdb labsyncpro

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials
```

4. **Environment Variables**
Create a `.env` file in the server directory:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=labsyncpro
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

5. **Initialize Database**
```bash
# Run database migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

6. **Start Backend Server**
```bash
npm run dev
```

### Frontend Setup

1. **Install frontend dependencies**
```bash
cd client
npm install
```

2. **Environment Variables**
Create a `.env` file in the client directory:
```env
VITE_API_URL=http://localhost:5000/api
```

3. **Start Frontend Development Server**
```bash
npm run dev
```

### Production Deployment

1. **Build Frontend**
```bash
cd client
npm run build
```

2. **Build Backend**
```bash
cd server
npm run build
```

3. **Start Production Server**
```bash
cd server
npm start
```

## 🧪 Testing

### Frontend Testing
```bash
cd client

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Generate coverage report
npm run test:coverage
```

### Backend Testing
```bash
cd server

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/logout` - User logout

### Lab Management
- `GET /api/labs` - Get all labs
- `GET /api/labs/:id` - Get lab by ID
- `POST /api/labs` - Create new lab
- `PUT /api/labs/:id` - Update lab
- `DELETE /api/labs/:id` - Delete lab

### Scheduling
- `GET /api/schedules` - Get all schedules
- `POST /api/schedules` - Create new schedule
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Submissions
- `GET /api/submissions` - Get all submissions
- `POST /api/submissions` - Create new submission
- `POST /api/submissions/upload` - Upload file
- `GET /api/submissions/:id/files` - Get submission files

### Grading
- `GET /api/grades` - Get all grades
- `PUT /api/grades/:id` - Update grade
- `POST /api/grades` - Create new grade

## 👥 User Roles

### Administrator
- Full system access
- Lab management and configuration
- User management and role assignment
- System monitoring and reports

### Teacher/Instructor
- Schedule lab sessions
- Create and manage assignments
- Grade student submissions
- View student progress

### Student
- View assigned schedules
- Submit assignments (files and text)
- View grades and feedback
- Access lab resources

## 🔧 Configuration

### Lab Configuration
- **Lab 1**: 15 computers, 50 seats, Ground Floor
- **Lab 2**: 19 computers, 50 seats, First Floor
- Equipment tracking (Projectors, Whiteboards, etc.)
- Real-time availability monitoring

### Academic Structure
- **Grade 11 Non-Medical**: Classes A, B, C, D, E, F
- **Grade 12 Non-Medical**: Classes A, B, C, D, E, F
- **Grade 11 Medical**: Classes A, B
- **Grade 12 Medical**: Classes A, B
- **Grade 11 Commerce**: Classes A, B
- **Grade 12 Commerce**: Classes A, B

### Student Organization
- 8-digit student IDs
- Groups of 3-4 members
- Class-based organization
- Role-based permissions

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database exists

2. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Clear browser localStorage

3. **File Upload Problems**
   - Check file size limits
   - Verify upload directory permissions
   - Ensure multer configuration

4. **Demo Mode Activation**
   - Demo mode activates when backend is unavailable
   - Check API connection
   - Verify VITE_API_URL configuration

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

---

**LabSyncPro** - Streamlining laboratory management for educational excellence.

```
LabSyncPro
├─ README.md
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ assignments
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  └─ Register.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  └─ Pagination.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ Grades.css
│  │  │  │  └─ Grades.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  └─ Groups.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ submissions
│  │  │  │  ├─ Submissions.css
│  │  │  │  └─ Submissions.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ seed.sql
│  └─ setup.js
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ package-lock.json
├─ package.json
├─ restart.sh
└─ server
   ├─ .env
   ├─ .env.example
   ├─ config
   │  └─ database.js
   ├─ index.js
   ├─ middleware
   │  └─ auth.js
   ├─ package-lock.json
   ├─ package.json
   ├─ routes
   │  ├─ assignments.js
   │  ├─ auth.js
   │  ├─ capacity.js
   │  ├─ classes.js
   │  ├─ grades.js
   │  ├─ groups.js
   │  ├─ inventory.js
   │  ├─ labs.js
   │  ├─ schedules.js
   │  ├─ submissions.js
   │  └─ users.js
   ├─ scripts
   │  ├─ add-missing-tables.js
   │  ├─ apply-full-schema.js
   │  ├─ check-constraints.js
   │  ├─ check-grades-table.js
   │  ├─ check-group-members-table.js
   │  ├─ check-groups-table.js
   │  ├─ check-schedule-constraints.js
   │  ├─ check-schedules-table.js
   │  ├─ check-submission-constraints.js
   │  ├─ check-submissions-table.js
   │  ├─ check-table-structure.js
   │  ├─ check-tables.js
   │  ├─ check-users.js
   │  ├─ create-additional-classes.js
   │  ├─ create-sample-assignments.js
   │  ├─ fix-passwords.js
   │  ├─ migrate.js
   │  ├─ populate-data.js
   │  ├─ setup-database.js
   │  ├─ test-login.js
   │  └─ verify-data.js
   └─ uploads
      └─ submissions

```
```
LabSyncPro
├─ README.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  └─ Pagination.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  ├─ Groups.tsx.backup
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  │  ├─ Submissions.css
│  │  │  │  └─ Submissions.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_default_groups.sql
│  │  └─ add_schedule_files_and_fix_classes.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ package-lock.json
├─ package.json
├─ restart-system.sh
├─ restart.sh
├─ server
│  ├─ .env
│  ├─ .env.example
│  ├─ config
│  │  └─ database.js
│  ├─ index.js
│  ├─ middleware
│  │  ├─ auth.js
│  │  └─ studentRestriction.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ assignment-distributions.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ fileUploads.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ schedules.js
│  │  ├─ submissions.js
│  │  └─ users.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  └─ uploads
│     ├─ assignments
│     │  ├─ assignment-1751714395696-79999933.pdf
│     │  ├─ assignment-1751714405808-646905828.pdf
│     │  ├─ assignment-1751717545648-498525459.pdf
│     │  ├─ assignment-1751718571430-12590940.pdf
│     │  ├─ assignment-1751718941590-865909909.pdf
│     │  ├─ assignment-692f0f6a-c5d0-4255-b0de-fda379f19d3b-1751563416566.pdf
│     │  ├─ assignment-70683981-d604-4c70-9502-0532c7653bd7-1751690996898.pdf
│     │  ├─ assignment-70dd4815-b0b0-4b89-9964-e9e0b8a6a96d-1751560096800.pdf
│     │  ├─ assignment-8c0243c6-02a1-454e-beee-004b01070b4c-1751560153421.pdf
│     │  ├─ assignment-c5c44312-d273-4fc8-9b61-54f19c7c2456-1751562133985.pdf
│     │  └─ assignment-e0e685f0-8914-4a6d-8762-4a24e53a0d97-1751563601696.pdf
│     └─ submissions
└─ start-server.js

```
```
LabSyncPro
├─ README.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  └─ Pagination.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  ├─ Groups.tsx.backup
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  │  ├─ Submissions.css
│  │  │  │  └─ Submissions.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_default_groups.sql
│  │  └─ add_schedule_files_and_fix_classes.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ package-lock.json
├─ package.json
├─ restart-system.sh
├─ restart.sh
├─ server
│  ├─ .env
│  ├─ .env.example
│  ├─ config
│  │  └─ database.js
│  ├─ index.js
│  ├─ middleware
│  │  ├─ auth.js
│  │  └─ studentRestriction.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ assignment-distributions.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ fileUploads.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ schedules.js
│  │  ├─ submissions.js
│  │  └─ users.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  └─ uploads
│     ├─ assignments
│     │  ├─ assignment-1751714395696-79999933.pdf
│     │  ├─ assignment-1751714405808-646905828.pdf
│     │  ├─ assignment-1751717545648-498525459.pdf
│     │  ├─ assignment-1751718571430-12590940.pdf
│     │  ├─ assignment-1751718941590-865909909.pdf
│     │  ├─ assignment-692f0f6a-c5d0-4255-b0de-fda379f19d3b-1751563416566.pdf
│     │  ├─ assignment-70683981-d604-4c70-9502-0532c7653bd7-1751690996898.pdf
│     │  ├─ assignment-70dd4815-b0b0-4b89-9964-e9e0b8a6a96d-1751560096800.pdf
│     │  ├─ assignment-8c0243c6-02a1-454e-beee-004b01070b4c-1751560153421.pdf
│     │  ├─ assignment-c5c44312-d273-4fc8-9b61-54f19c7c2456-1751562133985.pdf
│     │  └─ assignment-e0e685f0-8914-4a6d-8762-4a24e53a0d97-1751563601696.pdf
│     └─ submissions
└─ start-server.js

```
```
LabSyncPro
├─ README.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  └─ Pagination.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  ├─ Groups.tsx.backup
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  │  ├─ Submissions.css
│  │  │  │  └─ Submissions.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_default_groups.sql
│  │  └─ add_schedule_files_and_fix_classes.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ package-lock.json
├─ package.json
├─ restart-system.sh
├─ restart.sh
├─ server
│  ├─ .env
│  ├─ .env.example
│  ├─ config
│  │  └─ database.js
│  ├─ index.js
│  ├─ middleware
│  │  ├─ auth.js
│  │  └─ studentRestriction.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ assignment-distributions.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ fileUploads.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ schedules.js
│  │  ├─ submissions.js
│  │  └─ users.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  └─ uploads
│     ├─ assignments
│     │  ├─ assignment-1751714395696-79999933.pdf
│     │  ├─ assignment-1751714405808-646905828.pdf
│     │  ├─ assignment-1751717545648-498525459.pdf
│     │  ├─ assignment-1751718571430-12590940.pdf
│     │  ├─ assignment-1751718941590-865909909.pdf
│     │  ├─ assignment-1751758813376-953154529.pdf
│     │  ├─ assignment-692f0f6a-c5d0-4255-b0de-fda379f19d3b-1751563416566.pdf
│     │  ├─ assignment-70683981-d604-4c70-9502-0532c7653bd7-1751690996898.pdf
│     │  ├─ assignment-70dd4815-b0b0-4b89-9964-e9e0b8a6a96d-1751560096800.pdf
│     │  ├─ assignment-8c0243c6-02a1-454e-beee-004b01070b4c-1751560153421.pdf
│     │  ├─ assignment-c5c44312-d273-4fc8-9b61-54f19c7c2456-1751562133985.pdf
│     │  └─ assignment-e0e685f0-8914-4a6d-8762-4a24e53a0d97-1751563601696.pdf
│     └─ submissions
└─ start-server.js

```
```
LabSyncPro
├─ README.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  └─ Pagination.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  ├─ Groups.tsx.backup
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  │  ├─ Submissions.css
│  │  │  │  └─ Submissions.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_default_groups.sql
│  │  └─ add_schedule_files_and_fix_classes.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ package-lock.json
├─ package.json
├─ restart-system.sh
├─ restart.sh
├─ server
│  ├─ .env
│  ├─ .env.example
│  ├─ config
│  │  └─ database.js
│  ├─ index.js
│  ├─ middleware
│  │  ├─ auth.js
│  │  └─ studentRestriction.js
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ assignment-distributions.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ fileUploads.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ schedules.js
│  │  ├─ submissions.js
│  │  └─ users.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  └─ uploads
│     ├─ assignments
│     │  ├─ assignment-1751714395696-79999933.pdf
│     │  ├─ assignment-1751714405808-646905828.pdf
│     │  ├─ assignment-1751717545648-498525459.pdf
│     │  ├─ assignment-1751718571430-12590940.pdf
│     │  ├─ assignment-1751718941590-865909909.pdf
│     │  ├─ assignment-1751758813376-953154529.pdf
│     │  ├─ assignment-692f0f6a-c5d0-4255-b0de-fda379f19d3b-1751563416566.pdf
│     │  ├─ assignment-70683981-d604-4c70-9502-0532c7653bd7-1751690996898.pdf
│     │  ├─ assignment-70dd4815-b0b0-4b89-9964-e9e0b8a6a96d-1751560096800.pdf
│     │  ├─ assignment-8c0243c6-02a1-454e-beee-004b01070b4c-1751560153421.pdf
│     │  ├─ assignment-c5c44312-d273-4fc8-9b61-54f19c7c2456-1751562133985.pdf
│     │  └─ assignment-e0e685f0-8914-4a6d-8762-4a24e53a0d97-1751563601696.pdf
│     └─ submissions
└─ start-server.js

```
```
LabSyncPro
├─ README.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ cleanup-submissions.js
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ SimpleWebmail.tsx
│  │  │  ├─ admin
│  │  │  │  ├─ AssignmentSubmissions.css
│  │  │  │  ├─ AssignmentSubmissions.tsx
│  │  │  │  ├─ DataExport.css
│  │  │  │  ├─ DataExport.tsx
│  │  │  │  ├─ DataImport.css
│  │  │  │  ├─ DataImport.tsx
│  │  │  │  └─ PasswordResetRequests.tsx
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ PasswordReset.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ ExportButton.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  ├─ Pagination.tsx
│  │  │  │  ├─ PasswordInput.css
│  │  │  │  └─ PasswordInput.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ GradeAnalytics.css
│  │  │  │  ├─ GradeAnalytics.tsx
│  │  │  │  ├─ GradeScaleModal.css
│  │  │  │  ├─ GradeScaleModal.tsx
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ AssignmentGradingModal.css
│  │  │  │  ├─ AssignmentGradingModal.tsx
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  ├─ Groups.tsx.backup
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ DatabaseSchemaModal.css
│  │  │  │  ├─ DatabaseSchemaModal.tsx
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  ├─ timetable
│  │  │  │  ├─ Timetable.css
│  │  │  │  └─ Timetable.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_default_groups.sql
│  │  └─ add_schedule_files_and_fix_classes.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ docker-compose.mail.yml
├─ docker-data
│  ├─ dms
│  │  ├─ config
│  │  ├─ mail-data
│  │  ├─ mail-logs
│  │  └─ mail-state
│  ├─ mysql
│  └─ roundcube
│     ├─ config
│     └─ www
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ CSV_Export_System.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ install-simple-mailserver.sh
├─ manage-mail-users.sh
├─ manage-simple-mail.sh
├─ package-lock.json
├─ package.json
├─ restart-system.sh
├─ restart.sh
├─ server
│  ├─ .env
│  ├─ .env.example
│  ├─ cleanup-submissions.js
│  ├─ config
│  │  └─ database.js
│  ├─ create-grade-scale.js
│  ├─ index.js
│  ├─ mail-storage
│  │  ├─ 0baa2fd8-cd21-4027-9534-1709718a0050
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  ├─ sent
│  │  │  │  ├─ 04ab6a92-903a-44fa-861b-ae808aa1af2d.json
│  │  │  │  └─ 191add74-5fec-4db5-95c8-6617266d8a8b.json
│  │  │  └─ trash
│  │  ├─ 1fb8deef-14c8-4a19-ba28-551320883c08
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 65989d90-1316-4536-af24-3f4147bb1b2c.json
│  │  │  │  └─ d4e3e043-2266-47bd-8768-26203ae89ec9.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 48b3f970-ac43-4fcb-bf72-fc6775ca8239
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ cd5d5211-bb51-41a0-bc60-ca8418ad4ef8.json
│  │  │  │  └─ efc49288-5b10-4f1b-8acd-a6cae19bd814.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 682327aa-80a3-4be4-afbd-2055f23745ca
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 1427a52f-e31c-4e42-a1f8-1af80930e781.json
│  │  │  │  └─ f3a164bd-9a2a-4aaf-b9ff-299721e682df.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 7fb620cb-47ad-473d-a810-08814fd296b0
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 01e37f1f-0881-4652-ae6d-27f813a7cbe2.json
│  │  │  │  ├─ 6543332c-5978-46ce-b31f-7a96b74306d8.json
│  │  │  │  ├─ 844003a1-f59f-4ac6-b8ec-30e055b78c9b.json
│  │  │  │  └─ c25f993f-6a68-4807-b330-30e7cfd29833.json
│  │  │  ├─ sent
│  │  │  │  ├─ 0e57c76b-4907-4bb5-8f32-ef362a15f149.json
│  │  │  │  ├─ 10f7ea0f-fb51-4eb4-93eb-b4d83f9ba80b.json
│  │  │  │  └─ f8f20077-bb7d-490e-9267-deb1b56108d5.json
│  │  │  └─ trash
│  │  ├─ 89e7ab2a-2441-4165-a5e1-b0de05aefb73
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 64f64cb5-595f-4d77-b2e1-a36974161e14.json
│  │  │  │  ├─ 66ed4442-11a9-4cc7-a51a-db9f852d094d.json
│  │  │  │  ├─ b90a8958-1593-43d2-9317-bcec7b665f82.json
│  │  │  │  └─ f246190c-f49d-42f2-aee2-8eefb6ac89c9.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  └─ a506f7df-b841-4947-afdb-b6146fd76e5d
│  │     ├─ drafts
│  │     ├─ inbox
│  │     │  └─ 3f0968ef-ce63-4a49-a63c-651314dbb916.json
│  │     ├─ sent
│  │     └─ trash
│  ├─ middleware
│  │  ├─ auth.js
│  │  └─ studentRestriction.js
│  ├─ migrations
│  │  └─ add_password_reset_requests_table.sql
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ templates
│  │     ├─ computers_import_template.csv
│  │     ├─ instructors_import_template.csv
│  │     └─ students_import_template.csv
│  ├─ routes
│  │  ├─ admin.js
│  │  ├─ assignment-distributions.js
│  │  ├─ assignment-grades.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ export.js
│  │  ├─ fileUploads.js
│  │  ├─ grade-scales.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ import.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ passwordResetRequests.js
│  │  ├─ schedules.js
│  │  ├─ submissions.js
│  │  ├─ timetable.js
│  │  ├─ users.js
│  │  └─ webmail.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ add-timetable-tables.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  ├─ services
│  │  ├─ emailService.js
│  │  └─ mailboxService.js
│  └─ uploads
│     ├─ assignment-submissions
│     │  ├─ file-1751898149788-374516673.pdf
│     │  ├─ file-1751898175861-291660062.pdf
│     │  └─ file-1751898191195-381217534.pdf
│     ├─ assignments
│     │  ├─ assignment-1751714395696-79999933.pdf
│     │  ├─ assignment-1751714405808-646905828.pdf
│     │  ├─ assignment-1751717545648-498525459.pdf
│     │  ├─ assignment-1751718571430-12590940.pdf
│     │  ├─ assignment-1751718941590-865909909.pdf
│     │  ├─ assignment-1751758813376-953154529.pdf
│     │  ├─ assignment-692f0f6a-c5d0-4255-b0de-fda379f19d3b-1751563416566.pdf
│     │  ├─ assignment-70683981-d604-4c70-9502-0532c7653bd7-1751690996898.pdf
│     │  ├─ assignment-70dd4815-b0b0-4b89-9964-e9e0b8a6a96d-1751560096800.pdf
│     │  ├─ assignment-8c0243c6-02a1-454e-beee-004b01070b4c-1751560153421.pdf
│     │  ├─ assignment-c5c44312-d273-4fc8-9b61-54f19c7c2456-1751562133985.pdf
│     │  ├─ assignment-e0e685f0-8914-4a6d-8762-4a24e53a0d97-1751563601696.pdf
│     │  ├─ output-test.txt
│     │  └─ response-file.pdf
│     ├─ imports
│     └─ submissions
├─ setup-mailserver.sh
├─ start-server.js
└─ templates
   ├─ computers_import_template.csv
   ├─ instructors_import_template.csv
   └─ students_import_template.csv

```
```
LabSyncPro
├─ README.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ cleanup-submissions.js
├─ client
│  ├─ .env
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ SimpleWebmail.tsx
│  │  │  ├─ admin
│  │  │  │  ├─ AssignmentSubmissions.css
│  │  │  │  ├─ AssignmentSubmissions.tsx
│  │  │  │  ├─ DataExport.css
│  │  │  │  ├─ DataExport.tsx
│  │  │  │  ├─ DataImport.css
│  │  │  │  ├─ DataImport.tsx
│  │  │  │  └─ PasswordResetRequests.tsx
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ PasswordReset.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ ExportButton.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  ├─ Pagination.tsx
│  │  │  │  ├─ PasswordInput.css
│  │  │  │  └─ PasswordInput.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ GradeAnalytics.css
│  │  │  │  ├─ GradeAnalytics.tsx
│  │  │  │  ├─ GradeScaleModal.css
│  │  │  │  ├─ GradeScaleModal.tsx
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ AssignmentGradingModal.css
│  │  │  │  ├─ AssignmentGradingModal.tsx
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  ├─ Groups.tsx.backup
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Layout.css
│  │  │  │  └─ Layout.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ DatabaseSchemaModal.css
│  │  │  │  ├─ DatabaseSchemaModal.tsx
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  ├─ timetable
│  │  │  │  ├─ Timetable.css
│  │  │  │  └─ Timetable.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  └─ api.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_default_groups.sql
│  │  └─ add_schedule_files_and_fix_classes.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ docker-compose.mail.yml
├─ docker-data
│  ├─ dms
│  │  ├─ config
│  │  ├─ mail-data
│  │  ├─ mail-logs
│  │  └─ mail-state
│  ├─ mysql
│  └─ roundcube
│     ├─ config
│     └─ www
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ CSV_Export_System.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ install-simple-mailserver.sh
├─ manage-mail-users.sh
├─ manage-simple-mail.sh
├─ package-lock.json
├─ package.json
├─ restart-system.sh
├─ restart.sh
├─ server
│  ├─ .env
│  ├─ .env.example
│  ├─ cleanup-submissions.js
│  ├─ config
│  │  └─ database.js
│  ├─ create-grade-scale.js
│  ├─ index.js
│  ├─ mail-storage
│  │  ├─ 0baa2fd8-cd21-4027-9534-1709718a0050
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  ├─ sent
│  │  │  │  ├─ 04ab6a92-903a-44fa-861b-ae808aa1af2d.json
│  │  │  │  └─ 191add74-5fec-4db5-95c8-6617266d8a8b.json
│  │  │  └─ trash
│  │  ├─ 1fb8deef-14c8-4a19-ba28-551320883c08
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 65989d90-1316-4536-af24-3f4147bb1b2c.json
│  │  │  │  └─ d4e3e043-2266-47bd-8768-26203ae89ec9.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 48b3f970-ac43-4fcb-bf72-fc6775ca8239
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ cd5d5211-bb51-41a0-bc60-ca8418ad4ef8.json
│  │  │  │  └─ efc49288-5b10-4f1b-8acd-a6cae19bd814.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 682327aa-80a3-4be4-afbd-2055f23745ca
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 1427a52f-e31c-4e42-a1f8-1af80930e781.json
│  │  │  │  └─ f3a164bd-9a2a-4aaf-b9ff-299721e682df.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 7fb620cb-47ad-473d-a810-08814fd296b0
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 01e37f1f-0881-4652-ae6d-27f813a7cbe2.json
│  │  │  │  ├─ 6543332c-5978-46ce-b31f-7a96b74306d8.json
│  │  │  │  ├─ 844003a1-f59f-4ac6-b8ec-30e055b78c9b.json
│  │  │  │  └─ c25f993f-6a68-4807-b330-30e7cfd29833.json
│  │  │  ├─ sent
│  │  │  │  ├─ 0e57c76b-4907-4bb5-8f32-ef362a15f149.json
│  │  │  │  ├─ 10f7ea0f-fb51-4eb4-93eb-b4d83f9ba80b.json
│  │  │  │  └─ f8f20077-bb7d-490e-9267-deb1b56108d5.json
│  │  │  └─ trash
│  │  ├─ 89e7ab2a-2441-4165-a5e1-b0de05aefb73
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 64f64cb5-595f-4d77-b2e1-a36974161e14.json
│  │  │  │  ├─ 66ed4442-11a9-4cc7-a51a-db9f852d094d.json
│  │  │  │  ├─ b90a8958-1593-43d2-9317-bcec7b665f82.json
│  │  │  │  └─ f246190c-f49d-42f2-aee2-8eefb6ac89c9.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  └─ a506f7df-b841-4947-afdb-b6146fd76e5d
│  │     ├─ drafts
│  │     ├─ inbox
│  │     │  └─ 3f0968ef-ce63-4a49-a63c-651314dbb916.json
│  │     ├─ sent
│  │     └─ trash
│  ├─ middleware
│  │  ├─ auth.js
│  │  └─ studentRestriction.js
│  ├─ migrations
│  │  └─ add_password_reset_requests_table.sql
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  └─ templates
│  │     ├─ computers_import_template.csv
│  │     ├─ instructors_import_template.csv
│  │     └─ students_import_template.csv
│  ├─ routes
│  │  ├─ admin.js
│  │  ├─ assignment-distributions.js
│  │  ├─ assignment-grades.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ export.js
│  │  ├─ fileUploads.js
│  │  ├─ grade-scales.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ import.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ passwordResetRequests.js
│  │  ├─ schedules.js
│  │  ├─ submissions.js
│  │  ├─ timetable.js
│  │  ├─ users.js
│  │  └─ webmail.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ add-timetable-tables.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  ├─ services
│  │  ├─ emailService.js
│  │  └─ mailboxService.js
│  └─ uploads
│     ├─ assignment-submissions
│     │  ├─ file-1751898149788-374516673.pdf
│     │  ├─ file-1751898175861-291660062.pdf
│     │  └─ file-1751898191195-381217534.pdf
│     ├─ assignments
│     │  ├─ assignment-1751714395696-79999933.pdf
│     │  ├─ assignment-1751714405808-646905828.pdf
│     │  ├─ assignment-1751717545648-498525459.pdf
│     │  ├─ assignment-1751718571430-12590940.pdf
│     │  ├─ assignment-1751718941590-865909909.pdf
│     │  ├─ assignment-1751758813376-953154529.pdf
│     │  ├─ assignment-692f0f6a-c5d0-4255-b0de-fda379f19d3b-1751563416566.pdf
│     │  ├─ assignment-70683981-d604-4c70-9502-0532c7653bd7-1751690996898.pdf
│     │  ├─ assignment-70dd4815-b0b0-4b89-9964-e9e0b8a6a96d-1751560096800.pdf
│     │  ├─ assignment-8c0243c6-02a1-454e-beee-004b01070b4c-1751560153421.pdf
│     │  ├─ assignment-c5c44312-d273-4fc8-9b61-54f19c7c2456-1751562133985.pdf
│     │  ├─ assignment-e0e685f0-8914-4a6d-8762-4a24e53a0d97-1751563601696.pdf
│     │  ├─ output-test.txt
│     │  └─ response-file.pdf
│     ├─ imports
│     └─ submissions
├─ setup-mailserver.sh
├─ start-server.js
└─ templates
   ├─ computers_import_template.csv
   ├─ instructors_import_template.csv
   └─ students_import_template.csv

```
```
LabSyncPro
├─ COMPUTER-INVENTORY-UPDATE-SUMMARY.md
├─ DEPLOYMENT.md
├─ DEPLOYMENT_CHECKLIST.md
├─ ENHANCEMENTS_SUMMARY.md
├─ QUICK_DEPLOY.md
├─ README-TESTING.md
├─ README.md
├─ TEST-RESULTS-SUMMARY.md
├─ Tasks_2025-07-03T15-27-32.md
├─ check-assignments.js
├─ check-data.js
├─ cleanup-submissions.js
├─ client
│  ├─ README.md
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.tsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ SimpleWebmail.tsx
│  │  │  ├─ admin
│  │  │  │  ├─ AssignmentSubmissions.css
│  │  │  │  ├─ AssignmentSubmissions.tsx
│  │  │  │  ├─ DataExport.css
│  │  │  │  ├─ DataExport.tsx
│  │  │  │  ├─ DataImport.css
│  │  │  │  ├─ DataImport.tsx
│  │  │  │  ├─ PasswordResetRequests.tsx
│  │  │  │  ├─ SystemAdmin.css
│  │  │  │  └─ SystemAdmin.tsx
│  │  │  ├─ assignments
│  │  │  │  ├─ AssignmentCreation.tsx
│  │  │  │  ├─ AssignmentManagement.tsx
│  │  │  │  ├─ Assignments.css
│  │  │  │  └─ Assignments.tsx
│  │  │  ├─ auth
│  │  │  │  ├─ Auth.css
│  │  │  │  ├─ Login.tsx
│  │  │  │  ├─ PasswordReset.tsx
│  │  │  │  ├─ Register.tsx
│  │  │  │  └─ RoleProtectedRoute.tsx
│  │  │  ├─ capacity
│  │  │  │  ├─ CapacityPlanning.css
│  │  │  │  └─ CapacityPlanning.tsx
│  │  │  ├─ common
│  │  │  │  ├─ ConfirmationDialog.css
│  │  │  │  ├─ ConfirmationDialog.tsx
│  │  │  │  ├─ ExportButton.tsx
│  │  │  │  ├─ LabSyncProLogo.css
│  │  │  │  ├─ LabSyncProLogo.tsx
│  │  │  │  ├─ LoadingSpinner.css
│  │  │  │  ├─ LoadingSpinner.tsx
│  │  │  │  ├─ NotificationContainer.css
│  │  │  │  ├─ NotificationContainer.tsx
│  │  │  │  ├─ Pagination.css
│  │  │  │  ├─ Pagination.tsx
│  │  │  │  ├─ PasswordInput.css
│  │  │  │  └─ PasswordInput.tsx
│  │  │  ├─ dashboard
│  │  │  │  ├─ Dashboard.css
│  │  │  │  └─ Dashboard.tsx
│  │  │  ├─ debug
│  │  │  │  └─ ApiTest.tsx
│  │  │  ├─ grades
│  │  │  │  ├─ GradeAnalytics.css
│  │  │  │  ├─ GradeAnalytics.tsx
│  │  │  │  ├─ GradeScaleModal.css
│  │  │  │  ├─ GradeScaleModal.tsx
│  │  │  │  ├─ Grades.css
│  │  │  │  ├─ Grades.tsx
│  │  │  │  └─ GradesRouter.tsx
│  │  │  ├─ grading
│  │  │  │  ├─ AssignmentGradingModal.css
│  │  │  │  ├─ AssignmentGradingModal.tsx
│  │  │  │  ├─ GradingModal.css
│  │  │  │  └─ GradingModal.tsx
│  │  │  ├─ groups
│  │  │  │  ├─ Groups.css
│  │  │  │  ├─ Groups.tsx
│  │  │  │  └─ GroupsRouter.tsx
│  │  │  ├─ inventory
│  │  │  │  ├─ ComputerInventory.css
│  │  │  │  └─ ComputerInventory.tsx
│  │  │  ├─ labs
│  │  │  │  ├─ Labs.css
│  │  │  │  └─ Labs.tsx
│  │  │  ├─ monitoring
│  │  │  │  └─ KeepAlive.tsx
│  │  │  ├─ profile
│  │  │  │  ├─ DatabaseSchemaModal.css
│  │  │  │  ├─ DatabaseSchemaModal.tsx
│  │  │  │  ├─ Profile.css
│  │  │  │  └─ Profile.tsx
│  │  │  ├─ schedules
│  │  │  │  ├─ Schedules.css
│  │  │  │  └─ Schedules.tsx
│  │  │  ├─ student
│  │  │  │  ├─ StudentDashboard.css
│  │  │  │  ├─ StudentDashboard.tsx
│  │  │  │  ├─ StudentGrades.css
│  │  │  │  ├─ StudentGrades.tsx
│  │  │  │  ├─ StudentGroups.css
│  │  │  │  ├─ StudentGroups.tsx
│  │  │  │  ├─ StudentSubmissions.css
│  │  │  │  └─ StudentSubmissions.tsx
│  │  │  ├─ submissions
│  │  │  ├─ timetable
│  │  │  │  ├─ ComprehensiveTimetable.css
│  │  │  │  ├─ ComprehensiveTimetable.tsx
│  │  │  │  ├─ PeriodConfigurationModal.css
│  │  │  │  ├─ PeriodConfigurationModal.tsx
│  │  │  │  ├─ PeriodTimeManager.tsx
│  │  │  │  ├─ ScheduleModal.tsx
│  │  │  │  ├─ Timetable.css
│  │  │  │  ├─ Timetable.tsx
│  │  │  │  ├─ TimetableCalendarView.tsx
│  │  │  │  ├─ TimetableExport.tsx
│  │  │  │  ├─ TimetableVersionManager.tsx
│  │  │  │  ├─ TimetableWeeklyView.tsx
│  │  │  │  └─ WeeklyClassScheduleModal.tsx
│  │  │  └─ users
│  │  │     ├─ Users.css
│  │  │     └─ Users.tsx
│  │  ├─ config
│  │  ├─ contexts
│  │  │  ├─ AuthContext.tsx
│  │  │  └─ NotificationContext.tsx
│  │  ├─ hooks
│  │  │  └─ useConfirmation.tsx
│  │  ├─ index.css
│  │  ├─ main.tsx
│  │  ├─ services
│  │  │  ├─ api.ts
│  │  │  └─ timetableService.ts
│  │  ├─ test
│  │  │  ├─ AuthContext.test.tsx
│  │  │  ├─ Grades.test.tsx
│  │  │  ├─ Labs.test.tsx
│  │  │  ├─ api.test.ts
│  │  │  └─ setup.ts
│  │  ├─ types
│  │  │  └─ timetable.ts
│  │  └─ vite-env.d.ts
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  └─ vitest.config.ts
├─ database
│  ├─ add_deadline_field.sql
│  ├─ comprehensive_seed.sql
│  ├─ init.sql
│  ├─ migrations
│  │  ├─ add_audit_logging.sql
│  │  ├─ add_default_groups.sql
│  │  ├─ add_email_accounts.sql
│  │  ├─ add_schedule_files_and_fix_classes.sql
│  │  ├─ consolidate_schema.sql
│  │  └─ create_timetable_system.sql
│  ├─ populate_data.js
│  ├─ schema.sql
│  ├─ scripts
│  │  └─ populate_default_groups.js
│  ├─ seed.sql
│  └─ setup.js
├─ debug-db.js
├─ docker-compose.mail.yml
├─ docker-data
│  ├─ dms
│  │  ├─ config
│  │  ├─ mail-data
│  │  └─ mail-state
│  ├─ mysql
│  └─ roundcube
│     ├─ config
│     └─ www
├─ docs
│  ├─ API_DOCUMENTATION.md
│  ├─ CSV_Export_System.md
│  ├─ DEPLOYMENT_GUIDE.md
│  ├─ TESTING_REPORT.md
│  └─ USER_GUIDE.md
├─ fix-all-routes.js
├─ fix-database.js
├─ fix-users.sql
├─ github-setup.sh
├─ inspect-supabase-schema.js
├─ install-simple-mailserver.sh
├─ manage-mail-users.sh
├─ manage-simple-mail.sh
├─ migrate-postgresql-to-supabase.js
├─ migration-setup.md
├─ monitoring
│  └─ keep-alive.js
├─ package-lock.json
├─ package.json
├─ render.yaml
├─ restart-system.sh
├─ restart.sh
├─ scripts
│  └─ setup-mail-server.sh
├─ server
│  ├─ cleanup-submissions.js
│  ├─ config
│  │  ├─ database.js
│  │  └─ supabase.js
│  ├─ create-grade-scale.js
│  ├─ fix-all-routes.js
│  ├─ fix-crud-operations.js
│  ├─ fix-database.js
│  ├─ generated-supabase-inserts.sql
│  ├─ index.js
│  ├─ jest.config.js
│  ├─ mail-storage
│  │  ├─ 0baa2fd8-cd21-4027-9534-1709718a0050
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  ├─ sent
│  │  │  │  ├─ 04ab6a92-903a-44fa-861b-ae808aa1af2d.json
│  │  │  │  └─ 191add74-5fec-4db5-95c8-6617266d8a8b.json
│  │  │  └─ trash
│  │  ├─ 1fb8deef-14c8-4a19-ba28-551320883c08
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 65989d90-1316-4536-af24-3f4147bb1b2c.json
│  │  │  │  └─ d4e3e043-2266-47bd-8768-26203ae89ec9.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 38588c11-a71d-4730-8278-c2efb1cb4436
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 48b3f970-ac43-4fcb-bf72-fc6775ca8239
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ cd5d5211-bb51-41a0-bc60-ca8418ad4ef8.json
│  │  │  │  └─ efc49288-5b10-4f1b-8acd-a6cae19bd814.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 682327aa-80a3-4be4-afbd-2055f23745ca
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 1427a52f-e31c-4e42-a1f8-1af80930e781.json
│  │  │  │  └─ f3a164bd-9a2a-4aaf-b9ff-299721e682df.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ 7fb620cb-47ad-473d-a810-08814fd296b0
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 01e37f1f-0881-4652-ae6d-27f813a7cbe2.json
│  │  │  │  ├─ 6543332c-5978-46ce-b31f-7a96b74306d8.json
│  │  │  │  ├─ 844003a1-f59f-4ac6-b8ec-30e055b78c9b.json
│  │  │  │  └─ c25f993f-6a68-4807-b330-30e7cfd29833.json
│  │  │  ├─ sent
│  │  │  │  ├─ 0e57c76b-4907-4bb5-8f32-ef362a15f149.json
│  │  │  │  ├─ 10f7ea0f-fb51-4eb4-93eb-b4d83f9ba80b.json
│  │  │  │  └─ f8f20077-bb7d-490e-9267-deb1b56108d5.json
│  │  │  └─ trash
│  │  ├─ 89e7ab2a-2441-4165-a5e1-b0de05aefb73
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  ├─ 64f64cb5-595f-4d77-b2e1-a36974161e14.json
│  │  │  │  ├─ 66ed4442-11a9-4cc7-a51a-db9f852d094d.json
│  │  │  │  ├─ b90a8958-1593-43d2-9317-bcec7b665f82.json
│  │  │  │  └─ f246190c-f49d-42f2-aee2-8eefb6ac89c9.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ a506f7df-b841-4947-afdb-b6146fd76e5d
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  │  └─ 3f0968ef-ce63-4a49-a63c-651314dbb916.json
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ b25526ca-9872-4cb2-9625-ec76c36b3820
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  ├─ c57f03ad-4886-4bfb-aa64-e4fa1b4531c1
│  │  │  ├─ drafts
│  │  │  ├─ inbox
│  │  │  ├─ sent
│  │  │  └─ trash
│  │  └─ d816ab42-7623-4093-9de3-8e6a455f45b9
│  │     ├─ drafts
│  │     ├─ inbox
│  │     ├─ sent
│  │     └─ trash
│  ├─ middleware
│  │  ├─ auth.js
│  │  ├─ rateLimiter.js
│  │  └─ studentRestriction.js
│  ├─ migrations
│  │  └─ add_password_reset_requests_table.sql
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ -- Learning Management System Database S.sql
│  │  ├─ admin.js
│  │  ├─ assignment-grades.js
│  │  ├─ assignments.js
│  │  ├─ auth.js
│  │  ├─ capacity.js
│  │  ├─ classes-old.js
│  │  ├─ classes-supabase.js
│  │  ├─ classes.js
│  │  ├─ created-assignments.js
│  │  ├─ export.js
│  │  ├─ fileUploads.js
│  │  ├─ grade-scales.js
│  │  ├─ grades.js
│  │  ├─ groups.js
│  │  ├─ import.js
│  │  ├─ inventory.js
│  │  ├─ labs.js
│  │  ├─ passwordResetRequests.js
│  │  ├─ schedules.js
│  │  ├─ security.js
│  │  ├─ submissions.js
│  │  ├─ timetable-clean.js
│  │  ├─ timetable.js
│  │  ├─ users-old.js
│  │  ├─ users-supabase.js
│  │  ├─ users.js
│  │  └─ webmail.js
│  ├─ run-tests.js
│  ├─ scripts
│  │  ├─ add-created-assignments-table.js
│  │  ├─ add-missing-tables.js
│  │  ├─ add-timetable-tables.js
│  │  ├─ analyze-local-database.js
│  │  ├─ apply-full-schema.js
│  │  ├─ check-constraints.js
│  │  ├─ check-grades-table.js
│  │  ├─ check-group-g1.js
│  │  ├─ check-group-members-table.js
│  │  ├─ check-groups-table.js
│  │  ├─ check-schedule-constraints.js
│  │  ├─ check-schedules-table.js
│  │  ├─ check-submission-constraints.js
│  │  ├─ check-submissions-table.js
│  │  ├─ check-table-structure.js
│  │  ├─ check-tables.js
│  │  ├─ check-user-password.js
│  │  ├─ check-users.js
│  │  ├─ create-additional-classes.js
│  │  ├─ create-assignments.js
│  │  ├─ create-sample-assignments.js
│  │  ├─ enhance-computer-schema.js
│  │  ├─ fix-passwords.js
│  │  ├─ migrate.js
│  │  ├─ populate-data.js
│  │  ├─ setup-database.js
│  │  ├─ simple-data-check.js
│  │  ├─ test-database-connection.js
│  │  ├─ test-login.js
│  │  └─ verify-data.js
│  ├─ services
│  │  ├─ auditService.js
│  │  ├─ backupService.js
│  │  ├─ databaseService.js
│  │  ├─ emailService.js
│  │  ├─ fileUploadService.js
│  │  ├─ mailboxService.js
│  │  ├─ monitoringService.js
│  │  ├─ sessionService.js
│  │  ├─ timetableService.js
│  │  └─ twoFactorService.js
│  ├─ test-all-crud.js
│  ├─ test-edge-cases.js
│  ├─ test-server.js
│  ├─ tests
│  │  ├─ auth.test.js
│  │  ├─ capacity.test.js
│  │  ├─ classes.test.js
│  │  ├─ dashboard.test.js
│  │  ├─ globalSetup.js
│  │  ├─ globalTeardown.js
│  │  ├─ labs.test.js
│  │  ├─ setup.js
│  │  ├─ testDataSeeder.js
│  │  └─ unit
│  │     ├─ utils.test.js
│  │     └─ validation.test.js
│  ├─ update-computer-inventory.js
│  ├─ utils
│  │  └─ supabaseHelpers.js
│  └─ verify-computer-inventory.js
├─ setup-mailserver.sh
├─ setup-timetable.sql
├─ start-labsyncpro.sh
├─ start-server.js
├─ supabase-complete-data-inserts.sql
├─ supabase-data-inserts-fixed.sql
├─ supabase-data-inserts.sql
├─ supabase-schema.sql
├─ templates
│  ├─ computers_import_template.csv
│  ├─ instructors_import_template.csv
│  └─ students_import_template.csv
├─ test-all-crud.js
├─ test-frontend-profile.html
├─ test-timetable.js
└─ update-schema-for-text-submissions.sql

```