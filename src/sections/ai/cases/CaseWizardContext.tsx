import { createContext, useContext, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Department, getDepartment } from 'api/departments';
import { Customer, getCustomer } from 'api/customers';
import { AiPiece, fetchPieceDocx, getPiece } from 'api/aiPieces';
import { AiTopic, getTopic } from 'api/aiTopics';
import { AiTopicSpecific, fetchTopicSpecificDocx, getTopicSpecific } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import { saveWorkspaceState, getWorkspaceState } from 'api/workspace';
import type {
  CaseContextFields,
  AttachmentBox,
  CaseAttachmentMeta,
  CaseCommonAttachmentMeta,
  ContestationCategoryCode,
  CaseDraftPayload
} from 'api/aiCases';
import { putCaseDraft, putCaseDraftWithFiles, getCaseDraftAttachment } from 'api/aiCases';

export type OptionDept = Pick<Department, 'id'|'name'>;
export type OptionCust = Pick<Customer, 'id'|'displayName'|'name'|'kind'|'isMatriz'|'isFilial'|'parentCustomerId'>;
export type OptionPiece = AiPiece;
export type OptionTopic = AiTopic;
export type OptionSpec = AiTopicSpecific;

import type { OcrTestResponse } from 'api/aiDocs';

export type CaseAttachmentItem = {
  id: string;
  topicSpecificId: string;
  box: AttachmentBox;
  file: File;
  /** preenchido após upload no rascunho (POST draft/attachments) */
  fileId?: string;
  ocrResult?: OcrTestResponse;
};

export type CaseCommonAttachmentItem = {
  id: string;
  file: File;
  /** preenchido após upload no rascunho (POST draft/attachments) */
  fileId?: string;
  ocrResult?: OcrTestResponse;
};

type WizardState = {
  step: number;
  deptId: string | null;
  customerIds: string[];
  pieceId: string | null;
  topicIds: string[];
  specIds: string[];
  /** Mapa categoria → IDs de tópicos específicos (quando usa categorias da contestação) */
  topicSpecificsByCategory?: Partial<Record<ContestationCategoryCode, string[]>>;
  /** Mapa categoria → promptId (quando usa prompts por categoria) */
  categoryPromptIds?: Partial<Record<ContestationCategoryCode, string>>;
  instruction: string;
  timestamp: number;
};

type Ctx = {
  step: number;
  setStep: (n: number) => void;
  // selections
  dept: OptionDept | null; setDept: (v: OptionDept|null) => void;
  customers: OptionCust[]; setCustomers: (v: OptionCust[]) => void;
  piece: OptionPiece | null; setPiece: (v: OptionPiece|null) => void;
  /** Tópico principal (derivado do primeiro da lista `topics`) para telas que ainda esperam 1 */
  topic: OptionTopic | null; setTopic: (v: OptionTopic|null) => void;
  /** NOVO: múltiplos tópicos selecionados */
  topics: OptionTopic[]; setTopics: (v: OptionTopic[]) => void;
  specs: OptionSpec[]; setSpecs: (v: OptionSpec[]) => void;
  /** Categorias da contestação: mapa categoria → lista ordenada de IDs de tópicos específicos */
  topicSpecificsByCategory: Partial<Record<ContestationCategoryCode, string[]>>;
  setTopicSpecificsByCategory: React.Dispatch<React.SetStateAction<Partial<Record<ContestationCategoryCode, string[]>>>>;
  /** Prompts por categoria: mapa categoria → promptId */
  categoryPromptIds: Partial<Record<ContestationCategoryCode, string>>;
  setCategoryPromptIds: React.Dispatch<React.SetStateAction<Partial<Record<ContestationCategoryCode, string>>>>;
  // save/restore state
  saveWizardState: () => void;
  restoreWizardState: () => Promise<void>;
  // rascunho (auto-save 24h)
  buildDraftPayload: () => CaseDraftPayload;
  applyDraft: (draft: CaseDraftPayload) => Promise<void>;
  // details (preview)
  pieceDetail: OptionPiece | null; setPieceDetail: (v: OptionPiece|null) => void;
  topicDetail: OptionTopic | null; setTopicDetail: (v: OptionTopic|null) => void;
  specDetails: Record<string, OptionSpec>;
  setSpecDetails: (m: Record<string, OptionSpec>) => void;
  // instructions + attachments
  instruction: string; setInstruction: (t: string) => void;
  attachments: CaseAttachmentItem[];
  setAttachments: (f: CaseAttachmentItem[]) => void;
  addAttachments: (topicSpecificId: string, box: AttachmentBox, files: File[]) => string[];
  removeAttachment: (id: string) => void;
  clearAttachments: (topicSpecificId?: string) => void;
  updateAttachmentOcr: (id: string, ocrResult: OcrTestResponse) => void;
  // common attachments
  commonAttachments: CaseCommonAttachmentItem[];
  addCommonAttachments: (files: File[]) => string[];
  removeCommonAttachment: (id: string) => void;
  updateCommonAttachmentOcr: (id: string, ocrResult: OcrTestResponse) => void;
  // helpers
  canNext: (s: number) => boolean;
  maxStep: number;
  payloadPreview: any; // mantido para compat, mas agora usamos formPreview para exibir no UI
  validateAttachments: () => { valid: boolean; missingSpecs: string[]; missingBoxes: Array<{ specName: string; box: 'claimant' | 'client' }> };
  hasOcrErrors: () => { hasErrors: boolean; errorFiles: string[] };
  // downloads
  downloadPieceDocx: () => Promise<void>;
  downloadSpecDocx: (id: string) => Promise<void>;
  // envio
  buildFormData: () => FormData;
  buildCaseContextFormData: () => FormData;
  formPreview: {
    contentType: 'multipart/form-data';
    fields: {
      departmentId: string | null;
      customerIds: string[];
      pieceId: string | null;
      topicId: string | null;
      topicIds: string[];
      topicSpecificIds: string[];
      topicSpecificsByCategory?: Partial<Record<ContestationCategoryCode, string[]>>;
      categoryPromptIds?: Partial<Record<ContestationCategoryCode, string>>;
      instruction: string | null;
      attachmentsMeta?: CaseAttachmentMeta[];
      commonAttachmentsMeta?: CaseCommonAttachmentMeta[];
    };
    attachments: { name: string; type: string; size: number; topicSpecificId?: string; box?: AttachmentBox }[];
    commonAttachments: { name: string; type: string; size: number }[];
  };
};

