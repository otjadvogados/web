import axios from 'utils/axios';

// ==============================|| TIPOS E ENUMS ||============================== //

export enum ReportType {
  RELATORIO_SENTENCA = 'RELATORIO_SENTENCA',
  ANALISE_PRELIMINAR_RISCO = 'ANALISE_PRELIMINAR_RISCO',
  RELATORIO_AUDIENCIA_TRABALHISTA = 'RELATORIO_AUDIENCIA_TRABALHISTA'
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
  customerId: string;
  email: string;
  label: string | null;
  createdAt: string;
};

export type CreateReportEmailRequest = {
  email: string;
  label?: string;
};

export type UpdateReportEmailRequest = {
  label?: string | null;
};

// ==============================|| ESTRUTURA DE PASTAS ||============================== //

/**
 * Retorna estrutura hierárquica de pastas do cliente
 */
export async function getFolderStructure(customerId: string): Promise<FolderStructure> {
  const { data } = await axios.get<FolderStructure>(`/customers/${customerId}/reports/folder-structure`);
  return data;
}

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
 * Gera relatórios para uma transcrição
 */
export async function generateReports(
  customerId: string,
  request: GenerateReportsRequest
): Promise<CustomerReport[]> {
  const { data } = await axios.post<CustomerReport[]>(`/customers/${customerId}/reports/generate`, request);
  return data;
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
 * Finaliza e envia relatório (gera PDF e envia por e-mail)
 */
export async function finalizeReport(customerId: string, reportId: string): Promise<FinalizedReport> {
  const { data } = await axios.post<FinalizedReport>(`/customers/${customerId}/reports/${reportId}/finalize`);
  return data;
}

// ==============================|| E-MAILS ||============================== //

/**
 * Lista e-mails cadastrados para receber relatórios
 */
export async function getReportEmails(customerId: string): Promise<ReportEmail[]> {
  const { data } = await axios.get<ReportEmail[]>(`/customers/${customerId}/report-emails`);
  return data;
}

/**
 * Adiciona um e-mail para receber relatórios
 */
export async function createReportEmail(
  customerId: string,
  request: CreateReportEmailRequest
): Promise<ReportEmail> {
  const { data } = await axios.post<ReportEmail>(`/customers/${customerId}/report-emails`, request);
  return data;
}

/**
 * Atualiza um e-mail (principalmente o label)
 */
export async function updateReportEmail(
  customerId: string,
  emailId: string,
  request: UpdateReportEmailRequest
): Promise<ReportEmail> {
  const { data } = await axios.patch<ReportEmail>(`/customers/${customerId}/report-emails/${emailId}`, request);
  return data;
}

/**
 * Remove um e-mail da lista
 */
export async function deleteReportEmail(customerId: string, emailId: string): Promise<void> {
  await axios.delete(`/customers/${customerId}/report-emails/${emailId}`);
}


