import { useEffect, useState, useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import Button from '@mui/material/Button';
import { listTopicSpecifics, AiTopicSpecific, getTopicSpecific } from 'api/aiTopicSpecifics';
import { openSnackbar } from 'api/snackbar';
import { useCaseWizard } from '../CaseWizardContext';
import Tooltip from 'components/@extended/Tooltip';

export default function StepSpecs() {
  const { topics, specs, setSpecs, specDetails, setSpecDetails, downloadSpecDocx } = useCaseWizard();
  const [loading, setLoading] = useState(false);
  // lista completa de tópicos específicos dos tópicos selecionados
  const [allOpts, setAllOpts] = useState<AiTopicSpecific[]>([]);
  // --- drag & drop state (lista "selecionados") ---
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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
    const next = specs.filter((s) => {
      const current = byId.get(s.id);
      // se não encontramos o item na lista carregada, não conseguimos afirmar — mantém
      if (!current) return true;
      return !!current.docxFileId;
    });
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
    // Só permite selecionar tópicos específicos com DOCX
    const allowed = selectedForTopic.filter((s) => !!s.docxFileId);
    setSpecs([...others, ...allowed]);
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

  return (
    <Stack spacing={0.5}>
      <Typography fontWeight={700}>5. Tópicos Específicos</Typography>
      {!topics.length && (
        <Typography variant="body2" color="text.secondary">
          Selecione ao menos 1 tópico na etapa anterior.
        </Typography>
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
    </Stack>
  );
}
