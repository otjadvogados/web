import api from '../utils/axios';

export type ListKind = 'trusted' | 'blocked'; // confiáveis | bloqueados

export type DeviceRecord = {
  id: string;
  userAgent?: string; // ex: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
  ipSubnet?: string; // ex: "0:0:0:0::/64"
  lastSeen?: string; // para confiáveis (whitelist)
  createdAt?: string; // para bloqueados (blacklist)
  deletedAt?: string | null;
  [key: string]: any;
};

export type ApiResponse<T> = {
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

const base = {
  trusted: { root: '/auth/devices/whitelist', defaultSortBy: 'lastSeen' },
  blocked: { root: '/auth/devices/blacklist', defaultSortBy: 'createdAt' }
} as const;

type Query = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  history?: boolean;
};

export async function fetchDevices(kind: ListKind, q: Query) {
  const cfg = base[kind];
  const url = `${cfg.root}${q.history ? '/history' : ''}`;

  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    sortBy: q.sortBy || cfg.defaultSortBy,
    sortOrder: q.sortOrder || 'desc'
  };

  const res = await api.get(url, {
    params,
    headers: { 'Accept-Language': import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR' }
  });

  // Mapeia a resposta da API para o formato esperado pelo componente
  const apiResponse = res.data as ApiResponse<DeviceRecord>;
  return {
    items: apiResponse.data,
    page: apiResponse.pagination.page,
    limit: apiResponse.pagination.limit,
    total: apiResponse.pagination.total
  };
}

export async function removeDevice(kind: ListKind, deviceId: string) {
  const cfg = base[kind];
  await api.delete(`${cfg.root}/${deviceId}`, {
    headers: { 'Accept-Language': import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR' }
  });
}

export async function restoreDevice(kind: ListKind, deviceId: string) {
  const cfg = base[kind];
  await api.post(`${cfg.root}/${deviceId}/restore`, null, {
    headers: { 'Accept-Language': import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR' }
  });
}
