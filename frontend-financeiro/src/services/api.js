import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      
      // 👇 SÓ REDIRECIONA SE NÃO FOR A ROTA '/me'
      if (!error.config.url.includes('/api/auth/me')) {
        console.warn("Sessão expirada. Redirecionando para autenticação segura...");
        window.location.href = `${error.config.baseURL}/api/auth/login`;
      }
      
    }
    return Promise.reject(error);
  },
);

export default api;
