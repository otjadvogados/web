import { useEffect, useMemo, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '../../../components/@extended/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MainCard from '../../../components/MainCard';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import UnlockOutlined from '@ant-design/icons/UnlockOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import SafetyOutlined from '@ant-design/icons/SafetyOutlined';

import { listBlocks, listBlocksHistory, unblockUser } from '../../../api/blocks';
import { BlockRow, BlockHistoryRow } from '../../../types/blocks';
import { openSnackbar } from '../../../api/snackbar';
import BlockUserDialog from '../../../sections/blocks/BlockUserDialog';
import BlockEmailDialog from '../../../sections/blocks/BlockEmailDialog';

export default function AccountBlocksPage() {
  // tabs
  const [tab, setTab] = useState<'active' | 'history'>('active');

  // ativos
  const [items, setItems] = useState<BlockRow[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'blockedAt' | 'until' | 'email' | 'userName'>('blockedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // histórico
  const [hItems, setHItems] = useState<BlockHistoryRow[]>([]);
  const [hPage, setHPage] = useState(0);
  const [hLimit, setHLimit] = useState(10);
  const [hTotal, setHTotal] = useState(0);
  const [hSearch, setHSearch] = useState('');
  const [hSortBy, setHSortBy] = useState<'createdAt' | 'action'>('createdAt');
  const [hSortOrder, setHSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hLoading, setHLoading] = useState(false);

  const [openUser, setOpenUser] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const loadActive = async () => {
    try {
      setLoading(true);
      const res = await listBlocks({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar bloqueios', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHLoading(true);
      const res = await listBlocksHistory({
        page: hPage + 1,
        limit: hLimit,
        search: hSearch.trim() || undefined,
        sortBy: hSortBy,
        sortOrder: hSortOrder
      });
      setHItems(res.data);
      setHTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar histórico', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setHLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'active') loadActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hPage, hLimit, hSortBy, hSortOrder]);

  // helper
  const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

  const ActiveToolbar = (
    <Stack direction={isMobile ? 'column' : 'row'} spacing={isMobile ? 2 : 1.5} sx={{ p: 2, pb: 1 }} alignItems={isMobile ? 'stretch' : 'center'}>
      <TextField
        label="Buscar (nome, email, motivo)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (setPage(0), loadActive())}
        sx={{ minWidth: isMobile ? '100%' : 320, flex: isMobile ? 'none' : 1 }}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={() => (setPage(0), loadActive())} disabled={loading}>
          Buscar
        </Button>
        <Button variant="contained" startIcon={<PlusOutlined />} onClick={() => setOpenUser(true)}>
          Bloquear por usuário
        </Button>
        <Button variant="text" startIcon={<PlusOutlined />} onClick={() => setOpenEmail(true)}>
          Bloquear por e-mail
        </Button>
      </Stack>
    </Stack>
  );

  const HistoryToolbar = (
    <Stack direction={isMobile ? 'column' : 'row'} spacing={isMobile ? 2 : 1.5} sx={{ p: 2, pb: 1 }} alignItems={isMobile ? 'stretch' : 'center'}>
      <TextField
        label="Buscar (ator, usuário, e-mail, motivo)"
        value={hSearch}
        onChange={(e) => setHSearch(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (setHPage(0), loadHistory())}
        sx={{ minWidth: isMobile ? '100%' : 320, flex: isMobile ? 'none' : 1 }}
      />
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={() => (setHPage(0), loadHistory())} disabled={hLoading}>
          Buscar
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard title="Bloqueios de conta" contentSX={{ p: 0 }} secondary={<HistoryOutlined /> as any}>
          <Box sx={{ px: 2, pt: 1 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
              <Tab icon={<SafetyOutlined />} iconPosition="start" value="active" label="Bloqueios ativos" />
              <Tab icon={<HistoryOutlined />} iconPosition="start" value="history" label="Histórico / auditoria" />
            </Tabs>
          </Box>

          <Divider />

          {/* ACTIVE */}
          {tab === 'active' && (
            <>
              {ActiveToolbar}
              <Divider />
              <TableContainer>
                <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => { setSortBy('userName'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Usuário / E-mail</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell onClick={() => { setSortBy('blockedAt'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Bloqueado em</TableCell>
                      <TableCell onClick={() => { setSortBy('until'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Expira</TableCell>
                      <TableCell>Por</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          {r.user ? (
                            <Stack>
                              <Typography fontWeight={600}>{r.user.name || r.user.email}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.user.email}</Typography>
                            </Stack>
                          ) : (
                            <Typography fontWeight={600}>{r.email}</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 420 }}>
                          <Typography variant="body2" color="text.secondary">{r.reason || '—'}</Typography>
                        </TableCell>
                        <TableCell>{fmt(r.blockedAt)}</TableCell>
                        <TableCell>{fmt(r.until)}</TableCell>
                        <TableCell>
                          {r.blockedBy ? (
                            <Stack>
                              <Typography fontWeight={600}>{r.blockedBy.name || r.blockedBy.email}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.blockedBy.email}</Typography>
                            </Stack>
                          ) : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title={r.user?.id ? 'Desbloquear' : 'Desbloqueio por e-mail não disponível'}>
                              <span>
                                <IconButton
                                  color="success"
                                  disabled={!r.user?.id}
                                  onClick={async () => {
                                    try {
                                      if (!r.user?.id) return;
                                      await unblockUser(r.user.id);
                                      openSnackbar({ open: true, message: 'Conta desbloqueada', variant: 'alert', alert: { color: 'success' } } as any);
                                      // manter paginação estável
                                      if (items.length === 1 && page > 0) setPage((p) => p - 1);
                                      else loadActive();
                                    } catch (e: any) {
                                      openSnackbar({ open: true, message: e?.response?.data?.message || e.message || 'Falha ao desbloquear', variant: 'alert', alert: { color: 'error' } } as any);
                                    }
                                  }}
                                >
                                  <UnlockOutlined />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">{loading ? 'Carregando...' : 'Nenhum bloqueio ativo.'}</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />

              <Stack direction="row" justifyContent="center" sx={{ p: isMobile ? 1 : 2 }}>
                <TablePagination
                  component="div"
                  rowsPerPageOptions={isMobile ? [5, 10] : [5, 10, 20, 50]}
                  count={total}
                  rowsPerPage={limit}
                  page={page}
                  onPageChange={(_, p) => setPage(p)}
                  onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
                  labelRowsPerPage={isMobile ? 'Por página' : 'Linhas por página'}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
                />
              </Stack>
            </>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <>
              {HistoryToolbar}
              <Divider />
              <TableContainer>
                <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => { setHSortBy('createdAt'); setHSortOrder(hSortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Quando</TableCell>
                      <TableCell onClick={() => { setHSortBy('action'); setHSortOrder(hSortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Ação</TableCell>
                      <TableCell>Alvo</TableCell>
                      <TableCell>Ator</TableCell>
                      <TableCell>Motivo</TableCell>
                      <TableCell>Expira</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hItems.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{fmt(r.createdAt)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={r.action} />
                        </TableCell>
                        <TableCell>
                          {r.user ? (
                            <Stack>
                              <Typography fontWeight={600}>{r.user.name || r.user.email}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.user.email}</Typography>
                            </Stack>
                          ) : (r.email || '—')}
                        </TableCell>
                        <TableCell>
                          {r.actor ? (
                            <Stack>
                              <Typography fontWeight={600}>{r.actor.name || r.actor.email}</Typography>
                              <Typography variant="caption" color="text.secondary">{r.actor.email}</Typography>
                            </Stack>
                          ) : '—'}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 420 }}>
                          <Typography variant="body2" color="text.secondary">{r.reason || '—'}</Typography>
                        </TableCell>
                        <TableCell>{fmt(r.until)}</TableCell>
                      </TableRow>
                    ))}
                    {!hItems.length && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">{hLoading ? 'Carregando...' : 'Sem eventos no histórico.'}</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />

              <Stack direction="row" justifyContent="center" sx={{ p: isMobile ? 1 : 2 }}>
                <TablePagination
                  component="div"
                  rowsPerPageOptions={isMobile ? [5, 10] : [5, 10, 20, 50]}
                  count={hTotal}
                  rowsPerPage={hLimit}
                  page={hPage}
                  onPageChange={(_, p) => setHPage(p)}
                  onRowsPerPageChange={(e) => { setHLimit(parseInt(e.target.value, 10)); setHPage(0); }}
                  labelRowsPerPage={isMobile ? 'Por página' : 'Linhas por página'}
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
                />
              </Stack>
            </>
          )}
        </MainCard>
      </Grid>

      {/* Diálogos */}
      <BlockUserDialog open={openUser} onClose={() => setOpenUser(false)} onSaved={loadActive} />
      <BlockEmailDialog open={openEmail} onClose={() => setOpenEmail(false)} onSaved={loadActive} />
    </Grid>
  );
}
