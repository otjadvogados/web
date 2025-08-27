import axios from 'utils/axios';
import { SensitiveField, SensitiveFieldListResponse } from 'types/privacy';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listSensitiveFields(params: { page?: number; limit?: number; search?: string; active?: boolean }) {
  const res = await axios.get<SensitiveFieldListResponse>('/privacy/sensitive-fields', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search?.trim() || undefined,
      active: typeof params.active === 'boolean' ? params.active : undefined
    },
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function createSensitiveField(payload: Partial<SensitiveField>) {
  const res = await axios.post<{ data: SensitiveField }>('/privacy/sensitive-fields', payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function updateSensitiveField(id: string, payload: Partial<SensitiveField>) {
  const res = await axios.patch<{ data: SensitiveField }>(`/privacy/sensitive-fields/${id}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteSensitiveField(id: string) {
  const res = await axios.delete<{ ok: boolean }>(`/privacy/sensitive-fields/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
