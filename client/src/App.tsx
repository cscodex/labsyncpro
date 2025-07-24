import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NotificationContainer from './components/common/NotificationContainer';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PasswordReset from './components/auth/PasswordReset';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import Layout from './components/layout/Layout';
import Labs from './components/labs/Labs';
import Timetable from './components/timetable/Timetable';
import ComprehensiveTimetable from './components/timetable/ComprehensiveTimetable';
import Assignments from './components/assignments/Assignments';

import AssignmentCreation from './components/assignments/AssignmentCreation';
import AssignmentManagement from './components/assignments/AssignmentManagement';

import StudentSubmissions from './components/student/StudentSubmissions';
import StudentGroups from './components/student/StudentGroups';
import GradesRouter from './components/grades/GradesRouter';
import GroupsRouter from './components/groups/GroupsRouter';
import Users from './components/users/Users';
import Profile from './components/profile/Profile';
import CapacityPlanning from './components/capacity/CapacityPlanning';
import DataImport from './components/admin/DataImport';
import DataExport from './components/admin/DataExport';
import PasswordResetRequests from './components/admin/PasswordResetRequests';
import AssignmentSubmissions from './components/admin/AssignmentSubmissions';
import SimpleWebmail from './components/SimpleWebmail';
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/password-reset"
        element={
          <PublicRoute>
            <PasswordReset />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Admin/Instructor Only Routes */}
        <Route path="labs" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Labs />
          </RoleProtectedRoute>
        } />
        <Route path="timetable" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor', 'student']}>
            <ComprehensiveTimetable userRole={user?.role || 'student'} userId={user?.id || ''} />
          </RoleProtectedRoute>
        } />
        <Route path="assignment-creation" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <AssignmentCreation />
          </RoleProtectedRoute>
        } />
        <Route path="assignment-management" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <AssignmentManagement />
          </RoleProtectedRoute>
        } />

        <Route path="capacity" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <CapacityPlanning />
          </RoleProtectedRoute>
        } />
        <Route path="users" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <Users />
          </RoleProtectedRoute>
        } />
        <Route path="data-import" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <DataImport />
          </RoleProtectedRoute>
        } />
        <Route path="data-export" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <DataExport />
          </RoleProtectedRoute>
        } />
        <Route path="password-reset-requests" element={
          <RoleProtectedRoute allowedRoles={['admin']}>
            <PasswordResetRequests />
          </RoleProtectedRoute>
        } />
        <Route path="assignment-submissions" element={
          <RoleProtectedRoute allowedRoles={['admin', 'instructor']}>
            <AssignmentSubmissions />
          </RoleProtectedRoute>
        } />

        {/* Student Only Routes */}
        <Route path="my-submissions" element={
          <RoleProtectedRoute allowedRoles={['student']}>
            <StudentSubmissions />
          </RoleProtectedRoute>
        } />

        {/* Shared Routes (role-specific components handled internally) */}
        <Route path="grades" element={<GradesRouter />} />
        <Route path="groups" element={<GroupsRouter />} />
        <Route path="webmail" element={<SimpleWebmail />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <NotificationContainer />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
