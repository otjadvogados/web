// src/pages/ai-docs/TemplatesPage.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Paper
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { EditOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import LoadingTicker from 'components/LoadingTicker';
import { openSnackbar } from 'api/snackbar';

import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, getTemplateFileBlob,
  type AiTemplate, type AiTemplateListResponse
} from 'api/aiDocs';
import { listCategories, type AiCategory } from 'api/aiCategories';

export default function TemplatesPage() {
  // listagem
  const [rows, setRows] = useState<AiTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // categorias
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // dialog criar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null); // só no criar
  const [submitting, setSubmitting] = useState(false);
  const [showTicker, setShowTicker] = useState(false);

  // delete
  const [delOpen, setDelOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiTemplate | null>(null);

  async function loadCategories() {
    try {
      setCatLoading(true);
      const r = await listCategories({ page: 1, limit: 200 });
      setCategories(r.data);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar categorias', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setCatLoading(false);
    }
  }

  async function loadRows() {
    try {
      setLoading(true);
      const r: AiTemplateListResponse = await listTemplates({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        page, limit
      });
      setRows(r.data);
      setTotal(r.pagination.total);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar templates', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadRows(); /* eslint-disable-next-line */ }, [search, categoryFilter, page, limit]);

  // abrir/fechar dialog
  function openCreate() {
    setEditing(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategoryId(null);
    setFormFile(null);
    setDialogOpen(true);
  }
  function openEdit(t: AiTemplate) {
    setEditing(t);
    setFormTitle(t.title);
    setFormDescription(t.description || '');
    setFormCategoryId((t as any).categoryId ?? null);
    setFormFile(null);
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); }

  // submit criar/editar
  async function handleSubmit() {
    try {
      setSubmitting(true);
      if (editing) {
        const updated = await updateTemplate(editing.id, {
          title: formTitle,
          description: formDescription || null,
          categoryId: formCategoryId
        });
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
        openSnackbar({ open: true, message: 'Template atualizado.', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        if (!formFile) {
          openSnackbar({ open: true, message: 'Selecione um PDF', variant: 'alert', alert: { color: 'warning' } } as any);
          return;
        }
        if (!formTitle.trim()) {
          openSnackbar({ open: true, message: 'Título é obrigatório', variant: 'alert', alert: { color: 'warning' } } as any);
          return;
        }
        setShowTicker(true);
        await createTemplate({
          file: formFile,
          title: formTitle.trim(),
          description: formDescription || undefined,
          categoryId: formCategoryId
        });
        openSnackbar({ open: true, message: 'Template criado e processado!', variant: 'alert', alert: { color: 'success' } } as any);
        // recarrega a lista do início
        setPage(1);
        await loadRows();
      }
      closeDialog();
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setSubmitting(false);
      // deixa o ticker respirar 1 seg e some
      setTimeout(() => setShowTicker(false), 1000);
    }
  }

  // delete
  function askDelete(t: AiTemplate) {
    setToDelete(t);
    setDelOpen(true);
  }
  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteTemplate(toDelete.id);
      setRows(prev => prev.filter(r => r.id !== toDelete.id));
      openSnackbar({ open: true, message: 'Template removido.', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setDelOpen(false);
      setToDelete(null);
    }
  }

  // === Visualizar template via BLOB autenticado ===
  async function viewTemplate(template: AiTemplate) {
    const fileId = (template as any).fileId;
    if (!fileId) return;
    
    try {
      setLoading(true);
      const { blob } = await getTemplateFileBlob(template.id, fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // revoga depois de um tempo pra liberar memória
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
        <MainCard title="Templates">
          <Stack spacing={2}>
            {/* filtros */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <TextField
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                placeholder="Buscar por título ou descrição"
                InputProps={{ startAdornment: <SearchOutlined style={{ marginRight: 8, opacity: .6 }} /> as any }}
                sx={{ minWidth: 320 }}
              />
              <Autocomplete
                options={categories}
                loading={catLoading}
                getOptionLabel={(o) => o.name}
                value={categories.find(c => c.id === categoryFilter) || null}
                onChange={(_, v) => { setPage(1); setCategoryFilter(v?.id ?? null); }}
                sx={{ minWidth: 280 }}
                renderInput={(params) => <TextField {...params} label="Categoria" placeholder="Todas" />}
              />
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<PlusOutlined />} variant="contained" onClick={openCreate}>
                Novo Template
              </Button>
              <Button startIcon={<ReloadOutlined />} onClick={loadRows}>
                Atualizar
              </Button>
            </Stack>

            {/* tabela */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Título</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Criado</TableCell>
                    <TableCell align="center">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} align="center"><CircularProgress size={22} /></TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">Nenhum template encontrado</Typography></TableCell></TableRow>
                  ) : rows.map((t) => {
                    const catName = (t as any).categoryId ? catById.get((t as any).categoryId)?.name : undefined;
                    return (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Stack spacing={0.25}>
                            <Typography variant="body2" fontWeight={600} noWrap title={t.title}>{t.title}</Typography>
                            {t.description && (
                              <Typography 
                                variant="caption" 
                                color="text.secondary" 
                                noWrap 
                                title={t.description}
                                sx={{ 
                                  maxWidth: 200,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {t.description}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{catName ? <Chip size="small" label={catName} /> : <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{new Date(t.createdAt || '').toLocaleString()}</Typography></TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            {(t as any).fileId && (
                              <IconButton 
                                size="small" 
                                color="info" 
                                onClick={() => viewTemplate(t)}
                                title="Visualizar PDF"
                              >
                                <EyeOutlined />
                              </IconButton>
                            )}
                            <IconButton size="small" color="primary" onClick={() => openEdit(t)}><EditOutlined /></IconButton>
                            <IconButton size="small" color="error" onClick={() => askDelete(t)}><DeleteOutlined /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* paginação simples (opcional: trocar por seu componente de paginação) */}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
              <Typography variant="caption" color="text.secondary">
                {total} itens • pág. {page}
              </Typography>
              <Button size="small" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
              <Button size="small" disabled={rows.length < limit} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </Stack>
          </Stack>
        </MainCard>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Título *" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required fullWidth />
            <TextField label="Descrição" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} fullWidth multiline minRows={2} />
            <Autocomplete
              options={categories}
              loading={catLoading}
              getOptionLabel={(o) => o.name}
              value={categories.find(c => c.id === formCategoryId) || null}
              onChange={(_, v) => setFormCategoryId(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Categoria" placeholder="Opcional" />}
            />
            {!editing && (
              <Button component="label" variant="outlined">
                {formFile ? formFile.name : 'Selecionar PDF'}
                <input type="file" accept="application/pdf" hidden onChange={(e) => setFormFile(e.target.files?.[0] || null)} />
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || (!editing && (!formTitle.trim() || !formFile))}>
            {submitting ? <CircularProgress size={18} /> : (editing ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
        
        {/* LoadingTicker para criação de templates */}
        {(submitting || showTicker) && !editing && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <LoadingTicker
              running={submitting || showTicker}
              size="small"
              showSpinner={true}
              spinnerSize={16}
              script={[
                'Preparando upload...',
                'Validando arquivo PDF...',
                'Processando template...',
                'Extraindo conteúdo...',
                'Gerando metadados...',
                'Salvando no sistema...',
                'Quase pronto...'
              ]}
            />
          </Box>
        )}
      </Dialog>

      {/* Confirmar exclusão */}
      <ConfirmDeleteDialog
        open={delOpen}
        onCancel={() => setDelOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Template"
        description={`Tem certeza que deseja excluir o template "${toDelete?.title}"? Esta ação não pode ser desfeita.`}
      />
    </Stack>
  );
}