import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  InputAdornment,
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
import { Customer, CustomerKind } from '../../types/customers';
import { listPeople, listCompanies, deleteCustomer } from '../../api/customers';
import { openSnackbar } from '../../api/snackbar';

// ==============================|| CUSTOMERS LIST ||============================== //

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
                <TableCell>Criado em</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography>Carregando...</Typography>
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
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
