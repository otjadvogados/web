import axios from 'utils/axios';

// ==============================|| TIPOS E ENUMS ||============================== //

export enum ReportType {
  // Tipos legados (mantidos para compatibilidade)
  RELATORIO_SENTENCA = 'RELATORIO_SENTENCA',
  ANALISE_PRELIMINAR_RISCO = 'ANALISE_PRELIMINAR_RISCO',
  RELATORIO_AUDIENCIA_TRABALHISTA = 'RELATORIO_AUDIENCIA_TRABALHISTA',
  // Novos tipos de relatório
  RELATORIO_PROVISIONAMENTO_RISCO = 'RELATORIO_PROVISIONAMENTO_RISCO',
  RELATORIO_PRE_AUDIENCIA = 'RELATORIO_PRE_AUDIENCIA',
  RELATORIO_POS_AUDIENCIA = 'RELATORIO_POS_AUDIENCIA',
  RELATORIO_DECISOES_SENTENCA = 'RELATORIO_DECISOES_SENTENCA',
  RELATORIO_DECISOES_ACORDAO = 'RELATORIO_DECISOES_ACORDAO',
  RELATORIO_PROCESSUAL = 'RELATORIO_PROCESSUAL'
}

export type FileReference = {
  fileId: string;
  url: string;
};

export type TranscriptionFiles = {
  text: FileReference | null;
  audio: FileReference | null;
};

export type CustomerReport = {
  id: string;
  customerId: string;
  customerTranscriptionId: string;
  reportType: ReportType;
  title: string;
  htmlContent: string;
  pdfFileId: string | null;
  isFinalized: boolean;
  createdAt: string;
  finalizedAt?: string | null;
  sentAt?: string | null;
};

export type CustomerTranscription = {
  id: string;
  customerId: string;
  transcriptionId: string;
  originalFilename: string;
  textPreview: string;
  durationSeconds: number;
  createdAt: string;
  files: TranscriptionFiles;
  reports: CustomerReport[];
};

export type FolderItem = {
  id: string;
  type: 'transcription';
  name: string;
  createdAt: string;
  textPreview: string;
  durationSeconds: number;
  files: TranscriptionFiles;
  reports: Array<{
    id: string;
    type: 'report';
    name: string;
    reportType: ReportType;
    createdAt: string;
    isFinalized: boolean;
    pdf: FileReference | null;
  }>;
};

export type FolderStructure = {
  customerId: string;
  folderName: string;
  items: FolderItem[];
};

export type TranscriptionWithReports = {
  id: string;
  customerId: string;
  transcriptionId: string;
  originalFilename: string;
  textPreview: string;
  reports: CustomerReport[];
};

export type GenerateReportsRequest = {
  transcriptionId: string;
  reportTypes: ReportType[];
};

export type GenerateReportFromFileParams = {
  file: File;
  customerId?: string; // UUID ou "general" ou undefined (pasta geral)
  reportTypes: ReportType[]; // Array com tipos de relatório
  promptId?: string; // UUID do prompt salvo (opcional)
  additionalInstructions?: string; // Prompt customizado (opcional)
};

export type UpdateReportRequest = {
  htmlContent: string;
};

export type FinalizedReport = {
  id: string;
  pdfFileId: string;
  isFinalized: true;
  finalizedAt: string;
  sentAt: string;
};

export type ReportEmail = {
  id: string;
  customerId: string | null; // null para e-mails gerais
  email: string;
  label: string | null;
  createdAt: string;
};

export type CreateReportEmailRequest = {
  email: string;
  label?: string;
};

export type UpdateReportEmailRequest = {
  email?: string;
  label?: string | null;
};

// ==============================|| ESTRUTURA DE PASTAS ||============================== //

export type ReportFolderResponse = {
  id: string;
  type: 'customer' | 'general';
  name: string;
  customerId: string | null;
  reports: Array<{
    id: string;
    title: string;
    reportType: ReportType;
    createdAt: string;
    updatedAt: string;
    isFinalized: boolean;
    finalizedAt: string | null;
    sentAt: string | null;
    pdf: FileReference | null;
    customerId?: string | null; // Opcional, presente em alguns relatórios
  }>;
};

/**
 * Lista todas as pastas (clientes + pasta geral) com apenas os relatórios
 * Endpoint: GET /reports - Retorna todos os relatórios organizados por pastas
 */
export async function listReportFolders(): Promise<ReportFolderResponse[]> {
  const { data } = await axios.get('/reports');
  
  // O backend pode retornar { folders: [...] } ou diretamente um array
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object' && 'folders' in data && Array.isArray((data as any).folders)) {
    return (data as any).folders;
  }
  
  return [];
}

/**
 * @deprecated Esta função foi removida. Use listReportFolders() e filtre pela pasta desejada.
 * A rota GET /customers/:customerId/reports/folder-structure foi removida do backend.
 * Use GET /reports para obter todas as pastas com seus relatórios.
 */
