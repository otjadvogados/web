export type WRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  caps?: boolean;
  smallCaps?: boolean;
  size?: number;
  font?: string;
};

export type WBlock =
  | {
      type: 'heading' | 'paragraph' | 'quote' | 'pageBreak' | 'signature';
      style?: string;
      text?: string;
      runs?: WRun[];
    }
  | {
      type: 'bulletList' | 'numberedList';
      style?: string;
      items?: { runs: WRun[] }[];
    }
  | {
      type: 'table';
      style?: string;
      rows?: { runs: WRun[] }[][];
    };

export type WDoc = {
  meta: any;
  styles: Record<string, any>;
  content: WBlock[];
};

export type AiDraft = {
  id: string;
  caseId: string;
  templateId?: string | null;
  version: number;
  status: string; // draft|approved|rejected
  json: WDoc;
  createdAt: string;
  updatedAt: string;
};

export type SuggestionOp = {
  id: string;                 // UUID gerado no back
  op: 'replace'|'insert'|'remove';
  path: string;
  value?: any;
  meta?: Record<string, any>;
  status: 'PENDING'|'ACCEPTED'|'REJECTED';
};

export type AiSuggestion = {
  id: string;
  sessionId: string;
  draftId: string;
  draftVersion: number;
  ops: SuggestionOp[];
  rationale?: string | null;
  confidence?: number | null;
  targets: string[];
  status: 'PENDING'|'PARTIAL'|'ACCEPTED'|'REJECTED'; // derivado das ops
  createdAt: string;
  resolvedAt?: string | null;
};

export type AnalysisFinding = {
  id: string; // sha1 de (type|title|anchors|evidence)
  type: 'PLACEHOLDER'|'MISSING_FIELD'|'INCONSISTENCY'|'STYLE'|'TODO'|'OTHER';
  title: string;          // curto
  detail: string;         // explicação
  severity: 'info'|'warn'|'error';
  anchors?: string[];     // block ids
  evidence?: string[];    // trechos curtos
};
