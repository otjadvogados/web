import axios from 'utils/axios';

// ==============================|| TIPOS ||============================== //

export type Prompt = {
  id: string;
  companyId: string;
  name: string;
  description: string;
  customerId: string | null;
  customer: {
    id: string;
    displayName: string;
    kind: 'PERSON' | 'COMPANY';
  } | null;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ListPromptsResponse = {
  message: string;
  data: Prompt[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type ListPromptsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  departmentId?: string;
  sortBy?: 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export type CreatePromptInput = {
  name: string;
  description: string;
  customerId?: string | null;
  departmentId?: string | null;
};

export type UpdatePromptInput = Partial<CreatePromptInput>;

export type PromptFolder = {
  id: string;
  type: 'general' | 'customer' | 'department';
  name: string;
  customerId: string | null;
  departmentId: string | null;
  items: Prompt[];
};

export type ListFoldersResponse = {
  message: string;
  data: PromptFolder[];
};

// ==============================|| FUNÇÕES DE API ||============================== //

/**
 * Lista prompts com paginação e filtros
 * Endpoint: GET /ai/prompts
 */
export async function listPrompts(params?: ListPromptsQuery): Promise<ListPromptsResponse> {
  const queryParams: Record<string, any> = {};
  
  if (params?.page) queryParams.page = params.page;
  if (params?.limit) queryParams.limit = params.limit;
  if (params?.search) queryParams.search = params.search;
  if (params?.customerId) queryParams.customerId = params.customerId;
  if (params?.departmentId) queryParams.departmentId = params.departmentId;
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;

  const { data } = await axios.get<ListPromptsResponse>('/ai/prompts', { params: queryParams });
  return data;
}

/**
 * Busca um prompt por ID
 * Endpoint: GET /ai/prompts/:id
 */
export async function getPrompt(id: string): Promise<Prompt> {
  const { data } = await axios.get<{ message: string; data: Prompt }>(`/ai/prompts/${id}`);
  return data.data;
}

/**
 * Cria um novo prompt
 * Endpoint: POST /ai/prompts
 */
export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
  const { data } = await axios.post<{ message: string; data: Prompt }>('/ai/prompts', input);
  return data.data;
}

/**
 * Atualiza um prompt existente
 * Endpoint: PATCH /ai/prompts/:id
 */
export async function updatePrompt(id: string, input: UpdatePromptInput): Promise<Prompt> {
  const { data } = await axios.patch<{ message: string; data: Prompt }>(`/ai/prompts/${id}`, input);
  return data.data;
}

/**
 * Exclui um prompt (soft delete)
 * Endpoint: DELETE /ai/prompts/:id
 */
export async function deletePrompt(id: string): Promise<void> {
  await axios.delete<{ message: string }>(`/ai/prompts/${id}`);
}

/**
 * Lista todas as pastas organizadas com seus prompts
 * Endpoint: GET /ai/prompts/folders
 */
export async function listPromptFolders(): Promise<PromptFolder[]> {
  const { data } = await axios.get<ListFoldersResponse>('/ai/prompts/folders');
  
  // O backend pode retornar { data: [...] } ou diretamente um array
  if (Array.isArray(data)) {
    return data;
  } else if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data)) {
    return (data as any).data;
  }
  
  return [];
}
