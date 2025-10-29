import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { listDepartments, Department } from 'api/departments';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

type OptionDept = Pick<Department, 'id'|'name'>;

export default function StepDepartment() {
  const { dept, setDept } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<OptionDept[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await listDepartments({ page: 1, limit: 20, search: dTerm || undefined });
        // @ts-ignore
        setOpts(res.data || []);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar departamentos', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [dTerm]);

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography fontWeight={700}>1. Departamento</Typography>
        <Tooltip title="Selecione primeiro o departamento. As peças dependerão desta escolha.">
          <InfoCircleOutlined />
        </Tooltip>
      </Stack>
      <Autocomplete
        options={opts}
        loading={loading}
        value={dept}
        onChange={(_, v) => setDept(v)}
        inputValue={term}
        onInputChange={(_, v) => setTerm(v)}
        getOptionLabel={(o) => o?.name ?? ''}
        filterOptions={(x) => x}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Pesquisar departamentos…"
            InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
          />
        )}
      />
    </Stack>
  );
}
