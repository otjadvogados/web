import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { listPieces, AiPiece, getPiece } from 'api/aiPieces';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

export default function StepPiece() {
  const { dept, customer, piece, setPiece, setPieceDetail } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<AiPiece[]>([]);

  useEffect(() => {
    if (!dept?.id) { setOpts([]); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await listPieces({
          page: 1, limit: 20, search: dTerm || undefined,
          deptId: dept.id, customerId: customer?.id || undefined,
          sortBy: 'name', sortOrder: 'asc'
        });
        setOpts(res.data || []);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar peças', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [dept?.id, customer?.id, dTerm]);

  useEffect(() => {
    (async () => {
      if (!piece?.id) { setPieceDetail(null); return; }
      try { setPieceDetail(await getPiece(piece.id)); } catch {}
    })();
  }, [piece?.id, setPieceDetail]);

  return (
    <Stack spacing={0.5}>
      <Typography fontWeight={700}>3. Peça</Typography>
      <Autocomplete
        disabled={!dept?.id}
        options={opts}
        loading={loading}
        value={piece}
        onChange={(_, v) => setPiece(v)}
        inputValue={term}
        onInputChange={(_, v) => setTerm(v)}
        getOptionLabel={(o) => o?.name ?? ''}
        filterOptions={(x) => x}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
              <span>{option.name}</span>
              <Stack direction="row" spacing={0.5} alignItems="center">
                {option.docxFileId && <Chip size="small" label="DOCX" />}
                {option.customer?.displayName && <Chip size="small" variant="outlined" label={option.customer.displayName} />}
              </Stack>
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={dept?.id ? 'Pesquisar peças…' : 'Selecione um departamento primeiro'}
            InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
          />
        )}
      />
    </Stack>
  );
}
