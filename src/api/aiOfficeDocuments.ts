import axios from 'utils/axios';

export type AiOfficeDocument = {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  fileId?: string | null;
  fileMime?: string | null;
  originalName?: string | null;
  uploadedAt?: string | null;
  extractedText?: string | null;
  extractedTextGeneratedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type OfficeDocumentListResponse = {
  message: string;
  data: AiOfficeDocument[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export type ListOfficeDocumentsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export async function listOfficeDocuments(q: ListOfficeDocumentsQuery = {}) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  const { data } = await axios.get<OfficeDocumentListResponse>('/ai/office-documents', { params });
  return data;
}

export async function getOfficeDocument(id: string) {
  const { data } = await axios.get<{ message: string; data: AiOfficeDocument }>(`/ai/office-documents/${id}`);
  return data.data;
}

export type CreateOfficeDocumentDTO = {
  name: string;
  description?: string | null;
};

export async function createOfficeDocument(payload: CreateOfficeDocumentDTO) {
  const { data } = await axios.post<{ message: string; data: AiOfficeDocument }>(`/ai/office-documents`, payload);
  return data.data;
}

export type UpdateOfficeDocumentDTO = Partial<{
  name: string;
  description: string | null;
}>;

export async function updateOfficeDocument(id: string, payload: UpdateOfficeDocumentDTO) {
  const { data } = await axios.patch<{ message: string; data: AiOfficeDocument }>(`/ai/office-documents/${id}`, payload);
  return data.data;
}

export async function deleteOfficeDocument(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/office-documents/${id}`);
  return data;
}

// ===================== FILE (upload/delete/download) =====================
export async function uploadOfficeDocumentFile(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axios.post<{ message: string; data: AiOfficeDocument }>(`/ai/office-documents/${id}/file`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000 // 30 segundos
  });
  return data.data;
}

export async function deleteOfficeDocumentFile(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/office-documents/${id}/file`);
  return data;
}

export function officeDocumentFileUrl(id: string, version?: string) {
  const base = `/ai/office-documents/${id}/file`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

export async function fetchOfficeDocumentFile(
  id: string,
  version?: string
): Promise<{ blob: Blob; filename: string | null }> {
  const params: Record<string, string> = {};
  if (version) params.v = version;

  const res = await axios.get(`/ai/office-documents/${id}/file`, {
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
