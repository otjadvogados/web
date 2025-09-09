import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, TextField, Button, CircularProgress, Paper, Typography } from '@mui/material';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { listCases, getLatestDraftForCase, type AiCase } from 'api/aiDocs';

export default function CasesPage() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AiCase[]>([]);

  async function fetch() {
    try {
      setLoading(true);
      const res = await listCases({ search, page: 1, limit: 20 });
      setItems(res.data || []);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, []);

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <MainCard title="Meus Casos">
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} size="small" />
          <Button onClick={fetch} variant="contained" disabled={loading}>{loading ? <CircularProgress size={18} /> : 'Buscar'}</Button>
        </Stack>

        <Stack spacing={1.25}>
          {items.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">{c.type}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap title={c.requestText} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.requestText}</Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={async () => {
                      const latest = await getLatestDraftForCase(c.id);
                      if (latest) {
                        nav(`/ai-docs/editor?caseId=${encodeURIComponent(c.id)}&draftId=${encodeURIComponent(latest.id)}`);
                      } else {
                        nav(`/ai-docs/editor?caseId=${encodeURIComponent(c.id)}`); // gera novo
                      }
                    }}
                  >
                    Continuar
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => nav(`/ai-docs/editor?caseId=${encodeURIComponent(c.id)}`)}
                  >
                    Novo rascunho
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
          {!items.length && !loading && <Typography variant="body2" color="text.secondary">Nenhum caso encontrado.</Typography>}
        </Stack>
      </MainCard>
    </Box>
  );
}
