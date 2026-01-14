import { useEffect, useState, useMemo, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
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
import { listTopicSpecifics, AiTopicSpecific, getTopicSpecific } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import { useCaseWizard } from '../CaseWizardContext';
import Tooltip from 'components/@extended/Tooltip';
import { useNavigate } from 'react-router-dom';

export default function StepSpecs() {
  const { topics, specs, setSpecs, specDetails, setSpecDetails, downloadSpecDocx, saveWizardState, step } = useCaseWizard();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // lista completa de tópicos específicos dos tópicos selecionados
  const [allOpts, setAllOpts] = useState<AiTopicSpecific[]>([]);
  // --- drag & drop state (lista "selecionados") ---
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const hasShownDialogRef = useRef(false);

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

  // options filtradas por tópico + busca local
  const optionsByTopic = useMemo(() => {
    const base: Record<string, AiTopicSpecific[]> = {};
    for (const t of topics) {
      base[t.id] = allOpts.filter((o) => o.topicId === t.id);
    }
    return base;
  }, [allOpts, topics]);

  // helper: atualiza seleção global a partir da seleção daquele tópico
  const handleChangeForTopic = (topicId: string, selectedForTopic: AiTopicSpecific[]) => {
    const others = specs.filter((s) => s.topicId !== topicId);
    // Detecta quais tópicos específicos tentaram ser selecionados mas não têm DOCX
    const withoutDocx = selectedForTopic.filter((s) => !s.docxFileId);
    
    // Se tentou selecionar algum sem DOCX, exibe alerta
    if (withoutDocx.length > 0) {
      const names = withoutDocx.map(s => s.name).join(', ');
      openSnackbar({
        open: true,
        message: `Não é possível selecionar tópicos específicos sem arquivo DOCX. Tópicos: ${names}. Faça upload do arquivo primeiro.`,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
    
    // Só permite selecionar tópicos específicos com DOCX
    const allowed = selectedForTopic.filter((s) => !!s.docxFileId);
    setSpecs([...others, ...allowed]);
  };

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

  // Remove um tópico específico da seleção
  const removeSpec = (specId: string) => {
    setSpecs(specs.filter(s => s.id !== specId));
  };

  // --- DnD handlers para a lista de selecionados (abaixo) ---
  const onDragStart = (idx: number) => () => setDragIndex(idx);
  const onDragOver = (e: React.DragEvent) => {
    // necessário para permitir o drop
    e.preventDefault();
  };
  const onDrop = (toIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === toIdx) { setDragIndex(null); return; }
    const next = specs.slice();
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIdx, 0, moved);
    setSpecs(next);
    setDragIndex(null);
  };
  const onDragEnd = () => setDragIndex(null);

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

      {/* Um campo de seleção/busca para CADA tópico selecionado */}
      {topics.map((topic) => {
        const topicId = topic.id;
        const valueForTopic = specs.filter((s) => s.topicId === topicId);
        const opts = optionsByTopic[topicId] || [];

        return (
          <Stack key={topicId} spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">{topic.name}</Typography>
            <Autocomplete<AiTopicSpecific, true, false, false>
              multiple
              options={opts}
              loading={loading}
              value={valueForTopic}
              onChange={(_, v) => handleChangeForTopic(topicId, v)}
              getOptionLabel={(o) => o?.name ?? ''}
              getOptionDisabled={(option) => !option.docxFileId}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={option.id}
                    label={option.name}
                    variant="outlined"
                  />
                ))
              }
              renderOption={(props, option) => {
                const isDisabled = !option.docxFileId;
                return (
                  <Tooltip
                    title={isDisabled ? 'Este tópico específico não possui DOCX (anexo) e não pode ser selecionado' : ''}
                    arrow
                    placement="top"
                  >
                    <li
                      {...props}
                      key={option.id}
                      style={{
                        ...props.style,
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ width: '100%', justifyContent: 'space-between' }}
                      >
                        <Stack sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            title={option.name}
                            sx={{ color: isDisabled ? 'text.disabled' : 'text.primary' }}
                          >
                            {option.name}
                          </Typography>
                          {isDisabled && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.25 }}>
                              Sem DOCX disponível
                            </Typography>
                          )}
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {/* aqui o chip com o nome do tópico é opcional, pois já estamos
                              dentro do bloco daquele tópico – mas mantive por compat */}
                          {option.topic && (
                            <Chip
                              size="small"
                              label={option.topic.name}
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {option.docxFileId && <Chip size="small" label="DOCX" />}
                        </Stack>
                      </Stack>
                    </li>
                  </Tooltip>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={`Pesquisar tópicos específicos de "${topic.name}"…`}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
            />
          </Stack>
        );
      })}
      {!!specs.length && (
        <Stack spacing={0.75} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
            Arraste para ordenar (a ordem será enviada ao criar o caso)
          </Typography>
          {specs.map((s, idx) => {
            const det = specDetails[s.id];
            return (
              <Paper
                key={s.id}
                variant="outlined"
                sx={{
                  p: 1,
                  cursor: 'grab',
                  borderColor: dragIndex === idx ? 'primary.main' : 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
                draggable
                onDragStart={onDragStart(idx)}
                onDragOver={onDragOver}
                onDrop={onDrop(idx)}
                onDragEnd={onDragEnd}
                title="Arraste para reordenar"
              >
                {/* Grip + posição */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="center"
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 0.75,
                    border: '1px dashed',
                    borderColor: 'divider',
                    fontSize: 12,
                    color: 'text.secondary',
                    flexShrink: 0,
                    userSelect: 'none'
                  }}
                >
                  {idx + 1}
                </Stack>
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={600} variant="body2" noWrap title={s.name}>
                    {s.name}
                  </Typography>
                  {det?.instruction && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {det.instruction}
                    </Typography>
                  )}
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                  {det?.docxFileId ? (
                    <Button size="small" variant="text" startIcon={<DownloadOutlined />} onClick={() => downloadSpecDocx(s.id)}>
                      Baixar DOCX
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">Sem DOCX</Typography>
                  )}
                </Stack>
              </Paper>
            );
          })}
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
              <strong>Atenção:</strong> Se o tópico específico que você procura não estiver na lista, utilize o campo de pesquisa acima para encontrá-lo.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Digite parte do nome do tópico específico no campo de busca para filtrar os resultados disponíveis.
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
