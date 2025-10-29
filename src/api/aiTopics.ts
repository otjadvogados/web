import axios from 'utils/axios';

export type AiTopic = {
  id: string;
  companyId: string;
  pieceId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  // join básico para listagem (quando vier do backend com leftJoinAndSelect)
  piece?: { id: string; name: string };
};

export type TopicsListResponse = {
  message: string;
  data: AiTopic[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export type ListTopicsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  pieceId?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export async function listTopics(q: ListTopicsQuery = {}) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    pieceId: q.pieceId || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  const { data } = await axios.get<TopicsListResponse>('/ai/topics', { params });
  return data;
}

export async function getTopic(id: string) {
  const { data } = await axios.get<{ message: string; data: AiTopic }>(`/ai/topics/${id}`);
  return data.data;
}

export type CreateTopicDTO = {
  pieceId: string;
  name: string;
  description?: string | null;
};

export async function createTopic(payload: CreateTopicDTO) {
  const { data } = await axios.post<{ message: string; data: AiTopic }>(`/ai/topics`, payload);
  return data.data;
}

export type UpdateTopicDTO = Partial<{
  pieceId: string;      // mover para outra peça (opcional)
  name: string;
  description: string | null;
}>;

export async function updateTopic(id: string, payload: UpdateTopicDTO) {
  const { data } = await axios.patch<{ message: string; data: AiTopic }>(`/ai/topics/${id}`, payload);
  return data.data;
}

export async function deleteTopic(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/topics/${id}`);
  return data;
}
