import api from '../utils/axios';
import { BlocksListResponse, BlocksHistoryResponse } from '../types/blocks';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

export async function blockUser(userId: string, body: { reason?: string; until?: string | null }) {
  const res = await api.put(`/users/${userId}/block`, body, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function unblockUser(userId: string) {
  const res = await api.delete(`/users/${userId}/block`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function blockByEmail(body: { email: string; reason?: string; until?: string | null }) {
  const res = await api.put(`/auth/block-by-email`, body, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function unblockByEmail(email: string) {
  const res = await api.delete('/auth/block-by-email', {
    params: { email },
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function listBlocks(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'blockedAt' | 'until' | 'email' | 'userName';
  sortOrder?: 'asc' | 'desc';
}) {
  const res = await api.get<BlocksListResponse>('/auth/blocks', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search || undefined,
      sortBy: params.sortBy || 'blockedAt',
      sortOrder: params.sortOrder || 'desc'
    },
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function listBlocksHistory(params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'action';
  sortOrder?: 'asc' | 'desc';
}) {
  const res = await api.get<BlocksHistoryResponse>('/auth/blocks/history', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search || undefined,
      sortBy: params.sortBy || 'createdAt',
      sortOrder: params.sortOrder || 'desc'
    },
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}
