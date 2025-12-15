import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import AIIcon from 'components/icons/AIIcon';
import MainCard from 'components/MainCard';
import { listCaseResults, deleteCaseResults, CaseResult } from 'api/aiCases';
import { listDepartments } from 'api/departments';
import { listPieces } from 'api/aiPieces';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import CaseViewDialog from 'sections/ai/list-cases/CaseViewDialog';

export default function ListCasesPage() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // Lista e paginação
  const [items, setItems] = useState<CaseResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [deptId, setDeptId] = useState<string>('');
  const [pieceId, setPieceId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // Catálogos
  const [deptCatalog, setDeptCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [pieceCatalog, setPieceCatalog] = useState<Array<{ id: string; name: string }>>([]);

  // Seleção múltipla
  const [selected, setSelected] = useState<string[]>([]);

  // Dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCaseId, setViewCaseId] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await listCaseResults({
        page: page + 1,
        pageSize: limit,
        search: search.trim() || undefined,
        departmentId: deptId || undefined,
        pieceId: pieceId || undefined,
        customerName: customerName.trim() || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined
      });
      const resultItems = res.data || res.items || [];
      setItems(Array.isArray(resultItems) ? resultItems : []);
      setTotal(res.total || 0);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar casos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    // Carregar catálogo de departamentos
    (async () => {
      try {
        const res = await listDepartments({ page: 1, limit: 100 });
        // @ts-ignore
        setDeptCatalog(res.data?.map((d: any) => ({ id: d.id, name: d.name })) || []);
      } catch {}
    })();

    // Carregar catálogo de peças
    (async () => {
      try {
        const res = await listPieces({ page: 1, limit: 100 });
        setPieceCatalog(res.data?.map((p) => ({ id: p.id, name: p.name })) || []);
      } catch {}
    })();
  }, []);

  const onSearch = () => {
    setPage(0);
    setSelected([]);
    load();
  };

  const onClearFilters = () => {
    setSearch('');
    setDeptId('');
    setPieceId('');
    setCustomerName('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
    setSelected([]);
    load();
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(items.map((item) => item.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selected.length === 0) {
      openSnackbar({
        open: true,
        message: 'Selecione ao menos um caso para excluir',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteCaseResults(selected);
      openSnackbar({
        open: true,
        message: `${selected.length} caso(s) excluído(s) com sucesso!`,
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      setSelected([]);
      load();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao excluir casos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleView = (caseId: string) => {
    setViewCaseId(caseId);
    setViewOpen(true);
  };

  const handleEdit = (caseId: string) => {
    navigate(`/ai/cases/${caseId}/edit`);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const selectedCount = selected.length;
  const isAllSelected = items.length > 0 && selected.length === items.length;
  const isSomeSelected = selected.length > 0 && selected.length < items.length;

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>
                Casos
              </Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {/* Filtros */}
            <Stack spacing={1.25}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  label="Buscar em nome da peça e HTML"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  sx={{ minWidth: 200 }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  select
                  label="Departamento"
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {deptCatalog.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Peça"
                  value={pieceId}
                  onChange={(e) => setPieceId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {pieceCatalog.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  type="date"
                  label="Data inicial"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />

                <TextField
                  type="date"
                  label="Data final"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>
                  Buscar
                </Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>
                  Limpar
                </Button>
                {selectedCount > 0 && (
                  <Button variant="contained" color="error" startIcon={<DeleteOutlined />} onClick={handleDeleteSelected}>
                    Excluir selecionados ({selectedCount})
                  </Button>
                )}
              </Stack>
            </Stack>

            <Divider />

            {/* Listagem */}
            {isMobile ? (
              <Box>
                {items.map((item) => (
                  <Box key={item.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Checkbox checked={selected.includes(item.id)} onChange={() => handleSelect(item.id)} size="small" />
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700}>
                            {item.name || '—'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.pieceName || (item.infos as any)?.piece?.name || item.piece?.name || '—'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={`Depto: ${item.departmentName || (item.infos as any)?.piece?.department?.name || item.department?.name || '—'}`}
                        />
                        {item.customers && Array.isArray(item.customers) && item.customers.length > 0 && typeof item.customers[0] === 'object' && (
                          <Chip size="small" label={`Cliente: ${(item.customers[0] as any)?.displayName || (item.customers[0] as any)?.name || '—'}`} />
                        )}
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Criado em {item.createdAt ? formatDate(item.createdAt) : '—'}
                      </Typography>

                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" color="secondary" startIcon={<EyeOutlined />} onClick={() => handleView(item.id)}>
                          Ver
                        </Button>
                        <Button size="small" color="primary" startIcon={<EditOutlined />} onClick={() => handleEdit(item.id)}>
                          Editar
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                {!items.length && (
                  <Stack alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Carregando...' : 'Nenhum caso encontrado.'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isSomeSelected}
                          onChange={handleSelectAll}
                          disabled={items.length === 0}
                        />
                      </TableCell>
                      <TableCell>Nome do caso</TableCell>
                      <TableCell>Peça</TableCell>
                      <TableCell>Departamento</TableCell>
                      <TableCell>Clientes</TableCell>
                      <TableCell>Criado em</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} hover selected={selected.includes(item.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selected.includes(item.id)} onChange={() => handleSelect(item.id)} />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={700}>
                            {item.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>
                            {(item.infos as any)?.piece?.name || item.piece?.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.departmentName || (item.infos as any)?.piece?.department?.name || item.department?.name || '—'}
                        </TableCell>
                        <TableCell>
                          {item.customers && Array.isArray(item.customers) && item.customers.length > 0 && typeof item.customers[0] === 'object' ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {(item.customers as Array<{ id: string; name: string; displayName?: string }>).map((c) => (
                                <Chip key={c.id} size="small" label={c?.displayName || c?.name || '—'} variant="outlined" />
                              ))}
                            </Stack>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{item.createdAt ? formatDate(item.createdAt) : '—'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" color="secondary" startIcon={<EyeOutlined />} onClick={() => handleView(item.id)}>
                              Ver
                            </Button>
                            <Button size="small" color="primary" startIcon={<EditOutlined />} onClick={() => handleEdit(item.id)}>
                              Editar
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              {loading ? 'Carregando...' : 'Nenhum caso encontrado.'}
                            </Typography>
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
                rowsPerPageOptions={isMobile ? [5, 10] : [5, 10, 20, 50]}
                count={total}
                rowsPerPage={limit}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage={isMobile ? 'Por página' : 'Linhas por página'}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
              />
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      {/* Confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onCancel={() => {
          if (deleting) return;
          setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Excluir casos"
        description={
          <span>
            Esta ação <b>não pode ser desfeita</b>. Deseja remover <b>{selectedCount}</b> caso(s)?
          </span>
        }
      />

      {/* Visualizar caso */}
      <CaseViewDialog open={viewOpen} onClose={() => setViewOpen(false)} caseId={viewCaseId} />
    </Grid>
  );
}
