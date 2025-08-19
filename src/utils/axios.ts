import axios, { AxiosError, AxiosRequestConfig } from 'axios';

const apiBaseURL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3010';

const axiosServices = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true // mantém cookies p/ refresh
  // ❌ remova xsrfCookieName/xsrfHeaderName – não usamos double submit
});

// ---------- Helpers
const getLang = () => {
  try {
    const cfg = localStorage.getItem('mantis-react-ts-config');
    if (cfg) {
      const parsed = JSON.parse(cfg);
      return parsed?.i18n || import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';
    }
  } catch {}
  return import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';
};

const setAuthHeader = (token?: string | null) => {
  if (token) {
    axiosServices.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axiosServices.defaults.headers.common['Authorization'];
  }
};

// ---------- Request Interceptor
axiosServices.interceptors.request.use(
  async (config) => {
    const accessToken = localStorage.getItem('serviceToken');

    // 🔐 header p/ seu guard CSRF baseado em headers
    (config.headers as any)['X-Requested-With'] = 'XMLHttpRequest';

    if (accessToken) {
      (config.headers as any)['Authorization'] = `Bearer ${accessToken}`;
    }

    // Idioma (opcional)
    const lang = getLang();
    (config.headers as any)['Accept-Language'] = lang;
    (config.headers as any)['x-lang'] = lang;

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------- Refresh logic (single flight + queue)
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

const processQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
};

const refreshClient = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true
});

// ---------- Response Interceptor
axiosServices.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest: any = error.config || {};

    // Se não for 401, repasse o erro normalmente
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error.response?.data || error);
    }

    // Evita tentar refresh em /auth/login, /auth/refresh e /auth/logout
    const url = (originalRequest.url || '') as string;
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return Promise.reject(error.response?.data || error);
    }

    // Se já tentamos retry nesta request, não faça loop infinito
    if (originalRequest._retry) {
      // logout client-side
      localStorage.removeItem('serviceToken');
      setAuthHeader(null);
      try {
        await refreshClient.post('/auth/logout'); // melhor esforço
      } catch {}
      window.location.href = '/login';
      return Promise.reject(error.response?.data || error);
    }

    originalRequest._retry = true;

    // fila enquanto atualiza
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          resolve(axiosServices(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      // chama refresh (usa cookie httpOnly rt)
      const { data } = await refreshClient.post('/auth/refresh');
      const newToken = data?.serviceToken as string;
      if (!newToken) throw new Error('No serviceToken from refresh');

      // salva e reaplica token
      localStorage.setItem('serviceToken', newToken);
      setAuthHeader(newToken);

      processQueue(newToken);

      // refaz a request original com o novo token
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return axiosServices(originalRequest);
    } catch (refreshErr) {
      processQueue(null);
      // logout total
      localStorage.removeItem('serviceToken');
      setAuthHeader(null);
      try {
        await refreshClient.post('/auth/logout');
      } catch {}
      window.location.href = '/login';
      return Promise.reject((refreshErr as any)?.response?.data || refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// --------- Export helpers & fetchers
export default axiosServices;

export const fetcher = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.get(url, { ...config });
  return res.data;
};

export const fetcherPost = async (args: string | [string, AxiosRequestConfig]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await axiosServices.post(url, { ...(config as any) });
  return res.data;
};
