import axios, { AxiosError } from 'axios';

const getAPIUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  const hostname = window.location.hostname;

  // Se estivermos acessando por um IP (não localhost), mas o .env aponta para outro IP ou localhost
  // Vamos priorizar o IP que o usuário está usando no navegador agora.
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8080/api`;
  }

  // Fallback para o env ou rota relativa (proxy do Vite)
  return envUrl || '/api';
};

const API_URL = getAPIUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isPublicRoute = error.config?.url?.includes('/locais');
    
    if (error.response?.status === 401 && !isPublicRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('nomeCompleto');
      window.location.href = '/login';
    }

    const message = error.response?.data?.message || error.message;
    if (message && message !== 'Unauthorized') {
      console.error('API Error:', message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
