import axios from 'utils/axios';
import type { UserBasic } from './users';

export type AiRulebook = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  // responsável pela assinatura
  signatureUserId?: string | null;
  signatureUser?: UserBasic | null;
  fileId?: string | null;
  fileMime?: string | null;
  originalName?: string | null;
  uploadedAt?: string | null;
  fileStatus?: 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type RulebookListResponse = {
  message: string;
  data: AiRulebook[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export type ListRulebooksQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export async function listRulebooks(q: ListRulebooksQuery = {}) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  const { data } = await axios.get<RulebookListResponse>('/ai/rules', { params });
  return data;
}

export async function getRulebook(id: string) {
  const { data } = await axios.get<{ message: string; data: AiRulebook }>(`/ai/rules/${id}`);
  return data.data;
}

export type CreateRulebookDTO = {
  name: string;
  description?: string | null;
  isActive?: boolean;
  signatureUserId?: string | null;
};

export async function createRulebook(payload: CreateRulebookDTO) {
  const { data } = await axios.post<{ message: string; data: AiRulebook }>(`/ai/rules`, payload);
  return data.data;
}

export type UpdateRulebookDTO = Partial<{
  name: string;
  description: string | null;
  isActive: boolean;
  signatureUserId: string | null; // null para limpar
}>;

export async function updateRulebook(id: string, payload: UpdateRulebookDTO) {
  const { data } = await axios.patch<{ message: string; data: AiRulebook }>(`/ai/rules/${id}`, payload);
  return data.data;
}

export async function deleteRulebook(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/rules/${id}`);
  return data;
}

// ===== Toggle de ativação dedicada =====
export async function activateRulebook(id: string) {
  const { data } = await axios.patch<{ message: string; data: AiRulebook }>(`/ai/rules/${id}/activate`);
  return data.data;
}

// ===================== FILE (upload/delete/download) =====================
export async function uploadRulebookFile(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  // Timeout curto (30s) - apenas para confirmar que o arquivo foi recebido
  // O processamento acontece em background
  const { data } = await axios.post<{ message: string; data: AiRulebook }>(`/ai/rules/${id}/file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000 // 30 segundos - apenas para confirmar recebimento do arquivo
  });
  return data.data;
}

export async function deleteRulebookFile(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/rules/${id}/file`);
  return data;
}

export function rulebookFileUrl(id: string, version?: string) {
  const base = `/ai/rules/${id}/file`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

export async function fetchRulebookFile(
  id: string,
  version?: string
): Promise<{ blob: Blob; filename: string | null }> {
  const params: Record<string, string> = {};
  if (version) params.v = version;

  const res = await axios.get(`/ai/rules/${id}/file`, {
    responseType: 'blob',
    params
  });

  const blob = res.data as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error(`Falha ao baixar arquivo (HTTP ${res.status})`);
  }

  const cd = (res.headers?.['content-disposition'] || '') as string;
  let filename: string | null = null;
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (m && m[1]) {
    try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
  }
  return { blob, filename };
}
