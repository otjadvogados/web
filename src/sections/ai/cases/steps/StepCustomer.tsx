import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import { listCustomersAdvanced, type Customer, sortCustomersMatrizFilialPF, getCompanyBranches } from 'api/customers';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { useCaseWizard } from '../CaseWizardContext';

type OptionCust = Pick<Customer, 'id'|'displayName'|'name'|'kind'|'isMatriz'|'isFilial'|'parentCustomerId'>;
const labelCustomer = (c?: OptionCust | null) => (c?.displayName ?? c?.name ?? '');

export default function StepCustomer() {
  const { customers, setCustomers } = useCaseWizard();
  const [term, setTerm] = useState('');
  const dTerm = useDebounced(term);
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<OptionCust[]>([]);

  // Mapa de filiais carregadas por matriz (companyId -> filiais)
  const [branchesMap, setBranchesMap] = useState<Record<string, OptionCust[]>>({});
  const [loadingBranches, setLoadingBranches] = useState<Record<string, boolean>>({});
  // Busca local por filiais carregadas (por matriz)
  const [branchSearch, setBranchSearch] = useState<Record<string, string>>({});

  const hasSelection = customers.length > 0;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Sem seletor global: busca livre, mantendo includeHierarchy
        const res = await listCustomersAdvanced({
          page: 1,
          limit: 20,
          search: dTerm || undefined,
          includeHierarchy: true
        });
        const list = (res?.data ?? []) as OptionCust[];
        setOpts(sortCustomersMatrizFilialPF(list));
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao buscar clientes', variant: 'alert', alert: { color: 'error' } } as any);
      } finally { setLoading(false); }
    })();
  }, [dTerm]);

  // Ajuda: badges por tipo
  const badge = (c: OptionCust) => {
    if (c.kind === 'PERSON') return 'PF';
    if (c.isFilial) return 'Filial';
    return 'Matriz';
  };

  // Evitar duplicatas ao adicionar via painel de filiais
  const ensureSelected = (items: OptionCust[]) => {
    const cur = new Map(customers.map((c) => [c.id, c]));
    for (const it of items) cur.set(it.id, it);
    setCustomers(Array.from(cur.values()));
  };

  // Carregar filiais sob demanda
  const loadBranches = async (companyId: string) => {
    if (loadingBranches[companyId]) return;
    setLoadingBranches((m) => ({ ...m, [companyId]: true }));
    try {
      const rows = await getCompanyBranches(companyId);
      const mapped: OptionCust[] = (rows || []).map((r: any) => ({
        id: r?.child?.id ?? r?.id ?? r?.childId ?? r?.customerId ?? '',
        displayName: r?.child?.displayName ?? r?.displayName ?? r?.name,
        name: r?.child?.name ?? r?.name,
        kind: 'COMPANY' as const,
        isFilial: true,
        isMatriz: false,
        parentCustomerId: companyId
      })).filter((x: OptionCust) => x.id);
      setBranchesMap((m) => ({ ...m, [companyId]: sortCustomersMatrizFilialPF(mapped) }));
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar filiais', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoadingBranches((m) => ({ ...m, [companyId]: false }));
    }
  };

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
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={`${labelCustomer(option)} • ${badge(option)}`}
              variant="outlined"
            />
          ))
        }
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', justifyContent: 'space-between' }}>
              <Stack>
                <Typography variant="body2">{labelCustomer(option)}</Typography>
                <Typography variant="caption" color="text.secondary">{badge(option)}</Typography>
              </Stack>
              {option.kind !== 'PERSON' && !option.isFilial && (
                <Button
                  size="small"
                  variant="text"
                  onClick={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    loadBranches(option.id);
                  }}
                >
                  Ver filiais
                </Button>
              )}
            </Stack>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Pesquisar clientes…"
            InputProps={{ ...params.InputProps, endAdornment: (<>{loading ? <CircularProgress size={18} /> : null}{params.InputProps.endAdornment}</>) }}
          />
        )}
      />

      {/* Painel de filiais das matrizes selecionadas */}
      {hasSelection && (
        <Paper variant="outlined" sx={{ p: 1.25, mt: 0.75 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Filiais das matrizes selecionadas</Typography>
          {!customers.some(c => c.kind !== 'PERSON' && !c.isFilial) ? (
            <Typography variant="body2" color="text.secondary">Selecione uma matriz para explorar suas filiais.</Typography>
          ) : (
            <Stack spacing={1}>
              {customers
                .filter(c => c.kind !== 'PERSON' && !c.isFilial)
                .map((matriz) => {
                  const list = branchesMap[matriz.id];
                  const loading = !!loadingBranches[matriz.id];
                  const q = (branchSearch[matriz.id] || '').trim().toLowerCase();
                  const visible = (list || []).filter((f) =>
                    (labelCustomer(f) || '').toLowerCase().includes(q)
                  );
                  return (
                    <Stack key={matriz.id} spacing={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                        <Typography variant="body2">
                          <strong>{labelCustomer(matriz)}</strong> • Matriz
                        </Typography>
                        <Stack direction="row" spacing={0.75}>
                          <Button size="small" variant="outlined" onClick={() => loadBranches(matriz.id)} disabled={loading}>
                            {loading ? 'Carregando…' : (list ? 'Recarregar' : 'Carregar filiais')}
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => ensureSelected(visible)}
                            disabled={!visible.length}
                          >
                            Selecionar todas visíveis
                          </Button>
                        </Stack>
                      </Stack>
                      <Divider />
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
                        <TextField
                          size="small"
                          placeholder="Pesquisar filiais desta matriz…"
                          value={branchSearch[matriz.id] || ''}
                          onChange={(e) => setBranchSearch((m) => ({ ...m, [matriz.id]: e.target.value }))}
                          fullWidth
                          sx={{ maxWidth: 360 }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchOutlined />
                              </InputAdornment>
                            )
                          }}
                        />
                        {!!list?.length && (
                          <Typography variant="caption" color="text.secondary">
                            {visible.length}/{list.length}
                          </Typography>
                        )}
                      </Stack>
                      {!list?.length ? (
                        <Typography variant="caption" color="text.secondary">
                          {loading ? 'Buscando…' : 'Sem filiais carregadas.'}
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {visible.map((f) => {
                            const selected = customers.some(c => c.id === f.id);
                            return (
                              <Chip
                                key={f.id}
                                variant={selected ? 'filled' : 'outlined'}
                                color={selected ? 'primary' : 'default'}
                                label={labelCustomer(f)}
                                onClick={() => {
                                  if (selected) {
                                    setCustomers(customers.filter(c => c.id !== f.id));
                                  } else {
                                    ensureSelected([f]);
                                  }
                                }}
                              />
                            );
                          })}
                        </Stack>
                      )}
                    </Stack>
                  );
                })}
            </Stack>
          )}
        </Paper>
      )}
    </Stack>
  );
}
