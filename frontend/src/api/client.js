import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartCitizenToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smartCitizenToken');
      localStorage.removeItem('smartCitizenUser');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const unwrap = (request) => request.then((res) => res.data);

export const endpoints = {
  // Auth / profile
  getProfile: () => unwrap(api.get('/auth/me')),
  updateProfile: (payload) => unwrap(api.patch('/auth/me', payload)),

  // Public
  publicSummary: () => unwrap(api.get('/complaints/public-summary')),

  // Complaints (citizen + staff + admin)
  complaintMeta: () => unwrap(api.get('/complaints/meta')),
  complaints: (params) => unwrap(api.get('/complaints', { params })),
  myComplaints: () => unwrap(api.get('/complaints/my')),
  complaint: (trackingNumber) => unwrap(api.get(`/complaints/${trackingNumber}`)),
  createComplaint: (payload) => {
    const isFormData = payload instanceof FormData;
    return unwrap(api.post('/complaints', payload, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined));
  },
  updateComplaintStatus: (trackingNumber, payload) => unwrap(api.patch(`/complaints/${trackingNumber}/status`, payload)),
  escalateComplaint: (trackingNumber, payload) => unwrap(api.post(`/complaints/${trackingNumber}/escalate`, payload)),
  rateComplaint: (trackingNumber, payload) => unwrap(api.post(`/complaints/${trackingNumber}/rate`, payload)),
  complaintReports: () => unwrap(api.get('/complaints/reports')),
  complaintNotifications: () => unwrap(api.get('/complaints/notifications')),
  complaintAuditLogs: () => unwrap(api.get('/complaints/audit-logs')),
  createRoutingRule: (payload) => unwrap(api.post('/complaints/routing-rules', payload)),
  updateRoutingRule: (id, payload) => unwrap(api.patch(`/complaints/routing-rules/${id}`, payload)),
  createComplaintCategory: (payload) => unwrap(api.post('/complaints/categories', payload)),
  readNotification: (id) => unwrap(api.patch(`/complaints/notifications/${id}/read`)),
  unreadNotificationCount: () => unwrap(api.get('/complaints/notifications/unread-count')),

  // Admin: users
  users: () => unwrap(api.get('/admin/users')),
  createUser: (payload) => unwrap(api.post('/admin/users', payload)),
  updateUser: (id, payload) => unwrap(api.patch(`/admin/users/${id}`, payload)),
  deleteUser: (id) => unwrap(api.delete(`/admin/users/${id}`))
};
