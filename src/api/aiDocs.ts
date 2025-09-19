// src/api/aiDocs.ts
import axios from 'utils/axios';
import type { AiDraft, AiSuggestion, WDoc } from 'types/wdoc';

// Re-export types for convenience
export type { AiDraft, AiSuggestion, WDoc };

export type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;           // mensagem do usuário OU rationale agregado
  createdAt: string;
};
import type { DocflowDoc } from 'types/docflow';

// ==============================================================
// lembre: LANG vem de VITE_APP_ACCEPT_LANGUAGE
const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

// ===== Types (ou coloque em src/types/ai-docs.ts) =====
export type AiTemplate = {
  id: string;
  kind: string;
  title: string;
  description?: string | null;
  createdAt?: string;
  // novo:
  subCategoryId?: string | null;
};

export type AiTemplateListResponse = {
  data: AiTemplate[];
  pagination: { page: number; limit: number; total: number };
};

// ====== BY CATEGORY ======
export type TemplatesByCategoryItem = {
  categoryId: string | null;
  subCategories: Array<{
    subCategoryId: string | null;
    subCategoryName: string; // "Geral" ou nome da sub
    templates: Array<{
      id: string;
      name: string;
      kind: string;
      description?: string | null;
      fileId?: string | null;
      updatedAt?: string;
    }>;
  }>;
};
export type TemplatesByCategoryResponse = {
  message: string;
  data: TemplatesByCategoryItem[];
};

