import api from '../utils/axios';
import { RolesListResponse, RoleRow } from '../types/roles';

export type ListRolesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listRoles(q: ListRolesQuery = {}) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  const res = await api.get<RolesListResponse>('/roles', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function getRole(id: string) {
  const res = await api.get<{ message: string; data: RoleRow }>(`/roles/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

type UpsertRoleDTO = {
  name: string;
  description?: string | null;
};

export async function createRole(payload: UpsertRoleDTO) {
  const body = { ...payload };
  const res = await api.post(`/roles`, body, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function updateRole(id: string, payload: Partial<UpsertRoleDTO>) {
  const res = await api.patch(`/roles/${id}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteRole(id: string) {
  const res = await api.delete(`/roles/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