// export async function getFolderStructure(customerId: string): Promise<FolderStructure> {
//   const { data } = await axios.get<FolderStructure>(`/customers/${customerId}/reports/folder-structure`);
//   return data;
// }

// ==============================|| TRANSCRIÇÕES ||============================== //

/**
 * Lista todas as transcrições do cliente
 */
export async function getTranscriptions(customerId: string): Promise<CustomerTranscription[]> {
  const { data } = await axios.get<CustomerTranscription[]>(`/customers/${customerId}/reports/transcriptions`);
  return data;
}

/**
 * Busca transcrição específica com seus relatórios
 */
export async function getTranscriptionWithReports(
  customerId: string,
  transcriptionId: string
): Promise<TranscriptionWithReports> {
  const { data } = await axios.get<TranscriptionWithReports>(
    `/customers/${customerId}/reports/transcriptions/${transcriptionId}`
  );
  return data;
}

// ==============================|| RELATÓRIOS ||============================== //

/**
 * Lista todos os relatórios do cliente
 */
export async function getReports(customerId: string): Promise<CustomerReport[]> {
  const { data } = await axios.get<CustomerReport[]>(`/customers/${customerId}/reports`);
  return data;
}

/**
 * Busca relatório específico completo com HTML
 */
export async function getReport(customerId: string, reportId: string): Promise<CustomerReport> {
  const { data } = await axios.get<CustomerReport>(`/customers/${customerId}/reports/${reportId}`);
  return data;
}

/**
 * Gera relatórios para uma transcrição vinculada a um cliente
 * Endpoint: POST /customers/:customerId/reports/generate
 */
export async function generateCustomerReports(
  customerId: string,
  request: GenerateReportsRequest
): Promise<CustomerReport[]> {
  const { data } = await axios.post<CustomerReport[]>(`/customers/${customerId}/reports/generate`, request);
  return data;
}

/**
 * Gera relatórios gerais (sem cliente vinculado)
 * Endpoint: POST /reports/generate
 */
export async function generateGeneralReports(
  request: GenerateReportsRequest
): Promise<CustomerReport[]> {
  const { data } = await axios.post<CustomerReport[]>(`/reports/generate`, request);
  return data;
}

/**
 * Gera relatórios a partir de um arquivo (upload direto)
 * Endpoint: POST /customers/:customerId/reports/generate ou POST /reports/generate
 * 
 * @param params - Parâmetros da geração:
 *   - file: Arquivo a ser processado (obrigatório)
 *   - customerId: UUID do cliente, "general" ou undefined para pasta geral (opcional)
 *   - reportTypes: Array de tipos de relatório (obrigatório)
 *   - promptId: ID do prompt salvo (opcional)
 *   - additionalInstructions: Instruções adicionais customizadas (opcional)
 * 
 * @returns Array de CustomerReport[] gerados
 * 
 * @example
 * ```typescript
 * const reports = await generateReportFromFile({
 *   file: myFile,
 *   customerId: 'uuid-do-cliente',
 *   reportTypes: [ReportType.RELATORIO_PROVISIONAMENTO_RISCO],
 *   additionalInstructions: 'Analisar risco de crédito'
 * });
 * ```
 */
export async function generateReportFromFile(
  params: GenerateReportFromFileParams
): Promise<CustomerReport[]> {
  const formData = new FormData();
  
  // 1. Arquivo (obrigatório)
  formData.append('file', params.file);
  
  // 2. Tipos de relatório (obrigatório - array como JSON string)
  formData.append('reportTypes', JSON.stringify(params.reportTypes));
  
  // 3. PromptId (opcional - se usuário escolheu um prompt salvo)
  if (params.promptId) {
    formData.append('promptId', params.promptId);
  }
  
  // 4. Instruções adicionais (opcional - prompt customizado escrito pelo usuário)
  if (params.additionalInstructions) {
    formData.append('additionalInstructions', params.additionalInstructions);
  }
  
  // 5. URL baseada no cliente
  const url = params.customerId
    ? `/customers/${params.customerId}/reports/generate`
    : `/reports/generate`;
  
  const response = await axios.post<{ message?: string; data?: CustomerReport[] } | CustomerReport[]>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  const data = response.data;
  
  // Log para debug
  console.log('Resposta bruta da API generateReportFromFile:', data);
  console.log('Tipo da resposta:', typeof data);
  console.log('É array?', Array.isArray(data));
  
  // Backend pode retornar { message, data } ou diretamente um array
  if (Array.isArray(data)) {
    console.log('Retornando array direto, tamanho:', data.length);
    return data;
  } else if (data && typeof data === 'object') {
    if ('data' in data && Array.isArray((data as any).data)) {
      console.log('Retornando data.data, tamanho:', (data as any).data.length);
      return (data as any).data;
    }
    // Pode ter outras propriedades que contêm o array
    console.log('Propriedades do objeto:', Object.keys(data));
  }
  
  // Fallback: retorna array vazio se formato inesperado
  console.warn('Formato de resposta inesperado, retornando array vazio. Resposta:', data);
  return [];
}

