import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { listCustomers, Customer } from 'api/customers';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

type OptionCust = Pick<Customer, 'id'|'displayName'|'name'>;
const labelCustomer = (c?: OptionCust | null) => (c?.displayName ?? c?.name ?? '');

export default function StepCustomer() {
  const { customers, setCustomers } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<OptionCust[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await listCustomers({ page: 1, limit: 20, search: dTerm || undefined });
        // @ts-ignore
        setOpts(res.data || []);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar clientes', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [dTerm]);

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography fontWeight={700}>2. Clientes (opcional)</Typography>
        <Tooltip title="Selecione um ou mais clientes. As peças serão filtradas por todos os clientes selecionados.">
          <InfoCircleOutlined />
        </Tooltip>
        {!!customers.length && (
          <Button size="small" onClick={() => setCustomers([])} sx={{ ml: 1 }}>
            Limpar
          </Button>
        )}
      </Stack>
      <Autocomplete<OptionCust, true, false, false>
        multiple
        options={opts}
        loading={loading}
        value={customers}
        onChange={(_, v) => setCustomers(v)}
        inputValue={term}
        onInputChange={(_, v) => setTerm(v)}
        getOptionLabel={labelCustomer}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        filterOptions={(x) => x}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip {...getTagProps({ index })} key={option.id} label={labelCustomer(option)} variant="outlined" />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Pesquisar clientes…"
            InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
          />
        )}
      />
    </Stack>
  );
}
