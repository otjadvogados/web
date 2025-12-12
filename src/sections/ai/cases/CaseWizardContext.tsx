import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { Department } from 'api/departments';
import { Customer } from 'api/customers';
import { AiPiece, fetchPieceDocx } from 'api/aiPieces';
import { AiTopic } from 'api/aiTopics';
import { AiTopicSpecific, fetchTopicSpecificDocx } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import type { CaseContextFields, AttachmentBox, CaseAttachmentMeta, CaseCommonAttachmentMeta } from 'api/aiCases';

export type OptionDept = Pick<Department, 'id'|'name'>;
export type OptionCust = Pick<Customer, 'id'|'displayName'|'name'|'kind'|'isMatriz'|'isFilial'|'parentCustomerId'>;
export type OptionPiece = AiPiece;
export type OptionTopic = AiTopic;
export type OptionSpec = AiTopicSpecific;

export type CaseAttachmentItem = {
  id: string;
  topicSpecificId: string;
  box: AttachmentBox;
  file: File;
};

export type CaseCommonAttachmentItem = {
  id: string;
  file: File;
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
  // details (preview)
  pieceDetail: OptionPiece | null; setPieceDetail: (v: OptionPiece|null) => void;
  topicDetail: OptionTopic | null; setTopicDetail: (v: OptionTopic|null) => void;
  specDetails: Record<string, OptionSpec>;
  setSpecDetails: (m: Record<string, OptionSpec>) => void;
  // instructions + attachments
  instruction: string; setInstruction: (t: string) => void;
  attachments: CaseAttachmentItem[];
  setAttachments: (f: CaseAttachmentItem[]) => void;
  addAttachments: (topicSpecificId: string, box: AttachmentBox, files: File[]) => void;
  removeAttachment: (id: string) => void;
  clearAttachments: (topicSpecificId?: string) => void;
  // common attachments
  commonAttachments: CaseCommonAttachmentItem[];
  addCommonAttachments: (files: File[]) => void;
  removeCommonAttachment: (id: string) => void;
  // helpers
  canNext: (s: number) => boolean;
  maxStep: number;
  payloadPreview: any; // mantido para compat, mas agora usamos formPreview para exibir no UI
  validateAttachments: () => { valid: boolean; missingSpecs: string[] };
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

  const addAttachments = (topicSpecificId: string, box: AttachmentBox, filesToAdd: File[]) => {
    if (!filesToAdd?.length) return;
    const items = filesToAdd.map((file) => ({
      id: genId(),
      topicSpecificId,
      box,
      file
    }));
    setAttachments((prev) => [...prev, ...items]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAttachments = (topicSpecificId?: string) => {
    if (!topicSpecificId) return setAttachments([]);
    setAttachments((prev) => prev.filter((a) => a.topicSpecificId !== topicSpecificId));
  };

  const addCommonAttachments = (filesToAdd: File[]) => {
    if (!filesToAdd?.length) return;
    const items = filesToAdd.map((file) => ({
      id: genId(),
      file
    }));
    setCommonAttachments((prev) => [...prev, ...items]);
  };

  const removeCommonAttachment = (id: string) => {
    setCommonAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // encadeamento de resets
  useEffect(() => { setPiece(null); setTopic(null); setTopics([]); setSpecs([]); }, [dept?.id, customers.map(c=>c.id).join('|')]);
  useEffect(() => { setTopic(null); setTopics([]); setSpecs([]); }, [piece?.id]);
  useEffect(() => { setSpecs([]); }, [topic?.id]);
  // NOVO: se a lista de tópicos mudar (mesmo que o primeiro permaneça igual), limpar specs
  useEffect(() => { setSpecs([]); }, [topics.map(t => t.id).join('|')]);

  // remove anexos de specs que não estão mais selecionados
  useEffect(() => {
    const allowed = new Set(specs.map((s) => s.id));
    setAttachments((prev) => prev.filter((a) => allowed.has(a.topicSpecificId)));
  }, [specs.map(s => s.id).join('|')]);

  // Deriva `topic` (principal) do primeiro item de `topics`
  useEffect(() => {
    setTopic(topics[0] ?? null);
  }, [topics]);

  // Valida se todos os tópicos específicos têm pelo menos 1 anexo
  const validateAttachments = () => {
    if (specs.length === 0) {
      return { valid: true, missingSpecs: [] }; // se não há specs, não precisa validar
    }
    const specIds = new Set(specs.map(s => s.id));
    const attachmentsBySpec = new Map<string, number>();
    
    // Conta anexos por spec (independente da caixa)
    attachments.forEach(a => {
      if (specIds.has(a.topicSpecificId)) {
        attachmentsBySpec.set(a.topicSpecificId, (attachmentsBySpec.get(a.topicSpecificId) || 0) + 1);
      }
    });
    
    // Encontra specs sem anexos
    const missingSpecs = specs
      .filter(s => !attachmentsBySpec.has(s.id) || attachmentsBySpec.get(s.id) === 0)
      .map(s => s.name);
    
    return {
      valid: missingSpecs.length === 0,
      missingSpecs
    };
  };

  // validate step gating
  const canNext = (s: number) => {
    switch (s) {
      case 0: return !!dept?.id; // departamento
      case 1: return true;       // cliente é opcional
      case 2: return !!piece?.id && !!piece?.docxFileId; // peça com DOCX obrigatório
      case 3: return topics.length > 0; // agora exige >=1 tópico
      case 4: return specs.length > 0;
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
    // Valida se todos os tópicos específicos têm pelo menos 1 anexo
    const validation = validateAttachments();
    if (!validation.valid) {
      const specsList = validation.missingSpecs.join(', ');
      throw new Error(`Cada tópico específico deve ter pelo menos 1 anexo. Faltam anexos em: ${specsList}`);
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

    const ts = specs.map((s) => s.id);
    if (ts.length) fields.topicSpecificIds = ts;
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
  }), [dept?.id, customers.map(c=>c.id).join('|'), piece?.id, topic?.id, topics.map(t=>t.id).join('|'), specs.map(s=>s.id).join('|'), instruction, attachments.map(a=>a.id).join('|'), commonAttachments.map(a=>a.id).join('|')]);

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

  return (
    <CaseWizardContext.Provider value={{
      step, setStep,
      dept, setDept,
      customers, setCustomers,
      piece, setPiece,
      topic, setTopic,
      topics, setTopics,
      specs, setSpecs,
      pieceDetail, setPieceDetail,
      topicDetail, setTopicDetail,
      specDetails, setSpecDetails,
      instruction, setInstruction,
      attachments, setAttachments,
      addAttachments, removeAttachment, clearAttachments,
      commonAttachments, addCommonAttachments, removeCommonAttachment,
      canNext, maxStep, payloadPreview, validateAttachments,
      downloadPieceDocx, downloadSpecDocx,
      buildFormData, buildCaseContextFormData, formPreview
    }}>
      {children}
    </CaseWizardContext.Provider>
  );
}
