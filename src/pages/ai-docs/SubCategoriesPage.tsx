// src/pages/ai-docs/SubCategoriesPage.tsx
import { useState, useEffect } from 'react';
import {
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
import Autocomplete from '@mui/material/Autocomplete';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';

import {
  listSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  type AiSubCategory
} from 'api/aiSubCategories';
import { listCategories, type AiCategory } from 'api/aiCategories';
import { listCustomers, type Customer, subjectId, resolveSubjectId } from 'api/customers';

export default function SubCategoriesPage() {
  const [subCategories, setSubCategories] = useState<AiSubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<AiSubCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subCategoryToDelete, setSubCategoryToDelete] = useState<AiSubCategory | null>(null);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: null as string | null
  });
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Carregar subcategorias
  const loadSubCategories = async () => {
    try {
      setLoading(true);
      const response = await listSubCategories({ 
        search, 
        categoryId: categoryFilter || undefined,
        page: 1, 
        limit: 100 
      });
      setSubCategories(response.data);
    } catch (error: any) {
      openSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Erro ao carregar subcategorias', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setLoading(false);
    }
  };

  // Carregar peças
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await listCategories({ page: 1, limit:100, customerId: customerFilter || undefined });
      setCategories(response.data);
    } catch (error: any) {
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || 'Erro ao carregar peças',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    loadSubCategories();
  }, [search, categoryFilter]);

  useEffect(() => {
    loadCategories();
  }, [customerFilter]);
  useEffect(() => {
    (async () => { try { const r = await listCustomers({ page:1, limit:300 }); setCustomers(r.data);} catch {} })();
  }, []);

  // Handlers
  const handleOpenDialog = (subCategory?: AiSubCategory) => {
    if (subCategory) {
      setEditingSubCategory(subCategory);
      setFormData({
        name: subCategory.name,
        categoryId: subCategory.categoryId
      });
    } else {
      setEditingSubCategory(null);
      setFormData({
        name: '',
        categoryId: categoryFilter
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSubCategory(null);
    setFormData({
      name: '',
      categoryId: null
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

    if (!formData.categoryId) {
      openSnackbar({ 
        open: true, 
        message: 'Peça é obrigatória', 
        variant: 'alert', 
        alert: { color: 'warning' } 
      } as any);
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingSubCategory) {
        const updated = await updateSubCategory(editingSubCategory.id, { name: formData.name });
        setSubCategories(prev => prev.map(sc => sc.id === updated.id ? updated : sc));
        openSnackbar({ 
          open: true, 
          message: 'Tópico atualizado com sucesso!', 
          variant: 'alert', 
          alert: { color: 'success' } 
        } as any);
      } else {
        const created = await createSubCategory({ 
          name: formData.name,
          categoryId: formData.categoryId
        });
        setSubCategories(prev => [...prev, created]);
        openSnackbar({ 
          open: true, 
          message: 'Tópico criado com sucesso!', 
          variant: 'alert', 
          alert: { color: 'success' } 
        } as any);
      }
      
      handleCloseDialog();
    } catch (error: any) {
      openSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Erro ao salvar subcategoria', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (subCategory: AiSubCategory) => {
    setSubCategoryToDelete(subCategory);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subCategoryToDelete) return;

    try {
      await deleteSubCategory(subCategoryToDelete.id);
      setSubCategories(prev => prev.filter(sc => sc.id !== subCategoryToDelete.id));
      openSnackbar({ 
        open: true, 
        message: 'Tópico excluído com sucesso!', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
    } catch (error: any) {
      openSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Erro ao excluir subcategoria', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setDeleteDialogOpen(false);
      setSubCategoryToDelete(null);
    }
  };

  return (
    <Box>
      <MainCard title="Tópicos de Templates AI">
          <Stack spacing={3}>
            {/* Header com busca, filtro e botão adicionar */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                label="Buscar subcategorias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 300 }}
                placeholder="Digite o nome da subcategoria..."
              />
              <Autocomplete
                options={customers}
                getOptionLabel={(o) => o.displayName || o.name || 'Cliente sem nome'}
                value={customers.find(c => subjectId(c) === customerFilter) || null}
                onChange={async (_, v) => setCustomerFilter((await resolveSubjectId(v)) ?? null)}
                sx={{ minWidth: 240 }}
                renderInput={(params) => <TextField {...params} label="Cliente" placeholder="Global + Cliente" />}
              />
              <Autocomplete
                options={categories}
                loading={categoriesLoading}
                getOptionLabel={(o) => o.name || 'Categoria sem nome'}
                value={categories.find(c => c.id === categoryFilter) || null}
                onChange={(_, v) => setCategoryFilter(v?.id ?? null)}
                sx={{ minWidth: 280 }}
                renderInput={(params) => <TextField {...params} label="Filtrar por peça" placeholder="Todas" />}
              />
              <Button
                variant="contained"
                startIcon={<PlusOutlined />}
                onClick={() => handleOpenDialog()}
                sx={{ minWidth: 150 }}
              >
                Novo Tópico
              </Button>
            </Stack>

            {/* Tabela de subcategorias */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Peça</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : subCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma subcategoria encontrada
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    subCategories.map((subCategory) => {
                      const category = categories.find(c => c.id === subCategory.categoryId);
                      return (
                        <TableRow key={subCategory.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {subCategory.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {subCategory.slug}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {category ? (
                              <Chip size="small" label={category.name} />
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(subCategory)}
                                color="primary"
                              >
                                <EditOutlined />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(subCategory)}
                                color="error"
                              >
                                <DeleteOutlined />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
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
          {editingSubCategory ? 'Editar Tópico' : 'Novo Tópico'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Nome do Tópico"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="Ex: Contratos de Trabalho, Rescisões, etc."
            />
            <Autocomplete
              options={categories}
              loading={categoriesLoading}
              getOptionLabel={(o) => o.name}
              value={categories.find(c => c.id === formData.categoryId) || null}
              onChange={(_, v) => setFormData({ ...formData, categoryId: v?.id ?? null })}
              renderInput={(params) => <TextField {...params} label="Peça" placeholder="Selecione uma peça" required />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting || !formData.name.trim() || !formData.categoryId}
          >
            {submitting ? <CircularProgress size={18} /> : (editingSubCategory ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Tópico"
        description={`Tem certeza que deseja excluir o tópico "${subCategoryToDelete?.name}"? Esta ação não pode ser desfeita.`}
      />
    </Box>
  );
}

