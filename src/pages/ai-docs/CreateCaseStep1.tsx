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

import { listCustomers, type Customer, subjectId, resolveSubjectId } from 'api/customers';
import {
  listTemplates,
  getTemplateDocxBlob,
  createCase,
  uploadCaseDocs,
  type AiTemplate
} from 'api/aiDocs';
import GenerateDraftDialog from 'components/GenerateDraftDialog';

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

const steps = ['Departamento', 'Cliente', 'Peça', 'Tópico', 'Templates'];

export default function CreateCaseStep1() {
  const navigate = useNavigate();

  // ===== filtros em cascata
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AiCategory[]>([]);
  const [subCategories, setSubCategories] = useState<AiSubCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [deptId, setDeptId] = useState<string | null>(null);
  // Mantemos 2 IDs:
  // - subject (company/person) para matching na UI
  // - customerRecordId (Customer.id) para mandar ao backend
  const [customerSubjectId, setCustomerSubjectId] = useState<string | null>(null);
  const [customerRecordId, setCustomerRecordId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null);

  const [deptLoading, setDeptLoading] = useState(false);
  const [custLoading, setCustLoading] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [scLoading, setScLoading] = useState(false);
  // busca de peça (categoria)
  const [categorySearch, setCategorySearch] = useState('');
  const debouncedCategorySearch = useDebounced(categorySearch, 350);

  // ===== templates
  const [tplLoading, setTplLoading] = useState(false);
  const [tplSearch, setTplSearch] = useState('');
  const [templates, setTemplates] = useState<AiTemplate[]>([]);
  const [selected, setSelected] = useState<TemplateOption[]>([]);
  const [previewTpl, setPreviewTpl] = useState<TemplateOption | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ===== detalhes e anexos
  const [pedidoText, setPedidoText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  // ===== debounce para busca
  const debouncedTplSearch = useDebounced(tplSearch, 350);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const scById = useMemo(() => new Map(subCategories.map((s) => [s.id, s])), [subCategories]);

  // ===== persistir progresso no sessionStorage
  useEffect(() => {
    const snapshot = { deptId, customerSubjectId, customerRecordId, categoryId, subCategoryId, tplSearch, pedidoText };
    sessionStorage.setItem('createCaseProgress', JSON.stringify(snapshot));
  }, [deptId, customerSubjectId, customerRecordId, categoryId, subCategoryId, tplSearch, pedidoText]);

  // ===== restaurar progresso do sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem('createCaseProgress');
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      setDeptId(s.deptId ?? null);
      // restaurar ambos
      setCustomerSubjectId(s.customerSubjectId ?? null);
      setCustomerRecordId(s.customerRecordId ?? null);
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

  // estado para busca de clientes
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounced(customerSearch, 350);

  // carregar clientes iniciais
  useEffect(() => {
    (async () => {
      try {
        setCustLoading(true);
        const r = await listCustomers({ page: 1, limit: 50 });
        setCustomers(r.data || []);
      } finally {
        setCustLoading(false);
      }
    })();
  }, []);

  // busca dinâmica de clientes
  useEffect(() => {
    (async () => {
      if (!debouncedCustomerSearch || debouncedCustomerSearch.length < 2) return;
      
      try {
        setCustLoading(true);
        const r = await listCustomers({ 
          q: debouncedCustomerSearch, 
          page: 1, 
          limit: 50 
        });
        setCustomers(r.data || []);
      } catch (e: any) {
        openSnackbar({ 
          open: true, 
          message: e?.response?.data?.message || 'Erro ao buscar clientes', 
          variant: 'alert', 
          alert: { color: 'error' } 
        } as any);
      } finally {
        setCustLoading(false);
      }
    })();
  }, [debouncedCustomerSearch]);

  // quando departamento muda, recarrega peças e limpa níveis abaixo
  useEffect(() => {
    (async () => {
      setCustomerSubjectId(null);
      setCustomerRecordId(null);
      setCategoryId(null);
      setSubCategoryId(null);
      setSelected([]);
      setTemplates([]);
      if (!deptId) { setCategories([]); setSubCategories([]); return; }
    })();
  }, [deptId]);

  // quando cliente/departamento muda, recarrega peças "base" (sem depender do texto digitado)
  useEffect(() => {
    (async () => {
      setCategoryId(null);
      setSubCategoryId(null);
      setSelected([]);
      setTemplates([]);
      if (!deptId) { setCategories([]); setSubCategories([]); return; }
      try {
        setCatLoading(true);
        const r = await listCategories({
          page: 1,
          limit: 100,
          departmentId: deptId!,
          // usar sempre subjectId no filtro para consistência com o resto do app
          customerId: customerSubjectId || undefined
        });
        setCategories(r.data || []);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao carregar peças', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setCatLoading(false);
      }
    })();
  }, [customerSubjectId, deptId]);

  // ao DIGITAR na peça, busca remota (sem limpar seleção/subníveis)
  useEffect(() => {
    (async () => {
      if (!deptId) return;
      const q = (debouncedCategorySearch || '').trim();
      try {
        setCatLoading(true);
        const r = await listCategories({
          page: 1,
          limit: 100,
          departmentId: deptId!,
          // usar sempre subjectId no filtro para consistência com o resto do app
          customerId: customerSubjectId || undefined,
          ...(q.length >= 2 ? { search: q } : {}) // só aplica search com 2+ chars
        });
        setCategories(r.data || []);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || 'Erro ao buscar peças', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setCatLoading(false);
      }
    })();
  }, [debouncedCategorySearch, deptId, customerSubjectId]);

  // quando peça muda, recarrega subcategorias e limpa níveis abaixo
  useEffect(() => {
    (async () => {
      setSubCategoryId(null);
      setSelected([]);
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
      setSelected([]);
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
  const currentStep = !deptId ? 0 : !customerRecordId ? 1 : !categoryId ? 2 : !subCategoryId ? 3 : 4;

  async function handlePreview(t?: TemplateOption) {
    const target = t ?? previewTpl;
    if (!target?.fileId) return;
    try {
      setPreviewLoading(true);
      const { blob } = await getTemplateDocxBlob(target.id, target.fileId);
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
    if (!pedidoText.trim()) {
      openSnackbar({ open: true, message: 'Descreva o pedido do caso.', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    try {
      setCreating(true);
      // tipo do caso: se houver 1+ templates, classificar como 'from_templates'; senão 'free'
      const inferredType = selected.length ? 'from_templates' : 'free';
      const c = await createCase({
        type: inferredType,
        requestText: pedidoText.trim(),
        customerId: customerRecordId ?? null,
        categoryId: categoryId,                    // NEW
        templateIds: selected.map(s => s.id)       // NEW
      });
      if (files.length > 0) await uploadCaseDocs(c.id, files);

      // limpar progresso do sessionStorage ao criar caso
      sessionStorage.removeItem('createCaseProgress');

      // Abrir dialog de geração
      setCreatedCaseId(c.id);
      setGenerateDialogOpen(true);
      
      openSnackbar({ 
        open: true, 
        message: 'Caso criado! Gerando documento...', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
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
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  // 1 col no mobile, 2 no sm, 3 no md, 4 no lg+
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: '1fr 1fr',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)'
                  }
                }}
              >
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
                      size="small"
                    />
                  )}
                  sx={{ width: '100%' }}
                />
                <Autocomplete
                  options={customers}
                  loading={custLoading}
                  getOptionLabel={(o) => o.displayName || o.name || 'Cliente sem nome'}
                  value={customers.find((c) => subjectId(c) === customerSubjectId) || null}
                  onChange={(_, v) => {
                    setCustomerSubjectId(v ? subjectId(v) ?? null : null);
                    setCustomerRecordId(v?.id ?? null);
                  }}
                  onInputChange={(_, value) => setCustomerSearch(value)}
                  disabled={!deptId}
                  noOptionsText={customerSearch.length < 2 ? 'Digite ao menos 2 caracteres para buscar' : 'Nenhum cliente encontrado'}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Cliente" 
                      placeholder={deptId ? 'Digite nome, CPF ou CNPJ...' : 'Escolha um departamento'} 
                      size="small"
                    />
                  )}
                  sx={{ width: '100%' }}
                />
                <Autocomplete
                  options={categories}
                  loading={catLoading}
                  filterOptions={(x) => x} // evita filtro local quando buscamos no servidor
                  getOptionLabel={(o) => o.name}
                  value={categories.find((c) => c.id === categoryId) || null}
                  onChange={(_, v) => setCategoryId(v?.id ?? null)}
                  onInputChange={(_, value) => setCategorySearch(value)}
                  disabled={!deptId}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Peça" 
                      placeholder={deptId ? 'Digite para buscar/selecionar' : 'Escolha um departamento'} 
                      required 
                      size="small"
                    />
                  )}
                  noOptionsText={
                    (categorySearch?.length || 0) < 2
                      ? 'Digite ao menos 2 caracteres para buscar'
                      : 'Nenhuma peça encontrada'
                  }
                  sx={{ width: '100%' }}
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
                      label="Tópico" 
                      placeholder={categoryId ? 'Selecione' : 'Escolha uma peça'} 
                      required 
                      size="small"
                    />
                  )}
                  sx={{ width: '100%' }}
                />
              </Box>

              {/* Chips de filtros selecionados com opção de limpar */}
              {(deptId || customerSubjectId || categoryId || subCategoryId) && (
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {deptId && (
                    <Chip
                      label={`Departamento: ${departments.find(d => d.id === deptId)?.name}`}
                      onDelete={() => {
                        setDeptId(null);
                        setCustomerSubjectId(null);
                        setCustomerRecordId(null);
                        setCategoryId(null);
                        setSubCategoryId(null);
                        setSelected([]);
                        setTemplates([]);
                      }}
                      deleteIcon={<CloseOutlined /> as any}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {customerSubjectId && (() => {
                    const cust = customers.find(c => subjectId(c) === customerSubjectId);
                    const label =
                      cust?.displayName ||
                      cust?.name ||                       // fallback p/ casos que tenham name
                      cust?.company?.legalName ||         // outro fallback útil
                      cust?.person?.fullName || '—';
                    return (
                      <Chip
                        label={`Cliente: ${label}`}
                        onDelete={() => {
                          setCustomerSubjectId(null);
                          setCustomerRecordId(null);
                          setCategoryId(null);
                          setSubCategoryId(null);
                          setSelected([]);
                          setTemplates([]);
                        }}
                        deleteIcon={<CloseOutlined /> as any}
                        color="primary"
                        variant="outlined"
                      />
                    );
                  })()}
                  {categoryId && (
                    <Chip
                      label={`Peça: ${categories.find(c => c.id === categoryId)?.name}`}
                      onDelete={() => {
                        setCategoryId(null);
                        setSubCategoryId(null);
                        setSelected([]);
                        setTemplates([]);
                      }}
                      deleteIcon={<CloseOutlined /> as any}
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {subCategoryId && (
                    <Chip
                      label={`Tópico: ${subCategories.find(s => s.id === subCategoryId)?.name}`}
                      onDelete={() => {
                        setSubCategoryId(null);
                        setSelected([]);
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

          {/* Templates em cartões (multi-seleção) */}
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

                <Typography variant="caption" color="text.secondary">
                  {selected.length ? `${selected.length} template(s) selecionado(s)` : 'Nenhum template selecionado'}
                </Typography>

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
                      Nenhum template neste tópico.
                    </Typography>
                  ) : (
                    options.map((opt) => {
                      const isSel = selected.some(s => s.id === opt.id);
                      return (
                      <Paper
                        key={opt.id}
                        variant={isSel ? 'elevation' : 'outlined'}
                        elevation={isSel ? 2 : 0}
                        sx={{ 
                          p: 1.25, 
                          cursor: 'pointer',
                          border: isSel ? 2 : 1,
                          borderColor: isSel ? 'primary.main' : 'divider',
                          '&:hover': { 
                            boxShadow: 2,
                            borderColor: 'primary.main'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onClick={() => {
                          setSelected(prev => prev.some(p => p.id === opt.id) 
                            ? prev.filter(p => p.id !== opt.id)
                            : [...prev, opt]);
                        }}
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
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setPreviewTpl(opt);
                                setPreviewOpen(true);
                              }}
                              disabled={!opt.fileId}
                            >
                              Pré-visualizar
                            </Button>
                            <Button 
                              size="small" 
                              variant={isSel ? 'contained' : 'text'}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(prev => prev.some(p => p.id === opt.id) 
                                  ? prev.filter(p => p.id !== opt.id)
                                  : [...prev, opt]);
                              }}
                            >
                              {isSel ? 'Remover' : 'Selecionar'}
                            </Button>
                          </Stack>
                        </Stack>
                      </Paper>
                    )})
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
              
              {previewTpl && (
                <>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {previewTpl.title}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip size="small" label={previewTpl.categoryName} color="primary" />
                      <Chip size="small" label={previewTpl.subCategoryName} />
                      <Chip size="small" label={previewTpl.kind} variant="outlined" />
                    </Stack>
                  </Stack>

                  <Divider />

                  <Stack spacing={1}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Descrição
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {previewTpl.description || 'Nenhuma descrição disponível.'}
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
                      disabled={!previewTpl?.fileId || previewLoading}
                      onClick={() => handlePreview()}
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

          {/* Detalhes do caso (libera após escolher a Peça ou o Tópico; templates são opcionais) */}
          {(!!categoryId) && (
            <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 860 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                {selected.length ? `${selected.length} template(s) selecionado(s)` : 'Nenhum template selecionado (opcional)'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Descreva o pedido e anexe documentos (opcional). Você pode prosseguir mesmo sem selecionar templates.
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

      {/* Dialog de geração de rascunho */}
      {createdCaseId && (
        <GenerateDraftDialog
          open={generateDialogOpen}
          onClose={() => setGenerateDialogOpen(false)}
          caseId={createdCaseId}
          templateIds={selected.map(s => s.id)}
          categoryId={categoryId}
          onDone={(draft) => {
            setGenerateDialogOpen(false);
            // Redirecionar para o playground com o draft gerado
            navigate(`/ai-docs/a4-playground/${draft.id}`);
          }}
        />
      )}
    </Box>
  );
}