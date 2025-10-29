import axios from 'utils/axios';

export type UserBasic = {
  id: string;
  name: string;
  email: string;
};

export type UsersListResponse = {
  message: string;
  data: UserBasic[];
  pagination: { page: number; limit: number; total: number };
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