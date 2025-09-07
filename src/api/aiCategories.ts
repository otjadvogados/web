// src/api/aiCategories.ts
import api from '../utils/axios';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export type AiCategory = { 
  id: string; 
  name: string; 
  slug: string; 
  companyId?: string | null;
  companyScope?: 'global' | 'company';
};

export type AiCategoryListResponse = {
  message: string;
  data: AiCategory[];
  pagination: { page: number; limit: number; total: number };
};

export async function listCategories(params?: { search?: string; page?: number; limit?: number }) {
  const res = await api.get<AiCategoryListResponse>('/ai/categories', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function createCategory(payload: { name: string; companyScope?: 'global' | 'company' }) {
  const res = await api.post<{ message: string; data: AiCategory }>('/ai/categories', payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function updateCategory(id: string, payload: { name: string }) {
  const res = await api.patch<{ message: string; data: AiCategory }>(`/ai/categories/${id}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function deleteCategory(id: string) {
  const res = await api.delete<{ message: string }>(`/ai/categories/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
