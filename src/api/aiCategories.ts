// src/api/aiCategories.ts
import api from '../utils/axios';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export type AiCategory = { 
  id: string; 
  name: string; 
  slug: string; 
  companyId?: string | null;
  departmentId?: string | null;
  customerId?: string | null;   // novo
  createdAt?: string;
  updatedAt?: string;
};

export type AiCategoryListResponse = {
  message: string;
  data: AiCategory[];
  pagination: { page: number; limit: number; total: number };
};

// ---- Estilo por Categoria (.docx)
export type AiCategoryStyle = {
  id: string;
  name: string;
  styleFileId?: string | null;
  styleUpdatedAt?: string | null;
  styleStyleJson?: any;
  styleWdocJson?: any;
  hasStyle: boolean;
};

export async function listCategories(params?: {
  search?: string;
  departmentId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}) {
  const res = await api.get<AiCategoryListResponse>('/ai/categories', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function createCategory(payload: { name: string; departmentId?: string | null; customerId?: string | null }) {
  const res = await api.post<{ message: string; data: AiCategory }>('/ai/categories', payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function updateCategory(id: string, payload: { name?: string; departmentId?: string | null; customerId?: string | null }) {
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

export async function attachCategoryStyleDocx(categoryId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post<{ message: string; data: { fileId: string } }>(
    `/ai/categories/${encodeURIComponent(categoryId)}/style-docx`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data;
}

export async function getCategoryStyles(categoryId: string) {
  const res = await api.get<{ message: string; data: AiCategoryStyle }>(
    `/ai/categories/${encodeURIComponent(categoryId)}/styles`,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data.data;
}

export async function removeCategoryStyle(categoryId: string) {
  const res = await api.delete<{ message: string }>(
    `/ai/categories/${encodeURIComponent(categoryId)}/styles`
  );
  return res.data;
}
