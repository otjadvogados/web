// src/api/departments.ts
import axios from 'utils/axios';

export type Department = {
  id: string;
  name: string;
  companyId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DepartmentListResponse = {
  message: string;
  data: Department[];
  pagination: { page: number; limit: number; total: number };
};

export async function listDepartments(params?: { search?: string; page?: number; limit?: number }) {
  const { data } = await axios.get<DepartmentListResponse>('/departments', { params });
  return data;
}

export async function createDepartment(payload: { name: string }) {
  const { data } = await axios.post<{ message: string; data: Department }>('/departments', payload);
  return data.data;
}

export async function updateDepartment(id: string, payload: { name: string }) {
  const { data } = await axios.patch<{ message: string; data: Department }>(`/departments/${id}`, payload);
  return data.data;
}

export async function getDepartment(id: string) {
  const { data } = await axios.get<{ message: string; data: Department }>(`/departments/${id}`);
  return data.data;
}

export async function deleteDepartment(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/departments/${id}`);
  return data;
}