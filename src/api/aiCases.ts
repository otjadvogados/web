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
  /** preenchido após upload no rascunho (POST /ai/cases/draft/attachments) */
  fileId?: string;
};

export type CaseCommonAttachmentMeta = {
  /** posição do arquivo no FormData (ordem importa) */
  index: number;
  name: string;
  type: string;
  size: number;
  isCommon: true; // marca como arquivo comum
  /** preenchido após upload no rascunho (POST /ai/cases/draft/attachments) */
  fileId?: string;
};

/** Códigos de categoria da contestação (ordem oficial: Preliminares → Prejudiciais → Contrato → Mérito → Impugnação → Pedidos Finais) */
export type ContestationCategoryCode =
  | 'PRELIMINARES'
  | 'PREJUDICIAIS'
  | 'CONTRATO'
  | 'MERITO'
  | 'IMPUGNACAO_DOCS'
  | 'PEDIDOS_FINAIS';

/** Lista fixa dos códigos na ordem de exibição/montagem */
export const CONTESTATION_CATEGORY_CODES: readonly ContestationCategoryCode[] = [
  'PRELIMINARES',
  'PREJUDICIAIS',
  'CONTRATO',
  'MERITO',
  'IMPUGNACAO_DOCS',
  'PEDIDOS_FINAIS',
];

/** Retorna a ordem oficial de códigos (para ordenar listas, abas, seções). */
export function getContestationCategoryOrder(): ContestationCategoryCode[] {
  return [...CONTESTATION_CATEGORY_CODES];
}

/** Valida se uma string é código válido de categoria. */
export function isContestationCategoryCode(code: string): code is ContestationCategoryCode {
  return CONTESTATION_CATEGORY_CODES.includes(code as ContestationCategoryCode);
}

/** Rótulos no plural / padrão (uso quando não há contagem ou sempre plural). */
export const CONTESTATION_CATEGORY_LABELS: Record<ContestationCategoryCode, string> = {
  PRELIMINARES: 'Preliminares de mérito',
  PREJUDICIAIS: 'Prejudiciais de mérito',
  CONTRATO: 'Contrato de trabalho',
  MERITO: 'Mérito',
  IMPUGNACAO_DOCS: 'Impugnações aos Documentos',
  PEDIDOS_FINAIS: 'Pedidos Finais',
};

/** Rótulos no singular (quando há nenhum ou 1 documento anexado na categoria). */
const CONTESTATION_CATEGORY_LABELS_SINGULAR: Partial<Record<ContestationCategoryCode, string>> = {
  PRELIMINARES: 'Preliminar de mérito',
  PREJUDICIAIS: 'Prejudicial de mérito',
  IMPUGNACAO_DOCS: 'Impugnação aos Documentos',
  PEDIDOS_FINAIS: 'Pedido Final',
};

/**
 * Rótulo da categoria para exibição na UI.
 * Singular quando attachedDocumentCount é 0 ou 1; plural quando mais de um documento ou quando não informado.
 * @param code — código da categoria
 * @param attachedDocumentCount — número de documentos anexados nessa categoria (ex.: tópicos específicos com arquivo na categoria)
 */
export function getContestationCategoryLabel(code: ContestationCategoryCode, attachedDocumentCount?: number): string {
  if (attachedDocumentCount === 0 || attachedDocumentCount === 1) {
    const singular = CONTESTATION_CATEGORY_LABELS_SINGULAR[code];
    if (singular) return singular;
  }
  return CONTESTATION_CATEGORY_LABELS[code];
}

/** Categorias fixas: ordem oficial, código e rótulo (plural) para UI. */
export const CONTESTATION_CATEGORIES: { order: number; code: ContestationCategoryCode; label: string }[] =
  CONTESTATION_CATEGORY_CODES.map((code, i) => ({
    order: i + 1,
    code,
    label: CONTESTATION_CATEGORY_LABELS[code],
  }));

export type CaseContextFields = {
  departmentId: string;
  customerIds?: string[]; // múltiplos clientes
  pieceId: string;
  /** legado (um único tópico) */
  topicId?: string | null;
  /** NOVO: múltiplos tópicos */
  topicIds?: string[];
  /** Lista plana de IDs (usado quando topicSpecificsByCategory não é enviado) */
  topicSpecificIds?: string[];
  /**
   * Mapa categoria → lista ordenada de IDs de tópicos específicos.
   * Quando enviado, o backend usa esta ordem no documento; caso contrário usa topicSpecificIds.
   * Categorias vazias podem ser omitidas ou enviadas como array vazio.
   */
  topicSpecificsByCategory?: Partial<Record<ContestationCategoryCode, string[]>>;
  /**
   * Mapa categoria → promptId (UUID) do prompt da categoria (tabela ai_prompt).
   * Enviar apenas as categorias para as quais existe um prompt configurado.
   */
  categoryPromptIds?: Partial<Record<ContestationCategoryCode, string>>;
  instruction?: string | null;

  /** NOVO: metadados dos anexos por tópico específico e por caixa */
  attachmentsMeta?: CaseAttachmentMeta[];
  /** NOVO: metadados dos arquivos em comum para todos os tópicos específicos */
  commonAttachmentsMeta?: CaseCommonAttachmentMeta[];
  /** NOVO: dados do checklist inicial (para salvar no Redis) */
  initialChecklist?: Record<string, boolean>;
  /** Modelo opcional de IA usado na criação do caso (ex.: "gpt-4o-mini", "claude-sonnet-4") */
  model?: string;
};

