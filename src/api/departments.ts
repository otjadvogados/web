import api from '../utils/axios';
import { DepartmentsListResponse, DepartmentRow } from '../types/departments';

export type ListDepartmentsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listDepartments(q: ListDepartmentsQuery = {}) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  const res = await api.get<DepartmentsListResponse>('/departments', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function getDepartment(id: string) {
  const res = await api.get<{ message: string; data: DepartmentRow }>(`/departments/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

type UpsertDepartmentDTO = {
  name: string;
  description?: string | null;
};

export async function createDepartment(payload: UpsertDepartmentDTO) {
  const res = await api.post(`/departments`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function updateDepartment(id: string, payload: Partial<UpsertDepartmentDTO>) {
  const res = await api.patch(`/departments/${id}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteDepartment(id: string) {
  const res = await api.delete(`/departments/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
