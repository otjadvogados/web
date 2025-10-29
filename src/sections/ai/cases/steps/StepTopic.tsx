import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { listTopics, AiTopic, getTopic } from 'api/aiTopics';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

export default function StepTopic() {
  const { piece, topic, setTopic, setTopicDetail } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<AiTopic[]>([]);

  useEffect(() => {
    if (!piece?.id) { setOpts([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await listTopics({ page: 1, limit: 20, search: dTerm || undefined, pieceId: piece.id, sortBy: 'name', sortOrder: 'asc' });
        setOpts(res.data || []);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar tópicos', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [piece?.id, dTerm]);

  useEffect(() => {
    (async () => {
      if (!topic?.id) { setTopicDetail(null); return; }
      try { setTopicDetail(await getTopic(topic.id)); } catch {}
    })();
  }, [topic?.id, setTopicDetail]);

  return (
    <Stack spacing={0.5}>
      <Typography fontWeight={700}>4. Tópico</Typography>
      <Autocomplete
        disabled={!piece?.id}
        options={opts}
        loading={loading}
        value={topic}
        onChange={(_, v) => setTopic(v)}
        inputValue={term}
        onInputChange={(_, v) => setTerm(v)}
        getOptionLabel={(o) => o?.name ?? ''}
        filterOptions={(x) => x}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={piece?.id ? 'Pesquisar tópicos…' : 'Selecione uma peça primeiro'}
            InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
          />
        )}
      />
    </Stack>
  );
}
