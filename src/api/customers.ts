// src/api/customers.ts
import axios from 'utils/axios';

export type Customer = {
  /** ID do registro Customer (genérico) */
  id: string;
  /** Nome pronto para exibição */
  name: string;
  /** Tipo do cliente (quando disponível) */
  kind?: 'PERSON' | 'COMPANY';
  /** IDs específicos quando o backend enviar */
  personId?: string | null;
  companyId?: string | null;
  /** Fallbacks comuns que muitas APIs retornam */
  person?: { id: string; fullName?: string } | null;
  company?: { id: string; legalName?: string } | null;
  displayName?: string;
};
export type CustomerListResponse = {
  message: string;
  data: Customer[];
  pagination: { page: number; limit: number; total: number };
};

/**
 * subjectId: devolve o ID que deve ser enviado para filtros/payloads.
 * - Se for PERSON: prioriza personId (ou person.id)
 * - Caso contrário: usa companyId (ou company.id) ou cai no customer.id
 */
export function subjectId(c?: Customer | null): string | undefined {
  if (!c) return undefined;
  const pid = c.personId ?? c.person?.id;
  const cid = c.companyId ?? c.company?.id;
  return (c.kind === 'PERSON' ? pid : cid) || c.id;
}

/**
 * resolveSubjectId:
 *  - Se for PERSON e o item não tiver personId/person.id, busca via getCustomer(...)
 *    para retornar o person.id verdadeiro.
 *  - Caso contrário, devolve o mesmo resultado do subjectId.
 */
export async function resolveSubjectId(c?: Customer | null): Promise<string | undefined> {
  if (!c) return undefined;
  const sid = subjectId(c);
  // quando PERSON sem personId explícito, tente buscar os detalhes
  if (c.kind === 'PERSON' && !c.personId && !c.person?.id) {
    try {
      const full = await getCustomer(c.id, true);
      return full?.person?.id || sid;
    } catch { /* ignora e mantém sid */ }
  }
  return sid;
}

export async function listCustomers(params?: { q?: string; search?: string; page?: number; limit?: number }) {
  // Mapeia 'search' para 'q' se 'search' for fornecido, mantém 'q' se já fornecido
  const apiParams = params?.search && !params?.q 
    ? { ...params, q: params.search, search: undefined } 
    : params;
  const { data } = await axios.get<CustomerListResponse>('/customers', { params: apiParams });
  return data;
}

export async function getCustomer(id: string, tree?: boolean) {
  const { data } = await axios.get(`/customers/${id}${tree ? '?tree=true' : ''}`);
  return data.data || data;
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatCEP(cep: string): string {
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
}

export async function getCompanyBranches(companyId: string) {
  const { data } = await axios.get(`/customers/${companyId}/branches`);
  // backend às vezes retorna array puro
  return Array.isArray(data) ? data : (data.data || []);
}

export async function deleteCompanyBranch(parentId: string, childId: string) {
  const { data } = await axios.delete(`/customers/${parentId}/branches/${childId}`);
  return data;
}

export async function deleteCustomer(id: string) {
  const { data } = await axios.delete(`/customers/${id}`);
  return data;
}

export async function listPeople(search?: string) {
  const { data } = await axios.get('/customers/people', { params: { search } });
  return Array.isArray(data) ? data : (data.data || []);
}

export async function listCompanies(search?: string) {
  const { data } = await axios.get('/customers/companies', { params: { search } });
  return Array.isArray(data) ? data : (data.data || []);
}

export async function createCompanyAsBranch(parentId: string, companyData: any) {
  const { data } = await axios.post(`/customers/${parentId}/branches`, companyData);
  return data.data;
}

export async function createCustomer(payload: any) {
  const { data } = await axios.post('/customers', payload);
  return data.data;
}

export async function updateCustomer(id: string, payload: any) {
  const { data } = await axios.patch(`/customers/${id}`, payload);
  return data.data;
}

export async function updateCustomerCompany(id: string, payload: any) {
  const { data } = await axios.patch(`/customers/${id}/company`, payload);
  return data.data;
}

export function extractDigits(str: string): string {
  return str.replace(/\D/g, '');
}

export async function getReceitaFederalData(cnpj: string) {
  const cleanCnpj = extractDigits(cnpj);
  const { data } = await axios.get(`/customers/receita-federal/${cleanCnpj}`);
  return data.data || data;
}

export async function createCustomerAddress(customerId: string, payload: any) {
  const { data } = await axios.post(`/customers/${customerId}/addresses`, payload);
  return data.data;
}

export async function updateCustomerAddress(customerId: string, addressId: string, payload: any) {
  const { data } = await axios.patch(`/customers/${customerId}/addresses/${addressId}`, payload);
  return data.data;
}

export async function deleteCustomerAddress(customerId: string, addressId: string) {
  const { data } = await axios.delete(`/customers/${customerId}/addresses/${addressId}`);
  return data;
}

export async function linkAsBranch(parentId: string, childId: string) {
  const { data } = await axios.post(`/customers/${parentId}/branches/${childId}`);
  return data.data;
}

export async function getCompanyPeople(companyId: string) {
  const { data } = await axios.get(`/customers/${companyId}/people`);
  return data.data || [];
}

export async function upsertCompanyPerson(companyId: string, payload: any) {
  const { data } = await axios.post(`/customers/${companyId}/people`, payload);
  return data.data;
}

export async function deleteCompanyPerson(companyId: string, personId: string) {
  const { data } = await axios.delete(`/customers/${companyId}/people/${personId}`);
  return data;
}