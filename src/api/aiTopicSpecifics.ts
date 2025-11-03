import axios from 'utils/axios';

export type AiTopicSpecific = {
  id: string;
  companyId: string;
  topicId: string;
  name: string;
  instruction?: string | null;
  allowAiEdit: boolean;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  docxFileId?: string | null;
  docxOriginalName?: string | null;
  docxUploadedAt?: string | null;
  topic?: { id: string; name: string };
};

export type TopicSpecificsListResponse = {
  message: string;
  data: AiTopicSpecific[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export type ListTopicSpecificsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  /** legado: um único tópico */
  topicId?: string;
  /** NOVO: múltiplos tópicos */
  topicIds?: string[];
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export async function listTopicSpecifics(q: ListTopicSpecificsQuery = {}) {
  const params: Record<string, any> = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  // Preferir topicIds; cai para topicId (retrocompat) se não vier lista
  if (Array.isArray(q.topicIds) && q.topicIds.length > 0) {
    // Envia como CSV para compatibilidade total com o preprocess do backend
    params.topicIds = q.topicIds.join(',');
  } else if (q.topicId) {
    params.topicId = q.topicId;
  }
  const { data } = await axios.get<TopicSpecificsListResponse>('/ai/topic-specifics', { params });
  return data;
}

export async function getTopicSpecific(id: string) {
  const { data } = await axios.get<{ message: string; data: AiTopicSpecific }>(`/ai/topic-specifics/${id}`);
  return data.data;
}

export type CreateTopicSpecificDTO = {
  topicId: string;
  name: string;
  instruction?: string | null;
  allowAiEdit?: boolean;
};

export async function createTopicSpecific(payload: CreateTopicSpecificDTO) {
  const { data } = await axios.post<{ message: string; data: AiTopicSpecific }>(`/ai/topic-specifics`, payload);
  return data.data;
}

export type UpdateTopicSpecificDTO = Partial<{
  topicId: string;
  name: string;
  instruction: string | null;
  allowAiEdit: boolean;
}>;

export async function updateTopicSpecific(id: string, payload: UpdateTopicSpecificDTO) {
  const { data } = await axios.patch<{ message: string; data: AiTopicSpecific }>(`/ai/topic-specifics/${id}`, payload);
  return data.data;
}

export async function deleteTopicSpecific(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/topic-specifics/${id}`);
  return data;
}

// ===================== DOCX =====================
export async function uploadTopicSpecificDocx(id: string, file: File) {
  const formData = new FormData();
  formData.append('docx', file);
  const { data } = await axios.post<{ message: string; data: AiTopicSpecific }>(`/ai/topic-specifics/${id}/docx`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data;
}

export async function deleteTopicSpecificDocx(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/topic-specifics/${id}/docx`);
  return data;
}

export function topicSpecificDocxUrl(id: string, version?: string) {
  const base = `/ai/topic-specifics/${id}/docx`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

export async function fetchTopicSpecificDocx(
  id: string,
  version?: string
): Promise<{ blob: Blob; filename: string | null }> {
  const params: Record<string, string> = {};
  if (version) params.v = version;
  const res = await axios.get(`/ai/topic-specifics/${id}/docx`, {
    responseType: 'blob',
    params,
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  });
  const blob = res.data as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error(`Falha ao baixar DOCX (HTTP ${res.status})`);

  const cd = (res.headers?.['content-disposition'] || '') as string;
  let filename: string | null = null;
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (m && m[1]) {
    try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
  }
  return { blob, filename };
}
