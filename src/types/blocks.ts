export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type BlockRow = {
  id: string;
  status: 'active' | 'unblocked' | 'expired';
  blockedAt: string;
  until?: string | null;
  reason?: string | null;
  email?: string | null;
  user?: { id: string; name?: string | null; email: string };
  blockedBy?: { id: string; name?: string | null; email: string };
};

export type BlockHistoryRow = {
  id: string;
  action: 'block' | 'unblock' | 'expire';
  createdAt: string;
  reason?: string | null;
  until?: string | null;
  email?: string | null;
  user?: { id: string; name?: string | null; email: string };
  actor?: { id: string; name?: string | null; email: string };
};

export type BlocksListResponse = {
  message: string;
  data: BlockRow[];
  pagination: Pagination;
};

export type BlocksHistoryResponse = {
  message: string;
  data: BlockHistoryRow[];
  pagination: Pagination;
};
