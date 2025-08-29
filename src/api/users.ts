import api from '../utils/axios';
import { UsersListResponse, UserRow } from '../types/users';
import { digitsOnly } from '../utils/mask';

export type ListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function listUsers(q: ListQuery) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };

  const res = await api.get<UsersListResponse>('/users', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function getUser(id: string) {
  const res = await api.get<{ message: string; data: UserRow }>(`/users/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

type CreateUserDTO = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  cpf?: string | null;
  oab?: string | null;
  birthdate?: string | null; // 'yyyy-mm-dd'
  // 👇 NOVO
  roleId: string; // obrigatório no create
};

export async function createUser(payload: CreateUserDTO) {
  const body: any = { ...payload };
  if (body.phone) body.phone = digitsOnly(body.phone);
  if (body.cpf) body.cpf = digitsOnly(body.cpf);
  // roleId é obrigatório, não precisa verificar

  const res = await api.post(`/users`, body, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

type UpdateUserDTO = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string | null;
  cpf?: string | null;
  oab?: string | null;
  birthdate?: string | null; // 'yyyy-mm-dd' | null
  // 👇 NOVO
  roleId?: string | null; // string para definir/trocar, null para limpar
};

export async function updateUser(id: string, payload: UpdateUserDTO) {
  const body: any = { ...payload };
  if (typeof body.phone !== 'undefined' && body.phone !== null) body.phone = digitsOnly(body.phone);
  if (typeof body.cpf !== 'undefined' && body.cpf !== null) body.cpf = digitsOnly(body.cpf);
  const res = await api.patch(`/users/${id}`, body, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteUser(id: string) {
  const res = await api.delete(`/users/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// ---- role (user <-> role) ----
export async function getUserRole(userId: string) {
  const res = await api.get<{ message: string; data: UserRow['role'] }>(`/users/${userId}/role`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data ?? null;
}

export async function setUserRole(userId: string, roleId: string) {
  const res = await api.put(`/users/${userId}/role/${roleId}`, null, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function clearUserRole(userId: string) {
  const res = await api.delete(`/users/${userId}/role`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// ---- roles (para o seletor) ----
type RolesListResp = {
  message: string;
  data: Array<{ id: string; name: string; description?: string | null; company: { id: string; name: string } }>;
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
};

export async function listRoles(params: { page?: number; limit?: number; search?: string; companyId?: string }) {
  const q = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    search: params.search || undefined,
    companyId: params.companyId || undefined
  };
  const res = await api.get<RolesListResp>('/roles', {
    params: q,
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
