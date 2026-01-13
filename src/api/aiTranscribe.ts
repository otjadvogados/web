import axios from 'utils/axios';

export type TranscriptionRecord = {
  id: string;
  model: string;
  language?: string;
  durationSeconds?: number;
  filename: string;
  createdAt: string;
  textPreview?: string;
  text?: string; // apenas no GET /ai/transcribe/:id
};

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
    timeout: 120000 // 2 minutos
  });

  return data;
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

