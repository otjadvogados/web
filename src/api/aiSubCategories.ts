// src/api/aiSubCategories.ts
import axios from 'utils/axios';

export type AiSubCategory = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  companyId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AiSubCategoryListResponse = {
  message: string;
  data: AiSubCategory[];
  pagination: { page: number; limit: number; total: number };
};

export async function listSubCategories(params?: { categoryId?: string; search?: string; page?: number; limit?: number }) {
  const { data } = await axios.get<AiSubCategoryListResponse>('/ai/subcategories', { params });
  return data;
}

export async function createSubCategory(payload: { categoryId: string; name: string }) {
  const { data } = await axios.post<{ message: string; data: AiSubCategory }>('/ai/subcategories', payload);
  return data.data;
}

export async function updateSubCategory(id: string, payload: { name?: string }) {
  const { data } = await axios.patch<{ message: string; data: AiSubCategory }>(`/ai/subcategories/${id}`, payload);
  return data.data;
}

export async function deleteSubCategory(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/subcategories/${id}`);
  return data;
}

