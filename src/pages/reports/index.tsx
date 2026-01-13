import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { listCustomersAdvanced, type Customer, sortCustomersMatrizFilialPF } from 'api/customers';
import {
  getReports,
  getFolderStructure,
  type CustomerReport,
  type FolderStructure,
  ReportType
} from 'api/reports';
import useDebounced from 'utils/useDebounced';

type OptionCust = Pick<Customer, 'id' | 'displayName' | 'name' | 'kind' | 'isMatriz' | 'isFilial'>;

export default function ReportsPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<OptionCust | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedSearch = useDebounced(customerSearch);
  const [customerOptions, setCustomerOptions] = useState<OptionCust[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  const [folderStructure, setFolderStructure] = useState<FolderStructure | null>(null);
  const [reports, setReports] = useState<CustomerReport[]>([]);
  const [loading, setLoading] = useState(false);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // Buscar clientes para o autocomplete
  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setCustomerOptions([]);
      return;
    }

    let alive = true;
    async function search() {
      setLoadingCustomers(true);
      try {
        const res = await listCustomersAdvanced({
          page: 1,
          limit: 20,
          search: debouncedSearch,
          includeHierarchy: true
        });
        if (!alive) return;
        const list = (res?.data ?? []) as OptionCust[];
        setCustomerOptions(sortCustomersMatrizFilialPF(list));
      } catch (err: any) {
        if (!alive) return;
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao buscar clientes',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      } finally {
        if (alive) setLoadingCustomers(false);
      }
    }
    search();
    return () => {
      alive = false;
    };
  }, [debouncedSearch]);

  // Carregar estrutura de pastas e relatórios quando um cliente for selecionado
  useEffect(() => {
    if (!selectedCustomer) {
      setFolderStructure(null);
      setReports([]);
      return;
    }

    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [folderData, reportsData] = await Promise.all([
          getFolderStructure(selectedCustomer.id),
          getReports(selectedCustomer.id)
        ]);
        if (!alive) return;
        setFolderStructure(folderData);
        setReports(reportsData);
      } catch (err: any) {
        if (!alive) return;
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao carregar relatórios',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [selectedCustomer]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      [ReportType.RELATORIO_SENTENCA]: 'Relatório de Sentença',
      [ReportType.ANALISE_PRELIMINAR_RISCO]: 'Análise Preliminar de Risco',
      [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA]: 'Relatório de Audiência Trabalhista'
    };
    return labels[type] || type;
  };

  const badge = (c: OptionCust) => {
    if (c.kind === 'PERSON') return 'PF';
    if (c.kind === 'COMPANY') {
      if (c.isFilial) return 'Filial';
      if (c.isMatriz) return 'Matriz';
      return 'Empresa';
    }
    return '';
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <FileTextOutlined />
              <Typography variant="h6" fontWeight={700}>
                Relatórios
              </Typography>
            </Stack>
          }
        >
          <Stack spacing={2}>
            {/* Seletor de Cliente */}
            <Autocomplete<OptionCust, false, false, false>
              options={customerOptions}
              loading={loadingCustomers}
              value={selectedCustomer}
              onChange={(_, v) => setSelectedCustomer(v)}
              inputValue={customerSearch}
              onInputChange={(_, v) => setCustomerSearch(v)}
              getOptionLabel={(opt) => opt.displayName || opt.name || ''}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              filterOptions={(x) => x}
              noOptionsText={customerSearch.length < 2 ? 'Digite ao menos 2 caracteres' : 'Nenhum cliente encontrado'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecione um cliente"
                  placeholder="Digite o nome do cliente..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
              renderOption={(props, opt) => (
                <li {...props} key={opt.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>{opt.displayName || opt.name}</Typography>
                    {badge(opt) && (
                      <Chip label={badge(opt)} size="small" variant="outlined" />
                    )}
                  </Stack>
                </li>
              )}
            />

            {selectedCustomer && (
              <>
                <Divider />
                
                {loading ? (
                  <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Carregando relatórios...
                    </Typography>
                  </Stack>
                ) : (
                  <>
                    {/* Lista de Relatórios */}
                    {isMobile ? (
                      <Box>
                        {reports.length === 0 ? (
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhum relatório encontrado para este cliente.
                            </Typography>
                          </Stack>
                        ) : (
                          reports.map((report) => (
                            <Box key={report.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Stack spacing={0.75}>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                  <Typography fontWeight={600}>{report.title}</Typography>
                                  <Chip
                                    label={report.isFinalized ? 'Finalizado' : 'Rascunho'}
                                    size="small"
                                    color={report.isFinalized ? 'success' : 'default'}
                                  />
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  {getReportTypeLabel(report.reportType)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(report.createdAt)}
                                </Typography>
                                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                                  <Button size="small" startIcon={<EyeOutlined />}>
                                    Ver Relatório
                                  </Button>
                                </Stack>
                              </Stack>
                            </Box>
                          ))
                        )}
                      </Box>
                    ) : (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Título</TableCell>
                              <TableCell>Tipo</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Criado em</TableCell>
                              <TableCell align="right">Ações</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reports.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5}>
                                  <Stack alignItems="center" sx={{ py: 6 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Nenhum relatório encontrado para este cliente.
                                    </Typography>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            ) : (
                              reports.map((report) => (
                                <TableRow key={report.id} hover>
                                  <TableCell>
                                    <Typography fontWeight={600}>{report.title}</Typography>
                                  </TableCell>
                                  <TableCell>{getReportTypeLabel(report.reportType)}</TableCell>
                                  <TableCell>
                                    <Chip
                                      label={report.isFinalized ? 'Finalizado' : 'Rascunho'}
                                      size="small"
                                      color={report.isFinalized ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell>{formatDate(report.createdAt)}</TableCell>
                                  <TableCell align="right">
                                    <Button size="small" startIcon={<EyeOutlined />}>
                                      Ver Relatório
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </>
            )}

            {!selectedCustomer && (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Selecione um cliente para visualizar seus relatórios.
                </Typography>
              </Stack>
            )}
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}


