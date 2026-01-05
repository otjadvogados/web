import axios from 'utils/axios';

export type CustomerKind = 'PERSON' | 'COMPANY';

export type Customer = {
  id: string;
  displayName?: string;
  name?: string;
  // personId presente quando kind=PERSON (id da tabela customer_person)
  personId?: string;
  // SUGESTÃO: o backend passar esses campos quando includeHierarchy=true
  kind?: CustomerKind;                 // 'PERSON' | 'COMPANY'
  isMatriz?: boolean;                  // true para empresa não-filial (raiz ou sem vínculo)
  isFilial?: boolean;                  // true se for filial
  parentCustomerId?: string | null;    // se filial, id da matriz (customer)
};

export type CustomersListResponse = {
  message: string;
  data: Customer[];
  pagination: { page: number; limit: number; total: number };
};

export type ListCustomersParams = {
  search?: string;
  page?: number;
  limit?: number;
  kind?: 'ANY' | CustomerKind;         // ANY (padrão), PERSON, COMPANY
  branch?: 'any' | 'matrix' | 'branch';// só se kind=COMPANY: matrix (matriz), branch (filial)
  includeHierarchy?: boolean;          // pede isMatriz/isFilial/parentCustomerId no payload
};

export type LinkedPerson = {
  id: string;
  customerId: string;
  personId: string;
  role?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * NOVO: listagem com filtros por tipo e hierarquia (se o backend suportar).
 * Caso o backend ainda não suporte, você pode temporariamente ignorar as flags
 * (o front continua funcionando para busca 'Todos').
 */
export async function listCustomersAdvanced(params?: ListCustomersParams) {
  const q: any = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    search: params?.search || undefined,
    kind: params?.kind && params.kind !== 'ANY' ? params.kind : undefined,
    branch: params?.branch && params.branch !== 'any' ? params.branch : undefined,
    includeHierarchy: params?.includeHierarchy ? 1 : undefined
  };
  const { data } = await axios.get<CustomersListResponse>('/customers', { params: q });
  return data;
}

// Helper para ranking e ordenação consistente no cliente
export function sortCustomersMatrizFilialPF(list: Customer[]) {
  const rank = (c: Customer) => (c.kind === 'COMPANY' ? (c.isFilial ? 1 : 0) : 2);
  return [...(list || [])].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const an = (a.displayName ?? a.name ?? '').toString();
    const bn = (b.displayName ?? b.name ?? '').toString();
    return an.localeCompare(bn, 'pt-BR', { sensitivity: 'base', ignorePunctuation: true, numeric: true });
  });
}

export async function listCustomers(params?: { search?: string; page?: number; limit?: number }) {
  const q = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    search: params?.search || undefined
  };
  const { data } = await axios.get<CustomersListResponse>('/customers', { params: q });
  return data;
}

// Aceita string (busca) ou objeto { search, page, limit } e sempre retorna o ARRAY de customers.
export async function listPeople(params?: { search?: string; page?: number; limit?: number } | string): Promise<import('../types/customers').Customer[]> {
  const isStr = typeof params === 'string';
  const q = {
    page: !isStr ? params?.page ?? 1 : 1,
    limit: !isStr ? params?.limit ?? 20 : 20,
    search: isStr ? (params as string) : params?.search || undefined
  };
  const { data } = await axios.get<CustomersListResponse>('/customers/people', { params: q });
  // backend pode vir como {message,data,pagination} ou diretamente como array
  // padroniza para array
  // @ts-ignore
  return Array.isArray(data) ? (data as unknown as import('../types/customers').Customer[]) : (data?.data ?? []);
}

export async function listCompanies(params?: { search?: string; page?: number; limit?: number } | string): Promise<import('../types/customers').Customer[]> {
  const isStr = typeof params === 'string';
  const q = {
    page: !isStr ? params?.page ?? 1 : 1,
    limit: !isStr ? params?.limit ?? 20 : 20,
    search: isStr ? (params as string) : params?.search || undefined
  };
  const { data } = await axios.get<CustomersListResponse>('/customers/companies', { params: q });
  // padroniza para array
  // @ts-ignore
  return Array.isArray(data) ? (data as unknown as import('../types/customers').Customer[]) : (data?.data ?? []);
}

export async function getCompanyPeople(companyId: string) {
  const { data } = await axios.get<{ message?: string; data?: LinkedPerson[] } | LinkedPerson[]>(
    `/customers/${companyId}/people`
  );
  // aceita wrapper ou payload cru
  // @ts-ignore
  return Array.isArray(data) ? (data as LinkedPerson[]) : (data?.data ?? []);
}

