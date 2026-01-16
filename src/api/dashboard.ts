import axios from 'utils/axios';

export type UsageRankingBreakdown = {
  bucket: string;
  totalSeconds: number;
  formatted: string;
};

export type UsageRankingItem = {
  rank: number;
  userId: string;
  userName: string;
  imageUrl?: string;
  avatarFileId?: string | null; // ID do arquivo de avatar para cache HTTP
  totalSeconds: number;
  totalHours: number;
  formattedTotal: string;
  sessionsCount: number;
  lastActivity: string;
  relativeToLeader: number;
  breakdown?: UsageRankingBreakdown[];
  range?: {
    start: string;
    end: string;
  };
};

export type UsageRankingParams = {
  startDate?: string; // YYYY-MM-DD ou DD/MM/YYYY
  endDate?: string; // YYYY-MM-DD ou DD/MM/YYYY
  limit?: number;
  groupBy?: 'day' | 'week' | 'month';
};

export async function getUsageRanking(params: UsageRankingParams = {}): Promise<UsageRankingItem[]> {
  const queryParams: Record<string, string> = {};
  
  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.groupBy) queryParams.groupBy = params.groupBy;

  const { data } = await axios.get<UsageRankingItem[]>('/dashboard/usage-ranking', { params: queryParams });
  return data;
}

// ==============================|| PRODUTIVIDADE DE PEÇAS ||============================== //

export type PieceProductivityItem = {
  pieceId: string;
  pieceName: string;
  createdAt: string;
  finalizedAt?: string | null;
  approvedAt?: string | null;
  releasedAt?: string | null;
  finalizedBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  approvedBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  releasedBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
  timeToFinalize?: number | null; // segundos
  timeToApprove?: number | null; // segundos
  timeToRelease?: number | null; // segundos
  totalTime?: number | null; // segundos (do created_at até released_at)
  formattedTimeToFinalize?: string;
  formattedTimeToApprove?: string;
  formattedTimeToRelease?: string;
  formattedTotalTime?: string;
};

export type PieceProductivityParams = {
  startDate?: string; // YYYY-MM-DD ou DD/MM/YYYY
  endDate?: string; // YYYY-MM-DD ou DD/MM/YYYY
  limit?: number;
  pieceId?: string;
};

export async function getPieceProductivity(params: PieceProductivityParams = {}): Promise<PieceProductivityItem[]> {
  const queryParams: Record<string, string> = {};
  
  if (params.startDate) queryParams.startDate = params.startDate;
  if (params.endDate) queryParams.endDate = params.endDate;
  if (params.limit) queryParams.limit = params.limit.toString();
  if (params.pieceId) queryParams.pieceId = params.pieceId;

  const { data } = await axios.get<PieceProductivityItem[]>('/dashboard/piece-productivity', { params: queryParams });
  return data;
}

