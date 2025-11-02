import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  PlusOutlined as AddIcon,
  SearchOutlined as SearchIcon,
  MoreOutlined as MoreVertIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  EyeOutlined as ViewIcon,
  UserOutlined as PersonIcon,
  BankOutlined as BusinessIcon
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Customer, CustomerKind, CustomerBranch } from '../../types/customers';
import {
  listPeople,
  listCompanies,
  deleteCustomer,
  getCustomer,
  getCompanyBranches
} from '../../api/customers';
import { openSnackbar } from '../../api/snackbar';

// ==============================|| CUSTOMERS LIST ||============================== //

// ---------- Utils para exibir nomes/id de filiais ----------
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
  return b.childId || ch?.customer?.id || ch?.id;
};

// Hidrata filhos que vierem só com childId (para mostrar nomes no tooltip)
async function hydrateChildren(list: CustomerBranch[]): Promise<CustomerBranch[]> {
  const needs = list.some((b) => !b.child && b.childId);
  if (!needs) return list;
  const filled = await Promise.all(
    list.map(async (b) => {
      if (b.child || !b.childId) return b;
      try {
        const child = await getCustomer(b.childId, false);
        return { ...b, child };
      } catch {
        return b;
      }
    })
  );
  return filled;
}

// ---------- Componente da flag + tooltip ----------
function StructureFlag({ customer }: { customer: Customer }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isBranch, setIsBranch] = useState<boolean | null>(null);
  const [parent, setParent] = useState<{ id: string; displayName: string } | null>(null);
  const [branches, setBranches] = useState<CustomerBranch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Só para empresas: já carregamos na montagem para que a flag apareça de cara.
    if (customer.kind !== 'COMPANY') return;
    setLoading(true);
    (async () => {
      try {
        const data: any = await getCustomer(customer.id, true);
        const parentCustomer = data?.company?.parent?.customer || null;
        const branch = Boolean(parentCustomer);
        const baseId = branch ? parentCustomer.id : data.id;
        let list = await getCompanyBranches(baseId);
        if (branch) list = list.filter((b: any) => b.childId !== data.id);
        list = await hydrateChildren(list);
        if (!alive) return;
        setIsBranch(branch);
        setParent(parentCustomer ? { id: parentCustomer.id, displayName: parentCustomer.displayName } : null);
        setBranches(list);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.response?.data?.message || e?.message || 'Falha ao carregar estrutura');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customer.id, customer.kind]);

  if (customer.kind !== 'COMPANY') return <Typography variant="body2" color="text.secondary">—</Typography>;

  const label = isBranch === null ? '...' : isBranch ? 'FILIAL' : 'MATRIZ';
  const color: any = isBranch ? 'info' : 'default';

  const content = (
    <Box sx={{ maxWidth: 420 }}>
      {loading && <Stack direction="row" gap={1} alignItems="center"><CircularProgress size={16} /> <Typography variant="body2">Carregando…</Typography></Stack>}
      {!!error && <Typography color="error" variant="body2">{error}</Typography>}
      {!loading && !error && (
        <Stack gap={1}>
          {isBranch && parent && (
            <Typography variant="body2">
              <b>Matriz:</b>{' '}
              <Link component="button" onClick={() => navigate(`/clients/${parent.id}`)}>
                {parent.displayName}
              </Link>
            </Typography>
          )}
          {branches && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: .5 }}>Filiais</Typography>
              {branches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {isBranch ? 'Nenhuma outra filial vinculada à matriz.' : 'Nenhuma filial vinculada.'}
                </Typography>
              ) : (
                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {branches.slice(0, 10).map((b) => {
                    const nm = branchDisplayName(b);
                    const cid = branchTargetId(b);
                    return (
                      <Chip
                        key={b.id}
                        size="small"
                        label={nm}
                        clickable
                        onClick={() => cid && navigate(`/clients/${cid}`)}
                        sx={{ mb: 0.5 }}
                      />
                    );
                  })}
                  {branches.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: .5 }}>
                      e outras {branches.length - 10} filiais
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );

  return (
    <Tooltip title={content} arrow enterDelay={400} placement="top">
      <Chip size="small" color={color} label={label} />
    </Tooltip>
  );
}