/**
 * Gera relatórios (wrapper que escolhe o endpoint correto)
 * @deprecated Use generateCustomerReports ou generateGeneralReports diretamente
 */
export async function generateReports(
  customerId: string,
  request: GenerateReportsRequest
): Promise<CustomerReport[]> {
  return generateCustomerReports(customerId, request);
}

/**
 * Atualiza o HTML de um relatório
 */
export async function updateReport(
  customerId: string,
  reportId: string,
  request: UpdateReportRequest
): Promise<CustomerReport> {
  const { data } = await axios.patch<CustomerReport>(`/customers/${customerId}/reports/${reportId}`, request);
  return data;
}

/**
 * Finaliza e envia relatório de cliente (gera PDF e envia por e-mail)
 * Endpoint: POST /customers/:customerId/reports/:reportId/finalize
 */
export async function finalizeCustomerReport(customerId: string, reportId: string): Promise<FinalizedReport> {
  const { data } = await axios.post<FinalizedReport>(`/customers/${customerId}/reports/${reportId}/finalize`);
  return data;
}

/**
 * Finaliza e envia relatório geral (gera PDF e envia por e-mail)
 * Endpoint: POST /reports/:reportId/finalize
 */
export async function finalizeGeneralReport(reportId: string): Promise<FinalizedReport> {
  const { data } = await axios.post<FinalizedReport>(`/reports/${reportId}/finalize`);
  return data;
}

/**
 * Finaliza e envia relatório (wrapper que escolhe o endpoint correto)
 * @deprecated Use finalizeCustomerReport ou finalizeGeneralReport diretamente
 */
export async function finalizeReport(customerId: string, reportId: string): Promise<FinalizedReport> {
  return finalizeCustomerReport(customerId, reportId);
}

/**
 * Deleta um relatório
 * Endpoint: DELETE /reports/:reportId
 */
export async function deleteReport(reportId: string): Promise<void> {
  await axios.delete(`/reports/${reportId}`);
}

// ==============================|| E-MAILS ||============================== //

/**
 * Lista e-mails gerais cadastrados para receber relatórios gerais
 * Endpoint: GET /report-emails
 */
export async function getGeneralReportEmails(): Promise<ReportEmail[]> {
  const { data } = await axios.get<ReportEmail[]>('/report-emails');
  return data;
}

/**
 * Cadastra e-mail geral para receber relatórios gerais
 * Endpoint: POST /report-emails
 */
export async function createGeneralReportEmail(request: CreateReportEmailRequest): Promise<ReportEmail> {
  const { data } = await axios.post<ReportEmail>('/report-emails', request);
  return data;
}

/**
 * Atualiza label de e-mail geral
 * Endpoint: PATCH /report-emails/:emailId
 */
export async function updateGeneralReportEmail(emailId: string, request: UpdateReportEmailRequest): Promise<ReportEmail> {
  const { data } = await axios.patch<ReportEmail>(`/report-emails/${emailId}`, request);
  return data;
}

/**
 * Remove e-mail geral
 * Endpoint: DELETE /report-emails/:emailId
 */
export async function deleteGeneralReportEmail(emailId: string): Promise<void> {
  await axios.delete(`/report-emails/${emailId}`);
}

/**
 * Lista e-mails cadastrados para receber relatórios de um cliente específico
 * Endpoint: GET /customers/:customerId/report-emails
 */
export async function getCustomerReportEmails(customerId: string): Promise<ReportEmail[]> {
  const { data } = await axios.get<ReportEmail[]>(`/customers/${customerId}/report-emails`);
  return data;
}

/**
 * Cadastra e-mail para receber relatórios de um cliente específico
 * Endpoint: POST /customers/:customerId/report-emails
 */
export async function createCustomerReportEmail(
  customerId: string,
  request: CreateReportEmailRequest
): Promise<ReportEmail> {
  const { data } = await axios.post<ReportEmail>(`/customers/${customerId}/report-emails`, request);
  return data;
}

/**
 * Atualiza label de e-mail de cliente
 * Endpoint: PATCH /customers/:customerId/report-emails/:emailId
 */
export async function updateCustomerReportEmail(
  customerId: string,
  emailId: string,
  request: UpdateReportEmailRequest
): Promise<ReportEmail> {
  const { data } = await axios.patch<ReportEmail>(`/customers/${customerId}/report-emails/${emailId}`, request);
  return data;
}

/**
 * Remove e-mail de cliente
 * Endpoint: DELETE /customers/:customerId/report-emails/:emailId
 */
export async function deleteCustomerReportEmail(customerId: string, emailId: string): Promise<void> {
  await axios.delete(`/customers/${customerId}/report-emails/${emailId}`);
}


