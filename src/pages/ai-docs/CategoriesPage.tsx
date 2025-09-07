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
  FormControlLabel,
  Switch,
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
    companyScope: 'company' as 'global' | 'company'
  });
  const [submitting, setSubmitting] = useState(false);

  // Carregar categorias
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await listCategories({ search, page: 1, limit: 100 });
      setCategories(response.data);
    } catch (error: any) {
      openSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Erro ao carregar categorias', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [search]);

  // Handlers
  const handleOpenDialog = (category?: AiCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        companyScope: category.companyScope || 'company'
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        companyScope: 'company'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      companyScope: 'company'
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
        const updated = await updateCategory(editingCategory.id, { name: formData.name });
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        openSnackbar({ 
          open: true, 
          message: 'Categoria atualizada com sucesso!', 
          variant: 'alert', 
          alert: { color: 'success' } 
        } as any);
      } else {
        const created = await createCategory({ 
          name: formData.name, 
          companyScope: formData.companyScope 
        });
        setCategories(prev => [...prev, created]);
        openSnackbar({ 
          open: true, 
          message: 'Categoria criada com sucesso!', 
          variant: 'alert', 
          alert: { color: 'success' } 
        } as any);
      }
      
      handleCloseDialog();
    } catch (error: any) {
      openSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Erro ao salvar categoria', 
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
        message: 'Categoria excluída com sucesso!', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
    } catch (error: any) {
      openSnackbar({ 
        open: true, 
        message: error?.response?.data?.message || 'Erro ao excluir categoria', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <MainCard title="Categorias de Templates AI">
          <Stack spacing={3}>
            {/* Header com busca e botão adicionar */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                label="Buscar categorias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ minWidth: 300 }}
                placeholder="Digite o nome da categoria..."
              />
              <Button
                variant="contained"
                startIcon={<PlusOutlined />}
                onClick={() => handleOpenDialog()}
                sx={{ minWidth: 150 }}
              >
                Nova Categoria
              </Button>
            </Stack>

            {/* Tabela de categorias */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Escopo</TableCell>
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
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          Nenhuma categoria encontrada
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
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
                          <Chip
                            label={category.companyScope === 'global' ? 'Global' : 'Empresa'}
                            color={category.companyScope === 'global' ? 'primary' : 'default'}
                            size="small"
                            variant="outlined"
                          />
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
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </MainCard>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Nome da Categoria"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="Ex: Ações Trabalhistas, Contratos, etc."
            />
            
            {!editingCategory && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.companyScope === 'global'}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      companyScope: e.target.checked ? 'global' : 'company' 
                    })}
                  />
                }
                label="Disponível para toda a empresa"
              />
            )}
            
            {editingCategory && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Nota:</strong> O escopo da categoria não pode ser alterado após a criação.
                </Typography>
              </Box>
            )}
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
        title="Excluir Categoria"
        description={`Tem certeza que deseja excluir a categoria "${categoryToDelete?.name}"? Esta ação não pode ser desfeita.`}
      />
    </Box>
  );
}
