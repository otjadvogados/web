// src/pages/ai-docs/CreateCaseStep1.tsx
import { useEffect, useMemo, useState } from 'react';
import { 
  Box, 
  Stack, 
  Typography, 
  TextField, 
  CircularProgress, 
  Button, 
  Chip, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  Drawer, 
  Skeleton, 
  Divider,
  IconButton
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useNavigate } from 'react-router-dom';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';

import { listDepartments, type Department } from 'api/departments';
import { listCategories, type AiCategory } from 'api/aiCategories';
import { listSubCategories, type AiSubCategory } from 'api/aiSubCategories';
import {
  listTemplates,
  getTemplateDocxBlob,
  createCase,
  uploadCaseDocs,
  type AiTemplate
} from 'api/aiDocs';

import {
  EyeOutlined,
  ArrowRightOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  CloseOutlined
} from '@ant-design/icons';

type TemplateOption = {
  id: string;
  title: string;
  kind: string;
  description?: string | null;
  fileId?: string | null;
  updatedAt?: string;
  categoryName: string;
  subCategoryName: string;
};

const steps = ['Departamento', 'Categoria', 'Subcategoria', 'Template'];

export default function CreateCaseStep1() {
  const navigate = useNavigate();

  // ===== filtros em cascata
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [subCategories, setSubCategories] = useState<AiSubCategory[]>([]);

  const [deptId, setDeptId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);

  const [deptLoading, setDeptLoading] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [scLoading, setScLoading] = useState(false);

  // ===== templates
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSearch, setTplSearch] = useState('');
  const [templates, setTemplates] = useState<AiTemplate[]>([]);
  const [selected, setSelected] = useState<TemplateOption | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ===== detalhes e anexos
  const [pedidoText, setPedidoText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  // ===== debounce para busca
  const debouncedTplSearch = useDebounced(tplSearch, 350);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const scById = useMemo(() => new Map(subCategories.map((s) => [s.id, s])), [subCategories]);

  // ===== persistir progresso no sessionStorage
  useEffect(() => {
    const snapshot = { deptId, categoryId, subCategoryId, tplSearch, pedidoText };
    sessionStorage.setItem('createCaseProgress', JSON.stringify(snapshot));
  }, [deptId, categoryId, subCategoryId, tplSearch, pedidoText]);

  // ===== restaurar progresso do sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('createCaseProgress');
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      setDeptId(s.deptId ?? null);
      setCategoryId(s.categoryId ?? null);
      setSubCategoryId(s.subCategoryId ?? null);
      setTplSearch(s.tplSearch ?? '');
      setPedidoText(s.pedidoText ?? '');
    } catch {}
  }, []);

  // ===== carregamentos iniciais
  useEffect(() => {
    (async () => {
      try {
        setDeptLoading(true);
        const r = await listDepartments({ page: 1, limit: 100 });
        setDepartments(r.data || []);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar departamentos', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setDeptLoading(false);
      }
    })();
  }, []);

  // quando departamento muda, recarrega categorias e limpa níveis abaixo
  useEffect(() => {
    (async () => {
      setCategoryId(null);
      setSubCategoryId(null);
      setSelected(null);
      setTemplates([]);
      if (!deptId) { setCategories([]); setSubCategories([]); return; }
      try {
        setCatLoading(true);
        const r = await listCategories({ page: 1, limit: 100 });
        setCategories((r.data || []).filter((c) => c.departmentId === deptId));
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar categorias', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setCatLoading(false);
      }
    })();
  }, [deptId]);

  // quando categoria muda, recarrega subcategorias e limpa níveis abaixo
  useEffect(() => {
    (async () => {
      setSubCategoryId(null);
      setSelected(null);
      setTemplates([]);
      if (!categoryId) { setSubCategories([]); return; }
      try {
        setScLoading(true);
        const r = await listSubCategories({ categoryId, page: 1, limit: 100 });
        setSubCategories(r.data || []);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar subcategorias', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setScLoading(false);
      }
    })();
  }, [categoryId]);

  // quando subcategoria ou busca muda, carrega templates
  useEffect(() => {
    (async () => {
      setSelected(null);
      setTemplates([]);
      if (!subCategoryId) return; // só libera template após subcategoria
      try {
        setTplLoading(true);
        const r = await listTemplates({
          search: debouncedTplSearch || undefined,
          subCategoryId,
          page: 1,
          limit: 100
        });
        setTemplates(r.data || []);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar templates', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setTplLoading(false);
      }
    })();
  }, [subCategoryId, debouncedTplSearch]);

  const options: TemplateOption[] = useMemo(() => {
    return (templates || []).map((t) => {
      const sc = scById.get((t as any).subCategoryId || '') || null;
      const cat = sc ? catById.get(sc.categoryId) || null : null;
      return {
        id: t.id,
        title: t.title,
        kind: t.kind,
        description: t.description ?? null,
        fileId: (t as any).fileId ?? null,
        updatedAt: t.createdAt,
        categoryName: cat?.name || '—',
        subCategoryName: sc?.name || '—'
      };
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [templates, scById, catById]);

  // ===== calcular step atual
  const currentStep = !deptId ? 0 : !categoryId ? 1 : !subCategoryId ? 2 : 3;

  async function handlePreview() {
    if (!selected?.fileId) return;
    try {
      setPreviewLoading(true);
      const { blob } = await getTemplateDocxBlob(selected.id, selected.fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function createAndGo() {
    if (!selected) {
      openSnackbar({ open: true, message: 'Escolha um template para continuar.', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    if (!pedidoText.trim()) {
      openSnackbar({ open: true, message: 'Descreva o pedido do caso.', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    try {
      setCreating(true);
      const c = await createCase({ type: selected.kind, requestText: pedidoText.trim() });
      if (files.length > 0) await uploadCaseDocs(c.id, files);

      // limpar progresso do sessionStorage ao criar caso
      sessionStorage.removeItem('createCaseProgress');

      const qs = new URLSearchParams();
      qs.set('caseId', c.id);
      qs.set('templateId', selected.id);
      qs.set('kind', selected.kind);
      qs.set('pedido', encodeURIComponent(pedidoText.trim()));
      navigate(`/ai-docs/editor?${qs.toString()}`);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <MainCard title="Criar Caso">
        <Stack spacing={3} alignItems="center">
          {/* Voltar */}
          <Stack direction="row" justifyContent="flex-start" sx={{ width: '100%', maxWidth: 860 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowLeftOutlined />}
              onClick={() => navigate('/ai-docs/cases')}
              sx={{ mb: 1 }}
            >
              Meus Casos
            </Button>
          </Stack>

          {/* Stepper */}
          <Stepper activeStep={currentStep} alternativeLabel sx={{ width: '100%', maxWidth: 860 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 680 }}>
            Siga as etapas acima para criar seu caso. Cada etapa habilita a próxima quando você faz uma seleção.
          </Typography>

          {/* Filtros em cascata */}
          <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 860 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Autocomplete
                  options={departments}
                  loading={deptLoading}
                  getOptionLabel={(o) => o.name}
                  value={departments.find((d) => d.id === deptId) || null}
                  onChange={(_, v) => setDeptId(v?.id ?? null)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Departamento" 
                      placeholder="Selecione" 
                      required 
                    />
                  )}
                  sx={{ minWidth: 240 }}
                />
                <Autocomplete
                  options={categories}
                  loading={catLoading}
                  getOptionLabel={(o) => o.name}
                  value={categories.find((c) => c.id === categoryId) || null}
                  onChange={(_, v) => setCategoryId(v?.id ?? null)}
                  disabled={!deptId}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Categoria" 
                      placeholder={deptId ? 'Selecione' : 'Escolha um departamento'} 
                      required 
                    />
                  )}
                  sx={{ minWidth: 240 }}
                />
                <Autocomplete
                  options={subCategories}
                  loading={scLoading}
                  getOptionLabel={(o) => o.name}
                  value={subCategories.find((s) => s.id === subCategoryId) || null}
                  onChange={(_, v) => setSubCategoryId(v?.id ?? null)}
                  disabled={!categoryId}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Subcategoria" 
                      placeholder={categoryId ? 'Selecione' : 'Escolha uma categoria'} 
                      required 
                    />
                  )}
                  sx={{ minWidth: 240 }}
                />
              </Stack>

              {/* Chips de filtros selecionados com opção de limpar */}
              {(deptId || categoryId || subCategoryId) && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {deptId && (
                    <Chip
                      label={`Departamento: ${departments.find(d => d.id === deptId)?.name}`}
                      onDelete={() => {
                        setDeptId(null);
                        setCategoryId(null);
                        setSubCategoryId(null);
                        setSelected(null);
                        setTemplates([]);
                      }}
                      deleteIcon={<CloseOutlined /> as any}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {categoryId && (
                    <Chip
                      label={`Categoria: ${categories.find(c => c.id === categoryId)?.name}`}
                      onDelete={() => {
                        setCategoryId(null);
                        setSubCategoryId(null);
                        setSelected(null);
                        setTemplates([]);
                      }}
                      deleteIcon={<CloseOutlined /> as any}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {subCategoryId && (
                    <Chip
                      label={`Subcategoria: ${subCategories.find(s => s.id === subCategoryId)?.name}`}
                      onDelete={() => {
                        setSubCategoryId(null);
                        setSelected(null);
                        setTemplates([]);
                      }}
                      deleteIcon={<CloseOutlined /> as any}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>

          {/* Templates em cartões */}
          {subCategoryId && (
            <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 860 }}>
              <Stack spacing={2}>
                <TextField
                  value={tplSearch}
                  onChange={(e) => setTplSearch(e.target.value)}
                  placeholder="Buscar template por título/descrição"
                  InputProps={{ 
                    startAdornment: <SearchOutlined style={{ marginRight: 8, opacity: .6 }} /> as any 
                  }}
                  sx={{ minWidth: 320, flex: 1 }}
                />

                <Box sx={{ 
                  display: 'grid', 
                  gap: 1.5, 
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } 
                }}>
                  {tplLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Paper key={i} variant="outlined" sx={{ p: 1.25 }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="90%" />
                        <Skeleton variant="rectangular" height={28} sx={{ mt: 0.5 }} />
                      </Paper>
                    ))
                  ) : options.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 2 }}>
                      Nenhum template nesta subcategoria.
                    </Typography>
                  ) : (
                    options.map((opt) => (
                      <Paper
                        key={opt.id}
                        variant={selected?.id === opt.id ? 'elevation' : 'outlined'}
                        elevation={selected?.id === opt.id ? 2 : 0}
                        sx={{ 
                          p: 1.25, 
                          cursor: 'pointer', 
                          border: selected?.id === opt.id ? 2 : 1,
                          borderColor: selected?.id === opt.id ? 'primary.main' : 'divider',
                          '&:hover': { 
                            boxShadow: 2,
                            borderColor: 'primary.main'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={() => setSelected(opt)}
                      >
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2" noWrap title={opt.title}>
                            {opt.title}
                          </Typography>
                          {opt.description && (
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: 1.2,
                                maxHeight: '2.4em'
                              }}
                              title={opt.description}
                            >
                              {opt.description}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            <Chip size="small" label={opt.subCategoryName} />
                            <Chip size="small" label={opt.kind} variant="outlined" />
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelected(opt);
                                setPreviewOpen(true); 
                              }}
                              disabled={!opt.fileId}
                            >
                              Pré-visualizar
                            </Button>
                            <Button 
                              size="small" 
                              variant={selected?.id === opt.id ? 'contained' : 'text'}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(opt);
                              }}
                            >
                              {selected?.id === opt.id ? 'Selecionado' : 'Selecionar'}
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    ))
                  )}
                </Box>
              </Stack>
            </Paper>
          )}

          {/* Drawer de preview */}
          <Drawer 
            anchor="right" 
            open={previewOpen} 
            onClose={() => setPreviewOpen(false)} 
            PaperProps={{ sx: { width: 520 } }}
          >
            <Stack spacing={2} sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Pré-visualização</Typography>
                <IconButton onClick={() => setPreviewOpen(false)}>
                  <CloseOutlined />
                </IconButton>
              </Stack>
              
              {selected && (
                <>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selected.title}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={selected.categoryName} color="primary" />
                      <Chip size="small" label={selected.subCategoryName} />
                      <Chip size="small" label={selected.kind} variant="outlined" />
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Descrição
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {selected.description || 'Nenhuma descrição disponível.'}
                    </Typography>
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Arquivo do Template
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clique no botão abaixo para abrir o documento DOCX em uma nova aba
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<EyeOutlined />}
                      disabled={!selected?.fileId || previewLoading}
                      onClick={handlePreview}
                      fullWidth
                      size="large"
                    >
                      {previewLoading ? <CircularProgress size={16} /> : 'Abrir DOCX'}
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </Drawer>

          {/* Detalhes do caso (libera só após template escolhido) */}
          {selected && (
            <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 860 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Template selecionado: {selected.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Agora descreva o pedido e anexe documentos (opcional)
              </Typography>
              
              <TextField
                placeholder="Descreva o pedido (chat) para a IA. Ex.: Foi proferida sentença com trânsito em julgado..."
                multiline 
                minRows={5} 
                fullWidth
                value={pedidoText}
                onChange={(e) => setPedidoText(e.target.value)}
                sx={{ mb: 2 }}
              />

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Button component="label" variant="outlined" startIcon={<PaperClipOutlined /> as any}>
                  Anexos
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    hidden
                    onChange={(e) => {
                      const list = Array.from(e.target.files || []);
                      if (list.length) setFiles((prev) => [...prev, ...list]);
                    }}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  PDFs opcionais que a IA pode usar no rascunho
                </Typography>
              </Stack>

              {!!files.length && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                  {files.map((f, i) => (
                    <Chip
                      key={i}
                      label={f.name}
                      onDelete={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      deleteIcon={<DeleteOutlined /> as any}
                      variant="outlined"
                      sx={{ maxWidth: '100%' }}
                    />
                  ))}
                </Stack>
              )}

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="flex-end">
                <Button
                  variant="contained"
                  endIcon={<ArrowRightOutlined />}
                  onClick={createAndGo}
                  disabled={creating}
                  size="large"
                >
                  {creating ? <CircularProgress size={18} /> : 'Criar caso e continuar'}
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </MainCard>
    </Box>
  );
}