/** Item de infos.topicSpecifics na resposta (pode vir com categoryCode quando montado por categorias) */
export type CaseTopicSpecificInfo = {
  id: string;
  topicId?: string;
  topicName?: string;
  name: string;
  instruction?: string | null;
  allowAiEdit?: boolean;
  promptId?: string | null;
  htmlLight?: string | null;
  writingStyleGuide?: string | null;
  /** Preenchido quando o caso foi montado com topicSpecificsByCategory */
  categoryCode?: ContestationCategoryCode;
  [key: string]: unknown;
};

export type CaseContextResponse = {
  message: string;
  data: CaseContextResponseData;
};

/** Dados retornados por postCaseContext (objeto data da resposta) */
export type CaseContextResponseData = {
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

/**
 * Envia o contexto do caso para o backend e retorna o JSON
 * { message, data: { html, _infos, placeholders, ... } }.
 * Espera FormData com:
 *  - fields: JSON string (CaseContextFields)
 *  - attachments: múltiplos arquivos (pdf/imagem) - anexos por tópico específico
 *  - commonAttachments: múltiplos arquivos (pdf/imagem) - arquivos em comum
 */
export async function postCaseContext(form: FormData): Promise<CaseContextResponseData> {
  const { data: response } = await axios.post<CaseContextResponse>(
    '/ai/cases/context',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  return response.data;
}

// ==============================|| CASE DRAFT (auto-save) ||============================== //

/** Payload do rascunho: mesmo formato do formulário de contexto, todos os campos opcionais (apenas metadados; sem arquivos) */
export type CaseDraftPayload = Partial<Omit<CaseContextFields, 'initialChecklist'>>;

export type CaseDraftResponse = {
  draft: CaseDraftPayload | null;
  updatedAt: string | null;
};

export type CaseDraftPutResponse = {
  updatedAt: string;
};

/**
 * GET /ai/cases/draft - Buscar rascunho (expirado após 24h)
 */
export async function getCaseDraft(): Promise<CaseDraftResponse> {
  const { data } = await axios.get<CaseDraftResponse>('/ai/cases/draft');
  return data;
}

/**
 * PUT /ai/cases/draft - Salvar rascunho (JSON, sem arquivos)
 */
export async function putCaseDraft(payload: CaseDraftPayload): Promise<CaseDraftPutResponse> {
  const { data } = await axios.put<CaseDraftPutResponse>('/ai/cases/draft', payload);
  return data;
}

/**
 * PUT /ai/cases/draft/with-files - Salvar rascunho com arquivos (multipart).
 * - payload: string JSON do rascunho (inclui attachmentsMeta e commonAttachmentsMeta com metadados; fileId opcional).
 * - Arquivos na ordem: primeiro os de attachmentsMeta (por index), depois os de commonAttachmentsMeta.
 * - Campo dos arquivos: "file" (múltiplas ocorrências). Total = attachmentsMeta.length + commonAttachmentsMeta.length.
 * O backend faz upload no storage, associa fileId e persiste o rascunho (ex.: user.case_draft_payload).
 */
export async function putCaseDraftWithFiles(form: FormData): Promise<CaseDraftPutResponse> {
  const { data } = await axios.put<CaseDraftPutResponse>('/ai/cases/draft/with-files', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

/**
 * DELETE /ai/cases/draft - Remover rascunho (opcional; backend já limpa após gerar caso)
 */
export async function deleteCaseDraft(): Promise<void> {
  await axios.delete('/ai/cases/draft');
}

export type CaseDraftAttachmentsResponse = {
  attachmentsMeta: CaseAttachmentMeta[];
  commonAttachmentsMeta: CaseCommonAttachmentMeta[];
};

/**
 * POST /ai/cases/draft/attachments - Upload de anexos do rascunho (multipart).
 * - fields: string JSON com { attachmentsMeta: [...], commonAttachmentsMeta: [...] } sem fileId.
 * - Arquivos na ordem: primeiro os de attachmentsMeta (por index), depois os de commonAttachmentsMeta.
 * Resposta devolve as mesmas metas com fileId preenchido.
 */
export async function postCaseDraftAttachments(form: FormData): Promise<CaseDraftAttachmentsResponse> {
  const { data } = await axios.post<CaseDraftAttachmentsResponse>('/ai/cases/draft/attachments', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

/**
 * GET /ai/cases/draft/attachments/:fileId - Stream do anexo do rascunho (exibir/baixar).
 * Retorna o blob do arquivo (404 se não pertencer ao rascunho do usuário ou expirado).
 */
export async function getCaseDraftAttachment(fileId: string): Promise<Blob> {
  const { data } = await axios.get<Blob>(`/ai/cases/draft/attachments/${fileId}`, {
    responseType: 'blob'
  });
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

export type SpellingError = {
  word: string;
  location: string;
  severity: InconsistencySeverity;
  suggestion: string;
};

export type PlaceholderIssue = {
  placeholder: string;
  location?: string;
  severity?: InconsistencySeverity;
};

export type JurisprudenceIssue = {
  id?: string;
  type: string;
  description: string;
  severity: InconsistencySeverity;
  location?: string;
  suggestion?: string;
};

export type MissingTopicInfo = {
  id?: string;
  topic: string;
  description: string;
  severity: InconsistencySeverity;
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
  uncomprehendedContexts?: UncomprehendedContext[];
  unclearContexts?: UncomprehendedContext[]; // Campo retornado pelo backend
  spellingErrors?: SpellingError[];
  placeholderIssues?: PlaceholderIssue[];
  jurisprudenceIssues?: JurisprudenceIssue[];
  missingTopicInfo?: MissingTopicInfo[];
  questions?: SuggestedQuestion[];
  generatedAt?: string;
  analyzedAt?: string; // Campo retornado pelo backend
  modelUsed?: string;
  model?: string; // Campo retornado pelo backend
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
  /** Array de casos da página atual (API retorna `items`). */
  items?: CaseResult[];
  data?: CaseResult[]; // Compatibilidade
};

export type ListCaseResultsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  pieceId?: string;
  customerId?: string;
  customerName?: string;
  /** Quando true, retorna apenas casos sem cliente (customer null/vazio). Útil para a pasta geral. */
  noCustomer?: boolean;
  createdFrom?: string;
  createdTo?: string;
  folderId?: string;
  tags?: Record<string, string>;
  includeApprovalFlow?: boolean;
};

/**
 * GET /ai/cases/results - Listar resultados de casos
 */
export async function listCaseResults(q: ListCaseResultsQuery = {}) {
  const rawPageSize = q.pageSize ?? 20;
  const params: Record<string, any> = {
    page: q.page ?? 1,
    pageSize: Math.min(rawPageSize, 20),
    search: q.search || undefined,
    departmentId: q.departmentId || undefined,
    pieceId: q.pieceId || undefined,
    customerId: q.customerId || undefined,
    customerName: q.customerName || undefined,
    noCustomer: q.noCustomer === true ? true : undefined,
    createdFrom: q.createdFrom || undefined,
    createdTo: q.createdTo || undefined,
    folderId: q.folderId || undefined,
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
 * PATCH /ai/cases/results/:id/html - Editar HTML (e opcionalmente name/tags)
 */
export async function updateCaseResultHtml(id: string, payload: {
  html: string;
  name?: string;
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

export type AiModel = 'gpt-5.1' | `claude-${string}`;

/**
 * POST /ai/cases/results/:id/audit - Gera apenas auditoria (inconsistências e contextos não compreendidos)
 * Body: { model?: "gpt-4o-mini" | "claude-..." }
 */
export async function generateAudit(id: string, model?: AiModel) {
  const body = model ? { model } : {};
  const { data } = await axios.post<{ message: string; data: AuditData }>(
    `/ai/cases/results/${id}/audit`,
    body
  );
  // Mapeia unclearContexts para uncomprehendedContexts se necessário
  const auditData = data.data;
  if (auditData.unclearContexts && !auditData.uncomprehendedContexts) {
    auditData.uncomprehendedContexts = auditData.unclearContexts;
  }
  return auditData;
}

/**
 * POST /ai/cases/results/:id/questions/generate - Gera apenas perguntas
 */
export async function generateQuestions(id: string, model?: AiModel) {
  const body = model ? { model } : {};
  const { data } = await axios.post<{ message: string; data: QuestionsData }>(
    `/ai/cases/results/${id}/questions/generate`,
    body
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
  // Mapeia unclearContexts para uncomprehendedContexts se necessário
  const auditData = data.data;
  if (auditData.unclearContexts && !auditData.uncomprehendedContexts) {
    auditData.uncomprehendedContexts = auditData.unclearContexts;
  }
  return auditData;
}

/**
 * GET /ai/cases/results/:id/questions - Retorna apenas as perguntas
 */
export async function getQuestions(id: string) {
  const { data } = await axios.get<{ ok: boolean; data: QuestionsData }>(
    `/ai/cases/results/${id}/questions`
  );
  // Debug: verificar a resposta completa
  console.log('Resposta completa do getQuestions:', data);
  console.log('Estrutura da resposta:', {
    ok: data.ok,
    data: data.data,
    questions: data.data?.questions,
    primeiraPergunta: data.data?.questions?.[0],
    chavesPrimeiraPergunta: data.data?.questions?.[0] ? Object.keys(data.data.questions[0]) : []
  });
  return data.data;
}

/**
 * DELETE /ai/cases/results/:caseId/questions/:questionId - Remove uma pergunta
 */
export async function deleteQuestion(caseId: string, questionId: string) {
  const { data } = await axios.delete<{ message: string; ok: boolean }>(
    `/ai/cases/results/${caseId}/questions/${questionId}`
  );
  return data;
}

// ==============================|| CASE FOLDERS APIs ||============================== //

export type CaseFolder = {
  id: string;
  /** Preenchido na pasta geral da empresa (casos sem cliente) */
  companyId: string | null;
  /** null na pasta geral; preenchido nas pastas por cliente */
  customerId: string | null;
  name: string;
  description: string | null;
  caseCount: number;
  customer?: {
    id: string;
    displayName?: string;
    name?: string;
    kind?: 'PERSON' | 'COMPANY';
    [key: string]: any;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Identifica a pasta geral (casos sem cliente).
 * Regra: customerId === null e companyId !== null.
 * O front exibe como "Geral".
 */
export function isGeneralFolder(folder: CaseFolder): boolean {
  return folder.customerId == null && folder.companyId != null && folder.companyId !== '';
}

export type CaseFolderWithItems = CaseFolder & {
  items: CaseResult[];
};

export type CreateCaseFolderInput = {
  /** Omitir ou null = criar pasta geral (casos sem cliente) */
  customerId?: string | null;
  name: string;
  description?: string | null;
};

export type UpdateCaseFolderInput = {
  name?: string;
  description?: string | null;
};

export type MoveCaseToFolderInput = {
  folderId: string | null;
};

export type ListCaseFoldersResponse = {
  message: string;
  data: CaseFolder[];
};

export type GetCaseFolderResponse = {
  message: string;
  data: CaseFolder;
};

export type CreateCaseFolderResponse = {
  message: string;
  data: CaseFolder;
};

export type UpdateCaseFolderResponse = {
  message: string;
  data: CaseFolder;
};

export type MoveCaseToFolderResponse = {
  message: string;
  data: {
    ok: boolean;
    id: string;
    folderId: string | null;
  };
};

/**
 * GET /ai/cases/folders - Listar todas as pastas
 */
export async function listCaseFolders(customerId?: string): Promise<CaseFolder[]> {
  const params: Record<string, any> = {};
  if (customerId) {
    params.customerId = customerId;
  }
  const { data } = await axios.get<ListCaseFoldersResponse>('/ai/cases/folders', { params });
  return data.data;
}

/**
 * GET /ai/cases/folders/:id - Obter pasta específica
 */
export async function getCaseFolder(id: string): Promise<CaseFolder> {
  const { data } = await axios.get<GetCaseFolderResponse>(`/ai/cases/folders/${id}`);
  return data.data;
}

/**
 * POST /ai/cases/folders - Criar nova pasta
 * Para pasta geral (casos sem cliente), omita customerId ou use customerId: null.
 */
export async function createCaseFolder(input: CreateCaseFolderInput): Promise<CaseFolder> {
  const body =
    input.customerId !== undefined && input.customerId !== null
      ? input
      : { name: input.name, description: input.description ?? null };
  const { data } = await axios.post<CreateCaseFolderResponse>('/ai/cases/folders', body);
  return data.data;
}

/**
 * PATCH /ai/cases/folders/:id - Atualizar pasta
 */
export async function updateCaseFolder(id: string, input: UpdateCaseFolderInput): Promise<CaseFolder> {
  const { data } = await axios.patch<UpdateCaseFolderResponse>(`/ai/cases/folders/${id}`, input);
  return data.data;
}

/**
 * DELETE /ai/cases/folders/:id - Excluir pasta
 */
export async function deleteCaseFolder(id: string): Promise<void> {
  await axios.delete<{ message: string; ok: boolean }>(`/ai/cases/folders/${id}`);
}

/**
 * PATCH /ai/cases/results/:id/folder - Mover caso para pasta
 */
export async function moveCaseToFolder(caseId: string, input: MoveCaseToFolderInput): Promise<MoveCaseToFolderResponse['data']> {
  const { data } = await axios.patch<MoveCaseToFolderResponse>(`/ai/cases/results/${caseId}/folder`, input);
  return data.data;
}