import axios from 'utils/axios';

export type TranscriptionRecord = {
  id: string;
  model?: string;
  language?: string;
  durationSeconds?: number;
  filename: string;
  createdAt: string;
  updatedAt?: string;
  textPreview?: string;
  text?: string; // Texto completo (agora vem no GET /folders também)
  summary?: string; // Resumo salvo no banco (vem no GET /folders)
  folder?: string; // Pasta/diretório onde a transcrição está organizada
  customerId?: string; // ID do cliente associado
  files?: {
    text?: {
      fileId: string;
      url: string;
    } | null;
    audio?: {
      fileId: string;
      url: string;
    } | null;
  };
  reports?: Array<{
    id: string;
    reportType: string;
    title: string;
    createdAt: string;
    isFinalized: boolean;
    pdfFileId?: string | null;
  }>;
};

export type TranscriptionFolder = {
  id: string;
  type: 'customer' | 'general';
  name: string;
  customerId: string | null;
  items: TranscriptionRecord[];
};

export type TranscriptionsFoldersResponse = TranscriptionFolder[];

export type TranscribeRequestParams = {
  customerId?: string; // ID do cliente (opcional)
  language?: string;
  prompt?: string;
  temperature?: number;
  diarize?: boolean;
  model?: string;
};

export type SummarizeRequestParams = {
  promptTemplate?: string;
  model?: string;
  maxTokens?: number;
};

export type SummaryJson = {
  objetivo?: string;
  pontosChave?: string[];
  acoes?: string[];
  citacoes?: string[];
  tarefas?: Array<{
    descricao: string;
    responsavel?: string;
  }>;
  resumo?: string;
};

export type SummarizeResponse = {
  summary?: string | SummaryJson; // Pode ser string JSON ou objeto parseado
  model?: string;
  tokensUsed?: number;
} & Partial<SummaryJson>; // O backend pode retornar os campos do SummaryJson diretamente na raiz

/**
 * Faz upload de arquivo de áudio/vídeo para transcrição
 */
export async function transcribeFile(
  file: File,
  params?: TranscribeRequestParams
): Promise<TranscriptionRecord> {
  const formData = new FormData();
  formData.append('file', file);

  // Sempre envia customerId se fornecido (mesmo que seja string vazia, o backend pode precisar)
  if (params?.customerId !== undefined && params.customerId !== null && params.customerId !== '') {
    formData.append('customerId', params.customerId);
  }
  if (params?.language) formData.append('language', params.language);
  if (params?.prompt) formData.append('prompt', params.prompt);
  if (params?.temperature !== undefined) formData.append('temperature', params.temperature.toString());
  if (params?.diarize !== undefined) formData.append('diarize', params.diarize.toString());
  if (params?.model) formData.append('model', params.model);

  const { data } = await axios.post<TranscriptionRecord>('/ai/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 900000 // 15 minutos (backend configurado para 3 horas)
  });

  return data;
}

/**
 * Lista todas as transcrições organizadas em pastas
 * Retorna pastas de clientes e pasta geral
 */
export async function listTranscriptionFolders(): Promise<TranscriptionsFoldersResponse> {
  try {
    const { data } = await axios.get<TranscriptionsFoldersResponse>('/ai/transcribe/folders');
    
    // O backend pode retornar { folders: [...] } ou diretamente um array
    let folders: TranscriptionFolder[] = [];
    
    if (Array.isArray(data)) {
      folders = data;
    } else if (data && typeof data === 'object' && 'folders' in data && Array.isArray((data as any).folders)) {
      folders = (data as any).folders;
    } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
      folders = (data as any).data;
    }
    
    // Filtra a pasta geral para remover transcrições com customerId
    // A pasta geral deve conter apenas transcrições sem cliente vinculado (customerId null/undefined/vazio)
    folders = folders.map((folder) => {
      if (folder.type === 'general') {
        return {
          ...folder,
          items: folder.items.filter((item) => {
            // Remove itens que têm customerId válido (não null, não undefined, não vazio)
            if (!item.customerId) return true; // null, undefined ou falsy = mantém
            if (typeof item.customerId === 'string' && item.customerId.trim() === '') return true; // string vazia = mantém
            return false; // tem customerId válido = remove
          })
        };
      }
      return folder;
    });
    
    return folders;
  } catch (err: any) {
    throw err;
  }
}

/**
 * Busca uma transcrição completa pelo ID (inclui campo text)
 */
export async function getTranscription(id: string): Promise<TranscriptionRecord> {
  const { data } = await axios.get<TranscriptionRecord>(`/ai/transcribe/${id}`);
  return data;
}

/**
 * Resumir uma transcrição existente pelo ID
 */
export async function summarizeTranscription(
  id: string,
  params?: SummarizeRequestParams
): Promise<SummarizeResponse> {
  const { data } = await axios.post<SummarizeResponse>(`/ai/transcribe/${id}/summarize`, params);
  return data;
}

/**
 * Resumir um texto diretamente (sem ID de transcrição)
 */
export async function summarizeText(
  text: string,
  params?: SummarizeRequestParams
): Promise<SummarizeResponse> {
  const { data } = await axios.post<SummarizeResponse>('/ai/transcribe/summarize', {
    text,
    ...params
  });
  return data;
}

/**
 * Deleta uma transcrição pelo ID (soft delete)
 */
export async function deleteTranscription(id: string): Promise<{ message?: string }> {
  const { data } = await axios.delete<{ message?: string }>(`/ai/transcribe/${id}`);
  return data;
}

