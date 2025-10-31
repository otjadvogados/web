import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import { listPieces, AiPiece, getPiece } from 'api/aiPieces';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';
import Tooltip from 'components/@extended/Tooltip';

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

  // Limpa a seleção se a peça atual não tiver docxFileId
  useEffect(() => {
    if (!piece?.id || !opts.length) return;
    // Busca a peça atualizada nas opções para verificar se tem docxFileId
    const currentPiece = opts.find(p => p.id === piece.id);
    if (currentPiece && !currentPiece.docxFileId) {
      setPiece(null);
      setPieceDetail(null);
    }
  }, [opts, piece?.id, setPiece, setPieceDetail]);

  return (
    <Stack spacing={0.5}>
      <Typography fontWeight={700}>3. Peça</Typography>
      <Autocomplete
        disabled={!dept?.id}
        options={opts}
        loading={loading}
        value={piece}
        onChange={(_, v) => {
          // Só permite selecionar peças com docxFileId
          if (v && !v.docxFileId) return;
          setPiece(v);
        }}
        inputValue={term}
        onInputChange={(_, v) => setTerm(v)}
        getOptionLabel={(o) => o?.name ?? ''}
        getOptionDisabled={(option) => !option.docxFileId}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        filterOptions={(x) => x}
        renderOption={(props, option) => {
          const isDisabled = !option.docxFileId;
          return (
            <Tooltip
              title={isDisabled ? 'Esta peça não possui documento DOCX atrelado e não pode ser selecionada' : ''}
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
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDisabled ? 'text.disabled' : 'text.primary'
                      }}
                    >
                      {option.name}
                    </Typography>
                    {isDisabled && (
                      <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.25 }}>
                        Sem DOCX disponível
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {option.docxFileId && <Chip size="small" label="DOCX" color="primary" />}
                    {option.customer?.displayName && <Chip size="small" variant="outlined" label={option.customer.displayName} />}
                  </Stack>
                </Stack>
              </li>
            </Tooltip>
          );
        }}
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
