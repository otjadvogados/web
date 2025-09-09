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

export type AiSuggestion = {
  id: string;
  sessionId: string;
  draftId: string;
  draftVersion: number;
  ops: Array<{ op: string; path: string; value?: any; from?: string }>;
  rationale?: string | null;
  confidence?: number | null;
  targets: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string | null;
};
