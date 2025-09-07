// src/api/aiDocs.ts
import api from '../utils/axios';

// lembre: LANG vem de VITE_APP_ACCEPT_LANGUAGE
const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

// ===== Types (ou coloque em src/types/ai-docs.ts) =====
export type AiTemplate = {
  id: string;
  kind: string;
  title: string;
  description?: string | null;
  createdAt?: string;
};

export type AiTemplateListResponse = {
  data: AiTemplate[];
  pagination: { page: number; limit: number; total: number };
};

// ===== Templates - list/update/delete =====
export async function listTemplates(params?: { search?: string; categoryId?: string; page?: number; limit?: number }) {
  const res = await api.get<AiTemplateListResponse>('/ai/templates', { params, headers: { 'Accept-Language': LANG } }); return res.data;
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

export type AiDraft = {
  id: string;
  caseId: string;
  templateId?: string | null;
  version: number;
  status: string; // 'draft' | ...
  json: DraftJson;
  createdAt: string;
  updatedAt: string;
};

export type AiSuggestion = {
  id: string;
  sessionId: string;
  draftId: string;
  draftVersion: number;
  ops: Array<{ op: string; path: string; value?: any; from?: string }>;
  rationale?: string | null;
  confidence?: number | null;
  targets: string[];
  status: 'PENDING'|'ACCEPTED'|'REJECTED';
  createdAt: string;
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


// ===== Templates =====
export async function createTemplate(params: { file: File; title: string; description?: string; categoryId?: string | null }) {
  const fd = new FormData();
  fd.append('file', params.file);
  fd.append('title', params.title);
  if (params.description) fd.append('description', params.description);
  if (params.categoryId) fd.append('categoryId', params.categoryId);

  const res = await api.post<{ message: string; data: AiTemplate }>(`/ai/templates`, fd, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function updateTemplate(id: string, payload: { title?: string; description?: string | null; categoryId?: string | null; kind?: string }) {
  const res = await api.patch<{ message: string; data: AiTemplate }>(`/ai/templates/${id}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function deleteTemplate(id: string) {
  const res = await api.delete<{ message: string }>(`/ai/templates/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// ===== Cases =====
export async function createCase(params: { type: string; requestText: string }) {
  const res = await api.post<{ message: string; data: AiCase }>(`/ai/cases`, params, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function uploadCaseDoc(caseId: string, file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post<{ message: string }>(`/ai/cases/${caseId}/doc`, fd, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// ===== Drafts =====
export async function generateDraft(caseId: string, templateId?: string) {
  const res = await api.post<{ message: string; data: AiDraft }>(`/ai/drafts/${caseId}/generate`, { templateId }, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function updateDraft(draftId: string, payload: { json: DraftJson; status?: string }) {
  const res = await api.patch<{ message: string; data: AiDraft }>(`/ai/drafts/${draftId}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function exportDraft(draftId: string, kind: 'DOCX'|'PDF') {
  const res = await api.post<{ message: string; data: AiExport }>(`/ai/drafts/${draftId}/export`, { kind }, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

// ===== Chat & Sugestões =====
export async function postChatMessage(caseId: string, text: string) {
  type Resp = { message: string; data: { sessionId: string; draftId: string; suggestions: AiSuggestion[]; messageId: string } };
  const res = await api.post<Resp>(`/ai/chats/${caseId}/messages`, { text }, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data.data;
}

export async function acceptSuggestion(draftId: string, suggestionId: string) {
  const res = await api.post<{ message: string; data: { draft: AiDraft; suggestion: AiSuggestion } }>(
    `/ai/drafts/${draftId}/suggestions/${suggestionId}/accept`,
    null,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data.data;
}

export async function rejectSuggestion(draftId: string, suggestionId: string) {
  const res = await api.post<{ message: string; data: { suggestion: AiSuggestion } }>(
    `/ai/drafts/${draftId}/suggestions/${suggestionId}/reject`,
    null,
    { headers: { 'Accept-Language': LANG } }
  );
  return res.data.data;
}

// ===== File (Export) -> retorna BLOB autenticado (JWT via axios) =====
export async function getExportFileBlob(fileId: string) {
  const res = await api.get(`/ai/exports/current/file`, {
    params: { v: fileId },
    responseType: 'blob',
    headers: { 'Accept-Language': LANG }
  });

  // tenta extrair filename do Content-Disposition
  const cd = (res.headers as any)['content-disposition'] as string | undefined;
  let filename = 'documento.pdf';
  if (cd) {
    // filename*=UTF-8''name.pdf OU filename="name.pdf"
    const m1 = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
    const m2 = /filename="?([^"]+)"?/i.exec(cd);
    const raw = (m1?.[1] || m2?.[1])?.trim();
    if (raw) {
      try { filename = decodeURIComponent(raw.replace(/^UTF-8''/i, '')); } catch { filename = raw; }
    }
  }
  const contentType = (res.headers as any)['content-type'] as string | undefined;
  return { blob: res.data as Blob, filename, contentType };
}

// ===== Template PDF -> retorna BLOB autenticado (JWT via axios) =====
export async function getTemplateFileBlob(templateId: string, fileId: string) {
  const res = await api.get(`/ai/templates/${templateId}/pdf`, {
    params: { v: fileId },
    responseType: 'blob',
    headers: { 'Accept-Language': LANG }
  });

  // tenta extrair filename do Content-Disposition
  const cd = (res.headers as any)['content-disposition'] as string | undefined;
  let filename = 'template.pdf';
  if (cd) {
    // filename*=UTF-8''name.pdf OU filename="name.pdf"
    const m1 = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
    const m2 = /filename="?([^"]+)"?/i.exec(cd);
    const raw = (m1?.[1] || m2?.[1])?.trim();
    if (raw) {
      try { filename = decodeURIComponent(raw.replace(/^UTF-8''/i, '')); } catch { filename = raw; }
    }
  }
  const contentType = (res.headers as any)['content-type'] as string | undefined;
  return { blob: res.data as Blob, filename, contentType };
}
