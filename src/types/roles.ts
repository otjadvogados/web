export type RoleRow = {
  id: string;
  name: string;
  description?: string | null;
  company?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RolesListResponse = {
  message: string;
  data: RoleRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
