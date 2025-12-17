import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import MainCard from 'components/MainCard';
import AIIcon from 'components/icons/AIIcon';
import { openSnackbar } from 'api/snackbar';
import {
  listAiUsage,
  AiUsageRecord,
  AiUsageAgg
} from 'api/aiUsage';
import { searchUsers, type UserBasic } from 'api/users';

const MODEL_OPTIONS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-nano',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-5.1',
  'gpt-5',
  'gpt-5-mini',
  'gpt-5-nano'
];

export default function AIUsagePage() {
  const [records, setRecords] = useState<AiUsageRecord[]>([]);
  const [aggregates, setAggregates] = useState<AiUsageAgg | null>(null);
  const [total, setTotal] = useState(0);
  const [totalCostUsd, setTotalCostUsd] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [model, setModel] = useState('');
  const [userId, setUserId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserBasic[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserBasic | null>(null);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  async function loadRecords() {
    try {
      setLoading(true);
      const params: any = {
        limit,
        offset: page * limit,
        order
      };
      if (model) params.model = model;
      if (userId) params.userId = userId;
      if (fromDate) params.from = new Date(fromDate).toISOString();
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        params.to = to.toISOString();
      }

      const res = await listAiUsage(params);
      const topLevelAgg =
        'calls' in res
          ? {
              calls: (res as any).calls,
              promptTokens: (res as any).promptTokens,
              completionTokens: (res as any).completionTokens,
              cachedTokens: (res as any).cachedTokens,
              totalTokens: (res as any).totalTokens,
              totalCostUsd: (res as any).totalCostUsd,
              costUsd: (res as any).costUsd,
              updatedAt: (res as any).updatedAt
            }
          : null;

      const agg =
        (res as any).aggregates ??
        (res as any).summary ??
        (res as any).global ??
        (res as any).totals ??
        topLevelAgg ??
        null;
      setAggregates(agg);
      setRecords(res.items);
      setTotal(res.total);
      const nextTotalCostUsd = agg?.costUsd ?? agg?.totalCostUsd ?? res.totalCostUsd;
      setTotalCostUsd(nextTotalCostUsd);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar registros de uso', variant: 'alert', alert: { color: 'error' } } as any);
      setRecords([]);
      setAggregates(null);
      setTotalCostUsd(undefined);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, order]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!userSearch) {
        if (active) setUserOptions([]);
        return;
      }
      try {
        setUserLoading(true);
        const res = await searchUsers({ search: userSearch, limit: 20, page: 1 });
        if (active) setUserOptions(res.data);
      } catch (err: any) {
        if (active) {
          setUserOptions([]);
          openSnackbar({
            open: true,
            message: err?.response?.data?.message || 'Falha ao buscar usuários',
            variant: 'alert',
            alert: { color: 'error' }
          } as any);
        }
      } finally {
        if (active) setUserLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [userSearch]);

  const onSearch = () => {
    setPage(0);
    loadRecords();
  };

  const onClearFilters = () => {
    setModel('');
    setUserId('');
    setSelectedUser(null);
    setUserSearch('');
    setFromDate('');
    setToDate('');
    setPage(0);
    loadRecords();
  };

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatCurrency = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>Uso da IA</Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {/* Filtros */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                select
                label="Modelo"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                sx={{ minWidth: 200 }}
                size="small"
              >
                <MenuItem value="">Todos</MenuItem>
                {MODEL_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                size="small"
                sx={{ minWidth: 240 }}
                options={userOptions}
                loading={userLoading}
                value={selectedUser}
                onChange={(_, value) => {
                  setSelectedUser(value);
                  setUserId(value?.id || '');
                }}
                inputValue={userSearch}
                onInputChange={(_, value) => {
                  setUserSearch(value);
                  if (!value) {
                    setSelectedUser(null);
                    setUserId('');
                    setUserOptions([]);
                  }
                }}
                getOptionLabel={(option) => `${option.name} (${option.email})`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                noOptionsText={userSearch ? 'Nenhum usuário encontrado' : 'Digite para buscar'}
                loadingText="Buscando usuários..."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Usuário"
                    placeholder="Buscar por nome ou e-mail"
                  />
                )}
              />
              <TextField
                label="Data Inicial"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
                size="small"
              />
              <TextField
                label="Data Final"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
                size="small"
              />
              <TextField
                select
                label="Ordenação"
                value={order}
                onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}
                sx={{ minWidth: 120 }}
                size="small"
              >
                <MenuItem value="desc">Mais recentes</MenuItem>
                <MenuItem value="asc">Mais antigos</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>
                  Buscar
                </Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>
                  Limpar
                </Button>
              </Stack>
            </Stack>

            <Divider />

            {/* Resumo */}
            {(aggregates || totalCostUsd !== undefined) && (
              <>
                <Grid container spacing={2}>
                  {aggregates && (
                    <>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">Total de Chamadas</Typography>
                            <Typography variant="h4" fontWeight={700}>
                              {formatNumber(aggregates.calls)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">Tokens do Prompt</Typography>
                            <Typography variant="h4" fontWeight={700} color="primary.main">
                              {formatNumber(aggregates.promptTokens)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">Tokens de Completion</Typography>
                            <Typography variant="h4" fontWeight={700} color="success.main">
                              {formatNumber(aggregates.completionTokens)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">Cached Tokens</Typography>
                            <Typography variant="h4" fontWeight={700} color="info.main">
                              {formatNumber(aggregates.cachedTokens)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">Total de Tokens</Typography>
                            <Typography variant="h4" fontWeight={700} color="warning.main">
                              {formatNumber(aggregates.totalTokens)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </>
                  )}
                  {totalCostUsd !== undefined && (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card>
                        <CardContent>
                          <Typography variant="body2" color="text.secondary">Custo Total (USD)</Typography>
                          <Typography variant="h4" fontWeight={700} color="error.main">
                            {formatCurrency(totalCostUsd)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>

                <Divider />
              </>
            )}

            {/* Tabela de Registros */}
            {loading && records.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Carregando registros...</Typography>
              </Stack>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Call Name</TableCell>
                      <TableCell align="right">Prompt Tokens</TableCell>
                      <TableCell align="right">Completion Tokens</TableCell>
                      <TableCell align="right">Cached Tokens</TableCell>
                      <TableCell align="right">Total Tokens</TableCell>
                      <TableCell align="right">Total USD</TableCell>
                      <TableCell>Criado em</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} hover>
                        <TableCell><Typography fontWeight={600}>{record.model}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {record.callName || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{formatNumber(record.promptTokens)}</TableCell>
                        <TableCell align="right">{formatNumber(record.completionTokens)}</TableCell>
                        <TableCell align="right">{formatNumber(record.cachedTokens)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={600} color="primary.main">
                            {formatNumber(record.totalTokens)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(record.costUsd)}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(record.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                    {!records.length && !loading && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">Nenhum registro encontrado.</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider />

            <Stack direction="row" justifyContent="center" sx={{ p: isMobile ? 1 : 2 }}>
              <TablePagination
                component="div"
                rowsPerPageOptions={isMobile ? [25, 50] : [25, 50, 100, 200]}
                count={total}
                rowsPerPage={limit}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
                labelRowsPerPage={isMobile ? 'Por página' : 'Linhas por página'}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
              />
            </Stack>
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}