export async function linkPersonToCompany(companyId: string, personId: string, role?: string) {
  const { data } = await axios.post<{ message: string; data: LinkedPerson }>(`/customers/${companyId}/people`, {
    personId,
    role
  });
  return data.data;
}

export async function resolveSubjectId(subjectId: string) {
  const { data } = await axios.get<{ message: string; data: Customer }>(`/customers/resolve/${subjectId}`);
  return data.data;
}

export const subjectId = (customer: Customer) => customer.id;

export async function deleteCustomer(id: string) {
  const { data } = await axios.delete<{ message: string }>(`/customers/${id}`);
  return data;
}

// Funções adicionais para CustomerForm
export async function createCustomer(payload: any) {
  const { data } = await axios.post<{ message: string; data: any }>('/customers', payload);
  return data.data;
}

// Aceita flag 'tree' (true/false) para pedir expansões no backend
// e lida tanto com {message,data} quanto com objeto cru.
export async function getCustomer(id: string, tree?: boolean) {
  const { data } = await axios.get<{ message?: string; data?: any } | any>(`/customers/${id}`, {
    params: tree ? { tree: true } : undefined
  });
  return (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
}

export async function updateCustomer(id: string, payload: any) {
  const { data } = await axios.patch<{ message: string; data: any }>(`/customers/${id}`, payload);
  return data.data;
}

export async function updateCustomerCompany(id: string, payload: any) {
  const { data } = await axios.patch<{ message: string; data: any }>(`/customers/${id}/company`, payload);
  return data.data;
}

export function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export async function getReceitaFederalData(cnpj: string) {
  const cnpjClean = extractDigits(cnpj);
  // backend pode retornar {message,data} OU o objeto cru
  const { data } = await axios.get<{ message?: string; data?: any } | any>(`/customers/receita-federal/${cnpjClean}`);
  if (data && typeof data === 'object' && 'data' in data) return (data as any).data;
  return data; // objeto cru
}

export function formatCNPJ(cnpj: string): string {
  const digits = extractDigits(cnpj);
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatCPF(cpf: string): string {
  const digits = extractDigits(cpf);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCEP(cep: string): string {
  const digits = extractDigits(cep);
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Funções de endereços
export async function createCustomerAddress(customerId: string, payload: any) {
  const { data } = await axios.post<{ message: string; data: any }>(`/customers/${customerId}/addresses`, payload);
  return data.data;
}

export async function updateCustomerAddress(customerId: string, addressId: string, payload: any) {
  const { data } = await axios.patch<{ message: string; data: any }>(`/customers/${customerId}/addresses/${addressId}`, payload);
  return data.data;
}

export async function deleteCustomerAddress(customerId: string, addressId: string) {
  const { data } = await axios.delete<{ message: string }>(`/customers/${customerId}/addresses/${addressId}`);
  return data;
}

// Funções de filiais
export async function linkAsBranch(parentId: string, childId: string, payload?: any) {
  const { data } = await axios.post<{ message: string; data: any }>(`/customers/${parentId}/branches`, {
    childId,
    ...payload
  });
  return data.data;
}

export async function createCompanyAsBranch(parentId: string, payload: any) {
  const { data } = await axios.post<{ message: string; data: any }>(`/customers/${parentId}/branches`, payload);
  return data.data;
}

export async function deleteCompanyBranch(parentId: string, branchId: string) {
  const { data } = await axios.delete<{ message: string }>(`/customers/${parentId}/branches/${branchId}`);
  return data;
}

export async function getCompanyBranches(companyId: string) {
  const { data } = await axios.get<{ message?: string; data?: any[] } | any[]>(
    `/customers/${companyId}/branches`
  );
  // aceita wrapper ou array cru
  // @ts-ignore
  return Array.isArray(data) ? (data as any[]) : (data?.data ?? []);
}

// Opcional: árvore leve (matriz + filiais). Mantém compat com back atual.
export async function getCompanyTree(companyId: string) {
  // tenta endpoint de árvore via ?tree=true (se existir)
  try {
    const root = await getCustomer(companyId, true);
    return root;
  } catch {
    return { branches: await getCompanyBranches(companyId) };
  }
}

// Funções de pessoas da empresa
export async function upsertCompanyPerson(companyId: string, payload: any) {
  const { data } = await axios.post<{ message: string; data: any }>(`/customers/${companyId}/people/upsert`, payload);
  return data.data;
}

export async function deleteCompanyPerson(companyId: string, personId: string) {
  const { data } = await axios.delete<{ message: string }>(`/customers/${companyId}/people/${personId}`);
  return data;
}