export default function CustomersList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKind, setSelectedKind] = useState<CustomerKind | 'ALL'>('ALL');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // Carregar clientes
  const loadCustomers = async () => {
    setLoading(true);
    try {
      let allCustomers: Customer[] = [];
      
      if (selectedKind === 'ALL' || selectedKind === 'PERSON') {
        const people = await listPeople(searchTerm || undefined);
        allCustomers = [...allCustomers, ...(people || [])];
      }
      
      if (selectedKind === 'ALL' || selectedKind === 'COMPANY') {
        const companies = await listCompanies(searchTerm || undefined);
        allCustomers = [...allCustomers, ...(companies || [])];
      }
      
      setCustomers(allCustomers);
    } catch (err: any) {
      console.error('Erro ao carregar clientes:', err);
      // Só mostra erro se não for um array vazio
      if (err.response?.status !== 200) {
        openSnackbar({ 
          open: true, 
          message: err.response?.data?.message || 'Erro ao carregar clientes', 
          variant: 'alert', 
          alert: { color: 'error' } 
        } as any);
      }
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [selectedKind, searchTerm]);

  // Handlers
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleKindChange = (kind: CustomerKind | 'ALL') => {
    setSelectedKind(kind);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
    setAnchorEl(event.currentTarget);
    setSelectedCustomer(customer);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCustomer(null);
  };

  const handleView = () => {
    if (selectedCustomer) {
      navigate(`/clients/${selectedCustomer.id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedCustomer) {
      navigate(`/clients/${selectedCustomer.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (selectedCustomer) {
      try {
        await deleteCustomer(selectedCustomer.id);
        await loadCustomers();
        setDeleteDialog(false);
        setSelectedCustomer(null);
      } catch (err: any) {
        openSnackbar({ 
          open: true, 
          message: err.response?.data?.message || 'Erro ao deletar cliente', 
          variant: 'alert', 
          alert: { color: 'error' } 
        } as any);
      }
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
    setSelectedCustomer(null);
  };

  const getKindIcon = (kind: CustomerKind) => {
    return kind === 'PERSON' ? <PersonIcon /> : <BusinessIcon />;
  };

  const getKindColor = (kind: CustomerKind) => {
    return kind === 'PERSON' ? 'primary' : 'secondary';
  };

  const getKindLabel = (kind: CustomerKind) => {
    return kind === 'PERSON' ? 'Pessoa Física' : 'Pessoa Jurídica';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/clients/new')}
        >
          Novo Cliente
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                placeholder="Buscar por nome, CPF ou CNPJ..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="Todos"
                color={selectedKind === 'ALL' ? 'primary' : 'default'}
                onClick={() => handleKindChange('ALL')}
                clickable
              />
              <Chip
                label="Pessoas Físicas"
                color={selectedKind === 'PERSON' ? 'primary' : 'default'}
                onClick={() => handleKindChange('PERSON')}
                clickable
              />
              <Chip
                label="Pessoas Jurídicas"
                color={selectedKind === 'COMPANY' ? 'primary' : 'default'}
                onClick={() => handleKindChange('COMPANY')}
                clickable
              />
            </Box>
          </Box>
        </CardContent>
      </Card>


      {/* Tabela */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Estrutura</TableCell>
                <TableCell>Criado em</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography>Carregando...</Typography>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary">
                      Nenhum cliente encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id} hover>
                    <TableCell>
                      <Chip
                        icon={getKindIcon(customer.kind)}
                        label={getKindLabel(customer.kind)}
                        color={getKindColor(customer.kind)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {customer.displayName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={customer.isActive ? 'Ativo' : 'Inativo'}
                        color={customer.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {/* Flag Matriz/Filial + tooltip */}
                      <StructureFlag customer={customer} />
                    </TableCell>
                    <TableCell>
                      {new Date(customer.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, customer)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <ViewIcon />
          </ListItemIcon>
          <ListItemText>Visualizar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={deleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o cliente "{selectedCustomer?.displayName}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
