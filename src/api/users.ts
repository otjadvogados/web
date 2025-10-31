import axios from 'utils/axios';
import type { UserRow, UsersListResponse } from 'types/users';

export type UserBasic = {
  id: string;
  name: string;
  email: string;
};

type UserListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

/**
 * Lista usuários (escopo da empresa do usuário logado).
 * Aceita busca por nome/email.
 */
export async function searchUsers(params?: { search?: string; page?: number; limit?: number }) {
  const { data } = await axios.get<UsersListResponse>('/users', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search || undefined,
      sortBy: 'name',
      sortOrder: 'asc'
    }
  });
  return data;
}

/**
 * Lista usuários com parâmetros completos para ordenação
 */
export async function listUsers(params?: UserListParams) {
  const { data } = await axios.get<UsersListResponse>('/users', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search || undefined,
      sortBy: params?.sortBy || 'createdAt',
      sortOrder: params?.sortOrder || 'desc'
    }
  });
  return data;
}

/**
 * Busca um usuário por ID
 */
export async function getUser(id: string): Promise<UserRow> {
  const { data } = await axios.get<{ message: string; data: UserRow }>(`/users/${id}`);
  return data.data;
}

/**
 * Cria um novo usuário
 */
export async function createUser(payload: {
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;
  oab?: string | null;
  birthdate?: string | null;
  password: string;
  roleId: string;
}) {
  const { data } = await axios.post<{ message: string; data: any }>('/users', payload);
  return data;
}

/**
 * Atualiza um usuário existente
 */
export async function updateUser(id: string, payload: {
  name?: string;
  email?: string;
  phone?: string | null;
  cpf?: string | null;
  oab?: string | null;
  birthdate?: string | null;
  password?: string;
  roleId?: string | null;
}) {
  const { data } = await axios.patch<{ message: string; data: any }>(`/users/${id}`, payload);
  return data;
}

/**
 * Deleta um usuário
 */
export async function deleteUser(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/users/${id}`);
  return data;
}

/**
 * Lista roles (funções/cargos)
 */
export async function listRoles(params?: { page?: number; limit?: number; search?: string }) {
  const { data } = await axios.get<{ message: string; data: any[]; pagination: any }>('/roles', {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 20,
      search: params?.search || undefined
    }
  });
  return data;
}

/**
 * Define ou atualiza a função (role) de um usuário
 */
export async function setUserRole(userId: string, roleId: string) {
  const { data } = await axios.put<{ message: string }>(`/users/${userId}/role`, { roleId });
  return data;
}