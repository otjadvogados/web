export type DepartmentRow = {
  id: string;
  name: string;
  description?: string | null;
  company?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DepartmentsListResponse = {
  message: string;
  data: DepartmentRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
