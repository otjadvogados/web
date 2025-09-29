// ==============================|| CUSTOMERS TYPES ||============================== //

// relação Customer ↔ Customer (matriz ↔ filial)
export type CustomerBranch = {
  id: string;
  parentId: string;
  childId: string;
  since?: string;
  until?: string;
  note?: string;
  // quando listada por parent, o service inclui child
  child?: CustomerWithDetails; // backend pode retornar o child "completo"
};

export type CustomerKind = 'PERSON' | 'COMPANY';
export type AddressType = 'A' | 'P' | 'C' | 'E'; // alternativo, pessoal, comercial, entrega

export type Customer = {
  id: string;
  kind: CustomerKind;
  displayName: string;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

export type CustomerPerson = {
  id: string;
  customerId: string;
  fullName: string;
  cpf: string; // 11 dígitos
  rg?: string;
  birthDate?: string; // 'YYYY-MM-DD'
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  addresses?: Address[];
};

export type CustomerCompany = {
  id: string;
  customerId: string;
  legalName: string;
  tradeName?: string;
  cnpj: string; // 14 dígitos
  stateRegistration?: string;
  municipalRegistration?: string;
  email?: string;
  phone?: string;
  parent?: {
    customer: Customer;
  };
  // Novos campos da Receita Federal
  status?: string; // ex.: 'ATIVA'
  openingDate?: string; // Date como string ISO
  legalNature?: string; // ex.: '206-2 - Sociedade Empresária Limitada'
  size?: string; // ex.: 'MICRO EMPRESA'
  mainActivity?: string;
  secondaryActivities?: string[];
  createdAt: string;
  updatedAt: string;
  addresses?: Address[];
  links?: CompanyPersonLink[]; // pessoas vinculadas
};

export type Address = {
  id: string;
  personId?: string;
  companyId?: string;
  addressType: AddressType;
  label?: string;
  isPrimary: boolean;
  street: string;
  number?: string;
  complement?: string;
  district?: string;
  city: string;
  state: string; // ex.: 'SP'
  postalCode: string; // CEP
  country: string; // default 'Brasil'
  reference?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompanyPersonLink = {
  companyId: string;
  personId: string;
  role?: string;
  isPrimary: boolean;
  isLegalRepresentative: boolean;
  createdAt: string;
  updatedAt: string;
  person?: CustomerPerson & { customer: Customer }; // incluído em listagens
};

// Tipos para criação
export type CreatePersonPayload = {
  kind: 'PERSON';
  displayName: string;
  person: {
    fullName: string;
    cpf: string;
    rg?: string;
    birthDate?: string;
    email?: string;
    phone?: string;
    addresses?: Omit<Address, 'id' | 'personId' | 'companyId' | 'createdAt' | 'updatedAt'>[];
  };
};

export type CreateCompanyPayload = {
  kind: 'COMPANY';
  displayName: string;
  company: {
    legalName: string;
    tradeName?: string;
    cnpj: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    email?: string;
    phone?: string;
    // Novos campos da Receita Federal
    status?: string;
    openingDate?: string; // 'dd/MM/yyyy'
    legalNature?: string;
    size?: string;
    mainActivity?: string;
    secondaryActivities?: string[];
    addresses?: Omit<Address, 'id' | 'personId' | 'companyId' | 'createdAt' | 'updatedAt'>[];
    people?: Array<{
      cpf?: string;
      personId?: string;
      createPerson?: {
        fullName: string;
        cpf: string;
        email?: string;
        phone?: string;
      };
      role?: string;
      isPrimary?: boolean;
      isLegalRepresentative?: boolean;
    }>;
    branches?: Array<{
      legalName: string;
      tradeName?: string;
      cnpj: string;
      email?: string;
      phone?: string;
    }>;
  };
};

export type CreateCustomerPayload = CreatePersonPayload | CreateCompanyPayload;

// Tipos para atualização
export type UpdateCustomerPayload = {
  displayName?: string;
  isActive?: boolean;
};

export type UpdateCompanyPayload = {
  legalName?: string;
  tradeName?: string;
  cnpj?: string;
  stateRegistration?: string;
  municipalRegistration?: string;
  email?: string;
  phone?: string;
  status?: string;
  openingDate?: string;
  legalNature?: string;
  size?: string;
  mainActivity?: string;
  secondaryActivities?: string[];
  addresses?: Array<{
    addressType: string;
    label: string;
    isPrimary: boolean;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    reference?: string;
  }>;
};

export type CreateAddressPayload = Omit<Address, 'id' | 'personId' | 'companyId' | 'createdAt' | 'updatedAt'>;

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export type CreateCompanyPersonPayload = {
  personId?: string;
  cpf?: string;
  createPerson?: {
    fullName: string;
    cpf: string;
    email?: string;
    phone?: string;
  };
  role?: string;
  isPrimary?: boolean;
  isLegalRepresentative?: boolean;
};

export type CreateBranchPayload =
  | { existingCustomerId: string; note?: string; since?: string; until?: string }
  | { createCustomer: CreateCustomerPayload; note?: string; since?: string; until?: string };

// Tipos para respostas da API
export type CustomerWithDetails = Customer & {
  person?: CustomerPerson;
  company?: CustomerCompany;
  // quando ?tree=true, vamos esperar branches aqui (ajuste o backend se necessário)
  branches?: CustomerBranch[];
};

export type ApiError = {
  statusCode: number;
  message: string;
  error: string;
};

// ==============================|| RECEITA FEDERAL TYPES ||============================== //

// Resposta da sua API de CNPJ/Receita (exatamente como retorna do backend)
export type ReceitaFederalApiResponse = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string | null;

  situacao: 'ATIVA' | 'INATIVA' | 'SUSPENSA' | 'INAPTA' | 'BAIXADA' | string;
  dataSituacao?: string;
  motivoSituacao?: string | null;

  naturezaJuridica?: string;
  abertura?: string; // 'dd/MM/yyyy' ou ISO
  capitalSocial?: number | string;
  porte?: string; // 'MEI', 'MICRO EMPRESA', etc.

  atividadePrincipal: { codigo: string; descricao: string };
  atividadesSecundarias: Array<{ codigo: string; descricao: string }>;

  contato: {
    email?: string | null;
    telefone?: string | null;
  };

  endereco: {
    logradouro: string;
    numero?: string;
    complemento?: string | null;
    bairro?: string;
    municipio: string;
    uf: string;
    cep: string; // pode vir com ou sem máscara
  };
};

// Formato interno usado no frontend (mapeado em api/customers.ts)
export type ReceitaFederalData = {
  cnpj: string;
  legalName: string;
  email?: string;
  phone?: string;
  address: {
    street: string;
    number?: string;
    complement?: string;
    district?: string;
    city: string;
    state: string;
    postalCode: string;
  };
  status?: 'ATIVA' | 'INATIVA' | 'SUSPENSA' | 'INAPTA' | 'BAIXADA' | string;
  openingDate?: string; // 'dd/MM/yyyy' ou 'YYYY-MM-DD'
  legalNature?: string;
  capital?: number | string;
  size?: string; // porte
  mainActivity?: { code: string; description: string };
  secondaryActivities: Array<{ code: string; description: string }>;
};