import axios from 'utils/axios';

export type AttachmentBox = 'claimant' | 'client';

export type CaseAttachmentMeta = {
  /** posição do arquivo no FormData (ordem importa) */
  index: number;
  topicSpecificId: string;
  box: AttachmentBox;
  name: string;
  type: string;
  size: number;
};

export type CaseContextFields = {
  departmentId: string;
  customerIds?: string[]; // múltiplos clientes
  pieceId: string;
  /** legado (um único tópico) */
  topicId?: string | null;
  /** NOVO: múltiplos tópicos */
  topicIds?: string[];
  topicSpecificIds?: string[];
  instruction?: string | null;

  /** NOVO: metadados dos anexos por tópico específico e por caixa */
  attachmentsMeta?: CaseAttachmentMeta[];
};

export type CaseContextResponse = {
  message: string;
  data: {
    /** id de correlação do processamento, para casar com os eventos WS */
    runId?: string | null;
    /** NOVO: id do resultado persistido em ai_case_results */
    caseResultId?: string | null;
    _infos: Record<string, any>;
    pieceId: string | null;
    docxOriginalName: string | null;
    /** HTML já com os placeholders preenchidos (fase 2) */
    html: string;
    /** Placeholders detectados na fase 1 (útil para QA) */
    placeholders: string[];
    /** Chaves efetivamente substituídas (útil para QA) */
    replacedKeys?: string[];
    /** Chaves que ficaram faltando (útil para QA) */
    missingKeys?: string[];
  };
};

/**
 * Envia o contexto do caso para o backend e retorna o JSON
 * { message, data: { html, _infos, placeholders, ... } }.
 * Espera FormData com:
 *  - fields: JSON string (CaseContextFields)
 *  - attachments: múltiplos arquivos (pdf/imagem)
 */
export async function postCaseContext(form: FormData) {
  const { data } = await axios.post<CaseContextResponse>(
    '/ai/cases/context',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return data;
}

// ==============================|| CASE RESULTS APIs ||============================== //

export type CaseResult = {
  id: string;
  requesterId: string;
  companyId: string;
  pieceId: string;
  customers: string[] | null | Array<{ id: string; name: string; displayName?: string }>;
  html?: string; // ← Novo campo (igual ao /context)
  htmlMain?: string; // ← Mantido para compatibilidade
  _infos?: Record<string, any>; // ← Novo campo (igual ao /context)
  infos?: {
    piece?: any;
    today?: any;
    phase05?: {
      fillings?: Record<string, any>;
      attachments?: any[];
      unsupportedDetected?: any[];
    };
    phase06?: {
      html?: string;
      ast?: any;
      checklistId?: string | null;
      reportAfter?: any;
      appliedNotes?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  };
  phase05?: any; // ← Novo campo
  phase06?: any; // ← Novo campo
  phase07?: any; // ← Novo campo
  phase08?: any; // ← Novo campo
  phase09?: any; // ← Novo campo
  tags: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Campos que podem vir populados da listagem
  department?: { id: string; name: string };
  piece?: { id: string; name: string };
  placeholders?: string[];
  replacedKeys?: string[];
  missingKeys?: string[];
};

export type CaseResultsListResponse = {
  ok: boolean;
  page: number;
  pageSize: number;
  total: number;
  data?: CaseResult[]; // Backend retorna 'data'
  items?: CaseResult[]; // Mantido para compatibilidade
};

export type ListCaseResultsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  pieceId?: string;
  customerId?: string;
  customerName?: string;
  createdFrom?: string;
  createdTo?: string;
  tags?: Record<string, string>;
};

/**
 * GET /ai/cases/results - Listar resultados de casos
 */
export async function listCaseResults(q: ListCaseResultsQuery = {}) {
  const params: Record<string, any> = {
    page: q.page ?? 1,
    pageSize: q.pageSize ?? 10,
    search: q.search || undefined,
    departmentId: q.departmentId || undefined,
    pieceId: q.pieceId || undefined,
    customerId: q.customerId || undefined,
    customerName: q.customerName || undefined,
    createdFrom: q.createdFrom || undefined,
    createdTo: q.createdTo || undefined
  };

  // Adicionar tags como query params (tags[chave]=valor)
  if (q.tags) {
    Object.entries(q.tags).forEach(([key, value]) => {
      params[`tags[${key}]`] = value;
    });
  }

  const { data } = await axios.get<CaseResultsListResponse>('/ai/cases/results', { params });
  return data;
}

/**
 * GET /ai/cases/results/:id - Obter resultado específico
 */
export async function getCaseResult(id: string) {
  const { data } = await axios.get<{ ok: boolean; item: CaseResult }>(`/ai/cases/results/${id}`);
  return data.item;
}

/**
 * PATCH /ai/cases/results/:id/html - Editar HTML
 */
export async function updateCaseResultHtml(id: string, payload: {
  html: string;
  tags?: Record<string, any>;
  replaceTags?: boolean;
}) {
  const { data } = await axios.patch<{ message: string; data: CaseResult }>(
    `/ai/cases/results/${id}/html`,
    payload
  );
  return data;
}

/**
 * DELETE /ai/cases/results - Exclusão em lote
 */
export async function deleteCaseResults(ids: string[]) {
  const { data } = await axios.delete<{ message: string }>('/ai/cases/results', {
    data: { ids }
  });
  return data;
}

export type PlaceholdersResponse = {
  message: string;
  data: {
    placeholders: string[];
  };
};

/**
 * POST /ai/cases/topic-specifics/placeholders - Listar placeholders
 */
export async function detectPlaceholders(topicSpecificIds: string[]) {
  const { data } = await axios.post<PlaceholdersResponse>(
    '/ai/cases/topic-specifics/placeholders',
    { topicSpecificIds }
  );
  return data.data;
}