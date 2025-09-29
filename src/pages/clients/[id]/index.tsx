import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Link,
  Tooltip,
  IconButton,
  Stack,
  Grid,
  Typography,
  Alert,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import {
  EditOutlined as EditIcon,
  ArrowLeftOutlined as ArrowBackIcon,
  UserOutlined as PersonIcon,
  BankOutlined as BusinessIcon,
  CopyOutlined as CopyIcon,
  MailOutlined as MailIcon,
  PhoneOutlined as PhoneIcon,
  CalendarOutlined as CalendarIcon,
  IdcardOutlined as IdIcon,
  EnvironmentOutlined as AddressIcon
} from '@ant-design/icons';
import { LoadingOutlined as LoadingIcon, PlusOutlined as AddIcon, LinkOutlined as LinkIcon } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Customer, CustomerWithDetails, CustomerBranch } from '../../../types/customers';
import {
  getCustomer,
  formatCPF,
  formatCNPJ,
  formatCEP,
  getCompanyBranches,
  deleteCompanyBranch,
  listCompanies,
  linkAsBranch,
  createCompanyAsBranch,
  extractDigits
} from '../../../api/customers';

// ==============================|| CLIENT DETAILS PAGE ||============================== //

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ClientDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  
  // Debug: log quando branches mudam
  useEffect(() => {
    console.log('🔄 Estado branches atualizado:', branches);
  }, [branches]);
  
  // Hidrata branches que vieram só com childId (sem o objeto child)
  const hydrateChildren = async (list: CustomerBranch[]): Promise<CustomerBranch[]> => {
    console.log('🔄 hydrateChildren chamada com:', list);
    const needsFetch = list.some((b) => !b.child && b.childId);
    console.log('🔍 Precisa fazer fetch?', needsFetch);
    if (!needsFetch) {
      console.log('✅ Não precisa fetch, retornando lista original');
      return list;
    }
    const filled = await Promise.all(
      list.map(async (b) => {
        if (b.child || !b.childId) return b;
        try {
          console.log('📡 Fazendo fetch para childId:', b.childId);
          const child = await getCustomer(b.childId, false);
          return { ...b, child };
        } catch {
          console.log('❌ Erro ao buscar child:', b.childId);
          return b; // em caso de erro, mantém como está
        }
      })
    );
    console.log('✅ Lista hidratada:', filled);
    return filled;
  };

  // Helpers de exibição seguros
  const branchDisplayName = (b: CustomerBranch) => {
    const ch: any = (b as any).child;
    return (
      ch?.displayName ||
      ch?.customer?.displayName ||
      ch?.company?.legalName ||
      ch?.legalName ||
      b.childId
    );
  };
  const branchTargetId = (b: CustomerBranch) => {
    const ch: any = (b as any).child;
    return ch?.id || ch?.customer?.id || b.childId;
  };
  
  // Dialog "Adicionar Filial"
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState(0); // 0=existente, 1=nova
  const [searchExisting, setSearchExisting] = useState('');
  const [existingLoading, setExistingLoading] = useState(false);
  const [existingOptions, setExistingOptions] = useState<Customer[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  // formulário de nova filial (mínimo viável)
  const [newBranch, setNewBranch] = useState({
    displayName: '',
    legalName: '',
    cnpj: '',
    tradeName: '',
    email: '',
    phone: ''
  });

  const copy = async (text: string, key: string) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(()=>setCopied(null), 1200);} catch(_){} };

  useEffect(() => {
    if (id) loadCustomer();
  }, [id]);

  // Carrega branches assim que o cliente chega:
  // 1) Se vierem em customer.branches (tree=true), usa direto (caso MATRIZ).
  // 2) Se for FILIAL (tem parent), busca branches da MATRIZ e remove ela própria (mostra as "irmãs").
  // 3) Se não vier nada, faz fallback no endpoint /customers/:id/branches.
  useEffect(() => {
    if (!customer || customer.kind !== 'COMPANY') {
      setBranches([]);
      return;
    }

    const parent = (customer.company as any)?.parent?.customer || null;
    const hasTreeBranches = Array.isArray((customer as any)?.branches) && (customer as any).branches.length > 0;

    console.log('🔍 Debug branches:', {
      customerId: customer.id,
      customerName: customer.displayName,
      hasParent: !!parent,
      parentId: parent?.id,
      hasTreeBranches,
      treeBranchesCount: (customer as any)?.branches?.length || 0,
      treeBranches: (customer as any)?.branches
    });

    // Caso 2: É filial -> buscar irmãs na matriz
    if (parent) {
      console.log('📍 Caso 2: É filial, buscando irmãs na matriz', parent.id);
      getCompanyBranches(parent.id)
        .then(hydrateChildren)
        .then(res => setBranches(res.filter(b => b.childId !== customer.id)))
        .catch(() => setBranches([]));
      return;
    }

    // Caso 1: É matriz e já tenho branches do tree
    if (hasTreeBranches) {
      console.log('📍 Caso 1: É matriz com tree branches, hidratando...');
      const treeBranches = (customer as any).branches;
      hydrateChildren(treeBranches)
        .then(hydrated => {
          console.log('✅ Branches hidratados:', hydrated);
          setBranches(hydrated);
        })
        .catch(err => {
          console.error('❌ Erro na hidratação, usando tree original:', err);
          setBranches(treeBranches);
        });
      return;
    }

    // Caso 3: fallback (é matriz mas não veio tree ou veio vazio)
    console.log('📍 Caso 3: Fallback, buscando via endpoint');
    getCompanyBranches(customer.id)
      .then(hydrateChildren)
      .then(res => setBranches(res))
      .catch(() => setBranches([]));
  }, [customer]);

  // --- efeitos/busca para "Vincular existente" ---
  useEffect(() => {
    let alive = true;
    const q = searchExisting.trim();
    if (!addOpen || addTab !== 0) return;
    if (q.length < 2) {
      setExistingOptions([]);
      setExistingLoading(false);
      return;
    }
    setExistingLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await listCompanies(q);
        if (!alive) return;
        // evita listar a própria empresa na busca
        const filtered = customer ? res.filter(c => c.id !== customer.id) : res;
        setExistingOptions(filtered);
      } finally {
        if (alive) setExistingLoading(false);
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [searchExisting, addTab, addOpen, customer]);

  const loadCustomer = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const customerData = await getCustomer(id, true);
      setCustomer(customerData);
      // Pré-popula branches se vierem no payload (melhora paint inicial de MATRIZ)
      if (customerData?.kind === 'COMPANY' && Array.isArray((customerData as any).branches)) {
        setBranches((customerData as any).branches);
      } else {
        setBranches([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    navigate(`/clients/${id}/edit`);
  };

  const handleRemoveParent = async () => {
    if (!customer || customer.kind !== 'COMPANY') return;
    const parent = (customer.company as any)?.parent?.customer;
    if (!parent) return;
    try {
      await deleteCompanyBranch(parent.id, customer.id);
      await loadCustomer();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao remover matriz');
    }
  };

  const handleBack = () => {
    navigate('/clients');
  };

  const handleOpenAdd = () => {
    setAddError(null);
    setSelectedExisting(null);
    setSearchExisting('');
    setExistingOptions([]);
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

  const handleConfirmAdd = async () => {
    if (!customer || customer.kind !== 'COMPANY') return;
    setCreating(true);
    setAddError(null);
    try {
      if (addTab === 0) {
        // Vincular existente
        if (!selectedExisting?.id) {
          setAddError('Selecione uma empresa para vincular.');
          setCreating(false);
          return;
        }
        await linkAsBranch(customer.id, selectedExisting.id);
      } else {
        // Criar nova filial
        const cleanCnpj = extractDigits(newBranch.cnpj);
        if (!newBranch.legalName || cleanCnpj.length !== 14) {
          setAddError('Informe Razão Social e um CNPJ válido (14 dígitos).');
          setCreating(false);
          return;
        }
        await createCompanyAsBranch(customer.id, {
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
      }
      // refresh lista de filiais
      const res = await getCompanyBranches(customer.id);
      setBranches(await hydrateChildren(res));
      setAddOpen(false);
    } catch (e: any) {
      setAddError(e?.response?.data?.message || 'Falha ao adicionar filial');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando...</Typography>
      </Box>
    );
  }

  if (error || !customer) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Cliente não encontrado'}
        </Alert>
        <Button onClick={handleBack}>Voltar</Button>
      </Box>
    );
  }

  const getKindIcon = () => {
    return customer.kind === 'PERSON' ? <PersonIcon /> : <BusinessIcon />;
  };

  const getKindColor = () => {
    return customer.kind === 'PERSON' ? 'primary' : 'secondary';
  };

  const getKindLabel = () => {
    return customer.kind === 'PERSON' ? 'Pessoa Física' : 'Pessoa Jurídica';
  };

  const rfStatusColor = (s?: string) => {
    switch (s) {
      case 'ATIVA': return 'success';
      case 'SUSPENSA':
      case 'INAPTA': return 'warning';
      case 'BAIXADA': return 'error';
      case 'INATIVA': return 'default';
      default: return 'default';
    }
  };

  const addresses = customer.kind === 'COMPANY' ? customer.company?.addresses : customer.person?.addresses;
  const hasAddresses = !!(addresses && addresses.length);

  const formatIsoDateToBr = (isoDateString?: string) => {
    if (!isoDateString) return '';
    try {
      const date = new Date(isoDateString);
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error('Error formatting date:', e);
      return isoDateString; // Return original if formatting fails
    }
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
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" component="h1">
            {customer.displayName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Chip
              icon={getKindIcon()}
              label={getKindLabel()}
              color={getKindColor()}
              size="small"
            />
            <Chip
              label={customer.isActive ? 'Ativo' : 'Inativo'}
              color={customer.isActive ? 'success' : 'default'}
              size="small"
            />
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEdit}
        >
          Editar
        </Button>
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Dados Gerais" />
            <Tab label="Endereços" />
            {customer.kind === 'COMPANY' && [
              <Tab key="branches" label="Matriz / Filiais" />,
              <Tab key="people" label="Pessoas Vinculadas" />
            ]}
          </Tabs>
        </Box>

        {/* Dados Gerais */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Informações Básicas
                  </Typography>
                  <Box sx={{ display: 'grid', gap: 1.25 }}>
                    <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:2}}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Nome de Exibição
                      </Typography>
                      <Typography fontWeight={600}>{customer.displayName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={customer.isActive ? 'Ativo' : 'Inativo'}
                        color={customer.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Criado em
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon />
                        <Typography>
                        {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Stack>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Atualizado em
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarIcon />
                        <Typography>
                        {new Date(customer.updatedAt).toLocaleDateString('pt-BR')}
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Dados específicos */}
            {customer.kind === 'PERSON' && customer.person && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Dados da Pessoa Física
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1.25 }}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Nome Completo
                        </Typography>
                        <Typography>{customer.person.fullName}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          CPF
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <IdIcon />
                          <Typography>{formatCPF(customer.person.cpf)}</Typography>
                          <Tooltip title={copied==='cpf'?'Copiado!':'Copiar CPF'}>
                            <IconButton size="small" onClick={()=>copy(customer.person!.cpf, 'cpf')}>
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                      {customer.person.rg && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            RG
                          </Typography>
                          <Typography>{customer.person.rg}</Typography>
                        </Box>
                      )}
                      {customer.person.birthDate && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Data de Nascimento
                          </Typography>
                          <Typography>
                            {new Date(customer.person.birthDate).toLocaleDateString('pt-BR')}
                          </Typography>
                        </Box>
                      )}
                      {customer.person.email && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            E-mail
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <MailIcon />
                            <Link href={`mailto:${customer.person.email}`}>{customer.person.email}</Link>
                          </Stack>
                        </Box>
                      )}
                      {customer.person.phone && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Telefone
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PhoneIcon />
                            <Link href={`tel:${customer.person.phone}`}>{customer.person.phone}</Link>
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {customer.kind === 'COMPANY' && customer.company && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Dados da Pessoa Jurídica
                    </Typography>
                    <Box sx={{ display: 'grid', gap: 1.25 }}>
                      {/* Indicador Matriz/Filial */}
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Estrutura
                        </Typography>
                        {(customer.company as any).parent?.customer ? (
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Chip size="small" color="info" label="FILIAL" />
                            <Typography variant="body2" color="text.secondary">
                              (matriz: <Link onClick={() => navigate(`/clients/${(customer.company as any).parent.customer.id}`)} component="button">
                                {(customer.company as any).parent.customer.displayName}
                              </Link>)
                            </Typography>
                          </Stack>
                        ) : (
                          <Chip size="small" color="default" label="MATRIZ" />
                        )}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Razão Social
                        </Typography>
                        <Typography>{customer.company.legalName}</Typography>
                      </Box>
                      {customer.company.tradeName && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Nome Fantasia
                          </Typography>
                          <Typography>{customer.company.tradeName}</Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          CNPJ
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <IdIcon />
                          <Typography>{formatCNPJ(customer.company.cnpj)}</Typography>
                          <Tooltip title={copied==='cnpj'?'Copiado!':'Copiar CNPJ'}>
                            <IconButton size="small" onClick={()=>copy(customer.company!.cnpj, 'cnpj')}>
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                      {customer.company.stateRegistration && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Inscrição Estadual
                          </Typography>
                          <Typography>{customer.company.stateRegistration}</Typography>
                        </Box>
                      )}
                      {customer.company.municipalRegistration && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Inscrição Municipal
                          </Typography>
                          <Typography>{customer.company.municipalRegistration}</Typography>
                        </Box>
                      )}
                      {customer.company.email && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            E-mail
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <MailIcon />
                            <Link href={`mailto:${customer.company.email}`}>{customer.company.email}</Link>
                          </Stack>
                        </Box>
                      )}
                      {customer.company.phone && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Telefone
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PhoneIcon />
                            <Link href={`tel:${customer.company.phone}`}>{customer.company.phone}</Link>
                          </Stack>
                        </Box>
                      )}
                      {/* ----- Receita Federal extras ----- */}
                      {customer.company.status && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Situação (RF)</Typography>
                          <Chip size="small" label={customer.company.status} color={rfStatusColor(customer.company.status)} />
                        </Box>
                      )}
                      {customer.company.openingDate && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Abertura</Typography>
                          <Typography>{formatIsoDateToBr(customer.company.openingDate)}</Typography>
                        </Box>
                      )}
                      {customer.company.legalNature && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Natureza Jurídica</Typography>
                          <Typography>{customer.company.legalNature}</Typography>
                        </Box>
                      )}
                      {customer.company.size && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Porte</Typography>
                          <Chip size="small" label={customer.company.size} />
                        </Box>
                      )}
                      {customer.company.mainActivity && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Atividade Principal</Typography>
                          <Typography>{customer.company.mainActivity}</Typography>
                        </Box>
                      )}
                      {customer.company.secondaryActivities && customer.company.secondaryActivities.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Atividades Secundárias</Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{mt: .5}}>
                            {customer.company.secondaryActivities.map((a, i) => (
                              <Chip key={i} label={a} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Endereços */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>Endereços</Typography>
          {!hasAddresses && (
            <Typography color="text.secondary">Nenhum endereço cadastrado.</Typography>
          )}
          {hasAddresses && (
            <Grid container spacing={2}>
              {addresses!.map((addr, idx) => (
                <Grid key={addr.id || idx} size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{mb:1}}>
                        <AddressIcon />
                        <Typography variant="subtitle1">{addr.label || 'Endereço'}</Typography>
                        {addr.isPrimary && <Chip label="Primário" size="small" color="info" />}
                        <Chip label={addr.addressType === 'C' ? 'Comercial' : addr.addressType === 'P' ? 'Pessoal' : addr.addressType === 'E' ? 'Entrega' : 'Alternativo'} size="small" />
                      </Stack>
                      <Typography>
                        {addr.street}{addr.number ? `, ${addr.number}` : ''}{addr.complement ? `, ${addr.complement}` : ''}
                      </Typography>
                      <Typography>
                        {addr.district ? `${addr.district} - ` : ''}{addr.city}/{addr.state}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        CEP {formatCEP(addr.postalCode)} • {addr.country}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>

        {/* Matriz / Filiais (apenas para empresas) */}
        {customer.kind === 'COMPANY' && (
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>Matriz / Filiais</Typography>
            
            {/* Status atual */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Status Atual
              </Typography>
              {(customer.company as any).parent?.customer ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Esta empresa é uma FILIAL</strong>
                  </Typography>
                  <Typography variant="body2">
                    Matriz: <Link onClick={() => navigate(`/clients/${(customer.company as any).parent.customer.id}`)} component="button">
                      {(customer.company as any).parent.customer.displayName}
                    </Link>
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body1">
                    <strong>Esta empresa é uma MATRIZ</strong>
                  </Typography>
                  <Typography variant="body2">
                    Não possui empresa-matriz definida.
                  </Typography>
                </Alert>
              )}
            </Box>

            {/* Ações */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Ações
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleOpenAdd}
                >
                  Adicionar Filial
                </Button>
                <Button
                  variant="contained"
                  onClick={() => navigate(`/clients/${id}/edit`)}
                  startIcon={<EditIcon />}
                >
                  Editar Relação
                </Button>
                {(customer.company as any).parent?.customer && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleRemoveParent}
                  >
                    Remover Matriz
                  </Button>
                )}
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Filiais desta empresa */}
            <Box>
              {/** flag para saber se estou em uma filial */}
              {(() => {
                const isBranch = Boolean((customer.company as any)?.parent?.customer);
                console.log('🎯 Renderizando seção filiais:', { 
                  isBranch, 
                  branchesCount: branches.length, 
                  branches: branches 
                });
                return (
                  <>
                    <Typography variant="subtitle1" gutterBottom>
                      {isBranch ? 'Filiais da matriz' : 'Filiais desta empresa'}
                    </Typography>
                    {branches.length === 0 ? (
                      <Typography color="text.secondary">
                        {isBranch ? 'Nenhuma outra filial vinculada à matriz.' : 'Nenhuma filial vinculada.'}
                      </Typography>
                    ) : (
                <Stack spacing={1} direction="row" useFlexGap flexWrap="wrap">
                  {branches.map((b) => {
                    const label = branchDisplayName(b);
                    const targetId = branchTargetId(b);
                    console.log('🎯 Renderizando chip:', { branch: b, label, targetId });
                    return (
                      <Chip
                        key={b.id}
                        label={label}
                        onClick={() => targetId && navigate(`/clients/${targetId}`)}
                        clickable
                      />
                    );
                  })}
                </Stack>
                    )}
                  </>
                );
              })()}
            </Box>

            {/* Dialog: Adicionar Filial */}
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
                      loading={existingLoading}
                      options={existingOptions}
                      value={selectedExisting}
                      getOptionLabel={(opt) => opt.displayName}
                      noOptionsText={searchExisting.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhuma empresa encontrada'}
                      onInputChange={(_, value) => setSearchExisting(value)}
                      onChange={(_, value) => setSelectedExisting(value)}
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
                {addError && (
                  <Alert severity="error" sx={{ mt: 2 }}>{addError}</Alert>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button onClick={handleConfirmAdd} variant="contained" disabled={creating}>
                  {creating ? <><LoadingIcon />&nbsp;Salvando...</> : 'Confirmar'}
                </Button>
              </DialogActions>
            </Dialog>
          </TabPanel>
        )}

        {/* Pessoas Vinculadas (apenas para empresas) */}
        {customer.kind === 'COMPANY' && (
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Pessoas Vinculadas
            </Typography>
            <Typography color="text.secondary">
              Funcionalidade de pessoas vinculadas será implementada em breve.
            </Typography>
          </TabPanel>
        )}
      </Card>
    </Box>
  );
}
