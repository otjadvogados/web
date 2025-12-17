import axios from 'utils/axios';

export type AiUsageRecord = {
  id: string;
  kind: string;
  model: string;
  callName?: string;
  userId?: string;
  userName?: string;
  requestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  createdAt: string;
};

export type AiUsageListResponse = {
  total: number;
  limit: number;
  offset: number;
  order: 'asc' | 'desc';
  totalCostUsd?: number;
  items: AiUsageRecord[];
};

export type AiUsageAgg = {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  totalCostUsd?: number;
  updatedAt: string;
};

export type AiUsageSummaryResponse = {
  global: AiUsageAgg;
  byModel?: Array<{ model: string } & AiUsageAgg>;
  byUser?: Array<{ userId: string } & AiUsageAgg>;
  model?: { key: string } & AiUsageAgg;
  user?: { key: string } & AiUsageAgg;
  modelUser?: { model: string; userId: string } & AiUsageAgg;
};

export type ListAiUsageParams = {
  model?: string;
  userId?: string;
  kind?: string;
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  order?: 'asc' | 'desc';
};

export type SummaryAiUsageParams = {
  model?: string;
  userId?: string;
  kind?: string;
  topModels?: number;
  topUsers?: number;
};

export async function listAiUsage(params: ListAiUsageParams = {}): Promise<AiUsageListResponse> {
  const queryParams: Record<string, string> = {};
  
  if (params.model) queryParams.model = params.model;
  if (params.userId) queryParams.userId = params.userId;
  if (params.kind) queryParams.kind = params.kind;
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.offset) queryParams.offset = params.offset.toString();
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;
  if (params.order) queryParams.order = params.order;

  const { data } = await axios.get<AiUsageListResponse>('/ai/usage', { params: queryParams });
  return data;
}

export async function getAiUsageSummary(params: SummaryAiUsageParams = {}): Promise<AiUsageSummaryResponse> {
  const queryParams: Record<string, string> = {};
  
  if (params.model) queryParams.model = params.model;
  if (params.userId) queryParams.userId = params.userId;
  if (params.kind) queryParams.kind = params.kind;
  if (params.topModels) queryParams.topModels = params.topModels.toString();
  if (params.topUsers) queryParams.topUsers = params.topUsers.toString();

  const { data } = await axios.get<AiUsageSummaryResponse>('/ai/usage/summary', { params: queryParams });
  return data;
}

