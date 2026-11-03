import { api } from './api';

export const authService = {
  login: (payload) => api.post('/auth/login', payload),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
};

export const employeeService = {
  list: (params) => api.get('/employees', { params }),
  get: (id) => api.get(`/employees/${id}`),
  create: (payload) => api.post('/employees', payload),
  update: (id, payload) => api.put(`/employees/${id}`, payload),
  remove: (id) => api.delete(`/employees/${id}`),
};

export const departmentService = {
  list: (params) => api.get('/departments', { params }),
  create: (payload) => api.post('/departments', payload),
  update: (id, payload) => api.put(`/departments/${id}`, payload),
  remove: (id) => api.delete(`/departments/${id}`),
};

export const attendanceService = {
  checkIn: () => api.post('/attendance/check-in'),
  checkOut: () => api.post('/attendance/check-out'),
  mine: (params) => api.get('/attendance/me', { params }),
  list: (params) => api.get('/attendance', { params }),
  stats: (params) => api.get('/attendance/stats', { params }),
  exportCsv: (params) => api.get('/attendance/export', { params, responseType: 'text' }),
};

export const leaveService = {
  apply: (payload) => api.post('/leaves', payload),
  mine: (params) => api.get('/leaves/me', { params }),
  list: (params) => api.get('/leaves', { params }),
  approve: (id, payload) => api.patch(`/leaves/${id}/approve`, payload),
  reject: (id, payload) => api.patch(`/leaves/${id}/reject`, payload),
  cancel: (id) => api.patch(`/leaves/${id}/cancel`),
};

export const dashboardService = {
  admin: () => api.get('/dashboard/admin'),
  employee: () => api.get('/dashboard/employee'),
};

export const notificationService = {
  list: (params) => api.get('/notifications', { params }),
  read: (id) => api.patch(`/notifications/${id}/read`),
  readAll: () => api.patch('/notifications/read-all'),
};

export const profileService = {
  get: () => api.get('/profile'),
  update: (payload) => api.put('/profile', payload),
  settings: () => api.get('/settings'),
};
