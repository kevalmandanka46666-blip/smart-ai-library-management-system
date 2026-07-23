import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refToken = localStorage.getItem('refresh_token');
      if (refToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refToken });
          if (res.data && res.data.access_token) {
            localStorage.setItem('access_token', res.data.access_token);
            if (res.data.refresh_token) {
              localStorage.setItem('refresh_token', res.data.refresh_token);
            }
            originalRequest.headers['Authorization'] = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.clear();
          window.location.href = '/login?expired=true';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// ===== Auth API =====
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const refreshToken = async (refreshToken) => {
  const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
  return response.data;
};

// ===== Books API =====
export const getBooks = async (skip = 0, limit = 100) => {
  const response = await api.get(`/books?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const getBook = async (id) => {
  const response = await api.get(`/books/${id}`);
  return response.data;
};

export const createBook = async (data) => {
  const response = await api.post('/books', data);
  return response.data;
};

export const updateBook = async (id, data) => {
  const response = await api.put(`/books/${id}`, data);
  return response.data;
};

export const deleteBook = async (id) => {
  const response = await api.delete(`/books/${id}`);
  return response.data;
};

export const searchBooks = async (params) => {
  const response = await api.get('/books/search/', { params });
  return response.data;
};

export const filterBooks = async (isAvailable = true) => {
  const response = await api.get(`/books/filter/available/?is_available=${isAvailable}`);
  return response.data;
};

export const getBookStats = async () => {
  const response = await api.get('/books/stats/');
  return response.data;
};

// ===== Students API =====
export const getStudents = async (skip = 0, limit = 100) => {
  const response = await api.get(`/students?skip=${skip}&limit=${limit}`);
  return response.data;
};

export const getStudent = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const createStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

export const searchStudents = async (params) => {
  const response = await api.get('/students/search/', { params });
  return response.data;
};

export const getStudentStats = async () => {
  const response = await api.get('/students/stats/');
  return response.data;
};

export const bulkDeleteStudents = async (studentIds) => {
  const response = await api.post('/students/bulk-delete/', { student_ids: studentIds });
  return response.data;
};

export const exportStudentsCsvUrl = () => {
  const token = localStorage.getItem('access_token');
  return `http://localhost:8000/api/v1/students/export/csv?token=${token || ''}`;
};

export const importStudentsCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/students/import/csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ===== Forgot Password API =====
export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post('/auth/verify-otp', { email, otp });
  return response.data;
};

export const resetPassword = async (email, otp, password) => {
  const response = await api.post('/auth/reset-password', { email, otp, password });
  return response.data;
};

// ===== Borrows & Transactions API =====
export const issueBook = async (studentId, bookId) => {
  const response = await api.post('/borrows/issue', { student_id: studentId, book_id: bookId });
  return response.data;
};

export const returnBook = async (studentId, bookId) => {
  const response = await api.post('/borrows/return', { student_id: studentId, book_id: bookId });
  return response.data;
};

export const getTransactions = async (params) => {
  const response = await api.get('/borrows/transactions', { params });
  return response.data;
};

export const bulkReturnBooks = async (transactionIds) => {
  const response = await api.post('/borrows/bulk-return', { transaction_ids: transactionIds });
  return response.data;
};

export const getStudentBorrows = async (studentId) => {
  const response = await api.get(`/borrows/student/${studentId}`);
  return response.data;
};

export const getReportsStats = async () => {
  const response = await api.get('/borrows/reports');
  return response.data;
};

// ===== Books Production Extension APIs =====
export const browseBooks = async (params) => {
  const response = await api.get('/books/browse/', { params });
  return response.data;
};

export const getGenres = async () => {
  const response = await api.get('/books/genres/');
  return response.data;
};

export const bulkDeleteBooks = async (bookIds) => {
  const response = await api.post('/books/bulk-delete/', { book_ids: bookIds });
  return response.data;
};

export const exportBooksCsvUrl = () => {
  const token = localStorage.getItem('access_token');
  return `${API_BASE_URL}/books/export/csv?token=${token || ''}`;
};

export const importBooksCsv = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/books/import/csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// ===== Authors API =====
export const getAuthors = async (skip = 0, limit = 100, search = '', status = '') => {
  const params = { skip, limit };
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await api.get('/authors', { params });
  return response.data;
};

export const getAuthor = async (id) => {
  const response = await api.get(`/authors/${id}`);
  return response.data;
};

export const createAuthor = async (data) => {
  const response = await api.post('/authors', data);
  return response.data;
};

export const updateAuthor = async (id, data) => {
  const response = await api.put(`/authors/${id}`, data);
  return response.data;
};

export const deleteAuthor = async (id) => {
  const response = await api.delete(`/authors/${id}`);
  return response.data;
};

export const getAuthorStats = async () => {
  const response = await api.get('/authors/stats/');
  return response.data;
};

// ===== Categories API =====
export const getCategories = async (skip = 0, limit = 100, search = '', status = '') => {
  const params = { skip, limit };
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await api.get('/categories', { params });
  return response.data;
};

export const getCategory = async (id) => {
  const response = await api.get(`/categories/${id}`);
  return response.data;
};

export const createCategory = async (data) => {
  const response = await api.post('/categories', data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};

export const getCategoryStats = async () => {
  const response = await api.get('/categories/stats/');
  return response.data;
};

// ===== Reservations API =====
export const getActiveReservations = async () => {
  const response = await api.get('/reservations/active');
  return response.data;
};

export const reserveBook = async (bookId, studentId = null) => {
  const response = await api.post('/reservations/reserve', { book_id: bookId, student_id: studentId });
  return response.data;
};

export const cancelReservation = async (reservationId) => {
  const response = await api.post(`/reservations/cancel/${reservationId}`);
  return response.data;
};

// ===== Fines API =====
export const getFines = async (paid = false) => {
  const response = await api.get('/fines', { params: { paid } });
  return response.data;
};

export const payFine = async (fineId) => {
  const response = await api.post('/fines/pay', { fine_id: fineId });
  return response.data;
};

// ===== Notifications API =====
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.post(`/notifications/read/${id}`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

// ===== Analytics API =====
export const getDashboardAnalytics = async () => {
  const response = await api.get('/analytics/dashboard');
  return response.data;
};

export const getAnalyticsReports = async (granularity = 'monthly', period = 12) => {
  const response = await api.get('/analytics/reports', { params: { granularity, period } });
  return response.data;
};

// ===== Advanced Search API =====
export const searchBooksAdvanced = async (params) => {
  const response = await api.get('/search/books', { params });
  return response.data;
};

export const searchStudentsAdvanced = async (params) => {
  const response = await api.get('/search/students', { params });
  return response.data;
};

export const globalSearch = async (q, limit = 5) => {
  const response = await api.get('/search/global', { params: { q, limit } });
  return response.data;
};

// ===== Profile & Admin API =====
export const getMyProfile = async () => {
  const response = await api.get('/profile/me');
  return response.data;
};

export const updateMyProfile = async (payload) => {
  const response = await api.put('/profile/me', payload);
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await api.post('/profile/change-password', payload);
  return response.data;
};

export const getAdminPermissions = async () => {
  const response = await api.get('/admin/permissions');
  return response.data;
};

export const getAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createAdminUser = async (payload) => {
  const response = await api.post('/admin/users', payload);
  return response.data;
};

export const updateUserRolePermissions = async (userId, payload) => {
  const response = await api.put(`/admin/users/${userId}/role-permissions`, payload);
  return response.data;
};

export const getAuditLogs = async (page = 1, pageSize = 20) => {
  const response = await api.get('/admin/audit-logs', { params: { page, page_size: pageSize } });
  return response.data;
};

// ===== System Settings API =====
export const getSystemSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSystemSettings = async (payload) => {
  const response = await api.put('/settings', payload);
  return response.data;
};

export const uploadLogo = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const uploadFavicon = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/settings/favicon', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const exportDatabaseBackupUrl = () => {
  const baseURL = api.defaults.baseURL || '/api/v1';
  return `${baseURL}/settings/backup/export`;
};

export const restoreDatabaseBackup = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/settings/backup/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// ===== Audit Logs API =====
export const getAuditLogsAdvanced = async (params) => {
  const response = await api.get('/audit-logs', { params });
  return response.data;
};

export const exportAuditLogsCsvUrl = (params = {}) => {
  const baseURL = api.defaults.baseURL || '/api/v1';
  const query = new URLSearchParams(params).toString();
  return `${baseURL}/audit-logs/export/csv${query ? '?' + query : ''}`;
};

// ===== Backup & Restore API =====
export const createManualBackup = async () => {
  const response = await api.post('/backups/create');
  return response.data;
};

export const getBackupHistory = async () => {
  const response = await api.get('/backups/history');
  return response.data;
};

export const getBackupDownloadUrl = (backupId) => {
  const baseURL = api.defaults.baseURL || '/api/v1';
  return `${baseURL}/backups/${backupId}/download`;
};

export const restoreBackupById = async (backupId) => {
  const response = await api.post('/backups/restore', null, { params: { backup_id: backupId } });
  return response.data;
};

export const deleteBackup = async (backupId) => {
  const response = await api.delete(`/backups/${backupId}`);
  return response.data;
};

// ===== Email Service API =====
export const getSmtpSettings = async () => {
  const response = await api.get('/email/settings');
  return response.data;
};

export const updateSmtpSettings = async (payload) => {
  const response = await api.post('/email/settings', payload);
  return response.data;
};

export const sendTestEmail = async (recipient_email) => {
  const response = await api.post('/email/test', { recipient_email });
  return response.data;
};

export const triggerDueReminders = async () => {
  const response = await api.post('/email/remind-due');
  return response.data;
};

export const getEmailHistory = async (limit = 100, search = '') => {
  const params = { limit };
  if (search) params.search = search;
  const response = await api.get('/email/history', { params });
  return response.data;
};

export const resendEmail = async (logId) => {
  const response = await api.post(`/email/resend/${logId}`);
  return response.data;
};

export const sendCustomEmail = async (payload) => {
  const response = await api.post('/email/custom-send', payload);
  return response.data;
};

export const getEmailTemplates = async () => {
  const response = await api.get('/email/templates');
  return response.data;
};

// ===== SMS Service API =====
export const getSmsSettings = async () => {
  const response = await api.get('/sms/settings');
  return response.data;
};

export const updateSmsSettings = async (payload) => {
  const response = await api.post('/sms/settings', payload);
  return response.data;
};

export const sendTestSms = async (phone) => {
  const response = await api.post('/sms/test', { phone });
  return response.data;
};

export const triggerSmsDueReminders = async () => {
  const response = await api.post('/sms/remind-due');
  return response.data;
};

export const getSmsHistory = async (limit = 100, search = '') => {
  const params = { limit };
  if (search) params.search = search;
  const response = await api.get('/sms/history', { params });
  return response.data;
};

export const resendSms = async (logId) => {
  const response = await api.post(`/sms/resend/${logId}`);
  return response.data;
};

export const sendCustomSms = async (payload) => {
  const response = await api.post('/sms/custom-send', payload);
  return response.data;
};

export const getSmsTemplates = async () => {
  const response = await api.get('/sms/templates');
  return response.data;
};

export const sendOtp = async (phone) => {
  const response = await api.post('/sms/send-otp', { phone });
  return response.data;
};

export const verifyOtp = async (phone, code) => {
  const response = await api.post('/sms/verify-otp', { phone, code });
  return response.data;
};

// ===== Barcodes & QR API =====
export const getBarcodeImageUrl = (codeValue) => {
  const baseURL = api.defaults.baseURL || 'http://localhost:8000/api/v1';
  return `${baseURL}/barcodes/render/barcode/${encodeURIComponent(codeValue)}`;
};

export const getQrImageUrl = (codeValue) => {
  const baseURL = api.defaults.baseURL || 'http://localhost:8000/api/v1';
  return `${baseURL}/barcodes/render/qr/${encodeURIComponent(codeValue)}`;
};

export const searchBookByCode = async (code) => {
  const response = await api.get('/barcodes/search', { params: { code } });
  return response.data;
};

export const validateCode = async (codeType, value, excludeBookId = null) => {
  const response = await api.post('/barcodes/validate-code', {
    code_type: codeType,
    value: value,
    exclude_book_id: excludeBookId
  });
  return response.data;
};

export const bulkGenerateBarcodes = async (forceRegenerate = false) => {
  const response = await api.post('/barcodes/bulk-generate', { force_regenerate: forceRegenerate });
  return response.data;
};

export const scanIssueBook = async (scannedCode, studentId, dueDays = 14) => {
  const response = await api.post('/barcodes/scan-issue', {
    scanned_code: scannedCode,
    student_id: studentId,
    due_days: dueDays
  });
  return response.data;
};

export const scanReturnBook = async (scannedCode) => {
  const response = await api.post('/barcodes/scan-return', {
    scanned_code: scannedCode
  });
  return response.data;
};

// ===== Notification Service API =====
export const getNotificationSettings = async () => {
  const response = await api.get('/notifications/settings');
  return response.data;
};

export const updateNotificationSettings = async (payload) => {
  const response = await api.post('/notifications/settings', payload);
  return response.data;
};

export const createSystemNotification = async (payload) => {
  const response = await api.post('/notifications/create-system', payload);
  return response.data;
};

export default api;




