export type SensitiveField = {
  id: string;
  entity: string;
  field: string;
  moduleName: string;
  label?: string | null;
  description?: string | null;
  readRule?: string | null;
  writeRule?: string | null;
  active: boolean;
  companyId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SensitiveFieldListResponse = {
  data: SensitiveField[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
