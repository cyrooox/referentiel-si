import axios from 'axios';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur : attache le token Keycloak à chaque requête
api.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated) {
      // Rafraîchit le token s'il expire dans moins de 30 secondes
      try {
        await keycloak.updateToken(30);
      } catch {
        keycloak.logout();
        return Promise.reject(new Error('Session expirée'));
      }
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur réponse : déconnecte si 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      keycloak.logout();
    }
    return Promise.reject(error);
  }
);

export default api;
