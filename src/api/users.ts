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

export async function createUser(payload: CreateUserDTO & { avatar?: File | null }) {
  const fd = new FormData();
  fd.append('name', payload.name);
  fd.append('email', payload.email);
  fd.append('password', payload.password);
  fd.append('roleId', payload.roleId);
  if (payload.phone) fd.append('phone', digitsOnly(payload.phone));
  if (payload.cpf) fd.append('cpf', digitsOnly(payload.cpf));
  if (payload.oab) fd.append('oab', payload.oab);
  if (payload.birthdate) fd.append('birthdate', payload.birthdate);
  if (payload.avatar) fd.append('avatar', payload.avatar);

  const res = await api.post(`/users`, fd, { headers: { 'Accept-Language': LANG } });
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

export async function updateUser(id: string, payload: UpdateUserDTO & { avatar?: File | null }) {
  const fd = new FormData();
  // Só envia o que veio definido (PATCH)
  if (typeof payload.name !== 'undefined') fd.append('name', payload.name ?? '');
  if (typeof payload.email !== 'undefined') fd.append('email', payload.email ?? '');
  if (typeof payload.password !== 'undefined' && payload.password) fd.append('password', payload.password);
  if (typeof payload.phone !== 'undefined')
    fd.append('phone', payload.phone !== null ? digitsOnly(payload.phone) : '');
  if (typeof payload.cpf !== 'undefined')
    fd.append('cpf', payload.cpf !== null ? digitsOnly(payload.cpf) : '');
  if (typeof payload.oab !== 'undefined') fd.append('oab', payload.oab ?? '');
  if (typeof payload.birthdate !== 'undefined') fd.append('birthdate', payload.birthdate ?? '');
  if (typeof payload.roleId !== 'undefined') fd.append('roleId', payload.roleId ?? '');
  if (payload.avatar) fd.append('avatar', payload.avatar);

  const res = await api.patch(`/users/${id}`, fd, { headers: { 'Accept-Language': LANG } });
  return res.data;
}

export async function updateUserAvatar(id: string, file: File) {
  const fd = new FormData();
  fd.append('avatar', file);
  const res = await api.patch(`/users/${id}`, fd, { headers: { 'Accept-Language': LANG } });
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
