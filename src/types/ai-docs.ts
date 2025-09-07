// src/types/ai-docs.ts
export type AiTemplate = {
  id: string;
  kind: string;
  title: string;
  description?: string | null;
  createdAt?: string;
};

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
