// src/api/departments.ts
import axios from 'utils/axios';
import type { UserBasic } from './users';

export type Department = {
  id: string;
  name: string;
  companyId?: string | null;
  description?: string | null;
  // responsável pela assinatura
  signatureUserId?: string | null;
  signatureUser?: UserBasic | null;
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

export async function createDepartment(payload: { name: string; description?: string | null; signatureUserId?: string | null }) {
  const { data } = await axios.post<{ message: string; data: Department }>('/departments', payload);
  return data.data;
}

export type UpdateDepartmentDTO = Partial<{
  name: string;
  description: string | null;
  signatureUserId: string | null; // null para limpar
}>;

export async function updateDepartment(id: string, payload: UpdateDepartmentDTO) {
  const { data } = await axios.patch<{ message: string; data: Department }>(
    `/departments/${id}`,
    payload
  );
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