// src/pages/ai-docs/CategoriesPage.tsx
import { useState, useEffect } from 'react';
import {
  Grid,
  Stack,
  TextField,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box
} from '@mui/material';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type AiCategory
} from 'api/aiCategories';
import { listDepartments, type Department } from 'api/departments';
import Autocomplete from '@mui/material/Autocomplete';
import { listCustomers, type Customer, subjectId, resolveSubjectId } from 'api/customers';
import useDebounced from 'utils/useDebounced';

// (MenuItem removido)

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AiCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<AiCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    departmentId: (null as string | null),
    customerId: (null as string | null)
  });
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null); // subjectId
  
  // Estado para busca dinâmica de clientes
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounced(customerSearch, 350);

  // Carregar peças
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await listCategories({ search, departmentId: departmentFilter || undefined, customerId: customerFilter || undefined, page: 1, limit: 100 });
      setCategories(response.data);
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao carregar peças',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setLoading(false);
    }
  };

  // Carregar departamentos
  const loadDepartments = async () => {
    try {
      setDepartmentsLoading(true);
      const response = await listDepartments({ page: 1, limit: 100 });
      setDepartments(response.data);
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao carregar departamentos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  // Carregar clientes iniciais
  const loadCustomers = async () => {
    try {
      setCustomersLoading(true);
      const response = await listCustomers({ page: 1, limit: 50 });
      setCustomers(response.data);
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao carregar clientes',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setCustomersLoading(false);
    }
  };

  // Busca dinâmica de clientes
  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return;
    
    try {
      setCustomersLoading(true);
      const response = await listCustomers({ 
        q: searchTerm, 
        page: 1, 
        limit: 50 
      });
      setCustomers(response.data);
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao buscar clientes',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setCustomersLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [search, departmentFilter, customerFilter]);
  useEffect(() => { loadDepartments(); loadCustomers(); }, []);

  // Busca dinâmica de clientes
  useEffect(() => {
    searchCustomers(debouncedCustomerSearch);
  }, [debouncedCustomerSearch]);

  // Handlers
  const handleOpenDialog = (category?: AiCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        departmentId: category.departmentId ?? null,
        customerId: (category as any).customerId ?? null
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        departmentId: null,
        customerId: null
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      departmentId: null,
      customerId: null
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      openSnackbar({
        open: true,
        message: 'Nome é obrigatório',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }

    try {
      setSubmitting(true);

      if (editingCategory) {
        const updated = await updateCategory(editingCategory.id, {
          name: formData.name,
          departmentId: formData.departmentId ?? null,
          customerId: formData.customerId ?? null
        });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        openSnackbar({
          open: true,
          message: 'Peça atualizada com sucesso!',
          variant: 'alert',
          alert: { color: 'success' }
        } as any);
      } else {
        const created = await createCategory({
          name: formData.name,
          departmentId: formData.departmentId ?? null,
          customerId: formData.customerId ?? null
        });
        setCategories(prev => [...prev, created]);
        openSnackbar({
          open: true,
          message: 'Peça criada com sucesso!',
          variant: 'alert',
          alert: { color: 'success' }
        } as any);
      }

      handleCloseDialog();
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao salvar peça',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (category: AiCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      await deleteCategory(categoryToDelete.id);
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
      openSnackbar({
        open: true,
        message: 'Peça excluída com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao excluir peça',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <Box>
      <MainCard title="Peças de Templates AI">
        <Stack spacing={3}>
          {/* Header com busca e botão adicionar */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <TextField
              label="Buscar peças"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 300 }}
              placeholder="Digite o nome da peça..."
            />
            <Autocomplete
              options={departments}
              loading={departmentsLoading}
              getOptionLabel={(o) => o.name}
              value={departments.find(d => d.id === departmentFilter) || null}
              onChange={(_, v) => setDepartmentFilter(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Departamento" placeholder="Todos" />}
              sx={{ minWidth: 240 }}
            />
            <Autocomplete
              options={customers}
              loading={customersLoading}
              getOptionLabel={(o) => o.displayName || o.name || 'Cliente sem nome'}
              value={customers.find(c => subjectId(c) === customerFilter) || null}
              onChange={async (_, v) => setCustomerFilter((await resolveSubjectId(v)) ?? null)}
              onInputChange={(_, value) => setCustomerSearch(value)}
              noOptionsText={customerSearch.length < 2 ? 'Digite ao menos 2 caracteres para buscar' : 'Nenhum cliente encontrado'}
              renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Digite nome, CPF ou CNPJ..." />}
              sx={{ minWidth: 240 }}
            />
            <Button
              variant="contained"
              startIcon={<PlusOutlined />}
              onClick={() => handleOpenDialog()}
              sx={{ minWidth: 150 }}
            >
              Nova Peça
            </Button>
          </Stack>

          {/* Tabela de peças */}
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma peça encontrada
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => {
                    const department = departments.find(d => d.id === category.departmentId);
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {category.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {category.slug}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {department ? (
                            <Chip size="small" label={department.name} />
                          ) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(category)}
                              color="primary"
                            >
                              <EditOutlined />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(category)}
                              color="error"
                            >
                              <DeleteOutlined />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </MainCard>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Editar Peça' : 'Nova Peça'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Nome da Peça"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="Ex: Ações Trabalhistas, Contratos, etc."
            />
            <Autocomplete
              options={departments}
              loading={departmentsLoading}
              getOptionLabel={(o) => o.name}
              value={departments.find(d => d.id === formData.departmentId) || null}
              onChange={(_, v) => setFormData({ ...formData, departmentId: v?.id ?? null })}
              renderInput={(params) => <TextField {...params} label="Departamento" placeholder="Opcional" />}
              sx={{ minWidth: 280 }}
            />
            <Autocomplete
              options={customers}
              loading={customersLoading}
              getOptionLabel={(o) => o.displayName || o.name || 'Cliente sem nome'}
              value={customers.find(c => c.id === formData.customerId) || null}
              onChange={(_, v) =>
                setFormData({ ...formData, customerId: v?.id ?? null })
              }
              onInputChange={(_, value) => setCustomerSearch(value)}
              noOptionsText={customerSearch.length < 2 ? 'Digite ao menos 2 caracteres para buscar' : 'Nenhum cliente encontrado'}
              renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Digite nome, CPF ou CNPJ..." />}
              sx={{ minWidth: 280 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.name.trim()}
          >
            {submitting ? <CircularProgress size={18} /> : (editingCategory ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Peça"
        description={`Tem certeza que deseja excluir a peça "${categoryToDelete?.name}"? Esta ação não pode ser desfeita.`}
      />
    </Box>
  );
}
