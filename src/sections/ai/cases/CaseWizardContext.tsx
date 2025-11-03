import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { Department } from 'api/departments';
import { Customer } from 'api/customers';
import { AiPiece, fetchPieceDocx } from 'api/aiPieces';
import { AiTopic } from 'api/aiTopics';
import { AiTopicSpecific, fetchTopicSpecificDocx } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import type { CaseContextFields } from 'api/aiCases';

export type OptionDept = Pick<Department, 'id'|'name'>;
export type OptionCust = Pick<Customer, 'id'|'displayName'|'name'|'kind'|'isMatriz'|'isFilial'|'parentCustomerId'>;
export type OptionPiece = AiPiece;
export type OptionTopic = AiTopic;
export type OptionSpec = AiTopicSpecific;

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
  files: File[]; setFiles: (f: File[]) => void;
  // helpers
  canNext: (s: number) => boolean;
  maxStep: number;
  payloadPreview: any; // mantido para compat, mas agora usamos formPreview para exibir no UI
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
    };
    attachments: { name: string; type: string; size: number }[];
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
  const [files, setFiles] = useState<File[]>([]);

  // encadeamento de resets
  useEffect(() => { setPiece(null); setTopic(null); setTopics([]); setSpecs([]); }, [dept?.id, customers.map(c=>c.id).join('|')]);
  useEffect(() => { setTopic(null); setTopics([]); setSpecs([]); }, [piece?.id]);
  useEffect(() => { setSpecs([]); }, [topic?.id]);
  // NOVO: se a lista de tópicos mudar (mesmo que o primeiro permaneça igual), limpar specs
  useEffect(() => { setSpecs([]); }, [topics.map(t => t.id).join('|')]);

  // Deriva `topic` (principal) do primeiro item de `topics`
  useEffect(() => {
    setTopic(topics[0] ?? null);
  }, [topics]);

  // validate step gating
  const canNext = (s: number) => {
    switch (s) {
      case 0: return !!dept?.id; // departamento
      case 1: return true;       // cliente é opcional
      case 2: return !!piece?.id && !!piece?.docxFileId; // peça com DOCX obrigatório
      case 3: return topics.length > 0; // agora exige >=1 tópico
      case 4: return specs.length > 0;
      case 5: return true;       // anexos/instruções sempre ok
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
    attachmentsCount: files.length
  }), [dept, customers, piece, topic, topics, specs, instruction, files.length]);

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
    files.forEach((f) => {
      // nome do campo: attachments[]  (compatível com Nest + multer)
      fd.append('attachments[]', f, f.name);
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

    const fd = new FormData();
    fd.append('fields', JSON.stringify(fields));
    files.forEach((f) => {
      fd.append('attachments', f, f.name);
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
      instruction: instruction.trim() || null
    },
    attachments: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
  }), [dept?.id, customers.map(c=>c.id).join('|'), piece?.id, topic?.id, topics.map(t=>t.id).join('|'), specs, instruction, files]);

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
      files, setFiles,
      canNext, maxStep, payloadPreview,
      downloadPieceDocx, downloadSpecDocx,
      buildFormData, buildCaseContextFormData, formPreview
    }}>
      {children}
    </CaseWizardContext.Provider>
  );
}
