import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { Department, getDepartment } from 'api/departments';
import { Customer, getCustomer } from 'api/customers';
import { AiPiece, fetchPieceDocx, getPiece } from 'api/aiPieces';
import { AiTopic, getTopic } from 'api/aiTopics';
import { AiTopicSpecific, fetchTopicSpecificDocx, getTopicSpecific } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import type { CaseContextFields, AttachmentBox, CaseAttachmentMeta, CaseCommonAttachmentMeta } from 'api/aiCases';

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
  ocrResult?: OcrTestResponse;
};

export type CaseCommonAttachmentItem = {
  id: string;
  file: File;
  ocrResult?: OcrTestResponse;
};

type WizardState = {
  step: number;
  deptId: string | null;
  customerIds: string[];
  pieceId: string | null;
  topicIds: string[];
  specIds: string[];
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
  // save/restore state
  saveWizardState: () => void;
  restoreWizardState: () => Promise<void>;
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
  
  // Flag para desabilitar resets automáticos durante restauração
  const isRestoringRef = useRef(false);

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
  }, [topic?.id]);
  // NOVO: se a lista de tópicos mudar (mesmo que o primeiro permaneça igual), limpar specs
  useEffect(() => { 
    if (isRestoringRef.current) return;
    setSpecs([]); 
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

  // Valida se todos os tópicos específicos têm pelo menos 1 anexo em cada caixa (reclamante e reclamada)
  const validateAttachments = () => {
    if (specs.length === 0) {
      return { valid: true, missingSpecs: [], missingBoxes: [] }; // se não há specs, não precisa validar
    }
    
    const specIds = new Set(specs.map(s => s.id));
    const attachmentsBySpecAndBox = new Map<string, { claimant: number; client: number }>();
    
    // Inicializa contadores para cada spec
    specs.forEach(s => {
      attachmentsBySpecAndBox.set(s.id, { claimant: 0, client: 0 });
    });
    
    // Conta anexos por spec e por caixa
    attachments.forEach(a => {
      if (specIds.has(a.topicSpecificId)) {
        const current = attachmentsBySpecAndBox.get(a.topicSpecificId) || { claimant: 0, client: 0 };
        if (a.box === 'claimant') {
          current.claimant += 1;
        } else if (a.box === 'client') {
          current.client += 1;
        }
        attachmentsBySpecAndBox.set(a.topicSpecificId, current);
      }
    });
    
    // Encontra specs sem anexos ou com caixas faltando
    const missingSpecs: string[] = [];
    const missingBoxes: Array<{ specName: string; box: 'claimant' | 'client' }> = [];
    
    specs.forEach(s => {
      const counts = attachmentsBySpecAndBox.get(s.id) || { claimant: 0, client: 0 };
      const hasClaimant = counts.claimant > 0;
      const hasClient = counts.client > 0;
      
      if (!hasClaimant && !hasClient) {
        missingSpecs.push(s.name);
      } else {
        if (!hasClaimant) {
          missingBoxes.push({ specName: s.name, box: 'claimant' });
        }
        if (!hasClient) {
          missingBoxes.push({ specName: s.name, box: 'client' });
        }
      }
    });
    
    return {
      valid: missingSpecs.length === 0 && missingBoxes.length === 0,
      missingSpecs,
      missingBoxes
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
    // Valida se todos os tópicos específicos têm pelo menos 1 anexo em cada caixa (reclamante e reclamada)
    const validation = validateAttachments();
    if (!validation.valid) {
      const errors: string[] = [];
      if (validation.missingSpecs.length > 0) {
        errors.push(`Faltam anexos nos tópicos: ${validation.missingSpecs.join(', ')}`);
      }
      if (validation.missingBoxes.length > 0) {
        const boxErrors = validation.missingBoxes.map(mb => {
          const boxLabel = mb.box === 'claimant' ? 'reclamante' : 'reclamada';
          return `${mb.specName} (${boxLabel})`;
        });
        errors.push(`Faltam anexos nas caixas: ${boxErrors.join(', ')}`);
      }
      throw new Error(`Cada tópico específico deve ter pelo menos 1 arquivo em cada caixa (reclamante e reclamada). ${errors.join('; ')}`);
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

  // Salva o estado completo do wizard no sessionStorage
  const saveWizardState = () => {
    try {
      const state: WizardState = {
        step,
        deptId: dept?.id ?? null,
        customerIds: customers.map(c => c.id),
        pieceId: piece?.id ?? null,
        topicIds: topics.map(t => t.id),
        specIds: specs.map(s => s.id),
        instruction,
        timestamp: Date.now()
      };
      sessionStorage.setItem('wizard_return_state', JSON.stringify(state));
    } catch (err) {
      console.error('Erro ao salvar estado do wizard:', err);
    }
  };

  // Restaura o estado completo do wizard do sessionStorage
  const restoreWizardState = async () => {
    try {
      const saved = sessionStorage.getItem('wizard_return_state');
      if (!saved) return;

      const state: WizardState = JSON.parse(saved);
      
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

      // Restaura tópicos específicos
      if (state.specIds.length > 0) {
        try {
          const specsData = await Promise.all(
            state.specIds.map(id => getTopicSpecific(id))
          );
          setSpecs(specsData);
        } catch (err) {
          console.error('Erro ao restaurar tópicos específicos:', err);
        }
      }

      // Restaura instrução
      if (state.instruction) {
        setInstruction(state.instruction);
      }

      // Aguarda um pouco para garantir que todos os estados foram atualizados
      await new Promise(resolve => setTimeout(resolve, 300));

      // Remove o estado salvo após restaurar
      sessionStorage.removeItem('wizard_return_state');
      
      // Desativa flag de restauração
      isRestoringRef.current = false;
    } catch (err) {
      console.error('Erro ao restaurar estado do wizard:', err);
      sessionStorage.removeItem('wizard_return_state');
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
      saveWizardState, restoreWizardState
    }}>
      {children}
    </CaseWizardContext.Provider>
  );
}
