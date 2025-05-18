import axios from 'axios';
import { CredentialResponse } from '@react-oauth/google';

// Use relative URLs since we're proxying through Nginx
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),
    
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
    
  loginWithGoogle: (response: CredentialResponse) =>
    api.post('/auth/google', { credential: response.credential }),
    
  logout: () => api.post('/auth/logout'),
  
  checkAuth: () => api.get('/auth/me'),
};

export const detectionAPI = {
  detectPlate: (formData: FormData) =>
    api.post('/detect', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getHistory: () => api.get('/detection/history'),
  getDetectionById: (id: string) => api.get(`/detection/${id}`),
};

export default api;