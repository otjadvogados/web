import React, { useState, useEffect } from 'react';
import {
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Alert,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import {
  SaveOutlined as SaveIcon, ArrowLeftOutlined as ArrowBackIcon, SearchOutlined as SearchIcon,
  LoadingOutlined as LoadingIcon, PlusOutlined as AddIcon, LinkOutlined as LinkIcon
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Customer, CustomerKind, CreateCustomerPayload, CustomerWithDetails, ReceitaFederalData, UpdateCompanyPayload, CustomerBranch, CompanyPersonLink } from '../../types/customers';
import CompanyPeopleList from './CompanyPeopleList';
import { linkPersonToCompany, LinkedPerson } from '../../api/customers';
import {
  createCustomer, getCustomer, updateCustomer, updateCustomerCompany, extractDigits,
  getReceitaFederalData, formatCNPJ, formatCPF,
  createCustomerAddress, updateCustomerAddress, deleteCustomerAddress,
  listCompanies, listPeople,
  linkAsBranch, createCompanyAsBranch, deleteCompanyBranch, getCompanyBranches,
  getCompanyPeople, upsertCompanyPerson, deleteCompanyPerson
} from '../../api/customers';
import { listPeople as apiListPeople, resolveSubjectId } from '../../api/customers';
import { openSnackbar } from '../../api/snackbar';
import type { CreateAddressPayload, AddressType, UpdateAddressPayload } from '../../types/customers';

// Interface para endereços no formulário (pode ter id se for existente)
interface FormAddressPayload extends CreateAddressPayload {
  id?: string; // ID do endereço existente (se houver)
}

// ==============================|| CUSTOMER FORM ||============================== //

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  noPadding?: boolean;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, noPadding = false, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-form-tabpanel-${index}`}
      aria-labelledby={`customer-form-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={noPadding ? {} : { p: 2 }}>{children}</Box>}
    </div>
  );
}

interface CustomerFormData {
  kind: CustomerKind;
  displayName: string;
  isActive: boolean;
  // Pessoa Física
  fullName: string;
  cpf: string;
  rg: string;
  birthDate: string;
  email: string;
  phone: string;
  // Pessoa Jurídica
  legalName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration: string;
  municipalRegistration: string;
  companyEmail: string;
  companyPhone: string;
  // Novos campos da Receita Federal
  status: string;
  openingDate: string;
  legalNature: string;
  size: string;
  mainActivity: string;
  secondaryActivities: string[];
}

const STATUS_OPTIONS = ['ATIVA', 'INATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA'];
const SIZE_OPTIONS = ['MEI', 'MICRO EMPRESA', 'PEQUENA EMPRESA', 'MÉDIA EMPRESA', 'GRANDE EMPRESA'];

const initialFormData: CustomerFormData = {
  kind: 'PERSON',
  displayName: '',
  isActive: true,
  fullName: '',
  cpf: '',
  rg: '',
  birthDate: '',
  email: '',
  phone: '',
  legalName: '',
  tradeName: '',
  cnpj: '',
  stateRegistration: '',
  municipalRegistration: '',
  companyEmail: '',
  companyPhone: '',
  // Novos campos da Receita Federal
  status: '',
  openingDate: '',
  legalNature: '',
  size: '',
  mainActivity: '',
  secondaryActivities: []
};

// ---- Pessoas (create) ----
type DraftLink = {
  // Identificação
  personId?: string;           // quando adicionar existente
  personName?: string;         // nome da pessoa para exibição
  cpf?: string;                // fallback para identificação por CPF
  createPerson?: {             // quando criar nova pessoa
    fullName: string;
    cpf: string;               // com máscara no input; enviaremos só dígitos
    email?: string;
    phone?: string;
  };
  // Vínculo
  role?: string;
  isPrimary?: boolean;
  isLegalRepresentative?: boolean;
};

