export type RoleLite = {
  id: string;
  name: string;
  description?: string | null;
  companyId: string;
};

export type DepartmentLite = {
  id: string;
  name: string;
  description?: string | null;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cpf?: string | null;            // pode vir ou não, depende da permissão
  birthdate?: string | null;      // ISO
  emailVerifiedAt?: string | null; // ISO timestamp ou null
  createdAt: string;
  updatedAt: string;
  role?: RoleLite | null;
  departments?: DepartmentLite[];
  isBlocked?: boolean;            // indica se o usuário está bloqueado
};

export type UsersListResponse = {
  message: string;
  data: UserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