const CaseWizardContext = createContext<Ctx | null>(null);
export const useCaseWizard = () => {
  const ctx = useContext(CaseWizardContext);
  if (!ctx) throw new Error('useCaseWizard must be used within CaseWizardProvider');
  return ctx;
};

export function CaseWizardProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(0);
  const maxStep = 5; // 0..5

  const [dept, setDept] = useState<OptionDept | null>(null);
  const [customers, setCustomers] = useState<OptionCust[]>([]);
  const [piece, setPiece] = useState<OptionPiece | null>(null);
  const [topic, setTopic] = useState<OptionTopic | null>(null); // principal (primeiro)
  const [topics, setTopics] = useState<OptionTopic[]>([]);      // NOVO: múltiplos
  const [specs, setSpecs] = useState<OptionSpec[]>([]);
  const [topicSpecificsByCategory, setTopicSpecificsByCategory] = useState<
    Partial<Record<ContestationCategoryCode, string[]>>
  >({});
  const [categoryPromptIds, setCategoryPromptIds] = useState<
    Partial<Record<ContestationCategoryCode, string>>
  >({});

  // Flag para desabilitar resets automáticos durante restauração
  const isRestoringRef = useRef(false);
  // Flag para evitar múltiplas chamadas simultâneas de saveWizardState
  const isSavingRef = useRef(false);
  // Timer do auto-save de rascunho (PUT /ai/cases/draft)
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftPayloadRef = useRef<CaseDraftPayload>({});
  const attachmentsRef = useRef<CaseAttachmentItem[]>([]);
  const commonAttachmentsRef = useRef<CaseCommonAttachmentItem[]>([]);
  const saveWizardStateRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [pieceDetail, setPieceDetail] = useState<OptionPiece | null>(null);
  const [topicDetail, setTopicDetail] = useState<OptionTopic | null>(null);
  const [specDetails, setSpecDetails] = useState<Record<string, OptionSpec>>({});

  const [instruction, setInstruction] = useState('');
  const [attachments, setAttachments] = useState<CaseAttachmentItem[]>([]);
  const [commonAttachments, setCommonAttachments] = useState<CaseCommonAttachmentItem[]>([]);

  const genId = () => {
    try {
      // @ts-ignore
      return globalThis?.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  };

  const addAttachments = (topicSpecificId: string, box: AttachmentBox, filesToAdd: File[]): string[] => {
    if (!filesToAdd?.length) return [];
    const items = filesToAdd.map((file) => ({
      id: genId(),
      topicSpecificId,
      box,
      file
    }));
    setAttachments((prev) => [...prev, ...items]);
    return items.map(i => i.id);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAttachments = (topicSpecificId?: string) => {
    if (!topicSpecificId) return setAttachments([]);
    setAttachments((prev) => prev.filter((a) => a.topicSpecificId !== topicSpecificId));
  };

  const addCommonAttachments = (filesToAdd: File[]): string[] => {
    if (!filesToAdd?.length) return [];
    const items = filesToAdd.map((file) => ({
      id: genId(),
      file
    }));
    setCommonAttachments((prev) => [...prev, ...items]);
    return items.map(i => i.id);
  };

  const removeCommonAttachment = (id: string) => {
    setCommonAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAttachmentOcr = (id: string, ocrResult: OcrTestResponse) => {
    setAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ocrResult } : a)));
  };

  const updateCommonAttachmentOcr = (id: string, ocrResult: OcrTestResponse) => {
    setCommonAttachments((prev) => prev.map((a) => (a.id === id ? { ...a, ocrResult } : a)));
  };

  // encadeamento de resets (desabilitado durante restauração)
  useEffect(() => { 
    if (isRestoringRef.current) return;
    setPiece(null); setTopic(null); setTopics([]); setSpecs([]); 
  }, [dept?.id, customers.map(c=>c.id).join('|')]);
  useEffect(() => { 
    if (isRestoringRef.current) return;
    setTopic(null); setTopics([]); setSpecs([]); 
  }, [piece?.id]);
  useEffect(() => {
    if (isRestoringRef.current) return;
    setSpecs([]);
    setTopicSpecificsByCategory({});
    setCategoryPromptIds({});
  }, [topic?.id]);
  // NOVO: se a lista de tópicos mudar (mesmo que o primeiro permaneça igual), manter apenas specs dos tópicos que permaneceram
  useEffect(() => { 
    if (isRestoringRef.current) return;
    // Mantém apenas os tópicos específicos que pertencem aos tópicos que ainda estão selecionados
    setSpecs((prevSpecs) => {
      const currentTopicIds = new Set(topics.map(t => t.id));
      return prevSpecs.filter(spec => currentTopicIds.has(spec.topicId));
    });
  }, [topics.map(t => t.id).join('|')]);

  // remove anexos de specs que não estão mais selecionados
  useEffect(() => {
    const allowed = new Set(specs.map((s) => s.id));
    setAttachments((prev) => prev.filter((a) => allowed.has(a.topicSpecificId)));
  }, [specs.map(s => s.id).join('|')]);

  // Deriva `topic` (principal) do primeiro item de `topics`
  useEffect(() => {
    setTopic(topics[0] ?? null);
  }, [topics]);

  // Valida se há documentos para processar: arquivos em comum OU pelo menos 1 anexo por tópico (reclamante OU reclamada)
  const validateAttachments = () => {
    if (specs.length === 0) {
      return { valid: true, missingSpecs: [], missingBoxes: [] }; // se não há specs, não precisa validar
    }
    // Se há arquivos em comum (ex.: petição inicial), já pode gerar
    if (commonAttachments.length > 0) {
      return { valid: true, missingSpecs: [], missingBoxes: [] };
    }
    const specIds = new Set(specs.map(s => s.id));
    const attachmentsBySpecAndBox = new Map<string, { claimant: number; client: number }>();
    specs.forEach(s => {
      attachmentsBySpecAndBox.set(s.id, { claimant: 0, client: 0 });
    });
    attachments.forEach(a => {
      if (specIds.has(a.topicSpecificId)) {
        const current = attachmentsBySpecAndBox.get(a.topicSpecificId) || { claimant: 0, client: 0 };
        if (a.box === 'claimant') current.claimant += 1;
        else if (a.box === 'client') current.client += 1;
        attachmentsBySpecAndBox.set(a.topicSpecificId, current);
      }
    });
    // Só exige pelo menos 1 documento por tópico (em qualquer caixa); não exige as duas caixas
    const missingSpecs: string[] = [];
    specs.forEach(s => {
      const counts = attachmentsBySpecAndBox.get(s.id) || { claimant: 0, client: 0 };
      const hasAny = counts.claimant > 0 || counts.client > 0;
      if (!hasAny) missingSpecs.push(s.name);
    });
    return {
      valid: missingSpecs.length === 0,
      missingSpecs,
      missingBoxes: [] // não bloqueia mais por caixa vazia; fluxo segue com os docs disponíveis
    };
  };

  const hasOcrErrors = () => {
    const errorFiles: string[] = [];
    
    // Verifica anexos regulares
    attachments.forEach(a => {
      if (a.ocrResult && a.ocrResult.ocr === 'Erro') {
        errorFiles.push(a.file.name);
      }
    });
    
    // Verifica anexos em comum
    commonAttachments.forEach(a => {
      if (a.ocrResult && a.ocrResult.ocr === 'Erro') {
        errorFiles.push(a.file.name);
      }
    });
    
    return {
      hasErrors: errorFiles.length > 0,
      errorFiles
    };
  };

  // validate step gating
  const canNext = (s: number) => {
    switch (s) {
      case 0: return !!dept?.id; // departamento
      case 1: return true;       // cliente é opcional
      case 2: return !!piece?.id && !!piece?.docxFileId; // peça com DOCX obrigatório
      case 3: return topics.length > 0; // agora exige >=1 tópico
      case 4: {
        // Valida se há specs selecionados e se todos têm DOCX
        if (specs.length === 0) return false;
        // Verifica se todos os specs têm docxFileId usando specDetails (que tem dados atualizados)
        const specsWithoutDocx = specs.filter(s => {
          const detail = specDetails[s.id];
          return !detail?.docxFileId;
        });
        return specsWithoutDocx.length === 0;
      }
      case 5: return validateAttachments().valid; // valida se todos os specs têm anexos
      default: return false;
    }
  };

  const payloadPreview = useMemo(() => ({
    departmentId: dept?.id ?? null,
    customerIds: customers.map(c => c.id),
    pieceId: piece?.id ?? null,
    topicId: topic?.id ?? null,          // legado
    topicIds: topics.map(t => t.id),     // NOVO
    topicSpecificIds: specs.map(s => s.id),
    instruction: instruction.trim() || null,
    attachmentsCount: attachments.length
  }), [dept, customers, piece, topic, topics, specs, instruction, attachments.length]);

  // --- multipart/form-data builder ---
  const buildFormData = () => {
    const fd = new FormData();
    if (dept?.id) fd.append('departmentId', dept.id);
    if (customers.length) {
      for (const id of customers.map(c => c.id)) {
        fd.append('customerIds[]', id);
      }
    }
    if (piece?.id) fd.append('pieceId', piece.id);
    // Retrocompat: ainda envia topicId (principal)
    if (topic?.id) fd.append('topicId', topic.id);
    // NOVO: envia topicIds[] (múltiplos) quando houver
    if (topics.length) {
      for (const id of topics.map(t => t.id)) {
        fd.append('topicIds[]', id);
      }
    }
    for (const id of specs.map(s => s.id)) {
      fd.append('topicSpecificIds[]', id);
    }
    if (instruction.trim()) {
      fd.append('instruction', instruction.trim());
    }
    // legado: envia somente os arquivos (sem meta) para endpoints antigos
    attachments.forEach(({ file }) => {
      // nome do campo: attachments[]  (compatível com Nest + multer)
      fd.append('attachments[]', file, file.name);
    });
    return fd;
  };

  /**
   * Builder específico para o endpoint POST /ai/cases/context
   * - Envia um único campo "fields" (string JSON) com o payload consolidado
   * - Anexa arquivos no campo "attachments" (sem []), múltiplas ocorrências
   */
  const buildCaseContextFormData = () => {
    if (!dept?.id || !piece?.id || !piece?.docxFileId) {
      throw new Error('Departamento e Peça com DOCX são obrigatórios para criar o caso.');
    }
    const validation = validateAttachments();
    if (!validation.valid) {
      const msg = validation.missingSpecs.length > 0
        ? `Adicione ao menos um documento por tópico (reclamante ou reclamada) ou use arquivos em comum. Faltam anexos nos tópicos: ${validation.missingSpecs.join(', ')}`
        : 'Adicione ao menos um documento por tópico ou arquivos em comum para criar o caso.';
      throw new Error(msg);
    }
    const fields: CaseContextFields = {
      departmentId: dept.id,
      pieceId: piece.id,
    };
    if (customers.length) {
      fields.customerIds = customers.map(c => c.id);
    }
    // Retrocompat: topicId (principal)
    if (topic?.id) fields.topicId = topic.id;
    // NOVO: topicIds (múltiplos)
    if (topics.length) {
      fields.topicIds = topics.map(t => t.id);
    }

    // Categorias da contestação: quando há topicSpecificsByCategory com pelo menos uma categoria não vazia, envia e não envia topicSpecificIds
    const hasCategoryData = Object.values(topicSpecificsByCategory || {}).some((arr) => arr?.length);
    if (hasCategoryData && topicSpecificsByCategory) {
      fields.topicSpecificsByCategory = topicSpecificsByCategory;
      const promptIds = Object.fromEntries(
        Object.entries(categoryPromptIds || {}).filter(([, id]) => !!id)
      ) as Partial<Record<ContestationCategoryCode, string>>;
      if (Object.keys(promptIds).length) fields.categoryPromptIds = promptIds;
    } else {
      const ts = specs.map((s) => s.id);
      if (ts.length) fields.topicSpecificIds = ts;
    }
    if (instruction.trim()) fields.instruction = instruction.trim();

    // --- NOVO: meta dos anexos por spec + caixa ---
    const attachmentsMeta: CaseAttachmentMeta[] = attachments.map((a, index) => ({
      index,
      topicSpecificId: a.topicSpecificId,
      box: a.box,
      name: a.file.name,
      type: a.file.type,
      size: a.file.size
    }));
    if (attachmentsMeta.length) fields.attachmentsMeta = attachmentsMeta;

    // --- NOVO: meta dos arquivos em comum ---
    const commonAttachmentsMeta: CaseCommonAttachmentMeta[] = commonAttachments.map((a, index) => ({
      index,
      name: a.file.name,
      type: a.file.type,
      size: a.file.size,
      isCommon: true as const
    }));
    if (commonAttachmentsMeta.length) fields.commonAttachmentsMeta = commonAttachmentsMeta;

    const fd = new FormData();
    fd.append('fields', JSON.stringify(fields));
    // importante: mesma ordem do attachmentsMeta
    attachments.forEach((a) => {
      fd.append('attachments', a.file, a.file.name);
    });
    // arquivos comuns em campo separado
    commonAttachments.forEach((a) => {
      fd.append('commonAttachments', a.file, a.file.name);
    });
    return fd;
  };

  /**
   * Monta o payload do rascunho (PUT /ai/cases/draft): mesmo formato do formulário, apenas metadados (sem arquivos).
   */
  const buildDraftPayload = useCallback((): CaseDraftPayload => {
    const payload: CaseDraftPayload = {};
    if (dept?.id) payload.departmentId = dept.id;
    if (customers.length) payload.customerIds = customers.map(c => c.id);
    if (piece?.id) payload.pieceId = piece.id;
    if (topic?.id) payload.topicId = topic.id;
    if (topics.length) payload.topicIds = topics.map(t => t.id);
    const hasCategoryData = Object.values(topicSpecificsByCategory || {}).some((arr) => arr?.length);
    if (hasCategoryData && topicSpecificsByCategory) {
      payload.topicSpecificsByCategory = topicSpecificsByCategory;
      const promptIds = Object.fromEntries(
        Object.entries(categoryPromptIds || {}).filter(([, id]) => !!id)
      ) as Partial<Record<ContestationCategoryCode, string>>;
      if (Object.keys(promptIds).length) payload.categoryPromptIds = promptIds;
    } else if (specs.length) {
      payload.topicSpecificIds = specs.map(s => s.id);
    }
    if (instruction.trim()) payload.instruction = instruction.trim();
    const attachmentsMeta: CaseAttachmentMeta[] = attachments.map((a, index) => ({
      index,
      topicSpecificId: a.topicSpecificId,
      box: a.box,
      name: a.file.name,
      type: a.file.type,
      size: a.file.size,
      ...(a.fileId ? { fileId: a.fileId } : {})
    }));
    if (attachmentsMeta.length) payload.attachmentsMeta = attachmentsMeta;
    const commonAttachmentsMeta: CaseCommonAttachmentMeta[] = commonAttachments.map((a, index) => ({
      index,
      name: a.file.name,
      type: a.file.type,
      size: a.file.size,
      isCommon: true as const,
      ...(a.fileId ? { fileId: a.fileId } : {})
    }));
    if (commonAttachmentsMeta.length) payload.commonAttachmentsMeta = commonAttachmentsMeta;
    return payload;
  }, [dept?.id, customers, piece?.id, topic?.id, topics, specs, topicSpecificsByCategory, categoryPromptIds, instruction, attachments, commonAttachments]);

  /**
   * Aplica um rascunho ao formulário (após GET /ai/cases/draft).
   * Se o rascunho tiver attachmentsMeta/commonAttachmentsMeta com fileId, busca cada arquivo via GET draft/attachments/:fileId e restaura como File nos itens.
   */
  const applyDraft = useCallback(async (draft: CaseDraftPayload) => {
    isRestoringRef.current = true;
    try {
      if (draft.departmentId) {
        const deptData = await getDepartment(draft.departmentId);
        setDept({ id: deptData.id, name: deptData.name });
      }
      if (draft.customerIds?.length) {
        const customersData = await Promise.all(draft.customerIds.map(id => getCustomer(id)));
        setCustomers(customersData.map(c => ({
          id: c.id,
          displayName: c.displayName,
          name: c.name,
          kind: c.kind,
          isMatriz: c.isMatriz,
          isFilial: c.isFilial,
          parentCustomerId: c.parentCustomerId
        })));
      }
      if (draft.pieceId) {
        try {
          const pieceData = await getPiece(draft.pieceId);
          setPiece(pieceData);
        } catch (err) {
          console.error('Erro ao restaurar peça do rascunho:', err);
        }
      }
      if (draft.topicIds?.length) {
        try {
          const topicsData = await Promise.all(draft.topicIds.map(id => getTopic(id)));
          setTopics(topicsData);
        } catch (err) {
          console.error('Erro ao restaurar tópicos do rascunho:', err);
        }
      }
      const specIdsToRestore = draft.topicSpecificIds?.length
        ? draft.topicSpecificIds
        : (draft.topicSpecificsByCategory && Object.keys(draft.topicSpecificsByCategory).length > 0)
          ? Array.from(new Set(Object.values(draft.topicSpecificsByCategory).flat()))
          : [];
      if (specIdsToRestore.length) {
        try {
          const specsData = await Promise.all(specIdsToRestore.map(id => getTopicSpecific(id)));
          const restoredTopicIds = new Set(draft.topicIds || []);
          const validSpecs = specsData.filter(spec => restoredTopicIds.has(spec.topicId));
          setSpecs(validSpecs);
        } catch (err) {
          console.error('Erro ao restaurar tópicos específicos do rascunho:', err);
        }
      }
      if (draft.topicSpecificsByCategory && Object.keys(draft.topicSpecificsByCategory).length > 0) {
        setTopicSpecificsByCategory(draft.topicSpecificsByCategory);
      }
      if (draft.categoryPromptIds && Object.keys(draft.categoryPromptIds).length > 0) {
        setCategoryPromptIds(draft.categoryPromptIds);
      }
      if (draft.instruction) setInstruction(draft.instruction);

      const restoredSpecIds = new Set(specIdsToRestore);

      if (draft.attachmentsMeta?.length && draft.attachmentsMeta.some((m) => m.fileId)) {
        const items: CaseAttachmentItem[] = [];
        for (let i = 0; i < draft.attachmentsMeta.length; i++) {
          const meta = draft.attachmentsMeta[i];
          if (!meta.fileId || !restoredSpecIds.has(meta.topicSpecificId)) continue;
          try {
            const blob = await getCaseDraftAttachment(meta.fileId);
            const file = new File([blob], meta.name, { type: meta.type || 'application/octet-stream' });
            items.push({
              id: genId(),
              topicSpecificId: meta.topicSpecificId,
              box: meta.box,
              file,
              fileId: meta.fileId
            });
          } catch (err) {
            console.warn('Erro ao baixar anexo do rascunho:', meta.name, err);
          }
        }
        setAttachments(items);
      } else {
        setAttachments([]);
      }

      if (draft.commonAttachmentsMeta?.length && draft.commonAttachmentsMeta.some((m) => m.fileId)) {
        const items: CaseCommonAttachmentItem[] = [];
        for (let i = 0; i < draft.commonAttachmentsMeta.length; i++) {
          const meta = draft.commonAttachmentsMeta[i];
          if (!meta.fileId) continue;
          try {
            const blob = await getCaseDraftAttachment(meta.fileId);
            const file = new File([blob], meta.name, { type: meta.type || 'application/octet-stream' });
            items.push({ id: genId(), file, fileId: meta.fileId });
          } catch (err) {
            console.warn('Erro ao baixar anexo comum do rascunho:', meta.name, err);
          }
        }
        setCommonAttachments(items);
      } else {
        setCommonAttachments([]);
      }

      await new Promise(r => setTimeout(r, 300));
    } finally {
      isRestoringRef.current = false;
    }
  }, []);

  // Salva o estado completo do wizard no Redis (workspace) e sessionStorage (fallback). Declarado antes do useEffect de draft para evitar "before initialization".
  const saveWizardState = useCallback(async () => {
    if (isSavingRef.current) return; // Evita múltiplas chamadas simultâneas
    if (isRestoringRef.current) return; // Não salva durante restauração

    try {
      isSavingRef.current = true;
      const state: WizardState = {
        step,
        deptId: dept?.id ?? null,
        customerIds: customers.map(c => c.id),
        pieceId: piece?.id ?? null,
        topicIds: topics.map(t => t.id),
        specIds: specs.map(s => s.id),
        topicSpecificsByCategory: Object.keys(topicSpecificsByCategory || {}).length
          ? topicSpecificsByCategory
          : undefined,
        categoryPromptIds: Object.keys(categoryPromptIds || {}).length ? categoryPromptIds : undefined,
        instruction,
        timestamp: Date.now()
      };

      // Salva no Redis via workspace API
      try {
        await saveWorkspaceState({
          context: 'case-wizard',
          resourceId: null,
          state: state as any,
          metadata: {
            url: window.location.pathname,
            timestamp: new Date().toISOString()
          }
        });
      } catch (redisErr) {
        console.warn('Erro ao salvar estado no Redis, usando sessionStorage como fallback:', redisErr);
      }

      // Mantém sessionStorage como fallback
      sessionStorage.setItem('wizard_return_state', JSON.stringify(state));
    } catch (err) {
      console.error('Erro ao salvar estado do wizard:', err);
    } finally {
      isSavingRef.current = false;
    }
  }, [step, dept?.id, customers, piece?.id, topics, specs, topicSpecificsByCategory, categoryPromptIds, instruction]);

  // Auto-save do rascunho: debounce 45s após última alteração; salva também ao trocar de etapa. Com anexos: PUT /ai/cases/draft/with-files (payload + arquivos); sem anexos: PUT /ai/cases/draft (JSON).
  const prevStepRef = useRef(step);
  useEffect(() => {
    if (isRestoringRef.current) return;
    saveWizardStateRef.current = saveWizardState;
    const payload = buildDraftPayload();
    draftPayloadRef.current = payload;
    attachmentsRef.current = attachments;
    commonAttachmentsRef.current = commonAttachments;
    if (Object.keys(payload).length === 0) return;

    const stepChanged = prevStepRef.current !== step;
    prevStepRef.current = step;

    const doSave = async () => {
      const currentPayload = draftPayloadRef.current;
      const currentAttachments = attachmentsRef.current;
      const currentCommon = commonAttachmentsRef.current;
      const hasNewFiles =
        currentAttachments.some((a) => !a.fileId) || currentCommon.some((a) => !a.fileId);
      const hasAnyAttachment = currentAttachments.length > 0 || currentCommon.length > 0;

      try {
        if (hasAnyAttachment && hasNewFiles) {
          // PUT /ai/cases/draft/with-files: payload (JSON) + apenas arquivos NOVOS (sem fileId), na ordem: attachmentsMeta, depois commonAttachmentsMeta.
          const fd = new FormData();
          fd.append('payload', JSON.stringify(currentPayload));
          currentAttachments.filter((a) => !a.fileId).forEach((a) => fd.append('file', a.file, a.file.name));
          currentCommon.filter((a) => !a.fileId).forEach((a) => fd.append('file', a.file, a.file.name));
          await putCaseDraftWithFiles(fd);
        } else if (hasAnyAttachment && !hasNewFiles) {
          // Todos os anexos já têm fileId (restaurados do rascunho): salva só o payload (JSON).
          await putCaseDraft(currentPayload);
        } else {
          await putCaseDraft(currentPayload);
        }
        // Atualiza o Redis (workspace) após salvar o rascunho para manter estado em sync
        saveWizardStateRef.current().catch((err) => console.warn('Erro ao salvar estado do wizard no Redis:', err));
      } catch (err) {
        console.warn('Falha ao salvar rascunho automaticamente:', err);
      }
    };

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    if (stepChanged) {
      doSave();
    }
    draftSaveTimerRef.current = setTimeout(() => {
      draftSaveTimerRef.current = null;
      doSave();
    }, 45000);

    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [step, dept?.id, customers.map(c => c.id).join('|'), piece?.id, topics.map(t => t.id).join('|'), specs.map(s => s.id).join('|'), topicSpecificsByCategory, categoryPromptIds, instruction, attachments, commonAttachments, buildDraftPayload, saveWizardState]);

  // Pré-visualização amigável para o Drawer
  const formPreview = useMemo(() => ({
    contentType: 'multipart/form-data' as const,
    fields: {
      departmentId: dept?.id ?? null,
      customerIds: customers.map(c => c.id),
      pieceId: piece?.id ?? null,
      topicId: topic?.id ?? null,
      topicIds: topics.map(t => t.id),
      topicSpecificIds: specs.map(s => s.id),
      topicSpecificsByCategory: Object.keys(topicSpecificsByCategory || {}).length
        ? topicSpecificsByCategory
        : undefined,
      categoryPromptIds: Object.keys(categoryPromptIds || {}).length ? categoryPromptIds : undefined,
      instruction: instruction.trim() || null,
      attachmentsMeta: attachments.map((a, index) => ({
        index,
        topicSpecificId: a.topicSpecificId,
        box: a.box,
        name: a.file.name,
        type: a.file.type,
        size: a.file.size
      })),
      commonAttachmentsMeta: commonAttachments.map((a, index) => ({
        index,
        name: a.file.name,
        type: a.file.type,
        size: a.file.size,
        isCommon: true as const
      }))
    },
    attachments: attachments.map(a => ({
      name: a.file.name,
      type: a.file.type,
      size: a.file.size,
      topicSpecificId: a.topicSpecificId,
      box: a.box
    })),
    commonAttachments: commonAttachments.map(a => ({
      name: a.file.name,
      type: a.file.type,
      size: a.file.size
    }))
  }), [dept?.id, customers.map(c=>c.id).join('|'), piece?.id, topic?.id, topics.map(t=>t.id).join('|'), specs.map(s=>s.id).join('|'), topicSpecificsByCategory, categoryPromptIds, instruction, attachments.map(a=>a.id).join('|'), commonAttachments.map(a=>a.id).join('|')]);

  const downloading = useRef(false);
  const downloadPieceDocx = async () => {
    if (!pieceDetail?.id || !pieceDetail.docxFileId || downloading.current) return;
    try {
      downloading.current = true;
      const { blob, filename } = await fetchPieceDocx(pieceDetail.id, pieceDetail.docxFileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${(pieceDetail.name || 'documento').replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao baixar DOCX da peça', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      downloading.current = false;
    }
  };

  const downloadSpecDocx = async (id: string) => {
    const s = specDetails[id];
    if (!s?.id || !s.docxFileId || downloading.current) return;
    try {
      downloading.current = true;
      const { blob, filename } = await fetchTopicSpecificDocx(s.id, s.docxFileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${(s.name || 'documento').replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao baixar DOCX do tópico específico', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      downloading.current = false;
    }
  };

  // Salva automaticamente o estado no Redis quando os tópicos específicos ou tópicos mudarem
  useEffect(() => {
    if (isRestoringRef.current) return;
    // Salva após um pequeno delay para evitar muitas chamadas
    const timeoutId = setTimeout(() => {
      saveWizardState();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [specs.map(s => s.id).join('|'), topics.map(t => t.id).join('|'), saveWizardState]);

  // Restaura o estado completo do wizard do Redis (workspace) ou sessionStorage (fallback)
  const restoreWizardState = async () => {
    try {
      let state: WizardState | null = null;

      // Tenta buscar do Redis primeiro
      try {
        const workspaceResponse = await getWorkspaceState('case-wizard');
        if (workspaceResponse?.data?.state) {
          state = workspaceResponse.data.state as WizardState;
        }
      } catch (redisErr) {
        console.warn('Erro ao buscar estado do Redis, tentando sessionStorage:', redisErr);
      }

      // Se não encontrou no Redis, tenta sessionStorage como fallback
      if (!state) {
        const saved = sessionStorage.getItem('wizard_return_state');
        if (saved) {
          state = JSON.parse(saved);
        }
      }

      if (!state) return;

      // Verifica se o estado não é muito antigo (mais de 2 horas)
      const twoHours = 2 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp > twoHours) {
        sessionStorage.removeItem('wizard_return_state');
        return;
      }

      // Ativa flag de restauração para desabilitar resets automáticos
      isRestoringRef.current = true;

      // Restaura a etapa primeiro
      setStep(state.step);

      // Restaura departamento e clientes em paralelo
      const deptPromise = state.deptId ? getDepartment(state.deptId) : Promise.resolve(null);
      const customersPromises = state.customerIds.length > 0
        ? Promise.all(state.customerIds.map(id => getCustomer(id)))
        : Promise.resolve([]);

      const [deptData, customersData] = await Promise.all([deptPromise, customersPromises]);

      // Define departamento
      if (deptData) {
        setDept({ id: deptData.id, name: deptData.name });
      }

      // Define clientes
      if (customersData.length > 0) {
        setCustomers(customersData.map(c => ({
          id: c.id,
          displayName: c.displayName,
          name: c.name,
          kind: c.kind,
          isMatriz: c.isMatriz,
          isFilial: c.isFilial,
          parentCustomerId: c.parentCustomerId
        })));
      }

      // Restaura peça
      if (state.pieceId) {
        try {
          const pieceData = await getPiece(state.pieceId);
          setPiece(pieceData);
        } catch (err) {
          console.error('Erro ao restaurar peça:', err);
        }
      }

      // Restaura tópicos
      if (state.topicIds.length > 0) {
        try {
          const topicsData = await Promise.all(
            state.topicIds.map(id => getTopic(id))
          );
          setTopics(topicsData);
        } catch (err) {
          console.error('Erro ao restaurar tópicos:', err);
        }
      }

      // Restaura tópicos específicos - IMPORTANTE: mantém apenas os que pertencem aos tópicos restaurados
      if (state.specIds.length > 0) {
        try {
          const specsData = await Promise.all(
            state.specIds.map(id => getTopicSpecific(id))
          );
          // Filtra apenas os tópicos específicos que pertencem aos tópicos que foram restaurados
          // Isso garante que se um tópico foi removido, seus tópicos específicos também sejam removidos
          const restoredTopicIds = new Set(state.topicIds);
          const validSpecs = specsData.filter(spec => restoredTopicIds.has(spec.topicId));
          setSpecs(validSpecs);
        } catch (err) {
          console.error('Erro ao restaurar tópicos específicos:', err);
        }
      }

      if (state.topicSpecificsByCategory && Object.keys(state.topicSpecificsByCategory).length > 0) {
        setTopicSpecificsByCategory(state.topicSpecificsByCategory);
      }
      if (state.categoryPromptIds && Object.keys(state.categoryPromptIds).length > 0) {
        setCategoryPromptIds(state.categoryPromptIds);
      }

      // Restaura instrução
      if (state.instruction) {
        setInstruction(state.instruction);
      }

      // Aguarda um pouco para garantir que todos os estados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove o estado salvo após restaurar (tanto Redis quanto sessionStorage)
      try {
        sessionStorage.removeItem('wizard_return_state');
      } catch {}
      
      // Desativa flag de restauração
      isRestoringRef.current = false;
    } catch (err) {
      console.error('Erro ao restaurar estado do wizard:', err);
      try {
        sessionStorage.removeItem('wizard_return_state');
      } catch {}
      isRestoringRef.current = false;
    }
  };

  return (
    <CaseWizardContext.Provider value={{
      step, setStep,
      dept, setDept,
      customers, setCustomers,
      piece, setPiece,
      topic, setTopic,
      topics, setTopics,
      specs, setSpecs,
      topicSpecificsByCategory, setTopicSpecificsByCategory,
      categoryPromptIds, setCategoryPromptIds,
      pieceDetail, setPieceDetail,
      topicDetail, setTopicDetail,
      specDetails, setSpecDetails,
      instruction, setInstruction,
      attachments, setAttachments,
      addAttachments, removeAttachment, clearAttachments, updateAttachmentOcr,
      commonAttachments, addCommonAttachments, removeCommonAttachment, updateCommonAttachmentOcr,
      canNext, maxStep, payloadPreview, validateAttachments, hasOcrErrors,
      downloadPieceDocx, downloadSpecDocx,
      buildFormData, buildCaseContextFormData, formPreview,
      saveWizardState, restoreWizardState,
      buildDraftPayload, applyDraft
    }}>
      {children}
    </CaseWizardContext.Provider>
  );
}
