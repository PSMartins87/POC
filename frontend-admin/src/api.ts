import axios from 'axios';
const bffUrl = import.meta.env.VITE_BFF_URL || 'http://localhost:3002';

const api = axios.create({
  baseURL: bffUrl, 
  withCredentials: true, 
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Sessão inválida ou ausente. Redirecionando para o login...');
      window.location.href = `${bffUrl}/api/auth/login`;
    }
    return Promise.reject(error);
  }
);

export const securityService = {
  getSessions: () => api.get('/api/admin/security/sessions'),
  getDevices: () => api.get('/api/admin/security/devices'),
  revokeSession: (sessionId: string) => api.delete(`/api/admin/security/sessions/${sessionId}`),
  forgetDevice: (deviceId: string) => api.delete(`/api/admin/security/devices/${deviceId}`),
};

export default api;