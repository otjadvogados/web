import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Helpers simples p/ token em memória/localStorage
const KEY = 'serviceToken';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = (t?: string) => (t ? localStorage.setItem(KEY, t) : null);
export const clearToken = () => localStorage.removeItem(KEY);

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL || 'http://localhost:22211',
  withCredentials: true // envia/recebe o cookie 'rt' nas chamadas ao /auth/refresh
});

// ---------- Helpers
const getLang = () => {
  try {
    const cfg = localStorage.getItem('otj-react-ts-config');
    if (cfg) {
      const parsed = JSON.parse(cfg);
      return parsed?.i18n || import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';
    }
  } catch {}
  return import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';
};

// helper para forçar re-login
const forceRelogin = () => {
  try { 
    clearToken(); 
  } catch {}
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Endpoints públicos (não autenticados) que NÃO devem tentar refresh nem redirecionar ao receber 401
const PUBLIC_401_NO_REDIR = [
  '/auth/verify',
  '/auth/unlock',
  '/auth/approve-device',
  '/auth/reject-device',
  '/auth/report-login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/token/check',
  '/auth/test-email-config',
  '/auth/clear-email-dedupe'
];

// mensagens que exigem re-login imediato
const RELOGIN_HINTS = [
  'sua sessão foi encerrada por um novo login', // PT
  'session was closed by a new login',          // EN (caso apareça)
  'token_version',                              // token version mismatch
  'revoked'                                     // refresh/access revogado
];

// ——— Request: injeta Bearer
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const at = getToken();
  if (at) config.headers.Authorization = `Bearer ${at}`;
  
  // 🔐 header p/ seu guard CSRF baseado em headers
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  
  // Idioma (opcional)
  const lang = getLang();
  config.headers['Accept-Language'] = lang;
  config.headers['x-lang'] = lang;
  
  return config;
});

// ——— Response: 401 => tenta /auth/refresh com X-Requested-With
let isRefreshing = false;
let queue: Array<(t?: string) => void> = [];
const flushQueue = (t?: string) => { queue.forEach(cb => cb(t)); queue = []; };

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const { response, config } = error;
    if (!response || !config) throw error;

    const url = String(config.url || '');
    const msg = String((response.data as any)?.message || '').toLowerCase();

    // 1) Se for endpoint público, NÃO tentar refresh nem redirecionar
    if (PUBLIC_401_NO_REDIR.some((p) => url.includes(p))) {
      throw error;
    }

    // 2) Só entrar na lógica de refresh se a request original tinha Bearer
    const hadAuthHeader = !!(config.headers as any)?.Authorization;

    if (response.status === 401) {
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');
      const mustForceRelogin = RELOGIN_HINTS.some((s) => msg.includes(s));

      // Se não havia Authorization (rota pública) ou é endpoint "auth" ou mensagem manda relogar -> não tente refresh
      if (!hadAuthHeader || isAuthEndpoint || mustForceRelogin) {
        // Para rotas públicas sem Authorization, apenas propaga o erro
        if (!hadAuthHeader && !mustForceRelogin && !url.includes('/auth/')) {
          throw error;
        }
        // Para sessão encerrada/rotas auth, força login
        forceRelogin();
        throw error;
      }

      // Evitar loop
      if ((config as any)._retry) {
        forceRelogin();
        throw error;
      }
      (config as any)._retry = true;

      // Single-flight de refresh
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await api.post('/auth/refresh', null, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
          });
          const newAT = data?.data?.accessToken ?? data?.serviceToken;
          if (newAT) {
            setToken(newAT);
            flushQueue(newAT);
          } else {
            clearToken();
            flushQueue(undefined);
            forceRelogin();
          }
        } catch (e) {
          clearToken();
          flushQueue(undefined);
          // refresh falhou => agora sim redireciona
          forceRelogin();
          throw e;
        } finally {
          isRefreshing = false;
        }
      }

      // Aguarda refresh e repete a original
      return new Promise((resolve, reject) => {
        queue.push((t) => {
          if (!t) return reject(error);
          config.headers = config.headers || {};
          (config.headers as any).Authorization = `Bearer ${t}`;
          resolve(api(config));
        });
      });
    }

    if (response.status === 403) {
      // apenas propaga
      throw error;
    }

    throw error;
  }
);

// --------- Export helpers & fetchers
export default api;

export const fetcher = async (args: string | [string, any]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await api.get(url, { ...config });
  return res.data;
};

export const fetcherPost = async (args: string | [string, any]) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const res = await api.post(url, { ...(config as any) });
  return res.data;
};
