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
// MIME oficial de DOCX
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
import { openSnackbar } from 'api/snackbar';

import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, getTemplateDocxBlob,
  type AiTemplate, type AiTemplateListResponse
} from 'api/aiDocs';
import { listCategories, type AiCategory } from 'api/aiCategories';
import { listSubCategories, type AiSubCategory } from 'api/aiSubCategories';
import { listDepartments, type Department } from 'api/departments';

export default function TemplatesPage() {
  // listagem
  const [rows, setRows] = useState<AiTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [subCategoryFilter, setSubCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // departamentos
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  
  // categorias
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // subcategorias
  const [subCategories, setSubCategories] = useState<AiSubCategory[]>([]);
  const [scLoading, setScLoading] = useState(false);

  // dialog criar/editar
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AiTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState<string | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
  const [formSubCategoryId, setFormSubCategoryId] = useState<string | null>(null);
  const [formCategories, setFormCategories] = useState<AiCategory[]>([]);
  const [formSubCategories, setFormSubCategories] = useState<AiSubCategory[]>([]);
  const [formCatLoading, setFormCatLoading] = useState(false);
  const [formScLoading, setFormScLoading] = useState(false);
  const [formFile, setFormFile] = useState<File | null>(null); // só no criar
  const [submitting, setSubmitting] = useState(false);
  const [showTicker, setShowTicker] = useState(false);

  // Aceita .docx por extensão ou MIME (alguns browsers não preenchem type)
  const isDocx = (f: File | null) =>
    !!f && (f.name.toLowerCase().endsWith('.docx') || f.type === DOCX_MIME);

  // delete
  const [delOpen, setDelOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiTemplate | null>(null);

  async function loadDepartments() {
    try {
      setDeptLoading(true);
      const r = await listDepartments({ page: 1, limit: 100 });
      setDepartments(r.data);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar departamentos', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setDeptLoading(false);
    }
  }

  async function loadCategories() {
    try {
      setCatLoading(true);
      const r = await listCategories({ page: 1, limit: 100 });
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
        categoryId: !subCategoryFilter ? (categoryFilter || undefined) : undefined, // só usa categoryId se não há subcat
        subCategoryId: subCategoryFilter || undefined,
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

  // carregar subcats quando a categoria do filtro mudar
  useEffect(() => {
    (async () => {
      setSubCategoryFilter(null);
      try {
        setScLoading(true);
        const r = await listSubCategories({
          ...(categoryFilter ? { categoryId: categoryFilter } : {}),
          page: 1,
          limit: 500
        });
        setSubCategories(r.data);
      } finally {
        setScLoading(false);
      }
    })();
  }, [categoryFilter]);

  useEffect(() => { loadDepartments(); loadCategories(); }, []);
  useEffect(() => { loadRows(); /* eslint-disable-next-line */ }, [search, categoryFilter, subCategoryFilter, page, limit]);

  // carregar categorias do form quando departamento mudar
  useEffect(() => {
    (async () => {
      setFormCategoryId(null);
      setFormSubCategoryId(null);
      if (!formDepartmentId) { setFormCategories([]); setFormSubCategories([]); return; }
      try {
        setFormCatLoading(true);
        const r = await listCategories({ page: 1, limit: 100 });
        // filtrar categorias pelo departamento
        const filteredCategories = r.data.filter(cat => cat.departmentId === formDepartmentId);
        setFormCategories(filteredCategories);
      } finally {
        setFormCatLoading(false);
      }
    })();
  }, [formDepartmentId]);

  // carregar subcats do form quando categoria mudar
  useEffect(() => {
    (async () => {
      setFormSubCategoryId(null);
      if (!formCategoryId) { setFormSubCategories([]); return; }
      try {
        setFormScLoading(true);
        const r = await listSubCategories({ categoryId: formCategoryId, page: 1, limit: 500 });
        setFormSubCategories(r.data);
      } finally {
        setFormScLoading(false);
      }
    })();
  }, [formCategoryId]);

  // abrir/fechar dialog
  function openCreate() {
    setEditing(null);
    setFormTitle('');
    setFormDescription('');
    setFormDepartmentId(null);
    setFormCategoryId(null);
    setFormSubCategoryId(null);
    setFormCategories([]);
    setFormSubCategories([]);
    setFormFile(null);
    setDialogOpen(true);
  }
  function openEdit(t: AiTemplate) {
    setEditing(t);
    setFormTitle(t.title);
    setFormDescription(t.description || '');
    const scId = (t as any).subCategoryId ?? null;
    setFormSubCategoryId(scId);
    
    // carregar hierarquia completa a partir da subcategoria
    if (scId) {
      (async () => {
        const found = subCategories.find(s => s.id === scId);
        if (found) {
          const catId = found.categoryId;
          setFormCategoryId(catId);
          
          // encontrar categoria para obter departmentId
          const category = categories.find(c => c.id === catId);
          if (category?.departmentId) {
            setFormDepartmentId(category.departmentId);
            
            // carregar categorias do departamento
            try {
              setFormCatLoading(true);
              const r = await listCategories({ page: 1, limit: 100 });
              const filteredCategories = r.data.filter(cat => cat.departmentId === category.departmentId);
              setFormCategories(filteredCategories);
            } finally {
              setFormCatLoading(false);
            }
          }
          
          // carregar subcategorias da categoria
          try {
            setFormScLoading(true);
            const r = await listSubCategories({ categoryId: catId, page: 1, limit: 500 });
            setFormSubCategories(r.data);
          } finally {
            setFormScLoading(false);
          }
        }
      })();
    } else {
      setFormDepartmentId(null);
      setFormCategoryId(null);
      setFormCategories([]);
      setFormSubCategories([]);
    }
    setFormFile(null);
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); }

  // submit criar/editar
  async function handleSubmit() {
    // validações
    if (!editing && !formFile) {
      openSnackbar({ open: true, message: 'Selecione um arquivo .docx', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    if (!formTitle.trim()) {
      openSnackbar({ open: true, message: 'Título é obrigatório', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    if (!formDepartmentId) {
      openSnackbar({ open: true, message: 'Selecione um departamento', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    if (!editing && !isDocx(formFile)) {
      openSnackbar({
        open: true,
        message: 'Selecione um arquivo .docx para criar o template.',
        variant: 'alert', alert: { color: 'warning' }
      } as any);
      return;
    }

    try {
      setSubmitting(true);
      if (editing) {
        const updated = await updateTemplate(editing.id, {
          title: formTitle,
          description: formDescription || null,
          subCategoryId: formSubCategoryId ?? null,
          // se não vier subcat mas vier categoria, o backend joga em "Geral"
          categoryId: !formSubCategoryId ? (formCategoryId ?? null) : undefined
        });
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
        openSnackbar({ open: true, message: 'Template atualizado.', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        setShowTicker(true);
        await createTemplate({
          file: formFile!,
          title: formTitle.trim(),
          description: formDescription || undefined,
          subCategoryId: formSubCategoryId ?? null,
          categoryId: !formSubCategoryId ? (formCategoryId ?? null) : undefined
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
      // O LoadingTicker vai controlar o tempo mínimo internamente
      setShowTicker(false);
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
      const { blob } = await getTemplateDocxBlob(template.id, fileId);
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
                sx={{ minWidth: 220 }}
                renderInput={(params) => <TextField {...params} label="Categoria" placeholder="Todas" />}
              />

              <Autocomplete
                options={subCategories}
                loading={scLoading}
                getOptionLabel={(o) => o.name}
                value={subCategories.find(sc => sc.id === subCategoryFilter) || null}
                onChange={(_, v) => { setPage(1); setSubCategoryFilter(v?.id ?? null); }}
                sx={{ minWidth: 220 }}
                renderInput={(params) => <TextField {...params} label="Subcategoria" placeholder={categoryFilter ? 'Todas' : 'Selecione uma categoria'} />}
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
                    const subCatId = (t as any).subCategoryId as string | undefined;
                    const sc = subCategories.find(s => s.id === subCatId);
                    const catName = sc?.categoryId ? catById.get(sc.categoryId)?.name : undefined;

                    const subCatName = sc?.name;
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
                        <TableCell>
                          {catName ? <Chip size="small" label={catName} /> : <Typography variant="caption" color="text.secondary">—</Typography>}
                          {subCatName && <Chip size="small" label={subCatName} sx={{ ml: .5 }} />}
                        </TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{new Date(t.createdAt || '').toLocaleString()}</Typography></TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            {(t as any).fileId && (
                              <IconButton 
                                size="small" 
                                color="info" 
                                onClick={() => viewTemplate(t)}
                                title="Baixar DOCX"
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
              options={departments}
              loading={deptLoading}
              getOptionLabel={(o) => o.name}
              value={departments.find(d => d.id === formDepartmentId) || null}
              onChange={(_, v) => setFormDepartmentId(v?.id ?? null)}
              renderInput={(params) => <TextField {...params} label="Departamento *" placeholder="Selecione um departamento" required />}
            />
            <Autocomplete
              options={formCategories}
              loading={formCatLoading}
              getOptionLabel={(o) => o.name}
              value={formCategories.find(c => c.id === formCategoryId) || null}
              onChange={(_, v) => setFormCategoryId(v?.id ?? null)}
              disabled={!formDepartmentId}
              renderInput={(params) => <TextField {...params} label="Categoria" placeholder={formDepartmentId ? 'Opcional' : 'Selecione um departamento'} />}
            />
            <Autocomplete
              options={formSubCategories}
              loading={formScLoading}
              getOptionLabel={(o) => o.name}
              value={formSubCategories.find(sc => sc.id === formSubCategoryId) || null}
              onChange={(_, v) => setFormSubCategoryId(v?.id ?? null)}
              disabled={!formCategoryId}
              renderInput={(params) => <TextField {...params} label="Subcategoria" placeholder={formCategoryId ? 'Opcional' : 'Selecione uma categoria'} />}
            />
            {!editing && (
              <Button component="label" variant="outlined">
                {formFile ? formFile.name : 'Selecionar modelo (.docx)'}
                <input
                  type="file"
                  hidden
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && !isDocx(f)) {
                      openSnackbar({
                        open: true,
                        message: 'Envie um arquivo .docx (Word).',
                        variant: 'alert',
                        alert: { color: 'warning' }
                      } as any);
                      e.currentTarget.value = '';
                      setFormFile(null);
                      return;
                    }
                    setFormFile(f);
                  }}
                />
              </Button>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting || !formTitle.trim() || !formDepartmentId || (!editing && !formFile)}>
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
              minDuration={13000} // 13 segundos mínimo para templates
              script={[
                'Preparando upload...',
                'Validando arquivo DOCX...',
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