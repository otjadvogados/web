import { useEffect, useState } from 'react';
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
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

export default function StepSpecs() {
  const { topic, specs, setSpecs, specDetails, setSpecDetails, downloadSpecDocx } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<AiTopicSpecific[]>([]);

  useEffect(() => {
    if (!topic?.id) { setOpts([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await listTopicSpecifics({ page: 1, limit: 20, search: dTerm || undefined, topicId: topic.id, sortBy: 'name', sortOrder: 'asc' });
        setOpts(res.data || []);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar tópicos específicos', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [topic?.id, dTerm]);

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

  return (
    <Stack spacing={0.5}>
      <Typography fontWeight={700}>5. Tópicos Específicos</Typography>
      <Autocomplete
        multiple
        disabled={!topic?.id}
        options={opts}
        loading={loading}
        value={specs}
        onChange={(_, v) => setSpecs(v)}
        inputValue={term}
        onInputChange={(_, v) => setTerm(v)}
        getOptionLabel={(o) => o?.name ?? ''}
        filterOptions={(x) => x}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip {...getTagProps({ index })} key={option.id} label={option.name} variant="outlined" />
          ))
        }
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
              <span>{option.name}</span>
              {option.docxFileId && <Chip size="small" label="DOCX" />}
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={topic?.id ? 'Pesquisar tópicos específicos…' : 'Selecione um tópico primeiro'}
            InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
          />
        )}
      />
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
