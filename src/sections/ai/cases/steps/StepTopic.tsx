import { useEffect, useState, useRef } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { listTopics, AiTopic, getTopic } from 'api/aiTopics';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

export default function StepTopic() {
  const { piece, topic, setTopic, topics, setTopics, setTopicDetail, step } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<AiTopic[]>([]);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const hasShownDialogRef = useRef(false);

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

  // Mostra o dialog informativo quando entra na etapa de tópicos (step 3)
  useEffect(() => {
    // step 3 = Tópicos (baseado no array steps no create.tsx)
    if (step === 3 && !hasShownDialogRef.current) {
      // Pequeno delay para garantir que o componente está renderizado
      const timer = setTimeout(() => {
        setShowInfoDialog(true);
        hasShownDialogRef.current = true;
      }, 500);
      return () => clearTimeout(timer);
    } else if (step !== 3) {
      // Quando sai da etapa, reseta para permitir mostrar novamente se voltar
      hasShownDialogRef.current = false;
    }
  }, [step]);

  const handleCloseInfoDialog = () => {
    setShowInfoDialog(false);
  };

  return (
    <>
      <Stack spacing={0.5}>
        <Typography fontWeight={700}>4. Tópicos</Typography>
        <Autocomplete
          multiple
          disabled={!piece?.id}
          options={opts}
          loading={loading}
          value={topics}
          onChange={(_, v) => {
            // define lista completa
            setTopics(v);
            // mantém compat: primeiro vira "topic" principal
            setTopic(v[0] ?? null);
          }}
          inputValue={term}
          onInputChange={(_, v) => setTerm(v)}
          getOptionLabel={(o) => o?.name ?? ''}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          filterOptions={(x) => x}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={piece?.id ? 'Pesquisar e selecionar 1+ tópicos…' : 'Selecione uma peça primeiro'}
              InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
            />
          )}
        />
      </Stack>

      {/* Dialog informativo sobre pesquisa de tópicos */}
      <Dialog
        open={showInfoDialog}
        onClose={handleCloseInfoDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <InfoCircleOutlined style={{ color: '#1976d2' }} />
            <Typography variant="h6">Informação sobre Tópicos</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Atenção:</strong> Se o tópico que você procura não estiver na lista, utilize o campo de pesquisa acima para encontrá-lo.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Digite parte do nome do tópico no campo de busca para filtrar os resultados disponíveis.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInfoDialog} variant="contained" color="primary">
            Entendi
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