export async function listTemplatesByCategory(params?: {
  type?: string;
  search?: string;
  limitPerCategory?: number;
  onlyWithTemplates?: boolean;
}) {
  const { data } = await axios.get<TemplatesByCategoryResponse>('/ai/templates/by-category', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return data;
}

// ===== Templates - list/update/delete =====
export async function listTemplates(params?: { search?: string; categoryId?: string; subCategoryId?: string; page?: number; limit?: number }) {
  const { data } = await axios.get<AiTemplateListResponse>('/ai/templates', { params, headers: { 'Accept-Language': LANG } }); 
  return data;
}

export type AiCase = {
  id: string;
  userId: string;
  companyId?: string | null;
  type: string;
  requestText: string;
  status: 'DRAFT'|'GENERATING'|'READY'|'APPROVED'|'REJECTED'|string;
  createdAt: string;
};

export type DraftJson = {
  enderecamento: string;
  qualificacao: string;
  fatos: string;
  fundamentos: string;
  pedidos: string[];
  jurisprudencia: string[];
  observacoes: string;
  [k: string]: any;
};

export type AiExport = {
  id: string;
  draftId: string;
  kind: 'DOCX'|'PDF';
  status: 'PENDING'|'DONE'|'ERROR';
  fileId?: string | null;
  error?: string | null;
  createdAt: string;
};


//
// Drafts
//
// ===== Drafts - list/get =====
export type AiDraftListResponse = {
  message: string;
  data: AiDraft[];
  pagination: { page: number; limit: number; total: number };
};

export async function listDrafts(params?: { caseId?: string; page?: number; limit?: number }) {
  const { data } = await axios.get<AiDraftListResponse>('/ai/drafts', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return data;
}

export async function getDraft(draftId: string) {
  const { data } = await axios.get<{ data: AiDraft }>(`/ai/drafts/${encodeURIComponent(draftId)}`, {
    headers: { 'Accept-Language': LANG }
  });
  return data.data;
}

// Helper: pega o draft mais recente do caso
export async function getLatestDraftForCase(caseId: string) {
  const r = await listDrafts({ caseId, page: 1, limit: 1 });
  return r.data?.[0] || null;
}

export async function generateDraft(caseId: string, templateId?: string) {
  const { data } = await axios.post<{ data: AiDraft }>(
    `/ai/drafts/${encodeURIComponent(caseId)}/generate`,
    templateId ? { templateId } : {}
  );
  return data.data;
}

export async function updateDraft(
  draftId: string,
  payload: { json: WDoc | DocflowDoc; status?: string }
) {
  const { data } = await axios.patch<{ data: AiDraft }>(
    `/ai/drafts/${encodeURIComponent(draftId)}`,
    payload
  );
  return data.data;
}

export async function exportDraft(
  draftId: string,
  kind: 'DOCX' | 'PDF'
): Promise<{ id: string; draftId: string; kind: 'DOCX' | 'PDF'; status: string; fileId?: string }> {
  const { data } = await axios.post<{ data: any }>(
    `/ai/drafts/${encodeURIComponent(draftId)}/export`,
    { kind }
  );
  return data.data;
}

//
// Arquivos (storage)
//
export async function getExportFileBlob(fileId: string) {
  const res = await axios.get(`/files/${encodeURIComponent(fileId)}`, {
    responseType: 'blob'
  });
  return { blob: res.data as Blob };
}

//
// Chat & sugestões
//
export async function listChatMessages(caseId: string) {
  const { data } = await axios.get<{ data: AiChatMessage[] }>(
    `/ai/chats/${encodeURIComponent(caseId)}/messages`,
    { headers: { 'Accept-Language': LANG } }
  );
  return data.data;
}

export async function postChatMessage(caseId: string, text: string) {
  const { data } = await axios.post<{ data: { sessionId: string; draftId: string; suggestions: AiSuggestion[]; messageId: string } }>(
    `/ai/chats/${encodeURIComponent(caseId)}/messages`,
    { text }
  );
  return data.data;
}

export async function acceptSuggestion(draftId: string, suggestionId: string) {
  const { data } = await axios.post<{ data: { draft: AiDraft; suggestion: AiSuggestion } }>(
    `/ai/drafts/${encodeURIComponent(draftId)}/suggestions/${encodeURIComponent(suggestionId)}/accept`
  );
  return data.data;
}

export async function rejectSuggestion(draftId: string, suggestionId: string) {
  const { data } = await axios.post<{ data: { suggestion: AiSuggestion } }>(
    `/ai/drafts/${encodeURIComponent(draftId)}/suggestions/${encodeURIComponent(suggestionId)}/reject`
  );
  return data.data;
}

//
// Cases
//
// ===== Cases - list/get =====
export type AiCaseListResponse = {
  message: string;
  data: AiCase[];
  pagination: { page: number; limit: number; total: number };
};

export async function listCases(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await axios.get<AiCaseListResponse>('/ai/cases', {
    params,
    headers: { 'Accept-Language': LANG }
  });
  return data;
}

export async function getCase(caseId: string) {
  const { data } = await axios.get<{ data: AiCase }>(`/ai/cases/${encodeURIComponent(caseId)}`, {
    headers: { 'Accept-Language': LANG }
  });
  return data.data;
}

export async function createCase(payload: { type: string; requestText: string }) {
  const { data } = await axios.post<{ data: { id: string } }>(`/ai/cases`, payload);
  return data.data;
}

export async function uploadCaseDoc(caseId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await axios.post(`/ai/cases/${encodeURIComponent(caseId)}/doc`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function uploadCaseDocs(caseId: string, files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const { data } = await axios.post(`/ai/cases/${encodeURIComponent(caseId)}/docs`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

//
// Templates
//
export async function createTemplate(params: { file: File; title: string; description?: string; categoryId?: string | null; subCategoryId?: string | null }) {
  const fd = new FormData();
  fd.append('file', params.file);
  fd.append('title', params.title);
  if (params.description) fd.append('description', params.description);
  // preferir subCategoryId; manter categoryId como fallback → "Geral"
  if (params.subCategoryId) fd.append('subCategoryId', params.subCategoryId);
  if (!params.subCategoryId && params.categoryId) fd.append('categoryId', params.categoryId);

  const { data } = await axios.post<{ data: AiTemplate }>(`/ai/templates`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data;
}

export async function updateTemplate(
  id: string,
  payload: { title?: string; description?: string | null; subCategoryId?: string | null; categoryId?: string | null; kind?: string }
) {
  // servidor vai ignorar categoryId se subCategoryId vier (e zera categoryId)
  const { data } = await axios.patch<{ data: AiTemplate }>(`/ai/templates/${id}`, payload);
  return data.data;
}

export async function deleteTemplate(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/ai/templates/${id}`);
  return data;
}

export async function getTemplateDocxBlob(templateId: string, v?: string) {
  const { data } = await axios.get(
    `/ai/templates/${encodeURIComponent(templateId)}/docx`,
    { params: v ? { v } : undefined, responseType: 'blob' }
  );
  return { blob: data as Blob };
}