// Mensagens amigáveis p/ erros 400/404
const friendlyError = (err: any, fallback = 'Falha ao processar requisição') => {
  const status = err?.response?.status;
  const msg: string = err?.response?.data?.message || '';
  if (status === 400) {
    if (/cpf/i.test(msg)) return 'CPF inválido.';
    return 'Dados inválidos.';
  }
  if (status === 404) return 'Pessoa não encontrada.';
  return fallback;
};

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [cnpjSearching, setCnpjSearching] = useState(false);
  const [receitaData, setReceitaData] = useState<ReceitaFederalData | null>(null);
  // endereços no formulário (existentes com id ou novos sem id)
  const [companyAddresses, setCompanyAddresses] = useState<FormAddressPayload[]>([]);
  // endereços para Pessoa (PERSON)
  const [personAddresses, setPersonAddresses] = useState<FormAddressPayload[]>([]);
  const [secondaryInput, setSecondaryInput] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);
  // --- estado para "empresa-matriz" ---
  const [parentSearch, setParentSearch] = useState('');
  const [parentLoading, setParentLoading] = useState(false);
  const [parentOptions, setParentOptions] = useState<Customer[]>([]);
  const [selectedParent, setSelectedParent] = useState<Customer | null>(null); // apenas para exibir no formulário; o vínculo é criado via /branches
  const [originalAddressIds, setOriginalAddressIds] = useState<string[]>([]); // IDs originais dos endereços
  const [initialParentId, setInitialParentId] = useState<string | null>(null); // matriz original (se houver)

  // ---- MATRIZ / FILIAIS (no Editar) ----
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  // dialog "Adicionar Filial"
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState(0); // 0 = existente, 1 = nova
  const [searchExistingBranch, setSearchExistingBranch] = useState('');
  const [existingBranchLoading, setExistingBranchLoading] = useState(false);
  const [existingBranchOptions, setExistingBranchOptions] = useState<Customer[]>([]);
  const [selectedExistingBranch, setSelectedExistingBranch] = useState<Customer | null>(null);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    displayName: '',
    legalName: '',
    cnpj: '',
    tradeName: '',
    email: '',
    phone: ''
  });

  // ---- Pessoas (create & edit) ----
  // Draft a ser enviado em company.people[] (apenas no CREATE)
  const [peopleDraft, setPeopleDraft] = useState<DraftLink[]>([]);

  // Estado do EDIT (carregado por GET /customers/:id/people)
  const [peopleLinks, setPeopleLinks] = useState<CompanyPersonLink[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  // Dialog "Adicionar Pessoa"
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleTab, setPeopleTab] = useState(0); // 0=existente, 1=nova
  const [searchPerson, setSearchPerson] = useState('');
  const [personOptions, setPersonOptions] = useState<Customer[]>([]);
  const [personLoading, setPersonLoading] = useState(false);
  const [selectedExistingPerson, setSelectedExistingPerson] = useState<Customer | null>(null);
  
  // Estados para o novo componente CompanyPeopleList
  const [newlyLinked, setNewlyLinked] = useState<LinkedPerson | null>(null);
  const [quickRole, setQuickRole] = useState('');
  const [newPerson, setNewPerson] = useState({ fullName: '', cpf: '', email: '', phone: '' });
  const [peopleRole, setPeopleRole] = useState('');
  const [peopleIsPrimary, setPeopleIsPrimary] = useState(false);
  const [peopleIsLegalRep, setPeopleIsLegalRep] = useState(false);
  const [peopleActionLoading, setPeopleActionLoading] = useState(false);
  const [peopleActionError, setPeopleActionError] = useState<string | null>(null);

  // --- Quick link (autocomplete) para "Vincular pessoa" no EDIT ---
  const [quickPersonInput, setQuickPersonInput] = useState('');
  const [quickPersonOptions, setQuickPersonOptions] = useState<Customer[]>([]);
  const [quickPersonLoading, setQuickPersonLoading] = useState(false);
  const [quickSelectedPerson, setQuickSelectedPerson] = useState<Customer | null>(null);

  // Carregar dados do cliente se estiver editando
  useEffect(() => {
    if (isEdit && id) {
      loadCustomer();
    }
  }, [isEdit, id]);

  // Se mudar para PERSON e o usuário estiver na aba 2 ou 3, volta para 0
  useEffect(() => {
    if (formData.kind !== 'COMPANY' && tabValue > 1) setTabValue(0);
  }, [formData.kind, tabValue]);

  // Busca empresas para o autocomplete (com debounce simples)
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (formData.kind !== 'COMPANY') return;
      const q = parentSearch.trim();
      if (q.length < 2) {
        if (!alive) return;
        setParentOptions([]);
        setParentLoading(false);
        return;
      }
      setParentLoading(true);
      try {
        const res = await listCompanies(q);
        if (alive) setParentOptions(res as import('../../types/customers').Customer[]);
      } finally {
        if (alive) setParentLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [parentSearch, formData.kind]);

  // --- busca para "Vincular existente" (filiais) ---
  useEffect(() => {
    let alive = true;
    if (!addOpen || addTab !== 0) return;
    const q = searchExistingBranch.trim();
    if (q.length < 2) {
      setExistingBranchOptions([]);
      setExistingBranchLoading(false);
      return;
    }
    setExistingBranchLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await listCompanies(q);
        if (!alive) return;
        // evita listar a própria empresa e filiais já vinculadas
        const avoidIds = new Set<string>([
          id || '',
          ...(branches || []).map(b => b.childId)
        ]);
        setExistingBranchOptions((res as Customer[]).filter((c) => !avoidIds.has(c.id)));
      } finally {
        if (alive) setExistingBranchLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [addOpen, addTab, searchExistingBranch, branches, id]);

  // Autocomplete de pessoas (GET /customers/people?q=)
  useEffect(() => {
    let alive = true;
    if (!peopleOpen || peopleTab !== 0) return;
    const q = searchPerson.trim();
    if (q.length < 2) {
      setPersonOptions([]);
      setPersonLoading(false);
      return;
    }
    setPersonLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await listPeople(q);
        if (!alive) return;
        // apenas pessoas (defensivo)
        setPersonOptions((res as Customer[]).filter((c) => c.kind === 'PERSON'));
      } finally {
        if (alive) setPersonLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [peopleOpen, peopleTab, searchPerson]);

  // ---- Autocomplete rápido (aba Pessoas Vinculadas no EDIT) ----
  useEffect(() => {
    let alive = true;
    const q = quickPersonInput.trim();
    if (!isEdit || !id) return;
    if (q.length < 2) {
      setQuickPersonOptions([]);
      setQuickPersonLoading(false);
      return;
    }
    setQuickPersonLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await apiListPeople(q);
        if (!alive) return;
        setQuickPersonOptions(((res || []) as Customer[]).filter((c: any) => c.kind === 'PERSON'));
      } finally {
        if (alive) setQuickPersonLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [quickPersonInput, isEdit, id]);

  // Helpers de exibição
  const branchDisplayName = (b: CustomerBranch) => {
    const ch: any = (b as any).child;
    return ch?.displayName ||
           ch?.customer?.displayName ||
           ch?.company?.legalName ||
           ch?.legalName ||
           b.childId;
  };
  // Sempre devolver o *customerId* da filial para navegação/remoção
  const branchTargetId = (b: CustomerBranch) => {
    const ch: any = (b as any).child;
    // 1) childId (id do Customer da filial vindo do link)
    // 2) child.customer.id (quando child vem expandido)
    // 3) ch.id (fallback legado; pode ser company.id)
    return b.childId || ch?.customer?.id || ch?.id;
  };

  // Carrega lista de filiais para a empresa atual (se for matriz), ou irmãs (se for filial)
  const loadBranches = async (cust: CustomerWithDetails) => {
    if (!cust || cust.kind !== 'COMPANY') {
      setBranches([]);
      return;
    }
    setBranchesLoading(true);
    try {
      const parent = (cust.company as any)?.parent?.customer || null;
      const baseId = parent ? parent.id : cust.id;
      let list = await getCompanyBranches(baseId);
      if (parent) list = list.filter((b: { childId: string; }) => b.childId !== cust.id); // se for filial, oculta ela mesma
      setBranches(list);
    } catch (e: any) {
      openSnackbar({ 
        open: true, 
        message: e?.response?.data?.message || 'Erro ao carregar filiais', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
      setBranches([]);
    } finally {
      setBranchesLoading(false);
    }
  };

  // Carrega pessoas vinculadas (apenas no EDIT, company)
  const refreshPeopleLinks = async (customerId: string) => {
    setPeopleLoading(true);
    setPeopleError(null);
    try {
      const list = await getCompanyPeople(customerId);
      setPeopleLinks(list as unknown as CompanyPersonLink[]);
    } catch (e: any) {
      setPeopleError(friendlyError(e, 'Erro ao carregar pessoas vinculadas'));
    } finally {
      setPeopleLoading(false);
    }
  };

  // Helper: garante 1 vínculo primário entre itens (draft ou edit local)
  const ensureSinglePrimary = (arr: Array<any>, idxPrimary: number) =>
    arr.map((p, i) => ({ ...p, isPrimary: i === idxPrimary }));

  // Abra o diálogo de pessoas com estado limpo
  const openPeopleDialog = (defaultTab = 0) => {
    setPeopleTab(defaultTab);
    setSelectedExistingPerson(null);
    setNewPerson({ fullName: '', cpf: '', email: '', phone: '' });
    setPeopleRole('');
    setPeopleIsPrimary(false);
    setPeopleIsLegalRep(false);
    setPeopleActionError(null);
    setPeopleOpen(true);
  };

  const loadCustomer = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const customer = await getCustomer(id, true);
      
       setFormData({
         kind: customer.kind,
         displayName: customer.displayName,
         isActive: customer.isActive,
         fullName: customer.person?.fullName || '',
         cpf: customer.person?.cpf || '',
         rg: customer.person?.rg || '',
         birthDate: customer.person?.birthDate || '',
         email: customer.person?.email || '',
         phone: customer.person?.phone || '',
         legalName: customer.company?.legalName || '',
         tradeName: customer.company?.tradeName || '',
         cnpj: customer.company?.cnpj || '',
         stateRegistration: customer.company?.stateRegistration || '',
         municipalRegistration: customer.company?.municipalRegistration || '',
         companyEmail: customer.company?.email || '',
         companyPhone: customer.company?.phone || '',
         // Novos campos da Receita Federal
         status: customer.company?.status || '',
         openingDate: convertISODateToInput(customer.company?.openingDate || ''),
         legalNature: customer.company?.legalNature || '',
         size: customer.company?.size || '',
         mainActivity: customer.company?.mainActivity || '',
         secondaryActivities: customer.company?.secondaryActivities || []
       });

       // Pré-preencher empresa-matriz se existir
       if (customer.kind === 'COMPANY' && (customer.company as any)?.parent?.customer) {
         setSelectedParent((customer.company as any).parent.customer);
         setInitialParentId((customer.company as any).parent.customer.id);
       } else {
         setSelectedParent(null);
         setInitialParentId(null);
       }

       // ✅ Pré-popula branches se vierem no payload do tree (melhor first paint)
       if (customer.kind === 'COMPANY' && Array.isArray((customer as any).branches)) {
         setBranches((customer as any).branches);
       }

       await loadBranches(customer);

       // pessoas vinculadas (EDIT de empresa)
       if (customer.kind === 'COMPANY') {
         await refreshPeopleLinks(id);
       }

       // Carregar endereços existentes
       if (customer.kind === 'COMPANY' && customer.company?.addresses) {
         const existingAddresses: FormAddressPayload[] = customer.company.addresses.map((addr: { id: any; addressType: string; label: any; isPrimary: any; street: any; number: any; complement: any; district: any; city: any; state: any; postalCode: any; country: any; reference: any; }) => ({
           id: addr.id, // Incluir o ID do endereço existente
           addressType: addr.addressType as AddressType,
           label: addr.label,
           isPrimary: addr.isPrimary,
           street: addr.street,
           number: addr.number,
           complement: addr.complement || '',
           district: addr.district,
           city: addr.city,
           state: addr.state,
           postalCode: addr.postalCode,
           country: addr.country,
           reference: addr.reference || ''
         }));
         setCompanyAddresses(existingAddresses);
         // Guardar IDs originais dos endereços
         setOriginalAddressIds(customer.company.addresses.map((a: { id: any; }) => a.id));
       } else if (customer.kind === 'PERSON' && customer.person?.addresses) {
         const existingAddresses: FormAddressPayload[] = customer.person.addresses.map((addr: { id: any; addressType: string; label: any; isPrimary: any; street: any; number: any; complement: any; district: any; city: any; state: any; postalCode: any; country: any; reference: any; }) => ({
           id: addr.id,
           addressType: addr.addressType as AddressType,
           label: addr.label,
           isPrimary: addr.isPrimary,
           street: addr.street,
           number: addr.number,
           complement: addr.complement || '',
           district: addr.district,
           city: addr.city,
           state: addr.state,
           postalCode: addr.postalCode,
           country: addr.country,
           reference: addr.reference || ''
         }));
         setPersonAddresses(existingAddresses);
         // Guardar IDs originais dos endereços
         setOriginalAddressIds(customer.person.addresses.map((a: { id: any; }) => a.id));
       }
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Erro ao carregar cliente', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatBrDate = (raw: string) => {
    const d = raw.replace(/\D/g, '').slice(0, 8);
    const p1 = d.slice(0, 2);
    const p2 = d.slice(2, 4);
    const p3 = d.slice(4, 8);
    if (d.length >= 5) return `${p1}/${p2}/${p3}`;
    if (d.length >= 3) return `${p1}/${p2}`;
    return p1;
  };

  const convertBrDateToISO = (brDate: string) => {
    if (!brDate) return '';
    // Converte DD/MM/YYYY para YYYY-MM-DD
    const parts = brDate.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return brDate;
  };

  const convertISODateToInput = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      // Converte ISO timestamp para YYYY-MM-DD (formato do input date)
      const date = new Date(isoDate);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error('Error converting ISO date:', e);
      return isoDate;
    }
  };

  // mapeia dados da Receita para o payload dos endereços
  // Constrói endereço a partir da Receita; retorna null se não houver dados suficientes
  const receitaToAddress = (data: any): FormAddressPayload | null => {
    const e = data?.endereco;
    if (!e) return null;
    return {
      addressType: 'C',
      label: 'Comercial (Receita)',
      // decidimos o primário dentro do setState (com base no array atual)
      isPrimary: false,
      street: e.logradouro || '',
      number: e.numero || '',
      complement: e.complemento || '',
      district: e.bairro || '',
      city: e.municipio || '',
      state: (e.uf || '').toUpperCase().slice(0, 2),
      postalCode: extractDigits(e.cep || ''),
      country: e.pais || 'Brasil',
      reference: ''
    };
  };

  // ========= Helpers de endereço (funcionam para PERSON e COMPANY) =========
  const getCurrentAddresses = () =>
    formData.kind === 'COMPANY' ? companyAddresses : personAddresses;

  const setAddresses = (
    updater: (prev: FormAddressPayload[]) => FormAddressPayload[]
  ) => {
    if (formData.kind === 'COMPANY') {
      setCompanyAddresses(updater);
    } else {
      setPersonAddresses(updater);
    }
  };

  const setPrimaryAt = (idx: number) =>
    setAddresses(prev => prev.map((a, i) => ({ ...a, isPrimary: i === idx })));

  const updateAddressAt = (idx: number, patch: Partial<FormAddressPayload>) =>
    setAddresses(prev => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));

  const removeAddressAt = (idx: number) =>
    setAddresses(prev => prev.filter((_, i) => i !== idx));

  const addEmptyAddress = () =>
    setAddresses(prev => [
      ...prev.map(a => ({ ...a, isPrimary: prev.length ? a.isPrimary : true })), // mantém 1 primário
      {
        addressType: 'A' as AddressType,
        label: '',
        isPrimary: prev.length === 0 ? true : false,
        street: '',
        number: '',
        complement: '',
        district: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Brasil',
        reference: ''
      }
    ]);

  const addressTypeLabel = (t: AddressType) =>
    t === 'C' ? 'Comercial' : t === 'P' ? 'Pessoal' : t === 'E' ? 'Entrega' : 'Alternativo';

  // Busca dados do CEP no ViaCEP
  const searchCEP = async (cep: string, addressIdx: number) => {
    const cleanCep = extractDigits(cep);
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        console.warn('CEP não encontrado');
        return;
      }

      // Preenche automaticamente os campos do endereço
      updateAddressAt(addressIdx, {
        street: data.logradouro || '',
        district: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        postalCode: cleanCep
      });
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  const handleCnpjSearch = async () => {
    const clean = extractDigits(formData.cnpj);
    if (clean.length !== 14) {
      openSnackbar({ 
        open: true, 
        message: 'Digite um CNPJ válido (14 dígitos)', 
        variant: 'alert', 
        alert: { color: 'warning' } 
      } as any);
      return;
    }

    setCnpjSearching(true);
    setReceitaData(null);

    try {
      const data = await getReceitaFederalData(formData.cnpj);
      if (!data || typeof data !== 'object') {
        throw new Error('Resposta inesperada da Receita Federal');
      }
      setReceitaData(data);
      
      // Preencher automaticamente os campos com validação
      setFormData(prev => ({
        ...prev,
        legalName: data?.razaoSocial || '',
        displayName: data?.razaoSocial || '',
        tradeName: data?.nomeFantasia || '',
        companyEmail: data?.contato?.email || '',
        companyPhone: data?.contato?.telefone || '',
        // Novos campos da Receita Federal
        status: data?.situacao || '',
        openingDate: convertBrDateToISO(data?.abertura || ''),
        legalNature: data?.naturezaJuridica || '',
        size: data?.porte || '',
        mainActivity: data?.atividadePrincipal ? `${data.atividadePrincipal.codigo} - ${data.atividadePrincipal.descricao}` : '',
        secondaryActivities: data?.atividadesSecundarias?.map((activity: { codigo: any; descricao: any; }) => `${activity.codigo} - ${activity.descricao}`) || []
      }));

      // acrescenta o endereço da Receita como Comercial (C) se ainda não existir
      setCompanyAddresses(prev => {
        const addr = receitaToAddress(data);
        if (!addr) return prev; // nada para adicionar
        // define primário: se não houver nenhum primário atual
        const shouldBePrimary = prev.length === 0 || !prev.some(a => a.isPrimary);
        const candidate = { ...addr, isPrimary: shouldBePrimary };
        // evita duplicidade "mesmo CEP + rua + número"
        const dup = prev.find(
          p => p.postalCode === candidate.postalCode && p.street === candidate.street && (p.number || '') === (candidate.number || '')
        );
        if (dup) return prev;
        const list = shouldBePrimary ? prev.map(p => ({ ...p, isPrimary: false })) : prev.slice();
        return [...list, candidate];
      });
    } catch (err: any) {
      console.error('Erro ao buscar CNPJ:', err);
      openSnackbar({ 
        open: true, 
        message: err.response?.data?.message || err.message || 'Erro ao buscar dados da Receita Federal', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setCnpjSearching(false);
    }
  };

  const handleKindChange = (kind: CustomerKind) => {
    setFormData(prev => ({
      ...prev,
      kind,
      displayName: kind === 'PERSON' ? prev.fullName : prev.legalName
    }));
    // reset controles de matriz ao trocar tipo
    if (kind === 'PERSON') {
      setParentSearch('');
    setParentOptions([]);
    setSelectedParent(null);
    }
  };

  // --- Remover uma filial (desvincular child desta matriz)
  const handleRemoveBranch = async (childCustomerId: string) => {
    if (!id) return;
    try {
      await deleteCompanyBranch(id, childCustomerId);
      // recarrega lista (usa initialParentId porque o submit ainda não foi feito)
      const cust = await getCustomer(id, true);
      await loadBranches(cust);
    } catch (e: any) {
      openSnackbar({ 
        open: true, 
        message: e?.response?.data?.message || 'Erro ao remover filial', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  };

  // --- Remover relação com matriz (quando a empresa editada é FILIAL)
  const handleRemoveParentNow = async () => {
    if (!id || !initialParentId) return;
    try {
      await deleteCompanyBranch(initialParentId, id);
      // zera seleção e recarrega dados
      setSelectedParent(null);
      setInitialParentId(null);
      const cust = await getCustomer(id, true);
      await loadBranches(cust);
    } catch (e: any) {
      openSnackbar({ 
        open: true, 
        message: e?.response?.data?.message || 'Erro ao remover matriz', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  };

  // --- Adicionar filial (dialog)
  const openAddDialog = () => {
    setSelectedExistingBranch(null);
    setSearchExistingBranch('');
    setExistingBranchOptions([]);
    setAddTab(0);
    setNewBranch({
      displayName: '',
      legalName: '',
      cnpj: '',
      tradeName: '',
      email: '',
      phone: ''
    });
    setAddOpen(true);
  };

  const confirmAddBranch = async () => {
    if (!id) return;
    setCreatingBranch(true);
    try {
      if (addTab === 0) {
        if (!selectedExistingBranch?.id) {
          openSnackbar({ 
            open: true, 
            message: 'Selecione uma empresa para vincular.', 
            variant: 'alert', 
            alert: { color: 'warning' } 
          } as any);
          setCreatingBranch(false);
          return;
        }
        await linkAsBranch(id, selectedExistingBranch.id);
        openSnackbar({ open: true, message: 'Filial vinculada com sucesso!', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        const cleanCnpj = extractDigits(newBranch.cnpj);
        if (!newBranch.legalName || cleanCnpj.length !== 14) {
          openSnackbar({ 
            open: true, 
            message: 'Informe Razão Social e um CNPJ válido (14 dígitos).', 
            variant: 'alert', 
            alert: { color: 'warning' } 
          } as any);
          setCreatingBranch(false);
          return;
        }
        await createCompanyAsBranch(id, {
          kind: 'COMPANY',
          displayName: newBranch.displayName || newBranch.legalName,
          company: {
            legalName: newBranch.legalName,
            tradeName: newBranch.tradeName || undefined,
            cnpj: cleanCnpj,
            email: newBranch.email || undefined,
            phone: newBranch.phone || undefined
          }
        } as any);
        openSnackbar({ open: true, message: 'Filial criada com sucesso!', variant: 'alert', alert: { color: 'success' } } as any);
      }
      const cust = await getCustomer(id, true);
      await loadBranches(cust);
      setAddOpen(false);
    } catch (e: any) {
      openSnackbar({ 
        open: true, 
        message: e?.response?.data?.message || 'Falha ao adicionar filial', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit && id) {
        // Atualizar dados básicos do cliente
        await updateCustomer(id, {
          displayName: formData.displayName,
          isActive: formData.isActive
        });

        // Atualizações específicas por tipo
        if (formData.kind === 'COMPANY') {
          const companyPayload: UpdateCompanyPayload = {
            legalName: formData.legalName,
            tradeName: formData.tradeName,
            cnpj: extractDigits(formData.cnpj),
            stateRegistration: formData.stateRegistration,
            municipalRegistration: formData.municipalRegistration,
            email: formData.companyEmail,
            phone: formData.companyPhone,
            // Novos campos da Receita Federal
            status: formData.status || undefined,
            openingDate: formData.openingDate || undefined,
            legalNature: formData.legalNature || undefined,
            size: formData.size || undefined,
            mainActivity: formData.mainActivity || undefined,
            secondaryActivities: formData.secondaryActivities.length > 0 ? formData.secondaryActivities : undefined
          };
          
          await updateCustomerCompany(id, companyPayload);

          // --- MATRIZ/FILIAL: tratar mudanças sem cair em 409 ---
          const oldParentId = initialParentId;                // matriz original (pode ser null)
          const newParentId = selectedParent?.id || null;     // matriz escolhida agora (pode ser null)

          if (oldParentId && newParentId && oldParentId !== newParentId) {
            // trocou de matriz: remove vínculo antigo, cria novo
            await deleteCompanyBranch(oldParentId, id);
            await linkAsBranch(newParentId, id);
          } else if (!oldParentId && newParentId) {
            // passou a ter matriz
            await linkAsBranch(newParentId, id);
          } else if (oldParentId && !newParentId) {
            // removeu a matriz
            await deleteCompanyBranch(oldParentId, id);
          }

          // processar endereços da COMPANY
          const addrs = companyAddresses;
          const currentIds = addrs.filter(a => a.id).map(a => a.id!);
          const removedIds = originalAddressIds.filter(oid => !currentIds.includes(oid));

          // 1) deletar removidos
          await Promise.all(removedIds.map(rid => deleteCustomerAddress(id, rid)));

          // 2) atualizar/criar os atuais
          if (addrs.length) {
            await Promise.all(addrs.map(async (addr) => {
              if (addr.id) {
                // Endereço existente - usar PATCH
                const { id: addressId, ...updatePayload } = addr;
                await updateCustomerAddress(id, addressId, updatePayload);
              } else {
                // Novo endereço - usar POST
                const { id: _, ...createPayload } = addr;
                await createCustomerAddress(id, createPayload);
              }
            }));
          }
        } else if (formData.kind === 'PERSON') {
          // processar endereços da PERSON
          const addrs = personAddresses;
          const currentIds = addrs.filter(a => a.id).map(a => a.id!);
          const removedIds = originalAddressIds.filter(oid => !currentIds.includes(oid));

          // 1) deletar removidos
          await Promise.all(removedIds.map(rid => deleteCustomerAddress(id, rid)));

          // 2) atualizar/criar os atuais
          if (addrs.length) {
            await Promise.all(addrs.map(async (addr) => {
              if (addr.id) {
                const { id: addressId, ...updatePayload } = addr;
                await updateCustomerAddress(id, addressId, updatePayload);
              } else {
                const { id: _, ...createPayload } = addr;
                await createCustomerAddress(id, createPayload);
              }
            }));
          }
        }
      } else {
        // Criar novo cliente
        if (formData.kind === 'PERSON' || !selectedParent) {
          const payload: CreateCustomerPayload = formData.kind === 'PERSON' 
            ? {
                kind: 'PERSON',
                displayName: formData.displayName,
                person: {
                  fullName: formData.fullName,
                  cpf: extractDigits(formData.cpf),
                  rg: formData.rg,
                  birthDate: formData.birthDate,
                  email: formData.email,
                  phone: formData.phone,
                  // endereços ao criar pessoa
                  addresses: personAddresses.filter(a => !a.id).length
                    ? personAddresses.filter(a => !a.id).map(({ id: _, ...addr }) => addr)
                    : undefined
                }
              }
             : {
                 kind: 'COMPANY',
                 displayName: formData.displayName,
                 company: {
                   legalName: formData.legalName,
                   tradeName: formData.tradeName,
                   cnpj: extractDigits(formData.cnpj),
                   stateRegistration: formData.stateRegistration,
                   municipalRegistration: formData.municipalRegistration,
                   email: formData.companyEmail,
                   phone: formData.companyPhone,
                   // Novos campos da Receita Federal
                   status: formData.status || undefined,
                   openingDate: formData.openingDate || undefined,
                   legalNature: formData.legalNature || undefined,
                   size: formData.size || undefined,
                   mainActivity: formData.mainActivity || undefined,
                   secondaryActivities: formData.secondaryActivities.length > 0 ? formData.secondaryActivities : undefined,
                   // apenas endereços novos (sem ID) vão no POST
                   addresses: companyAddresses.filter(addr => !addr.id).length ? 
                     companyAddresses.filter(addr => !addr.id).map(({ id: _, ...addr }) => addr) : undefined,
                   // pessoas vinculadas (draft)
                   people: peopleDraft && peopleDraft.length ? peopleDraft.map(p => ({
                     ...(p.personId ? { personId: p.personId } : {}),
                     ...(p.cpf ? { cpf: extractDigits(p.cpf) } : {}),
                     ...(p.createPerson ? { createPerson: p.createPerson } : {}),
                     role: p.role || undefined,
                     isPrimary: !!p.isPrimary,
                     isLegalRepresentative: !!p.isLegalRepresentative
                   })) : undefined
                 }
               };

          await createCustomer(payload);

          // sucesso: mensagem + reset rápido do form
          openSnackbar({
            open: true,
            message: formData.kind === 'COMPANY' ? 'Empresa criada com sucesso!' : 'Pessoa criada com sucesso!',
            variant: 'alert',
            alert: { color: 'success' }
          } as any);

          // reset local (útil se continuar na tela; inofensivo antes do redirect)
          setFormData(initialFormData);
          setCompanyAddresses([]);
          setPersonAddresses([]);
          setSecondaryInput('');
          setPeopleDraft([]);
          setSelectedParent(null);
          setParentOptions([]);
          setParentSearch('');
          setTabValue(0);

        } else {
          // COMPANY + tem matriz selecionada => cria já como filial
          const payload: CreateCustomerPayload = {
            kind: 'COMPANY',
            displayName: formData.displayName,
            company: {
              legalName: formData.legalName,
              tradeName: formData.tradeName,
              cnpj: extractDigits(formData.cnpj),
              stateRegistration: formData.stateRegistration,
              municipalRegistration: formData.municipalRegistration,
              email: formData.companyEmail,
              phone: formData.companyPhone,
              // Novos campos da Receita Federal
              status: formData.status || undefined,
              openingDate: formData.openingDate || undefined,
              legalNature: formData.legalNature || undefined,
              size: formData.size || undefined,
              mainActivity: formData.mainActivity || undefined,
              secondaryActivities: formData.secondaryActivities.length > 0 ? formData.secondaryActivities : undefined,
              // apenas endereços novos (sem ID) vão no POST
              addresses: companyAddresses.filter(addr => !addr.id).length ? 
                companyAddresses.filter(addr => !addr.id).map(({ id: _, ...addr }) => addr) : undefined,
              // pessoas vinculadas (draft)
              people: peopleDraft && peopleDraft.length ? peopleDraft.map(p => ({
                ...(p.personId ? { personId: p.personId } : {}),
                ...(p.cpf ? { cpf: extractDigits(p.cpf) } : {}),
                ...(p.createPerson ? { createPerson: p.createPerson } : {}),
                role: p.role || undefined,
                isPrimary: !!p.isPrimary,
                isLegalRepresentative: !!p.isLegalRepresentative
              })) : undefined
            }
          };
          const link = await createCompanyAsBranch(selectedParent.id, payload);
          // sucesso: mensagem
          openSnackbar({
            open: true,
            message: 'Filial criada e vinculada à matriz com sucesso!',
            variant: 'alert',
            alert: { color: 'success' }
          } as any);
          // como o backend retorna o link, redirecione para a child
          navigate(`/clients/${link.childId}`);
          return;
        }
      }

      navigate('/clients');
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Erro ao salvar cliente', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/clients');
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          Voltar
        </Button>
        <Typography variant="h4" component="h1">
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </Typography>
      </Box>


      <form onSubmit={handleSubmit}>
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Dados Gerais" />
              <Tab label="Endereços" />
              {formData.kind === 'COMPANY' && <Tab label="Matriz / Filiais" />}
              {formData.kind === 'COMPANY' && <Tab label="Pessoas Vinculadas" />}
            </Tabs>
          </Box>

          {/* Dados Gerais */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'grid', gap: 3 }}>
          {/* Tipo de Cliente */}
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Tipo de Cliente
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup
                    value={formData.kind}
                    onChange={(e) => handleKindChange(e.target.value as CustomerKind)}
                    row
                  >
                    <FormControlLabel
                      value="PERSON"
                      control={<Radio />}
                      label="Pessoa Física"
                    />
                    <FormControlLabel
                      value="COMPANY"
                      control={<Radio />}
                      label="Pessoa Jurídica"
                    />
                  </RadioGroup>
                </FormControl>
              </CardContent>
            </Card>
          </Box>

          {/* Dados Básicos */}
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Dados Básicos
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box>
                    <TextField
                      fullWidth
                      label="Nome de Exibição"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      required
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        />
                      }
                      label="Cliente Ativo"
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Dados Específicos */}
          {formData.kind === 'PERSON' ? (
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Dados da Pessoa Física
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 3 }}>
                    {/* Nome e CPF */}
                    <Box>
                      <TextField
                        fullWidth
                        label="Nome Completo"
                        value={formData.fullName}
                        onChange={(e) => {
                          handleInputChange('fullName', e.target.value);
                          if (!isEdit) {
                            handleInputChange('displayName', e.target.value);
                          }
                        }}
                        required
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="CPF"
                        value={formData.cpf}
                        onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                        placeholder="000.000.000-00"
                        required
                      />
                    </Box>
                    
                    {/* RG e Data de Nascimento */}
                    <Box>
                      <TextField
                        fullWidth
                        label="RG"
                        value={formData.rg}
                        onChange={(e) => handleInputChange('rg', e.target.value)}
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Data de Nascimento"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    
                    {/* Contato */}
                    <Box>
                      <TextField
                        fullWidth
                        label="E-mail"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Telefone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          ) : (
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Dados da Pessoa Jurídica
                  </Typography>
                  
                  {/* CNPJ com busca */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom color="text.secondary">
                      CNPJ (obrigatório)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        label="CNPJ"
                        value={formData.cnpj}
                        onChange={(e) => {
                          const formatted = formatCNPJ(e.target.value);
                          handleInputChange('cnpj', formatted);
                        }}
                        placeholder="00.000.000/0000-00"
                        required
                        helperText="Digite o CNPJ e clique em buscar para preencher automaticamente"
                      />
                      <Button
                        variant="contained"
                        onClick={handleCnpjSearch}
                        disabled={cnpjSearching || extractDigits(formData.cnpj).length !== 14}
                        sx={{ minWidth: 'auto', px: 3, height: '40px' }}
                      >
                        {cnpjSearching ? <LoadingIcon /> : <SearchIcon />}
                      </Button>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'grid', gap: 3 }}>
                    {/* Razão Social e Nome Fantasia */}
                    <Box>
                      <TextField
                        fullWidth
                        label="Razão Social"
                        value={formData.legalName}
                        onChange={(e) => {
                          handleInputChange('legalName', e.target.value);
                          if (!isEdit) {
                            handleInputChange('displayName', e.target.value);
                          }
                        }}
                        required
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Nome Fantasia"
                        value={formData.tradeName}
                        onChange={(e) => handleInputChange('tradeName', e.target.value)}
                        helperText="Opcional"
                      />
                    </Box>
                    
                    {/* Inscrições */}
                    <Box>
                      <TextField
                        fullWidth
                        label="Inscrição Estadual"
                        value={formData.stateRegistration}
                        onChange={(e) => handleInputChange('stateRegistration', e.target.value)}
                        helperText="Opcional"
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Inscrição Municipal"
                        value={formData.municipalRegistration}
                        onChange={(e) => handleInputChange('municipalRegistration', e.target.value)}
                        helperText="Opcional"
                      />
                    </Box>
                    
                    {/* Contato */}
                    <Box>
                      <TextField
                        fullWidth
                        label="E-mail"
                        type="email"
                        value={formData.companyEmail}
                        onChange={(e) => handleInputChange('companyEmail', e.target.value)}
                        helperText="Opcional"
                      />
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Telefone"
                        value={formData.companyPhone}
                        onChange={(e) => handleInputChange('companyPhone', e.target.value)}
                        placeholder="(11) 99999-9999"
                        helperText="Opcional"
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Dados da Receita Federal - Inputs editáveis */}
          {formData.kind === 'COMPANY' && (
            <Box>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Dados fiscais (Receita Federal)</Typography>
                  <Box sx={{ display: 'grid', gap: 3 }}>
                    <Box>
                      <FormLabel>Status</FormLabel>
                      <Select
                        fullWidth
                        value={formData.status || ''}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">Selecione...</MenuItem>
                        {STATUS_OPTIONS.map(opt => (
                          <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Data de Abertura"
                        type="date"
                        value={formData.openingDate}
                        onChange={(e) => handleInputChange('openingDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box>
                      <Autocomplete
                        options={SIZE_OPTIONS}
                        freeSolo
                        value={formData.size || ''}
                        onChange={(_, v) => handleInputChange('size', v || '')}
                        renderInput={(params) => (
                          <TextField {...params} label="Porte (size)" placeholder="MICRO EMPRESA" />
                        )}
                     />
                  </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Natureza Jurídica"
                        value={formData.legalNature}
                        onChange={(e) => handleInputChange('legalNature', e.target.value)}
                        placeholder="206-2 - Sociedade Empresária Limitada"
                      />
                      </Box>
                    <Box>
                      <TextField
                        fullWidth
                        label="Atividade Principal"
                        value={formData.mainActivity}
                        onChange={(e) => handleInputChange('mainActivity', e.target.value)}
                        placeholder="62.02-3-00 - Desenvolvimento e licenciamento de programas de computador customizáveis"
                      />
                      </Box>
                    <Box>
                      <FormLabel>Atividades Secundárias</FormLabel>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        {formData.secondaryActivities.map((a, idx) => (
                          <Chip key={idx} label={a} onDelete={() => {
                            setFormData(prev => ({
                              ...prev,
                              secondaryActivities: prev.secondaryActivities.filter((_, i) => i !== idx)
                            }));
                          }} />
                        ))}
                      </Stack>
                      <TextField
                        fullWidth
                        sx={{ mt: 1 }}
                        placeholder="Ex: 62.01-5-01 - Desenvolvimento de programas de computador sob encomenda"
                        value={secondaryInput}
                        onChange={(e) => setSecondaryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && secondaryInput.trim()) {
                            e.preventDefault();
                            setFormData(prev => ({
                              ...prev,
                              secondaryActivities: [...prev.secondaryActivities, secondaryInput.trim()]
                            }));
                            setSecondaryInput('');
                          }
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>

            </Box>
          )}
            </Box>
          </TabPanel>

          {/* Endereços (PERSON e COMPANY) */}
          <TabPanel value={tabValue} index={1}>
            <Box>
              {formData.kind === 'COMPANY' ? (
                <>
                  <Typography variant="h6" gutterBottom>Endereços a cadastrar</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    O endereço da Receita vem como <b>Comercial</b> por padrão. Você pode removê-lo ou adicionar outros.
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h6" gutterBottom>Endereços da pessoa</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Adicione um ou mais endereços. Você pode marcar um como <b>Primário</b>.
                  </Typography>
                </>
              )}

              {getCurrentAddresses().length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  {formData.kind === 'COMPANY'
                    ? 'Nenhum endereço na fila de cadastro. Busque um CNPJ ou adicione manualmente.'
                    : 'Nenhum endereço cadastrado. Adicione manualmente.'}
                </Alert>
              )}

              <Stack spacing={2}>
                {getCurrentAddresses().map((addr, idx) => (
                    <Card key={idx} variant="outlined">
                      <CardContent>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                          <Chip label={addressTypeLabel(addr.addressType)} />
                          {addr.isPrimary && <Chip color="info" label="Primário" />}
                        </Stack>

                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
                          <FormControl fullWidth>
                            <FormLabel>Tipo</FormLabel>
                            <Select
                              value={addr.addressType}
                              onChange={(e) =>
                                updateAddressAt(idx, { addressType: e.target.value as AddressType })
                              }
                            >
                              <MenuItem value="C">Comercial</MenuItem>
                              <MenuItem value="P">Pessoal</MenuItem>
                              <MenuItem value="E">Entrega</MenuItem>
                              <MenuItem value="A">Alternativo</MenuItem>
                            </Select>
                          </FormControl>
                          <TextField
                            label="Rótulo"
                            value={addr.label || ''}
                            onChange={(e) => updateAddressAt(idx, { label: e.target.value })}
                            fullWidth
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={addr.isPrimary}
                                onChange={() => setPrimaryAt(idx)}
                              />
                            }
                            label="Primário"
                          />
                        </Stack>

                        <Divider sx={{ my: 2 }} />
                        <Stack spacing={2}>
                          {/* CEP primeiro para busca automática */}
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-end">
                            <TextField 
                              label="CEP" 
                              value={addr.postalCode} 
                              onChange={(e) => {
                                const cleanCep = extractDigits(e.target.value).slice(0, 8);
                                updateAddressAt(idx, { postalCode: cleanCep });
                                // Busca automática quando CEP tem 8 dígitos
                                if (cleanCep.length === 8) {
                                  searchCEP(cleanCep, idx);
                                }
                              }} 
                              fullWidth
                              required 
                              placeholder="00000-000"
                            />
                           
                          </Stack>
                          
                          {/* Endereço principal */}
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField label="Rua" value={addr.street} onChange={(e)=>updateAddressAt(idx,{street:e.target.value})} fullWidth required />
                            <TextField label="Número" value={addr.number || ''} onChange={(e)=>updateAddressAt(idx,{number:e.target.value})} fullWidth />
                            <TextField label="Complemento" value={addr.complement || ''} onChange={(e)=>updateAddressAt(idx,{complement:e.target.value})} fullWidth />
                          </Stack>
                          
                          {/* Cidade, UF e Bairro */}
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField label="Bairro" value={addr.district || ''} onChange={(e)=>updateAddressAt(idx,{district:e.target.value})} fullWidth />
                            <TextField label="Cidade" value={addr.city} onChange={(e)=>updateAddressAt(idx,{city:e.target.value})} fullWidth required />
                            <TextField label="UF" value={addr.state} onChange={(e)=>updateAddressAt(idx,{state:e.target.value.toUpperCase().slice(0,2)})} fullWidth required />
                          </Stack>
                          
                          {/* Referência */}
                          <TextField label="Referência" value={addr.reference || ''} onChange={(e)=>updateAddressAt(idx,{reference:e.target.value})} fullWidth />
                          
                          <Box sx={{ display:'flex', justifyContent:'flex-end' }}>
                            <Button color="error" onClick={()=>removeAddressAt(idx)}>Remover</Button>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>

              <Box sx={{ mt: 2 }}>
                <Button variant="outlined" onClick={addEmptyAddress}>
                  Adicionar endereço
                </Button>
              </Box>
            </Box>
          </TabPanel>
        </Card>

        {/* Matriz / Filiais (somente COMPANY) */}
        {formData.kind === 'COMPANY' && (
          <TabPanel value={tabValue} index={2} noPadding>
            <Stack spacing={3}>
              {/* Status atual + lista + ações (somente no EDIT) */}
              {isEdit && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Matriz / Filiais</Typography>
                  {initialParentId ? (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <AlertTitle><strong>Esta empresa é uma FILIAL</strong></AlertTitle>
                      Você pode remover a relação com a matriz agora, ou alterar a matriz no bloco abaixo e salvar.
                      <Box sx={{ mt: 1 }}>
                        <Button variant="outlined" color="warning" onClick={handleRemoveParentNow}>
                          Remover Matriz
                        </Button>
                      </Box>
                    </Alert>
                  ) : (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <AlertTitle><strong>Esta empresa é uma MATRIZ</strong></AlertTitle>
                      Vincule, crie e remova filiais diretamente aqui.
                    </Alert>
                  )}

                  {/* Lista de filiais / irmãs */}
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      {initialParentId ? 'Filiais da matriz (exceto esta)' : 'Filiais desta empresa'}
                    </Typography>
                    {branchesLoading ? (
                      <Typography color="text.secondary">Carregando...</Typography>
                    ) : !branches || branches.length === 0 ? (
                      <Typography color="text.secondary">
                        {initialParentId ? 'Nenhuma outra filial vinculada à matriz.' : 'Nenhuma filial vinculada.'}
                      </Typography>
                    ) : (
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {branches.map((b) => {
                          const label = branchDisplayName(b);
                          const childId = branchTargetId(b);
                          return (
                            <Chip
                              key={b.id}
                              label={label}
                              onDelete={!initialParentId ? () => handleRemoveBranch(childId!) : undefined}
                              clickable
                              onClick={() => childId && navigate(`/clients/${childId}`)}
                            />
                          );
                        })}
                      </Stack>
                    )}
                  </Box>

                  {/* Ações de filiais (apenas para MATRIZ) */}
                  {!initialParentId && (
                    <Box sx={{ mt: 2 }}>
                      <Button startIcon={<AddIcon />} variant="contained" onClick={openAddDialog}>
                        Adicionar Filial
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Alterar/Definir Matriz */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Definir/Alterar Matriz</Typography>
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    <Autocomplete
                      loading={parentLoading}
                      options={parentOptions}
                      value={selectedParent}
                      getOptionLabel={(opt) => opt.displayName}
                      noOptionsText={parentSearch.length < 2 ? 'Digite para buscar' : 'Nenhuma empresa encontrada'}
                      onInputChange={(_, value) => setParentSearch(value)}
                      onChange={(_, value) => {
                        if (value?.id && value.id === id) return; // evita escolher a si mesma
                        setSelectedParent(value ?? null);
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Buscar e selecionar empresa-matriz"
                          placeholder="Digite ao menos 2 caracteres para buscar..."
                        />
                      )}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setSelectedParent(null);
                          setParentSearch('');
                          setParentOptions([]);
                        }}
                      >
                        Limpar seleção
                      </Button>
                    </Stack>
                    <Alert severity="info">
                      Ao salvar este formulário, a empresa atual será criada/atualizada como <b>filial</b> da matriz selecionada.
                    </Alert>
                  </Box>
                </CardContent>
              </Card>
            </Stack>

            {/* Dialog: Adicionar Filial */}
            {isEdit && (
            <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="md">
              <DialogTitle>Adicionar Filial</DialogTitle>
              <DialogContent dividers>
                <Tabs value={addTab} onChange={(_, v) => setAddTab(v)} sx={{ mb: 2 }}>
                  <Tab label="Vincular existente" icon={<LinkIcon />} iconPosition="start" />
                  <Tab label="Criar nova" icon={<AddIcon />} iconPosition="start" />
                </Tabs>
                {addTab === 0 && (
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    <Autocomplete
                      loading={existingBranchLoading}
                      options={existingBranchOptions}
                      value={selectedExistingBranch}
                      getOptionLabel={(opt) => opt.displayName}
                      noOptionsText={searchExistingBranch.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhuma empresa encontrada'}
                      onInputChange={(_, value) => setSearchExistingBranch(value)}
                      onChange={(_, value) => setSelectedExistingBranch(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Buscar empresa para vincular como filial"
                          placeholder="Nome, CNPJ..."
                        />
                      )}
                    />
                  </Box>
                )}
                {addTab === 1 && (
                  <Box sx={{ display: 'grid', gap: 2 }}>
                    <TextField
                      label="Razão Social *"
                      value={newBranch.legalName}
                      onChange={(e) => setNewBranch({ ...newBranch, legalName: e.target.value })}
                      fullWidth
                      required
                    />
                    <TextField
                      label="Nome Fantasia"
                      value={newBranch.tradeName}
                      onChange={(e) => setNewBranch({ ...newBranch, tradeName: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="CNPJ *"
                      value={newBranch.cnpj}
                      onChange={(e) => setNewBranch({ ...newBranch, cnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                      fullWidth
                      required
                    />
                    <TextField
                      label="E-mail"
                      value={newBranch.email}
                      onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      label="Telefone"
                      value={newBranch.phone}
                      onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                      fullWidth
                    />
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button onClick={confirmAddBranch} variant="contained" disabled={creatingBranch}>
                  {creatingBranch ? <><LoadingIcon />&nbsp;Salvando...</> : 'Confirmar'}
                </Button>
              </DialogActions>
            </Dialog>
            )}

          </TabPanel>
        )}

        {/* Pessoas Vinculadas (COMPANY - create e edit) */}
        {formData.kind === 'COMPANY' && (
          <TabPanel value={tabValue} index={3}>
            <Stack spacing={3}>
              {/* CREATE: rascunho que vai no POST /customers */}
              {!isEdit && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Pessoas vinculadas (rascunho)</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Adicione pessoas agora; elas serão vinculadas ao salvar a empresa.
                    </Typography>

                    {!peopleDraft || peopleDraft.length === 0 ? (
                      <Alert severity="info" sx={{ mb: 2 }}>Nenhuma pessoa adicionada.</Alert>
                    ) : (
                      <Stack spacing={2} sx={{ mb: 2 }}>
                        {peopleDraft.map((p, idx) => (
                          <Card key={idx} variant="outlined">
                            <CardContent>
                              <Stack spacing={1}>
                                <Typography fontWeight={600}>
                                  {p.createPerson?.fullName || p.personName || `Pessoa existente #${idx + 1}`}
                                </Typography>
                                <TextField
                                  label="Função"
                                  value={p.role || ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPeopleDraft(prev => prev.map((it, i) => i === idx ? { ...it, role: v } : it));
                                  }}
                                  fullWidth
                                />
                                <Stack direction="row" spacing={2}>
                                  <FormControlLabel
                                    control={<Switch checked={!!p.isPrimary} onChange={() => {
                                      setPeopleDraft(prev => ensureSinglePrimary(prev, idx));
                                    }} />}
                                    label="Primário"
                                  />
                                  <FormControlLabel
                                    control={<Switch checked={!!p.isLegalRepresentative} onChange={(e) => {
                                      const ch = e.target.checked;
                                      setPeopleDraft(prev => prev.map((it, i) => i === idx ? { ...it, isLegalRepresentative: ch } : it));
                                    }} />}
                                    label="Representante Legal"
                                  />
                                  <Box sx={{ flex: 1 }} />
                                  <Button color="error" onClick={() => {
                                    setPeopleDraft(prev => prev.filter((_, i) => i !== idx));
                                  }}>
                                    Remover
                                  </Button>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => openPeopleDialog(0)}>
                        Adicionar existente
                      </Button>
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openPeopleDialog(1)}>
                        Criar nova pessoa
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* EDIT: usar o novo componente CompanyPeopleList */}
              {isEdit && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6">Pessoas vinculadas</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Veja quem está associado a esta empresa (cargo, representante legal, etc.).
                  </Typography>
                  <CompanyPeopleList companyId={id!} newlyLinked={newlyLinked} />

                  {/* Atalho com AUTOCOMPLETE para criar vínculo e refletir na UI */}
                  <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 2, flexWrap: 'wrap' }}>
                    <Autocomplete
                      sx={{ minWidth: 320 }}
                      loading={quickPersonLoading}
                      options={quickPersonOptions}
                      value={quickSelectedPerson}
                      getOptionLabel={(opt) => opt.displayName || (opt as any)?.person?.fullName || ''}
                      onInputChange={(_, v) => setQuickPersonInput(v)}
                      onChange={(_, v) => setQuickSelectedPerson(v)}
                      noOptionsText={quickPersonInput.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhuma pessoa encontrada'}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Buscar pessoa (nome, CPF...)"
                          placeholder="Ex.: Maria, 123.456.789-00"
                        />
                      )}
                      renderOption={(props, opt) => {
                        const cpf = (opt as any)?.person?.cpf;
                        return (
                          <li {...props} key={(opt as any).id}>
                            <Stack>
                              <Typography variant="body2">{opt.displayName}</Typography>
                              {cpf && <Typography variant="caption" color="text.secondary">{cpf}</Typography>}
                            </Stack>
                          </li>
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      label="Cargo (opcional)"
                      placeholder="ex.: CEO"
                      value={quickRole}
                      onChange={(e) => setQuickRole(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={async () => {
                        if (!id) return;
                        if (!quickSelectedPerson) {
                          openSnackbar({
                            open: true,
                            message: 'Selecione uma pessoa para vincular.',
                            variant: 'alert',
                            alert: { color: 'warning' }
                          } as any);
                          return;
                        }
                        try {
                          // resolve o personId real (pode exigir um GET /customers/:id?tree=true por baixo)
                          const resolvedPerson = await resolveSubjectId((quickSelectedPerson as any).id);
                          if (!resolvedPerson?.id) throw new Error('Não foi possível obter o ID da pessoa.');
                          // cria o vínculo e faz atualização imediata da lista
                          const created = await linkPersonToCompany(id, resolvedPerson.id, quickRole || undefined);
                          setNewlyLinked(created);     // empurra para a lista sem refetch
                          setQuickSelectedPerson(null);
                          setQuickPersonInput('');
                          setQuickRole('');
                        } catch (e: any) {
                          openSnackbar({ 
                            open: true, 
                            message: e?.response?.data?.message || 'Erro ao vincular pessoa', 
                            variant: 'alert', 
                            alert: { color: 'error' } 
                          } as any);
                        }
                      }}
                    >
                      Vincular pessoa
                    </Button>
                  </Stack>
                </>
              )}

              {/* EDIT: lista atual com upsert/delete imediato - MANTIDO PARA REFERÊNCIA */}
              {false && isEdit && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Pessoas vinculadas</Typography>
                    {peopleError && <Alert severity="error" sx={{ mb: 2 }}>{peopleError}</Alert>}
                    {peopleLoading ? (
                      <Typography color="text.secondary">Carregando...</Typography>
                    ) : !peopleLinks || peopleLinks.length === 0 ? (
                      <Alert severity="info" sx={{ mb: 2 }}>Nenhuma pessoa vinculada.</Alert>
                    ) : (
                      <Stack spacing={2} sx={{ mb: 2 }}>
                        {peopleLinks.map((lnk, idx) => (
                          <Card key={lnk.personId} variant="outlined">
                            <CardContent>
                              <Stack spacing={2}>
                                {/* Informações da Pessoa */}
                                <Box>
                                  <Typography variant="h6" fontWeight={600} gutterBottom>
                                    {lnk.person?.customer?.displayName || lnk.person?.fullName || 'Pessoa'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>CPF:</strong> {lnk.person?.cpf ? lnk.person.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>RG:</strong> {lnk.person?.rg || '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>Email:</strong> {lnk.person?.email || '-'}
                                      </Typography>
                                    </Box>
                                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                                      <Typography variant="body2" color="text.secondary">
                                        <strong>Telefone:</strong> {lnk.person?.phone || '-'}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </Box>

                                {/* Campos Editáveis */}
                                <Divider />
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                  Dados do Vínculo
                                </Typography>
                                <TextField
                                  label="Função"
                                  value={lnk.role || ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setPeopleLinks(prev => prev.map((it, i) => i === idx ? { ...it, role: v } : it));
                                  }}
                                  fullWidth
                                />
                                
                                {/* Status e Flags */}
                                <Stack direction="row" spacing={3} alignItems="center">
                                  <FormControlLabel
                                    control={<Switch checked={!!lnk.isPrimary} onChange={() => {
                                      // local: garantir 1 primário
                                      setPeopleLinks(prev => prev.map((it, i) => ({ ...it, isPrimary: i === idx })));
                                    }} />}
                                    label="Primário"
                                  />
                                  <FormControlLabel
                                    control={<Switch checked={!!lnk.isLegalRepresentative} onChange={(e) => {
                                      const ch = e.target.checked;
                                      setPeopleLinks(prev => prev.map((it, i) => i === idx ? { ...it, isLegalRepresentative: ch } : it));
                                    }} />}
                                    label="Representante Legal"
                                  />
                                  <Box sx={{ flex: 1 }} />
                                  <Stack direction="row" spacing={1}>
                                    <Button
                                      variant="contained"
                                      onClick={async () => {
                                        if (!id) return;
                                        try {
                                          await upsertCompanyPerson(id, {
                                            personId: lnk.personId,
                                            role: lnk.role || undefined,
                                            isPrimary: !!lnk.isPrimary,
                                            isLegalRepresentative: !!lnk.isLegalRepresentative
                                          });
                                        } catch (e: any) {
                                          setPeopleError(friendlyError(e, 'Falha ao salvar vínculo'));
                                        } finally {
                                          await refreshPeopleLinks(id);
                                        }
                                      }}
                                    >
                                      Salvar
                                    </Button>
                                    <Button 
                                      color="error" 
                                      variant="outlined"
                                      onClick={async () => {
                                        if (!id) return;
                                        try {
                                          await deleteCompanyPerson(id, lnk.personId);
                                        } catch (e: any) {
                                          setPeopleError(friendlyError(e, 'Falha ao remover vínculo'));
                                        } finally {
                                          await refreshPeopleLinks(id);
                                        }
                                      }}
                                    >
                                      Remover
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => openPeopleDialog(0)}>
                        Adicionar existente
                      </Button>
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openPeopleDialog(1)}>
                        Criar nova pessoa
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>

            {/* Dialog: Adicionar Pessoa */}
            <Dialog open={peopleOpen} onClose={() => setPeopleOpen(false)} fullWidth maxWidth="md">
              <DialogTitle>Adicionar Pessoa</DialogTitle>
              <DialogContent dividers>
                <Tabs value={peopleTab} onChange={(_, v) => setPeopleTab(v)} sx={{ mb: 2 }}>
                  <Tab label="Adicionar existente" icon={<LinkIcon />} iconPosition="start" />
                  <Tab label="Criar nova pessoa" icon={<AddIcon />} iconPosition="start" />
                </Tabs>

                {/* EXISTENTE */}
                {peopleTab === 0 && (
                  <Stack spacing={2}>
                    <Autocomplete
                      loading={personLoading}
                      options={personOptions}
                      value={selectedExistingPerson}
                      getOptionLabel={(opt) => opt.displayName}
                      noOptionsText={searchPerson.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhuma pessoa encontrada'}
                      onInputChange={(_, value) => setSearchPerson(value)}
                      onChange={(_, value) => setSelectedExistingPerson(value)}
                      renderInput={(params) => (
                        <TextField {...params} label="Buscar pessoa (nome, CPF...)" />
                      )}
                    />
                    <TextField label="Função" value={peopleRole} onChange={(e) => setPeopleRole(e.target.value)} fullWidth />
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel control={<Switch checked={peopleIsPrimary} onChange={(e)=>setPeopleIsPrimary(e.target.checked)} />} label="Primário" />
                      <FormControlLabel control={<Switch checked={peopleIsLegalRep} onChange={(e)=>setPeopleIsLegalRep(e.target.checked)} />} label="Representante Legal" />
                    </Stack>
                  </Stack>
                )}

                {/* NOVA */}
                {peopleTab === 1 && (
                  <Stack spacing={2}>
                    <TextField label="Nome completo *" value={newPerson.fullName} onChange={(e)=>setNewPerson({...newPerson, fullName: e.target.value})} fullWidth required />
                    <TextField label="CPF *" value={newPerson.cpf} onChange={(e)=>setNewPerson({...newPerson, cpf: formatCPF(e.target.value)})} placeholder="000.000.000-00" fullWidth required />
                    <TextField label="E-mail" value={newPerson.email} onChange={(e)=>setNewPerson({...newPerson, email: e.target.value})} fullWidth />
                    <TextField label="Telefone" value={newPerson.phone} onChange={(e)=>setNewPerson({...newPerson, phone: e.target.value})} fullWidth />
                    <Divider />
                    <TextField label="Papel (role)" value={peopleRole} onChange={(e) => setPeopleRole(e.target.value)} fullWidth />
                    <Stack direction="row" spacing={2}>
                      <FormControlLabel control={<Switch checked={peopleIsPrimary} onChange={(e)=>setPeopleIsPrimary(e.target.checked)} />} label="Primário" />
                      <FormControlLabel control={<Switch checked={peopleIsLegalRep} onChange={(e)=>setPeopleIsLegalRep(e.target.checked)} />} label="Representante Legal" />
                    </Stack>
                  </Stack>
                )}

                {peopleActionError && <Alert severity="error" sx={{ mt: 2 }}>{peopleActionError}</Alert>}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setPeopleOpen(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    setPeopleActionError(null);
                    setPeopleActionLoading(true);
                    try {
                      if (peopleTab === 0) {
                        if (!selectedExistingPerson) {
                          setPeopleActionError('Pessoa não selecionada');
                          setPeopleActionLoading(false);
                          return;
                        }
                        let personPayloadId = (selectedExistingPerson as any)?.person?.id;
                        let personCpf = (selectedExistingPerson as any)?.person?.cpf;

                        // fallback: se o item não trouxe person.id, busca detalhes do customer
                        if (!personPayloadId && (selectedExistingPerson as any)?.kind === 'PERSON' && (selectedExistingPerson as any)?.id) {
                          try {
                            const full = await getCustomer((selectedExistingPerson as any).id, true);
                            personPayloadId = full?.person?.id || personPayloadId;
                            personCpf = personCpf || full?.person?.cpf;
                          } catch { /* mantém como está */ }
                        }
                        if (!personPayloadId && !personCpf) {
                          setPeopleActionError('Pessoa inválida (sem ID nem CPF)');
                          setPeopleActionLoading(false);
                          return;
                        }
                        if (isEdit && id) {
                          // EDIT: upsert imediato
                          await upsertCompanyPerson(id, {
                            ...(personPayloadId ? { personId: personPayloadId } : { cpf: personCpf }),
                            role: peopleRole || undefined,
                            isPrimary: !!peopleIsPrimary,
                            isLegalRepresentative: !!peopleIsLegalRep
                          });
                          await refreshPeopleLinks(id);
                        } else {
                          // CREATE: acumula no draft
                          const item: DraftLink = {
                            personId: personPayloadId!,
                            personName: (selectedExistingPerson as any).displayName,
                            role: peopleRole || undefined,
                            isPrimary: !!peopleIsPrimary,
                            isLegalRepresentative: !!peopleIsLegalRep
                          };
                          setPeopleDraft(prev => {
                            const arr = [...prev, item];
                            return peopleIsPrimary ? ensureSinglePrimary(arr, arr.length - 1) : arr;
                          });
                        }
                      } else {
                        // Tab "Criar nova"
                        if (!newPerson.fullName || extractDigits(newPerson.cpf).length !== 11) {
                          setPeopleActionError('Informe nome e um CPF válido.');
                          setPeopleActionLoading(false);
                          return;
                        }
                        if (isEdit && id) {
                          // EDIT: upsert criando pessoa no backend
                          await upsertCompanyPerson(id, {
                            createPerson: {
                              fullName: newPerson.fullName,
                              cpf: extractDigits(newPerson.cpf),
                              email: newPerson.email || undefined,
                              phone: newPerson.phone || undefined
                            },
                            role: peopleRole || undefined,
                            isPrimary: !!peopleIsPrimary,
                            isLegalRepresentative: !!peopleIsLegalRep
                          });
                          await refreshPeopleLinks(id);
                        } else {
                          // CREATE: empilha no draft
                          const item: DraftLink = {
                            createPerson: {
                              fullName: newPerson.fullName,
                              cpf: extractDigits(newPerson.cpf),
                              email: newPerson.email || undefined,
                              phone: newPerson.phone || undefined
                            },
                            role: peopleRole || undefined,
                            isPrimary: !!peopleIsPrimary,
                            isLegalRepresentative: !!peopleIsLegalRep
                          };
                          setPeopleDraft(prev => {
                            const arr = [...prev, item];
                            return peopleIsPrimary ? ensureSinglePrimary(arr, arr.length - 1) : arr;
                          });
                        }
                      }
                      setPeopleOpen(false);
                    } catch (e: any) {
                      setPeopleActionError(friendlyError(e, 'Falha ao adicionar pessoa'));
                    } finally {
                      setPeopleActionLoading(false);
                    }
                  }}
                  variant="contained"
                  disabled={peopleActionLoading}
                >
                  {peopleActionLoading ? <><LoadingIcon />&nbsp;Salvando...</> : 'Confirmar'}
                </Button>
              </DialogActions>
            </Dialog>
          </TabPanel>
        )}

        {/* Botões */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </Box>
        </Box>
      </form>
    </Box>
  );
}
