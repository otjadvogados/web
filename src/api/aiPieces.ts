import axios from 'utils/axios';
// OBS: este axios já injeta Authorization (Bearer) via interceptors

export type AiPiece = {
  id: string;
  companyId: string;
  departmentId: string;
  customerId?: string | null;
  name: string;
  instruction?: string | null;
  isActive: boolean;
  allowAiEdit?: boolean; // novo: IA pode editar o texto da peça (DOCX como capa)
  createdAt?: string;
  updatedAt?: string;
  // docx
  docxFileId?: string | null;
  docxOriginalName?: string | null;
  docxUploadedAt?: string | null;
  // joins (quando houver)
  department?: { id: string; name: string };
  customer?: { id: string; displayName?: string; name?: string };
};

export type PiecesListResponse = {
  message: string;
  data: AiPiece[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
};

export type ListPiecesQuery = {
  page?: number;
  limit?: number;
  search?: string;
  deptId?: string;
  customerId?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export async function listPieces(q: ListPiecesQuery) {
  const params = {
    page: q.page ?? 1,
    limit: q.limit ?? 10,
    search: q.search || undefined,
    deptId: q.deptId || undefined,
    customerId: q.customerId || undefined,
    sortBy: q.sortBy || 'createdAt',
    sortOrder: q.sortOrder || 'desc'
  };
  const { data } = await axios.get<PiecesListResponse>('/ai/pieces', { params });
  return data;
}

export async function getPiece(id: string) {
  const { data } = await axios.get<{ message: string; data: AiPiece }>(`/ai/pieces/${id}`);
  return data.data;
}

export type CreatePieceDTO = {
  departmentId: string;
  name: string;
  instruction?: string | null;
  customerId?: string | null;
  isActive?: boolean;
  allowAiEdit?: boolean; // novo
};

export async function createPiece(payload: CreatePieceDTO) {
  const { data } = await axios.post<{ message: string; data: AiPiece }>(`/ai/pieces`, payload);
  return data.data;
}

export type UpdatePieceDTO = Partial<{
  departmentId: string;
  customerId: string | null; // null = desvincula cliente
  name: string;
  instruction: string | null;
  isActive: boolean;
  allowAiEdit: boolean; // novo
}>;

export async function updatePiece(id: string, payload: UpdatePieceDTO) {
  const { data } = await axios.patch<{ message: string; data: AiPiece }>(`/ai/pieces/${id}`, payload);
  return data.data;
}

export async function deletePiece(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/pieces/${id}`);
  return data;
}

// ===================== DOCX =====================
export async function uploadPieceDocx(id: string, file: File) {
  const formData = new FormData();
  formData.append('docx', file);
  const { data } = await axios.post<{ message: string; data: AiPiece }>(`/ai/pieces/${id}/docx`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data;
}

export async function deletePieceDocx(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/pieces/${id}/docx`);
  return data;
}

export function pieceDocxUrl(id: string, version?: string) {
  const base = `/ai/pieces/${id}/docx`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

/**
 * Busca o DOCX como Blob (com auth) e retorna também o filename do header.
 * Use no front para forçar o download sem quebrar o SPA (sem navegar para /ai/... no 3000).
 */
export async function fetchPieceDocx(
  id: string,
  version?: string
): Promise<{ blob: Blob; filename: string | null }> {
  const params: Record<string, string> = {};
  if (version) params.v = version;

  const res = await axios.get(`/ai/pieces/${id}/docx`, {
    responseType: 'blob',
    params,
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
  });

  const blob = res.data as Blob;
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error(`Falha ao baixar DOCX (HTTP ${res.status})`);
  }

  // tenta extrair filename do Content-Disposition
  const cd = (res.headers?.['content-disposition'] || '') as string;
  let filename: string | null = null;
  const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
  if (m && m[1]) {
    try { filename = decodeURIComponent(m[1]); } catch { filename = m[1]; }
  }

  return { blob, filename };
}
