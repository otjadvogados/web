import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Stack, TextField, Button, CircularProgress, Paper, Typography } from '@mui/material';
import { PlusOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { listCases, getLatestDraftForCase, type AiCase } from 'api/aiDocs';
import { listCustomers, type Customer, subjectId, resolveSubjectId } from 'api/customers';
import Autocomplete from '@mui/material/Autocomplete';

export default function CasesPage() {
  const nav = useNavigate();
  const [search, setSearch] = useState('');
  // guardamos o "subject id" correto (person.id se PERSON, senão cai para id padrão)
  const [customerSubjectId, setCustomerSubjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AiCase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  async function fetch() {
    try {
      setLoading(true);
      const res = await listCases({ search, customerId: customerSubjectId || undefined, page: 1, limit: 20 });
      setItems(res.data || []);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetch(); /* eslint-disable-next-line */ }, [customerSubjectId]);
  useEffect(() => { (async () => { try { const r = await listCustomers({ page:1, limit:200 }); setCustomers(r.data);} catch {} })(); }, []);

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <MainCard title="Meus Casos">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
          <TextField 
            placeholder="Buscar casos..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            size="small" 
            sx={{ minWidth: 300 }}
          />
          <Autocomplete
            options={customers}
            getOptionLabel={(o) => o.displayName || o.name || 'Cliente sem nome'}
            value={customers.find(c => subjectId(c) === customerSubjectId) || null}
            onChange={async (_, v) => setCustomerSubjectId((await resolveSubjectId(v)) ?? null)}
            renderInput={(p) => <TextField {...p} placeholder="Cliente (opcional)" size="small" />}
            sx={{ minWidth: 260 }}
          />
          <Stack direction="row" spacing={1}>
            <Button onClick={fetch} variant="outlined" disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Buscar'}
            </Button>
            <Button 
              variant="contained" 
              startIcon={<PlusOutlined />}
              onClick={() => nav('/ai-docs/create')}
            >
              Criar Caso
            </Button>
          </Stack>
        </Stack>

        <Stack spacing={1.25}>
          {items.map((c) => (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2">{c.type}</Typography>
                  <Typography variant="body2" color="text.secondary" noWrap title={c.requestText} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.requestText}</Typography>
                </Stack>
                <Button
                  variant="contained"
                  onClick={async () => {
                    const latest = await getLatestDraftForCase(c.id);
                    if (latest) {
                      nav(`/ai-docs/a4-playground/${latest.id}`);
                    } else {
                      openSnackbar({ 
                        open: true, 
                        message: 'Nenhum rascunho encontrado. Crie um caso primeiro.', 
                        variant: 'alert', 
                        alert: { color: 'warning' } 
                      } as any);
                    }
                  }}
                >
                  Continuar
                </Button>
              </Stack>
            </Paper>
          ))}
          {!items.length && !loading && <Typography variant="body2" color="text.secondary">Nenhum caso encontrado.</Typography>}
        </Stack>
      </MainCard>
    </Box>
  );
}
