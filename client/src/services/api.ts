import axios from 'axios';

// API Base URL configuration with better fallback handling
const getApiBaseUrl = () => {
  console.log('🔍 Environment debug:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
    hostname: window.location.hostname,
    origin: window.location.origin
  });

  // Force the correct API URL for production
  if (window.location.hostname.includes('labsyncpro-frontend.onrender.com')) {
    console.log('🔧 Forcing correct API URL for production');
    return 'https://labsyncpro.onrender.com/api';
  }

  // Check if we have a specific API URL set
  if (import.meta.env.VITE_API_URL) {
    console.log('✅ Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // If we're in production and no API URL is set, try to construct it
  if (import.meta.env.PROD) {
    // Try to determine the backend URL based on current domain
    const currentDomain = window.location.hostname;
    console.log('🔍 Production mode, current domain:', currentDomain);

    if (currentDomain.includes('labsyncpro-frontend')) {
      console.log('✅ Using labsyncpro-frontend fallback');
      return 'https://labsyncpro.onrender.com/api';
    }
    if (currentDomain.includes('onrender.com')) {
      console.log('✅ Using onrender.com fallback');
      return 'https://labsyncpro.onrender.com/api';
    }
  }

  // Default fallback for development
  console.log('⚠️ Using development fallback');
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 Final API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  
  register: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    studentId?: string;
    role: 'student' | 'instructor' | 'admin';
  }) => api.post('/auth/register', userData),
  
  getProfile: () => api.get('/auth/profile'),
  
  updateProfile: (data: any) => api.put('/auth/profile', data),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),

  requestPasswordReset: (email: string, message?: string) =>
    api.post('/auth/request-password-reset', { email, message }),

  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),

  adminResetPassword: (data: { userId: string; newPassword: string }) =>
    api.post('/auth/admin-reset-password', data),
};

// Users API
export const usersAPI = {
  getUsers: (params?: any) => api.get('/users', { params }),
  getUserById: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  blockUser: (id: string, isActive: boolean) => api.put(`/users/${id}/block`, { isActive }),
};

// Labs API
export const labsAPI = {
  getLabs: () => api.get('/labs'),
  getLabById: (id: string) => api.get(`/labs/${id}`),
  checkAvailability: (labId: string, date: string, startTime: string, endTime: string) =>
    api.get(`/labs/${labId}/availability`, {
      params: { date, startTime, endTime }
    }),
};

// Classes API
export const classesAPI = {
  getClasses: (params?: any) => api.get('/classes', { params }),
  getClassById: (id: string) => api.get(`/classes/${id}`),
  createClass: (data: any) => api.post('/classes', data),
  updateClass: (id: string, data: any) => api.put(`/classes/${id}`, data),
  deleteClass: (id: string) => api.delete(`/classes/${id}`),
};

// Groups API
export const groupsAPI = {
  getGroups: (params?: any) => api.get('/groups', { params }),
  getGroupById: (id: string) => api.get(`/groups/${id}`),
  createGroup: (data: any) => api.post('/groups', data),
  updateGroup: (id: string, data: any) => api.put(`/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/groups/${id}`),
  addMember: (groupId: string, data: { userId: string; role?: string }) =>
    api.post(`/groups/${groupId}/members`, data),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
};

// Schedules API
export const schedulesAPI = {
  getSchedules: (params?: any) => api.get('/schedules', { params }),
  getScheduleById: (id: string) => api.get(`/schedules/${id}`),
  createSchedule: (data: any) => api.post('/schedules', data),
  updateScheduleStatus: (id: string, status: string) =>
    api.put(`/schedules/${id}/status`, { status }),
  deleteSchedule: (id: string) => api.delete(`/schedules/${id}`),
  createAssignments: (scheduleId: string, assignments: any[]) =>
    api.post(`/schedules/${scheduleId}/assignments`, { assignments }),
};

// Submissions API
export const submissionsAPI = {
  getSubmissions: (params?: any) => api.get('/submissions', { params }),
  getSubmissionById: (id: string) => api.get(`/submissions/${id}`),
  createSubmission: (data: FormData) =>
    api.post('/submissions', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateSubmission: (id: string, data: FormData) =>
    api.put(`/submissions/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteSubmission: (id: string) => api.delete(`/submissions/${id}`),
  downloadFile: (submissionId: string, filename: string) =>
    api.get(`/submissions/${submissionId}/files/${filename}`, {
      responseType: 'blob'
    }),
};

// Grades API
export const gradesAPI = {
  getGrades: (params?: any) => api.get('/grades', { params }),
  getGradeById: (id: string) => api.get(`/grades/${id}`),
  createOrUpdateGrade: (data: any) => api.post('/grades', data),
  updateGrade: (id: string, data: any) => api.put(`/grades/${id}`, data),
  deleteGrade: (id: string) => api.delete(`/grades/${id}`),
  getStatistics: (scheduleId: string) => api.get(`/grades/statistics/${scheduleId}`),
};

// Assignment Grades API
export const assignmentGradesAPI = {
  getGrades: (params?: any) => api.get('/assignment-grades', { params }),
  getGradeById: (id: string) => api.get(`/assignment-grades/${id}`),
  getGradeBySubmission: (submissionId: string) => api.get(`/assignment-grades/submission/${submissionId}`),
  createOrUpdateGrade: (data: any) => api.post('/assignment-grades', data),
  updateGrade: (id: string, data: any) => api.put(`/assignment-grades/${id}`, data),
  deleteGrade: (id: string) => api.delete(`/assignment-grades/${id}`),
  getAnalytics: (params?: any) => api.get('/assignment-grades/analytics', { params }),
};

// Created Assignments API
export const createdAssignmentsAPI = {
  getAssignments: (params?: any) => api.get('/assignments/created', { params }),
  getAssignmentById: (id: string) => api.get(`/assignments/created/${id}`),
  createAssignment: (data: FormData) => api.post('/assignments/created', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateAssignment: (id: string, data: FormData) => api.put(`/assignments/created/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAssignment: (id: string) => api.delete(`/assignments/created/${id}`),
  downloadAssignment: (id: string) => api.get(`/assignments/created/${id}/download`, {
    responseType: 'blob'
  }),
};

// Dashboard API
export const dashboardAPI = {
  getSystemStats: () => api.get('/groups/dashboard-stats'),
};

// Timetable API
export const timetableAPI = {
  // Configuration
  getConfig: () => api.get('/timetable/config'),
  updateConfig: (data: any) => api.put('/timetable/config', data),

  // Time slots
  getTimeSlots: () => api.get('/timetable/time-slots'),
  regenerateTimeSlots: () => api.post('/timetable/time-slots/regenerate'),

  // Weekly timetable
  getWeeklyTimetable: (params?: any) => api.get('/timetable/weekly', { params }),

  // Timetable entries
  createEntry: (data: any) => api.post('/timetable/entry', data),
  updateEntry: (id: string, data: any) => api.put(`/timetable/entry/${id}`, data),
  deleteEntry: (id: string) => api.delete(`/timetable/entry/${id}`),

  // Class schedule (for PDF)
  getClassSchedule: (classId: string, params?: any) =>
    api.get(`/timetable/class/${classId}/schedule`, { params }),
};

// Export both as default and named export for flexibility
export { api };
export default api;
