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

export default function StepSpecs() {
  const { topics, specs, setSpecs, specDetails, setSpecDetails, downloadSpecDocx } = useCaseWizard();
  const [loading, setLoading] = useState(false);
  // lista completa de tópicos específicos dos tópicos selecionados
  const [allOpts, setAllOpts] = useState<AiTopicSpecific[]>([]);

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
    setSpecs([...others, ...selectedForTopic]);
  };

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
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <span style={{ flex: 1 }}>{option.name}</span>
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
              )}
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
        <Stack spacing={0.75}>
          {specs.map((s) => {
            const det = specDetails[s.id];
            return (
              <Paper key={s.id} variant="outlined" sx={{ p: 1 }}>
                <Typography fontWeight={600} variant="body2">{s.name}</Typography>
                {det?.instruction && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {det.instruction}
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} alignItems="center">
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
