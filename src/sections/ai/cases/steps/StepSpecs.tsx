import { useEffect, useState, useMemo, useRef } from 'react';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import LinkOutlined from '@ant-design/icons/LinkOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { listTopicSpecifics, AiTopicSpecific, getTopicSpecific } from 'api/aiTopicSpecifics';
import { listPromptFolders, type Prompt } from 'api/prompts';
import { CONTESTATION_CATEGORIES, type ContestationCategoryCode } from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';
import { useCaseWizard } from '../CaseWizardContext';
import { useNavigate } from 'react-router-dom';

export default function StepSpecs() {
  const {
    piece,
    topics,
    specs,
    setSpecs,
    specDetails,
    setSpecDetails,
    downloadSpecDocx,
    saveWizardState,
    step,
    topicSpecificsByCategory,
    setTopicSpecificsByCategory,
    categoryPromptIds,
    setCategoryPromptIds,
    customers,
    dept
  } = useCaseWizard();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  // lista completa de tópicos específicos dos tópicos selecionados
  const [allOpts, setAllOpts] = useState<AiTopicSpecific[]>([]);
  // --- drag & drop state (lista "selecionados") ---
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const hasShownDialogRef = useRef(false);
  /** Prompts da API /ai/prompts (folders) — usamos prompt.id como categoryPromptIds */
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categoryDrag, setCategoryDrag] = useState<{ code: ContestationCategoryCode; index: number } | null>(null);
  /** Zona de drop em hover (código da categoria) para highlight */
  const [dragOverCategory, setDragOverCategory] = useState<ContestationCategoryCode | null>(null);
  /** ID do tópico específico sendo arrastado (do pool) para feedback visual */
  const [draggingSpecId, setDraggingSpecId] = useState<string | null>(null);

  /** Rolagem automática ao arrastar perto do topo/base da janela */
  const scrollZonePx = 100;
  const scrollStepPx = 10;
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScrollDirRef = useRef<number>(0);
  useEffect(() => {
    const isDragging = !!draggingSpecId || !!categoryDrag;
    if (!isDragging) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      lastScrollDirRef.current = 0;
      return;
    }
    const onDocDragOver = (e: DragEvent) => {
      const y = e.clientY;
      const dir = y < scrollZonePx ? -1 : y > window.innerHeight - scrollZonePx ? 1 : 0;
      lastScrollDirRef.current = dir;
      if (dir !== 0 && !scrollIntervalRef.current) {
        scrollIntervalRef.current = setInterval(() => {
          if (lastScrollDirRef.current !== 0) {
            window.scrollBy(0, lastScrollDirRef.current * scrollStepPx);
          }
        }, 50);
      } else if (dir === 0 && scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
    document.addEventListener('dragover', onDocDragOver, { passive: true });
    return () => {
      document.removeEventListener('dragover', onDocDragOver);
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [draggingSpecId, categoryDrag]);

  // Carrega prompts da API de prompts (folders); filtra por cliente/departamento do wizard
  useEffect(() => {
    (async () => {
      try {
        setLoadingPrompts(true);
        const customerId = customers.length > 0 ? customers[0].id : undefined;
        const departmentId = dept?.id;
        const folders = await listPromptFolders();
        const allPrompts: Prompt[] = [];
        folders.forEach((folder) => {
          if (folder.items?.length) allPrompts.push(...folder.items);
        });
        const uniquePrompts = Array.from(new Map(allPrompts.map((p) => [p.id, p])).values());
        const filtered =
          customerId != null
            ? uniquePrompts.filter((p) => !p.customerId || p.customerId === customerId)
            : uniquePrompts.filter((p) => !p.customerId);
        const byDept =
          departmentId != null
            ? filtered.filter((p) => !p.departmentId || p.departmentId === departmentId)
            : filtered;
        setPrompts(byDept);
      } catch (err: any) {
        console.error('Erro ao carregar prompts:', err);
        openSnackbar({
          open: true,
          message: 'Erro ao carregar prompts disponíveis',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        setPrompts([]);
      } finally {
        setLoadingPrompts(false);
      }
    })();
  }, [customers.map((c) => c.id).join('|'), dept?.id]);

  // Sincroniza specs com a ordem do documento (flatten por categoria)
  useEffect(() => {
    if (!topicSpecificsByCategory || !allOpts.length) return;
    const hasAny = Object.values(topicSpecificsByCategory).some((arr) => arr && arr.length > 0);
    if (!hasAny) {
      setSpecs([]);
      return;
    }
    const byId = new Map(allOpts.map((o) => [o.id, o]));
    const ordered: AiTopicSpecific[] = [];
    for (const { code } of CONTESTATION_CATEGORIES) {
      const ids = topicSpecificsByCategory[code] || [];
      for (const id of ids) {
        const spec = byId.get(id);
        if (spec) ordered.push(spec);
      }
    }
    setSpecs(ordered);
  }, [topicSpecificsByCategory, allOpts.map((o) => o.id).join('|')]);

  useEffect(() => {
    if (!topics.length) {
      setAllOpts([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await listTopicSpecifics({
          page: 1,
          // carrega todos os específicos dos tópicos selecionados
          limit: 100,
          topicIds: topics.map((t) => t.id),
          sortBy: 'name',
          sortOrder: 'asc'
        });
        setAllOpts(res.data || []);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar tópicos específicos', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [topics.map(t => t.id).join('|')]);

  useEffect(() => {
    (async () => {
      const map: Record<string, AiTopicSpecific> = {};
      for (const s of specs) {
        try { map[s.id] = await getTopicSpecific(s.id); } catch {}
      }
      setSpecDetails(map);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specs.map(s => s.id).join('|')]);

  // Remove da seleção qualquer tópico específico que esteja sem DOCX (mesma regra da Peça)
  useEffect(() => {
    if (!specs.length || !allOpts.length) return;
    const byId = new Map(allOpts.map((o) => [o.id, o]));
    const toRemove: AiTopicSpecific[] = [];
    const next = specs.filter((s) => {
      const current = byId.get(s.id);
      // se não encontramos o item na lista carregada, não conseguimos afirmar — mantém
      if (!current) return true;
      if (!current.docxFileId) {
        toRemove.push(s);
        return false;
      }
      return true;
    });
    
    // Se detectou specs sem DOCX que foram removidos, exibe alerta
    if (toRemove.length > 0) {
      const names = toRemove.map(s => s.name).join(', ');
      openSnackbar({
        open: true,
        message: `Os seguintes tópicos específicos foram removidos por não possuírem arquivo DOCX: ${names}. Faça upload do arquivo antes de selecioná-los novamente.`,
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
    }
    
    if (next.length !== specs.length) {
      setSpecs(next);
    }
  }, [allOpts.map(o => `${o.id}:${o.docxFileId ? 1 : 0}`).join('|'), specs.map(s => s.id).join('|'), setSpecs]);

  // Identifica tópicos específicos selecionados que não têm DOCX
  // Verifica tanto specDetails (dados atualizados) quanto allOpts (lista carregada)
  const specsWithoutDocx = useMemo(() => {
    const byId = new Map(allOpts.map((o) => [o.id, o]));
    return specs.filter(s => {
      // Prioriza dados de allOpts (mais atualizado), depois specDetails
      const fromOpts = byId.get(s.id);
      if (fromOpts !== undefined) {
        return !fromOpts.docxFileId;
      }
      const detail = specDetails[s.id];
      return !detail?.docxFileId;
    });
  }, [specs, specDetails, allOpts]);

  // Remove um tópico específico de todas as categorias (usado no alerta de specs sem DOCX)
  const removeSpec = (specId: string) => {
    setTopicSpecificsByCategory((prev) => {
      const next = { ...prev };
      for (const { code } of CONTESTATION_CATEGORIES) {
        if (next[code]) next[code] = next[code]!.filter((id) => id !== specId);
      }
      return next;
    });
  };

  // --- IDs já em alguma categoria (para pool disponível) ---
  const idsInCategories = useMemo(() => {
    const set = new Set<string>();
    Object.values(topicSpecificsByCategory || {}).forEach((arr) => arr?.forEach((id) => set.add(id)));
    return set;
  }, [topicSpecificsByCategory]);

  const availableForCategories = useMemo(
    () => allOpts.filter((o) => o.docxFileId && !idsInCategories.has(o.id)),
    [allOpts, idsInCategories]
  );

  /** Tópicos disponíveis agrupados por tópico (para exibir por peça > tópico) */
  const availableByTopic = useMemo(() => {
    const map: Record<string, AiTopicSpecific[]> = {};
    for (const s of availableForCategories) {
      const tid = s.topicId || '';
      if (!map[tid]) map[tid] = [];
      map[tid].push(s);
    }
    return map;
  }, [availableForCategories]);

  const addToCategory = (code: ContestationCategoryCode, specId: string) => {
    const byId = new Map(allOpts.map((o) => [o.id, o]));
    const spec = byId.get(specId);
    if (!spec?.docxFileId) return;
    setTopicSpecificsByCategory((prev) => {
      const next = { ...prev };
      // Remove de outras categorias (um spec só em uma categoria)
      for (const k of Object.keys(next) as ContestationCategoryCode[]) {
        if (next[k]) next[k] = next[k]!.filter((id) => id !== specId);
      }
      next[code] = [...(next[code] || []), specId];
      return next;
    });
  };

  const removeFromCategory = (code: ContestationCategoryCode, specId: string) => {
    setTopicSpecificsByCategory((prev) => {
      const next = { ...prev };
      if (next[code]) next[code] = next[code]!.filter((id) => id !== specId);
      return next;
    });
  };

  const reorderInCategory = (code: ContestationCategoryCode, fromIdx: number, toIdx: number) => {
    setTopicSpecificsByCategory((prev) => {
      const arr = [...(prev[code] || [])];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...prev, [code]: arr };
    });
  };

  const setCategoryPrompt = (code: ContestationCategoryCode, promptId: string) => {
    setCategoryPromptIds((prev) => {
      const next = { ...prev };
      if (promptId) next[code] = promptId;
      else delete next[code];
      return next;
    });
  };

  const handleDragOverCategory = (e: React.DragEvent, code: ContestationCategoryCode) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('text/plain')) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverCategory(code);
    }
  };

  const handleDragLeaveCategory = (e: React.DragEvent, code: ContestationCategoryCode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory((prev) => (prev === code ? null : prev));
  };

  const handleDropOnCategory = (e: React.DragEvent, code: ContestationCategoryCode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategory(null);
    setDraggingSpecId(null);
    const specId = e.dataTransfer.getData('text/plain');
    if (specId) addToCategory(code, specId);
  };

  const handlePoolDragStart = (e: React.DragEvent, specId: string) => {
    e.dataTransfer.setData('text/plain', specId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSpecId(specId);
  };

  const handlePoolDragEnd = () => {
    setDraggingSpecId(null);
  };

  // Detecta tópicos específicos disponíveis sem DOCX (de todos os tópicos selecionados)
  const availableSpecsWithoutDocx = useMemo(() => {
    return allOpts.filter(s => !s.docxFileId);
  }, [allOpts]);

  // Mostra o dialog informativo quando entra na etapa de tópicos específicos (step 4)
  useEffect(() => {
    // step 4 = Tópicos específicos (baseado no array steps no create.tsx)
    if (step === 4 && !hasShownDialogRef.current) {
      // Pequeno delay para garantir que o componente está renderizado
      const timer = setTimeout(() => {
        setShowInfoDialog(true);
        hasShownDialogRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    } else if (step !== 4) {
      // Quando sai da etapa, reseta para permitir mostrar novamente se voltar
      hasShownDialogRef.current = false;
    }
  }, [step]);

  const handleCloseInfoDialog = () => {
    setShowInfoDialog(false);
  };

  return (
    <Stack spacing={1.5}>
      <Typography fontWeight={700}>5. Tópicos Específicos</Typography>
      {!topics.length && (
        <Typography variant="body2" color="text.secondary">
          Selecione ao menos 1 tópico na etapa anterior.
        </Typography>
      )}

      {/* Alerta quando há tópicos específicos disponíveis sem arquivo DOCX */}
      {topics.length > 0 && availableSpecsWithoutDocx.length > 0 && (
        <Alert 
          severity="warning" 
          icon={<WarningOutlined />}
          sx={{ mt: 1 }}
        >
          <AlertTitle>Atenção: Tópicos Específicos sem arquivo DOCX</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Existem {availableSpecsWithoutDocx.length} tópico(s) específico(s) disponível(is) sem arquivo DOCX e não poderão ser selecionados:
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            {availableSpecsWithoutDocx.slice(0, 5).map(s => (
              <Box
                key={s.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 0.75,
                  bgcolor: 'warning.lighter',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'warning.main'
                }}
              >
                <Typography variant="body2">
                  <strong>{s.name}</strong>
                  {s.topic && (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      (tópico: {s.topic.name})
                    </Typography>
                  )}
                </Typography>
              </Box>
            ))}
            {availableSpecsWithoutDocx.length > 5 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                ... e mais {availableSpecsWithoutDocx.length - 5} tópico(s) específico(s)
              </Typography>
            )}
          </Stack>
          <Typography variant="body2">
            <strong>Para selecionar estes tópicos:</strong> Acesse a página de Tópicos Específicos e faça upload do arquivo DOCX para cada um deles.
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LinkOutlined />}
            onClick={() => {
              // Salva o estado completo do wizard antes de navegar
              saveWizardState();
              navigate('/ai/topic-specifics');
            }}
            sx={{ alignSelf: 'flex-start', mt: 1 }}
          >
            Ir para Tópicos Específicos
          </Button>
        </Alert>
      )}

      {/* Alerta quando há tópicos específicos selecionados sem arquivo DOCX */}
      {specsWithoutDocx.length > 0 && (
        <Alert 
          severity="error" 
          icon={<WarningOutlined />}
          sx={{ mt: 1 }}
        >
          <AlertTitle>Não é possível continuar sem arquivo DOCX</AlertTitle>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Os seguintes tópicos específicos não possuem arquivo DOCX e precisam ser corrigidos antes de continuar:
          </Typography>
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            {specsWithoutDocx.map(s => (
              <Box
                key={s.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  bgcolor: 'error.lighter',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'error.main'
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {s.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => removeSpec(s.id)}
                  color="error"
                  title="Remover este tópico específico"
                >
                  <CloseCircleOutlined />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Opções para resolver:</strong>
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2" component="div">
              • <strong>Remover o tópico:</strong> Clique no ícone X ao lado do tópico acima
            </Typography>
            <Typography variant="body2" component="div">
              • <strong>Fazer upload do arquivo:</strong> Acesse a página de Tópicos Específicos para fazer upload do DOCX
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<LinkOutlined />}
              onClick={() => {
                // Salva o estado completo do wizard antes de navegar
                saveWizardState();
                navigate('/ai/topic-specifics');
              }}
              sx={{ alignSelf: 'flex-start', mt: 0.5 }}
            >
              Ir para Tópicos Específicos
            </Button>
          </Stack>
        </Alert>
      )}

      {/* Pool de tópicos disponíveis por peça (e por tópico) + 5 categorias como zonas de drop */}
      {topics.length > 0 && (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Tópicos específicos disponíveis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Arraste um tópico da lista abaixo e solte em uma das categorias. Apenas tópicos com DOCX podem ser usados.
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            {piece && (
              <Typography variant="subtitle2" color="primary" fontWeight={600} sx={{ mb: 1.5 }}>
                Peça: {piece.name}
              </Typography>
            )}
            {availableForCategories.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {idsInCategories.size > 0
                  ? 'Todos os tópicos já foram distribuídos nas categorias.'
                  : 'Selecione tópicos na etapa anterior para ver os tópicos específicos disponíveis.'}
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {topics.map((topic) => {
                  const specsInTopic = availableByTopic[topic.id] || [];
                  if (specsInTopic.length === 0) return null;
                  return (
                    <Stack key={topic.id} spacing={0.75}>
                      <Typography variant="body2" fontWeight={600} color="text.secondary">
                        Tópico: {topic.name}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                        {specsInTopic.map((s) => (
                          <Paper
                            key={s.id}
                            variant="outlined"
                            sx={{
                              px: 1.25,
                              py: 0.75,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              cursor: 'grab',
                              opacity: draggingSpecId === s.id ? 0.6 : 1,
                              borderColor: draggingSpecId === s.id ? 'primary.main' : 'divider'
                            }}
                            draggable
                            onDragStart={(e) => handlePoolDragStart(e, s.id)}
                            onDragEnd={handlePoolDragEnd}
                            title="Arraste para uma categoria abaixo"
                          >
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {s.name}
                            </Typography>
                          </Paper>
                        ))}
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1 }}>
            Categorias da contestação
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Arraste os tópicos da lista acima para cada categoria. A ordem no documento é: Preliminares → Contrato → Mérito → Impugnação aos Documentos → Pedidos Finais.
          </Typography>
          <Stack spacing={2}>
            {CONTESTATION_CATEGORIES.map(({ code, label }) => {
              const idsInThis = topicSpecificsByCategory?.[code] || [];
              const specsInThis = idsInThis
                .map((id) => allOpts.find((o) => o.id === id))
                .filter(Boolean) as AiTopicSpecific[];
              const isDragOver = dragOverCategory === code;
              return (
                <Paper
                  key={code}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    transition: 'border-color 0.2s, background-color 0.2s',
                    ...(isDragOver ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.hover' } : {})
                  }}
                  onDragOver={(e) => handleDragOverCategory(e, code)}
                  onDragLeave={(e) => handleDragLeaveCategory(e, code)}
                  onDrop={(e) => handleDropOnCategory(e, code)}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
                    <Typography fontWeight={700} variant="body2">
                      {label}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 200 }} disabled={loadingPrompts}>
                      <InputLabel id={`prompt-label-${code}`} shrink>
                        Prompt da categoria
                      </InputLabel>
                      <Select
                        labelId={`prompt-label-${code}`}
                        value={categoryPromptIds?.[code] || ''}
                        label="Prompt da categoria"
                        onChange={(e) => setCategoryPrompt(code, e.target.value as string)}
                        displayEmpty
                        renderValue={(v) =>
                          loadingPrompts && !v
                            ? 'Carregando…'
                            : v
                              ? prompts.find((p) => p.id === v)?.name ?? v
                              : 'Nenhum'
                        }
                      >
                        <MenuItem value="">Nenhum</MenuItem>
                        {prompts.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragOver ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      py: 2,
                      px: 2,
                      textAlign: 'center',
                      bgcolor: isDragOver ? 'action.hover' : 'grey.50',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      minHeight: 72,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5
                    }}
                  >
                    <UploadOutlined style={{ fontSize: 24, color: isDragOver ? 'var(--mui-palette-primary-main)' : undefined }} />
                    <Typography variant="body2" color={isDragOver ? 'primary.main' : 'text.secondary'} fontWeight={500}>
                      {isDragOver ? 'Solte o tópico aqui' : 'Arraste o tópico específico para esta categoria'}
                    </Typography>
                  </Box>
                  {specsInThis.length > 0 && (
                    <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                      {specsInThis.map((s, idx) => (
                        <Paper
                          key={s.id}
                          variant="outlined"
                          sx={{
                            px: 1,
                            py: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'grab',
                            borderColor: categoryDrag?.code === code && categoryDrag?.index === idx ? 'primary.main' : 'divider'
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', s.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setCategoryDrag({ code, index: idx });
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (categoryDrag?.code === code && categoryDrag?.index !== idx) {
                              reorderInCategory(code, categoryDrag.index, idx);
                            }
                            setCategoryDrag(null);
                          }}
                          onDragEnd={() => setCategoryDrag(null)}
                          title="Arraste para reordenar nesta categoria ou solte em outra categoria"
                        >
                          <Typography variant="body2" noWrap sx={{ flex: 1, maxWidth: 240 }}>
                            {s.name}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => removeFromCategory(code, s.id)}
                            sx={{ p: 0.25 }}
                            title="Remover da categoria"
                          >
                            <CloseCircleOutlined style={{ fontSize: 16 }} />
                          </IconButton>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>
              );
            })}
          </Stack>
        </Stack>
      )}

      {/* Dialog informativo sobre pesquisa de tópicos específicos */}
      <Dialog
        open={showInfoDialog}
        onClose={handleCloseInfoDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <InfoCircleOutlined style={{ color: '#1976d2' }} />
            <Typography variant="h6">Informação sobre Tópicos Específicos</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Categorias da contestação:</strong> Arraste os tópicos específicos da lista &quot;Tópicos específicos disponíveis&quot; para cada categoria (Preliminares, Contrato, Mérito, Impugnação aos Documentos, Pedidos Finais). Você também pode arrastar um tópico que já está em uma categoria e soltar em outra para movê-lo.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              A ordem dentro de cada categoria será a ordem no documento. Apenas tópicos com arquivo DOCX aparecem na lista. Para adicionar DOCX a um tópico, acesse a página de Tópicos Específicos.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoDialog} variant="contained" color="primary">
            Entendi
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
