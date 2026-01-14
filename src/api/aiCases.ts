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

export type CaseCommonAttachmentMeta = {
  /** posição do arquivo no FormData (ordem importa) */
  index: number;
  name: string;
  type: string;
  size: number;
  isCommon: true; // marca como arquivo comum
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
  /** NOVO: metadados dos arquivos em comum para todos os tópicos específicos */
  commonAttachmentsMeta?: CaseCommonAttachmentMeta[];
  /** NOVO: dados do checklist inicial (para salvar no Redis) */
  initialChecklist?: Record<string, boolean>;
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
 *  - attachments: múltiplos arquivos (pdf/imagem) - anexos por tópico específico
 *  - commonAttachments: múltiplos arquivos (pdf/imagem) - arquivos em comum
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

// Tipos de auditoria e perguntas (definidos antes de CaseResult para evitar referências circulares)
export type InconsistencySeverity = 'high' | 'medium' | 'low';

export type Inconsistency = {
  id?: string;
  type: string;
  description: string;
  severity: InconsistencySeverity;
  location?: string;
  suggestion?: string;
};

export type UncomprehendedContext = {
  id?: string;
  context: string;
  reason?: string;
  suggestion?: string;
};

export type QuestionCategory = 'facts' | 'evidence' | 'witnesses' | 'legal' | 'other';

export type QuestionPriority = 'high' | 'medium' | 'low';

export type SuggestedQuestion = {
  id?: string;
  question: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  reasoning?: string;
};

export type AuditData = {
  inconsistencies: Inconsistency[];
  uncomprehendedContexts: UncomprehendedContext[];
  questions?: SuggestedQuestion[];
  generatedAt?: string;
  modelUsed?: string;
};

export type QuestionsData = {
  questions: SuggestedQuestion[];
  generatedAt?: string;
  modelUsed?: string;
};

export type CaseResult = {
  id: string;
  requesterId: string;
  companyId: string;
  pieceId: string;
  /** Nome descritivo do caso retornado pelo backend */
  name?: string | null;
  /** Nome da peça já denormalizado pelo backend */
  pieceName?: string | null;
  /** Nome do departamento já denormalizado pelo backend */
  departmentName?: string | null;
  /** Dados do usuário redator */
  userName?: string | null;
  userRoleName?: string | null;
  userAvatarFileId?: string | null;
  customers: string[] | null | Array<{ id: string; name: string; displayName?: string }>;
  /** Status do fluxo de aprovação */
  status?: 'pending' | 'finalized' | 'approved' | 'released' | null;
  /** Dados do fluxo de aprovação */
  approvalFlow?: {
    // Criou
    createdBy?: string | null;
    createdByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    createdAt?: string | null;
    // Finalizou
    finalizedBy?: string | null;
    finalizedByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    finalizedAt?: string | null;
    // Aprovou
    approvedBy?: string | null;
    approvedByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    approvedAt?: string | null;
    // Liberou
    releasedBy?: string | null;
    releasedByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    releasedAt?: string | null;
  } | null;
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
  // Campos de auditoria e perguntas
  hasAudit?: boolean;
  hasQuestions?: boolean;
  suggestedQuestions?: SuggestedQuestion[];
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
  includeApprovalFlow?: boolean;
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
    createdTo: q.createdTo || undefined,
    includeApprovalFlow: q.includeApprovalFlow !== undefined ? q.includeApprovalFlow : true
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
 * GET /ai/cases/results/:id/approval-flow - Obter apenas o fluxo de aprovação
 */
export async function getCaseApprovalFlow(id: string) {
  const { data } = await axios.get<{
    id: string;
    caseResultId: string;
    status: 'pending' | 'finalized' | 'approved' | 'released';
    createdBy?: string | null;
    createdByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    createdAt?: string | null;
    finalizedBy?: string | null;
    finalizedByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    finalizedAt?: string | null;
    approvedBy?: string | null;
    approvedByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    approvedAt?: string | null;
    releasedBy?: string | null;
    releasedByUser?: {
      id: string;
      name: string;
      avatarFileId?: string | null;
    } | null;
    releasedAt?: string | null;
    notes?: string | null;
  }>(`/ai/cases/results/${id}/approval-flow`);
  return data;
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

/**
 * POST /ai/cases/results/:id/finalize - Finalizar caso
 * O backend deve preencher automaticamente os campos:
 * - finalized_by (ID do usuário autenticado)
 * - finalized_at (timestamp atual)
 * - status (muda para 'finalized')
 */
export async function finalizeCase(id: string, notes?: string) {
  const payload: { notes?: string } = {};
  if (notes?.trim()) {
    payload.notes = notes.trim();
  }
  const { data } = await axios.post<{ message: string; data: CaseResult }>(
    `/ai/cases/results/${id}/finalize`,
    payload
  );
  return data;
}

/**
 * POST /ai/cases/results/:id/approve - Aprovar caso
 * O backend deve preencher automaticamente os campos:
 * - approved_by (ID do usuário autenticado)
 * - approved_at (timestamp atual)
 * - status (muda para 'approved')
 */
export async function approveCase(id: string, notes?: string) {
  const payload: { notes?: string } = {};
  if (notes?.trim()) {
    payload.notes = notes.trim();
  }
  const { data } = await axios.post<{ message: string; data: CaseResult }>(
    `/ai/cases/results/${id}/approve`,
    payload
  );
  return data;
}

/**
 * POST /ai/cases/results/:id/release - Liberar caso
 * O backend deve preencher automaticamente os campos:
 * - released_by (ID do usuário autenticado)
 * - released_at (timestamp atual)
 * - status (muda para 'released')
 */
export async function releaseCase(id: string, notes?: string) {
  const payload: { notes?: string } = {};
  if (notes?.trim()) {
    payload.notes = notes.trim();
  }
  const { data } = await axios.post<{ message: string; data: CaseResult }>(
    `/ai/cases/results/${id}/release`,
    payload
  );
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

// ==============================|| AUDIT & QUESTIONS APIs ||============================== //

/**
 * POST /ai/cases/results/:id/audit - Gera apenas auditoria (inconsistências e contextos não compreendidos)
 */
export async function generateAudit(id: string) {
  const { data } = await axios.post<{ message: string; data: AuditData }>(
    `/ai/cases/results/${id}/audit`
  );
  return data.data;
}

/**
 * POST /ai/cases/results/:id/questions/generate - Gera apenas perguntas
 */
export async function generateQuestions(id: string) {
  const { data } = await axios.post<{ message: string; data: QuestionsData }>(
    `/ai/cases/results/${id}/questions/generate`
  );
  return data.data;
}

/**
 * GET /ai/cases/results/:id/audit - Retorna a auditoria completa (inconsistências, contextos e perguntas)
 */
export async function getAudit(id: string) {
  const { data } = await axios.get<{ ok: boolean; data: AuditData }>(
    `/ai/cases/results/${id}/audit`
  );
  return data.data;
}

/**
 * GET /ai/cases/results/:id/questions - Retorna apenas as perguntas
 */
export async function getQuestions(id: string) {
  const { data } = await axios.get<{ ok: boolean; data: QuestionsData }>(
    `/ai/cases/results/${id}/questions`
  );
  return data.data;
}