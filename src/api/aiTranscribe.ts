import axios from 'utils/axios';
import { getRealtimeSocket, ensureRealtimeConnected, type CaseProgressEvent } from './realtime';

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

// Tipos para transcrição assíncrona
export type TranscriptionProgress = {
  phase?: string;
  message: string;
  kind: 'log' | 'phase' | 'ai';
  timestamp?: string;
};

export type TranscriptionProgressCallback = (progress: TranscriptionProgress) => void;

export type TranscribeAsyncResponse = {
  transcriptionId: string;
  status: 'accepted';
  message: string;
};

export type TranscriptionCompleteEvent = {
  transcriptionId: string;
  transcription: TranscriptionRecord;
  timestamp: string;
};

export type TranscriptionErrorEvent = {
  transcriptionId: string;
  error: string;
  errorType?: string;
  timestamp: string;
};

/**
 * Faz upload de arquivo de áudio/vídeo para transcrição (assíncrono)
 * 
 * A função agora usa processamento assíncrono:
 * 1. Envia a requisição POST e recebe um transcriptionId (202 Accepted)
 * 2. Escuta eventos via WebSocket para progresso, sucesso ou erro
 * 3. Retorna o TranscriptionRecord quando a transcrição estiver completa
 * 
 * @param file Arquivo de áudio/vídeo para transcrever
 * @param params Parâmetros opcionais para a transcrição
 * @param onProgress Callback opcional para receber atualizações de progresso
 * @returns Promise que resolve com o TranscriptionRecord completo
 */
export async function transcribeFile(
  file: File,
  params?: TranscribeRequestParams,
  onProgress?: TranscriptionProgressCallback
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

  try {
    // 1. Conecta ao WebSocket ANTES de enviar a requisição
    const realtime = getRealtimeSocket();
    
    // Garante que o WebSocket está conectado (tenta conectar se não estiver)
    await ensureRealtimeConnected(3000);

    // 2. Envia a requisição POST
    const response = await axios.post<TranscribeAsyncResponse | TranscriptionRecord>('/ai/transcribe', formData, {
      // Não precisa de timeout longo, pois retorna 202 Accepted imediatamente
      timeout: 60000 // 1 minuto é suficiente para receber a resposta 202
    });

    // Verifica se a resposta é 202 Accepted (assíncrono)
    if (response.status !== 202) {
      // Se não for 202, pode ser que ainda esteja usando o formato antigo (síncrono)
      // Nesse caso, retorna diretamente os dados (backward compatibility)
      if (response.status === 200 && response.data && 'id' in response.data && 'filename' in response.data) {
        return response.data as TranscriptionRecord;
      }
      throw new Error('Resposta inesperada do servidor');
    }

    // Extrai transcriptionId da resposta 202
    const responseData = response.data as TranscribeAsyncResponse;
    if (!('transcriptionId' in responseData)) {
      throw new Error('Resposta 202 não contém transcriptionId');
    }
    const { transcriptionId } = responseData;
    if (!transcriptionId) {
      throw new Error('TranscriptionId não encontrado na resposta');
    }

    // 3. Aguarda notificações via WebSocket
    return new Promise<TranscriptionRecord>((resolve, reject) => {
      let isResolved = false;

      // Timeout de segurança (30 minutos para arquivos muito grandes)
      const timeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          realtime.off('case:progress', handleProgress);
          realtime.off('transcription:complete', handleComplete);
          realtime.off('transcription:error', handleError);
          
          reject(new Error('Timeout: A transcrição demorou muito para ser concluída'));
        }
      }, 30 * 60 * 1000); // 30 minutos

      // Handlers para eventos WebSocket
      const handleProgress = (data: CaseProgressEvent) => {
        // Verifica se o evento é da transcrição atual
        if (data.runId === transcriptionId) {
          const progress: TranscriptionProgress = {
            phase: data.code,
            message: data.message,
            kind: data.kind,
            timestamp: data.ts
          };
          
          // Chama callback de progresso se fornecido
          onProgress?.(progress);
        }
      };

      const handleComplete = async (data: TranscriptionCompleteEvent) => {
        if (data.transcriptionId === transcriptionId && !isResolved) {
          clearTimeout(timeout);
          isResolved = true;
          // Remove listeners
          realtime.off('case:progress', handleProgress);
          realtime.off('transcription:complete', handleComplete);
          realtime.off('transcription:error', handleError);
          
          try {
            // Busca a transcrição completa via API usando o ID da transcrição
            // O evento pode conter apenas um preview, então buscamos o texto completo
            const transcriptionIdToFetch = data.transcription?.id || data.transcriptionId;
            const fullTranscription = await getTranscription(transcriptionIdToFetch);
            
            // Resolve com a transcrição completa
            resolve(fullTranscription);
          } catch (fetchError: any) {
            // Se falhar ao buscar, tenta usar os dados do evento (pode estar incompleto)
            console.warn('Erro ao buscar transcrição completa, usando dados do evento:', fetchError);
            if (data.transcription) {
              resolve(data.transcription);
            } else {
              reject(new Error('Erro ao buscar transcrição completa: ' + (fetchError?.message || 'Erro desconhecido')));
            }
          }
        }
      };

      const handleError = (data: TranscriptionErrorEvent) => {
        if (data.transcriptionId === transcriptionId && !isResolved) {
          clearTimeout(timeout);
          isResolved = true;
          // Remove listeners
          realtime.off('case:progress', handleProgress);
          realtime.off('transcription:complete', handleComplete);
          realtime.off('transcription:error', handleError);
          
          // Rejeita com erro
          const error = new Error(data.error || 'Erro ao processar transcrição');
          (error as any).errorType = data.errorType;
          reject(error);
        }
      };

      // Registra listeners
      realtime.on('case:progress', handleProgress);
      realtime.on('transcription:complete', handleComplete);
      realtime.on('transcription:error', handleError);

      // Se o WebSocket não estiver conectado após um tempo, tenta reconectar
      if (!realtime.connected) {
        setTimeout(async () => {
          if (!isResolved && !realtime.connected) {
            try {
              await ensureRealtimeConnected(5000);
            } catch (err) {
              console.warn('Não foi possível conectar ao WebSocket:', err);
              // Continua esperando, pois o WebSocket pode conectar mais tarde
            }
          }
        }, 1000);
      }
    });
  } catch (err: any) {
    // Se a resposta não for 202, trata como erro síncrono
    if (err?.response?.status !== 202) {
      console.log('TRANSCRIBE ERROR', {
        message: err?.message,
        code: err?.code,
        name: err?.name,
        status: err?.response?.status
      });
      throw err;
    }
    
    // Se for 202 mas não tiver transcriptionId, também é erro
    throw new Error(err?.response?.data?.message || 'Erro ao iniciar transcrição');
  }
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

