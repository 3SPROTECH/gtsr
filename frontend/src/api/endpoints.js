import { api } from './client';

// --- Auth ---
export const authApi = {
  login:  (email, password) => api.post('/auth/login', { email, password }).then(r => r.data),
  me:     () => api.get('/auth/me').then(r => r.data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }).then(r => r.data),
  changePassword: (oldPassword, newPassword) => api.post('/auth/change-password', { oldPassword, newPassword }).then(r => r.data),
  updateAvailability: (availability) => api.patch('/auth/me/availability', { availability }).then(r => r.data),
};

// --- Tickets ---
export const ticketsApi = {
  list: (params) => api.get('/tickets', { params }).then(r => r.data),
  get:  (id) => api.get(`/tickets/${id}`).then(r => r.data),
  create: (data) => api.post('/tickets', data).then(r => r.data),
  update: (id, data) => api.patch(`/tickets/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/tickets/${id}`).then(r => r.data),
  // Pièces jointes
  listAttachments: (id) => api.get(`/tickets/${id}/attachments`).then(r => r.data),
  uploadAttachments: (id, files) => {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return api.post(`/tickets/${id}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  downloadAttachmentUrl: (id, attId) => `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/tickets/${id}/attachments/${attId}`,
  removeAttachment: (id, attId) => api.delete(`/tickets/${id}/attachments/${attId}`).then(r => r.data),
  changeStatus: (id, status, resolutionNote) =>
    api.post(`/tickets/${id}/status`, { status, resolutionNote }).then(r => r.data),
  assign: (id, assigneeId) => api.post(`/tickets/${id}/assign`, { assigneeId }).then(r => r.data),
  escalate: (id, toLevel, reason) => api.post(`/tickets/${id}/escalate`, { toLevel, reason }).then(r => r.data),
  addComment: (id, body, isInternal=false) => api.post(`/tickets/${id}/comments`, { body, isInternal }).then(r => r.data),
  userMarkResolved: (id, note) => api.post(`/tickets/${id}/user-resolve`, { note }).then(r => r.data),
  techDeclare: (id, resolution, note) => api.post(`/tickets/${id}/tech-declare`, { resolution, note }).then(r => r.data),
  userConfirm: (id, confirmation, note) => api.post(`/tickets/${id}/user-confirm`, { confirmation, note }).then(r => r.data),
  reopen: (id, reason) => api.post(`/tickets/${id}/reopen`, { reason }).then(r => r.data),
  cancel: (id, reason) => api.post(`/tickets/${id}/cancel`, { reason }).then(r => r.data),
  createComplaint: (id, description, images) => {
    const fd = new FormData();
    fd.append('description', description);
    for (const img of (images || [])) fd.append('images', img);
    return api.post(`/tickets/${id}/complaints`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  submitSatisfaction: (id, rating, comment) => api.post(`/tickets/${id}/satisfaction`, { rating, comment }).then(r => r.data),
  allowedTransitions: (status) => api.get(`/tickets/transitions/${status}`).then(r => r.data),
};

// --- Admin (users, agencies, categories) ---
export const adminApi = {
  users: {
    list: (params) => api.get('/admin/users', { params }).then(r => r.data),
    get: (id) => api.get(`/admin/users/${id}`).then(r => r.data),
    create: (d) => api.post('/admin/users', d).then(r => r.data),
    update: (id, d) => api.patch(`/admin/users/${id}`, d).then(r => r.data),
    remove: (id) => api.delete(`/admin/users/${id}`).then(r => r.data),
    onlineCount: () => api.get('/admin/users/online-count').then(r => r.data),
  },
  agencies: {
    list: () => api.get('/admin/agencies').then(r => r.data),
    get: (id) => api.get(`/admin/agencies/${id}`).then(r => r.data),
    create: (d) => api.post('/admin/agencies', d).then(r => r.data),
    update: (id, d) => api.patch(`/admin/agencies/${id}`, d).then(r => r.data),
    remove: (id) => api.delete(`/admin/agencies/${id}`).then(r => r.data),
  },
  categories: {
    list: () => api.get('/admin/categories').then(r => r.data),
    create: (d) => api.post('/admin/categories', d).then(r => r.data),
    update: (id, d) => api.patch(`/admin/categories/${id}`, d).then(r => r.data),
    remove: (id) => api.delete(`/admin/categories/${id}`).then(r => r.data),
  },
};

// --- Notifications ---
export const notificationsApi = {
  list: (unread = false) => api.get('/notifications', { params: { unread: unread ? '1' : '0' } }).then(r => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => api.post('/notifications/read-all').then(r => r.data),
};

// --- Complaints (réclamations) ---
export const complaintsApi = {
  list: (params) => api.get('/complaints', { params }).then(r => r.data),
  get:  (id) => api.get(`/complaints/${id}`).then(r => r.data),
  markReviewed: (id, reviewNote) => api.post(`/complaints/${id}/review`, { reviewNote }).then(r => r.data),
  forwardToTech: (id, technicianId, note) => api.post(`/complaints/${id}/forward`, { technicianId, note }).then(r => r.data),
  imageUrl: (complaintId, imageId) => `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/complaints/${complaintId}/images/${imageId}`,
};

// --- Reports ---
export const reportsApi = {
  dashboard: (params) => api.get('/reports/dashboard', { params }).then(r => r.data),
  myDashboard: () => api.get('/reports/me/dashboard').then(r => r.data),
  topCategories: () => api.get('/reports/top-categories').then(r => r.data),
  techWorkload: () => api.get('/reports/tech-workload').then(r => r.data),
};

// --- Rapports d'intervention (Technicien -> rapport par ticket, obligatoire à la clôture) ---
export const interventionReportsApi = {
  list: (params) => api.get('/intervention-reports', { params }).then(r => r.data),
  get: (id) => api.get(`/intervention-reports/${id}`).then(r => r.data),
  getByTicket: (ticketId) => api.get(`/intervention-reports/by-ticket/${ticketId}`).then(r => r.data),
  create: (ticketId, description, files) => {
    const fd = new FormData();
    fd.append('description', description);
    for (const f of (files || [])) fd.append('files', f);
    return api.post(`/intervention-reports/ticket/${ticketId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  openFile: async (reportId, fileId) => {
    const r = await api.get(`/intervention-reports/${reportId}/files/${fileId}`, { responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
