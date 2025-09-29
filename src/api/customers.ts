import api from '../utils/axios';
import {
  Customer,
  CustomerWithDetails,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  UpdateCompanyPayload,
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
  CompanyPersonLink,
  CreateCompanyPersonPayload,
  CreateBranchPayload,
  CustomerBranch,
  ReceitaFederalApiResponse,
  ReceitaFederalData
} from '../types/customers';

const LANG = import.meta.env.VITE_APP_ACCEPT_LANGUAGE || 'pt-BR';

// ==============================|| CUSTOMERS API ||============================== //

// 1) Criar cliente (PF ou PJ)
export async function createCustomer(payload: CreateCustomerPayload): Promise<CustomerWithDetails> {
  const res = await api.post('/customers', payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// 2) Buscar um cliente
export async function getCustomer(id: string, tree = false): Promise<CustomerWithDetails> {
  const res = await api.get(`/customers/${id}`, {
    params: { tree },
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// 3) Atualizar um cliente
export async function updateCustomer(id: string, payload: UpdateCustomerPayload): Promise<Customer> {
  const res = await api.patch(`/customers/${id}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// Atualizar dados da empresa
export async function updateCustomerCompany(id: string, payload: UpdateCompanyPayload): Promise<CustomerWithDetails> {
  const res = await api.patch(`/customers/${id}/company`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// 4) Deletar um cliente
export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`, {
    headers: { 'Accept-Language': LANG }
  });
}

// 5) Listar coleções por tipo
export async function listPeople(q?: string): Promise<Customer[]> {
  const res = await api.get('/customers/people', {
    params: q ? { q } : {},
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function listCompanies(q?: string): Promise<Customer[]> {
  const res = await api.get('/customers/companies', {
    params: q ? { q } : {},
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}


// 6) Endereços (por customer)
export async function getCustomerAddresses(customerId: string): Promise<Address[]> {
  const res = await api.get(`/customers/${customerId}/addresses`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function createCustomerAddress(customerId: string, payload: CreateAddressPayload): Promise<Address> {
  const res = await api.post(`/customers/${customerId}/addresses`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function updateCustomerAddress(
  customerId: string, 
  addressId: string, 
  payload: UpdateAddressPayload
): Promise<Address> {
  const res = await api.patch(`/customers/${customerId}/addresses/${addressId}`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteCustomerAddress(customerId: string, addressId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/addresses/${addressId}`, {
    headers: { 'Accept-Language': LANG }
  });
}

// 7) Pessoas vinculadas a uma empresa
export async function getCompanyPeople(customerId: string): Promise<CompanyPersonLink[]> {
  const res = await api.get(`/customers/${customerId}/people`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

// Upsert (POST) – alias semântico para o checklist
export async function upsertCompanyPerson(customerId: string, payload: CreateCompanyPersonPayload): Promise<CompanyPersonLink> {
  return createCompanyPerson(customerId, payload);
}

export async function createCompanyPerson(customerId: string, payload: CreateCompanyPersonPayload): Promise<CompanyPersonLink> {
  const res = await api.post(`/customers/${customerId}/people`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteCompanyPerson(customerId: string, personId: string): Promise<void> {
  await api.delete(`/customers/${customerId}/people/${personId}`, {
    headers: { 'Accept-Language': LANG }
  });
}

// 8) Filiais de uma empresa
export async function getCompanyBranches(customerId: string): Promise<CustomerBranch[]> {
  const res = await api.get(`/customers/${customerId}/branches`, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function createCompanyBranch(
  parentCustomerId: string,
  payload: CreateBranchPayload
): Promise<CustomerBranch> {
  const res = await api.post(`/customers/${parentCustomerId}/branches`, payload, {
    headers: { 'Accept-Language': LANG }
  });
  return res.data;
}

export async function deleteCompanyBranch(parentCustomerId: string, childCustomerId: string): Promise<void> {
  await api.delete(`/customers/${parentCustomerId}/branches/${childCustomerId}`, {
    headers: { 'Accept-Language': LANG }
  });
}

// Helpers
export async function linkAsBranch(parentId: string, childCustomerId: string, note?: string) {
  return createCompanyBranch(parentId, { existingCustomerId: childCustomerId, note });
}

export async function createCompanyAsBranch(parentId: string, payload: CreateCustomerPayload, note?: string) {
  return createCompanyBranch(parentId, { createCustomer: payload, note });
}

// ==============================|| UTILITY FUNCTIONS ||============================== //

// Função para formatar CNPJ
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj;
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Função para formatar CEP
export function formatCEP(cep: string): string {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return cep;
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Função para formatar CPF
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para extrair apenas dígitos
export function extractDigits(value: string): string {
  return value.replace(/\D/g, '');
}

// Função para validar CPF básico
export function isValidCPF(cpf: string): boolean {
  const digits = extractDigits(cpf);
  return digits.length === 11;
}

// Função para validar CNPJ básico
export function isValidCNPJ(cnpj: string): boolean {
  const digits = extractDigits(cnpj);
  return digits.length === 14;
}

// Função para validar CEP básico
export function isValidCEP(cep: string): boolean {
  const digits = extractDigits(cep);
  return digits.length === 8;
}

// ==============================|| RECEITA FEDERAL API ||============================== //

// Função para mapear resposta da API da Receita Federal para o formato do frontend
function mapReceitaFederalData(apiData: ReceitaFederalApiResponse): ReceitaFederalData {
  // Mapear status da situação
  const statusMap: Record<string, string> = {
    'ATIVA': 'ATIVA',
    'INATIVA': 'INATIVA',
    'SUSPENSA': 'SUSPENSA',
    'INAPTA': 'INAPTA',
    'BAIXADA': 'BAIXADA'
  };

  return {
    cnpj: formatCNPJ(apiData.cnpj),
    legalName: apiData.razaoSocial,
    email: apiData.contato.email || undefined,
    phone: apiData.contato.telefone || undefined,
    address: {
      street: apiData.endereco.logradouro,
      number: apiData.endereco.numero,
      complement: apiData.endereco.complemento || undefined,
      district: apiData.endereco.bairro,
      city: apiData.endereco.municipio,
      state: apiData.endereco.uf,
      postalCode: apiData.endereco.cep
    },
    status: statusMap[apiData.situacao] || apiData.situacao,
    openingDate: apiData.abertura,
    legalNature: apiData.naturezaJuridica,
    capital: apiData.capitalSocial,
    size: apiData.porte,
    mainActivity: {
      code: apiData.atividadePrincipal.codigo,
      description: apiData.atividadePrincipal.descricao
    },
    secondaryActivities: apiData.atividadesSecundarias.map(activity => ({
      code: activity.codigo,
      description: activity.descricao
    }))
  };
}

// Buscar dados da Receita Federal por CNPJ
export async function getReceitaFederalData(cnpj: string): Promise<ReceitaFederalData> {
  const cleanCnpj = extractDigits(cnpj);
  if (!isValidCNPJ(cleanCnpj)) {
    throw new Error('CNPJ inválido');
  }

  const res = await api.get(`/customers/cnpj/${cleanCnpj}`, {
    headers: { 'Accept-Language': LANG }
  });
  
  // Mapear os dados da API para o formato esperado pelo frontend
  return mapReceitaFederalData(res.data);
}
