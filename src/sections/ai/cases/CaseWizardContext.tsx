import { createContext, useContext, useMemo, useState, useEffect, useRef } from 'react';
import { Department } from 'api/departments';
import { Customer } from 'api/customers';
import { AiPiece, fetchPieceDocx } from 'api/aiPieces';
import { AiTopic } from 'api/aiTopics';
import { AiTopicSpecific, fetchTopicSpecificDocx } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import type { CaseContextFields } from 'api/aiCases';

export type OptionDept = Pick<Department, 'id'|'name'>;
export type OptionCust = Pick<Customer, 'id'|'displayName'|'name'>;
export type OptionPiece = AiPiece;
export type OptionTopic = AiTopic;
export type OptionSpec = AiTopicSpecific;

type Ctx = {
  step: number;
  setStep: (n: number) => void;
  // selections
  dept: OptionDept | null; setDept: (v: OptionDept|null) => void;
  customer: OptionCust | null; setCustomer: (v: OptionCust|null) => void;
  piece: OptionPiece | null; setPiece: (v: OptionPiece|null) => void;
  topic: OptionTopic | null; setTopic: (v: OptionTopic|null) => void;
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
      customerId: string | null;
      pieceId: string | null;
      topicId: string | null;
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
  const [customer, setCustomer] = useState<OptionCust | null>(null);
  const [piece, setPiece] = useState<OptionPiece | null>(null);
  const [topic, setTopic] = useState<OptionTopic | null>(null);
  const [specs, setSpecs] = useState<OptionSpec[]>([]);

  const [pieceDetail, setPieceDetail] = useState<OptionPiece | null>(null);
  const [topicDetail, setTopicDetail] = useState<OptionTopic | null>(null);
  const [specDetails, setSpecDetails] = useState<Record<string, OptionSpec>>({});

  const [instruction, setInstruction] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  // encadeamento de resets
  useEffect(() => { setPiece(null); setTopic(null); setSpecs([]); }, [dept?.id, customer?.id]);
  useEffect(() => { setTopic(null); setSpecs([]); }, [piece?.id]);
  useEffect(() => { setSpecs([]); }, [topic?.id]);

  // validate step gating
  const canNext = (s: number) => {
    switch (s) {
      case 0: return !!dept?.id; // departamento
      case 1: return true;       // cliente é opcional
      case 2: return !!piece?.id && !!piece?.docxFileId; // peça com DOCX obrigatório
      case 3: return !!topic?.id;
      case 4: return specs.length > 0;
      case 5: return true;       // anexos/instruções sempre ok
      default: return false;
    }
  };

  const payloadPreview = useMemo(() => ({
    departmentId: dept?.id ?? null,
    customerId: customer?.id ?? null,
    pieceId: piece?.id ?? null,
    topicId: topic?.id ?? null,
    topicSpecificIds: specs.map(s => s.id),
    instruction: instruction.trim() || null,
    attachmentsCount: files.length
  }), [dept, customer, piece, topic, specs, instruction, files.length]);

  // --- multipart/form-data builder ---
  const buildFormData = () => {
    const fd = new FormData();
    if (dept?.id) fd.append('departmentId', dept.id);
    if (customer?.id) fd.append('customerId', customer.id);
    if (piece?.id) fd.append('pieceId', piece.id);
    if (topic?.id) fd.append('topicId', topic.id);
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
    if (customer?.id) fields.customerId = customer.id;
    if (topic?.id) fields.topicId = topic.id;
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
      customerId: customer?.id ?? null,
      pieceId: piece?.id ?? null,
      topicId: topic?.id ?? null,
      topicSpecificIds: specs.map(s => s.id),
      instruction: instruction.trim() || null
    },
    attachments: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
  }), [dept?.id, customer?.id, piece?.id, topic?.id, specs, instruction, files]);

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
      customer, setCustomer,
      piece, setPiece,
      topic, setTopic,
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
