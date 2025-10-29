import { useEffect, useMemo, useState } from 'react';
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
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import MainCard from 'components/MainCard';
import AIIcon from 'components/icons/AIIcon';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import { listTopics, deleteTopic, AiTopic } from 'api/aiTopics';
import { listPieces } from 'api/aiPieces';
import TopicFormDialog from 'sections/ai/topics/TopicFormDialog';

export default function AITopicsPage() {
  // lista/filtros
  const [items, setItems] = useState<AiTopic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [pieceId, setPieceId] = useState<string>('');
  const [pieceCatalog, setPieceCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<AiTopic | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  async function load() {
    try {
      setLoading(true);
      const res = await listTopics({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        pieceId: pieceId || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar tópicos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    // catálogo de peças para filtro e formulário
    (async () => {
      try {
        const res = await listPieces({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
        // @ts-ignore compat
        setPieceCatalog((res.data || []).map((p: any) => ({ id: p.id, name: p.name })));
      } catch {}
    })();
  }, []);

  const onSearch = () => { setPage(0); load(); };
  const onClearFilters = () => { setSearch(''); setPieceId(''); setPage(0); load(); };

  const openCreate = () => { setEditId(null); setEditInitial(null); setFormOpen(true); };
  const openEdit = (row: AiTopic) => { setEditId(row.id); setEditInitial(row); setFormOpen(true); };
  const requestDelete = (row: AiTopic) => { setDeleteTarget({ id: row.id, name: row.name }); setDeleteOpen(true); };

  const columns = useMemo(() => ([
    { key: 'name', label: 'Nome' },
    { key: 'piece', label: 'Peça' },
    { key: 'description', label: 'Descrição' },
    { key: 'createdAt', label: 'Criado em' },
    { key: 'actions', label: 'Ações', align: 'right' as const }
  ]), []);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>Tópicos</Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {/* Filtros / Ações */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Buscar por nome/descrição"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                sx={{ minWidth: 240, flex: 1 }}
              />
              <TextField
                select
                label="Peça"
                value={pieceId}
                onChange={(e) => setPieceId(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">Todas</MenuItem>
                {pieceCatalog.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>
                  Buscar
                </Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>
                  Limpar
                </Button>
                <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
                  Novo Tópico
                </Button>
              </Stack>
            </Stack>

            <Divider />

            {/* Listing */}
            {isMobile ? (
              <Box>
                {items.map((t) => (
                  <Box key={t.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography fontWeight={700}>{t.name}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip size="small" label={`Peça: ${t.piece?.name ?? t.pieceId}`} />
                        {t.createdAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            Criado em {new Date(t.createdAt).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                      {t.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                        >
                          {t.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(t)}>
                          Editar
                        </Button>
                        <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(t)}>
                          Excluir
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                {!items.length && (
                  <Stack alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Carregando...' : 'Nenhum tópico encontrado.'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        onClick={() => { setSortBy('name'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }}
                        sx={{ cursor: 'pointer' }}
                      >
                        Nome
                      </TableCell>
                      <TableCell>Peça</TableCell>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Criado em</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{t.name}</Typography>
                        </TableCell>
                        <TableCell>{t.piece?.name ?? t.pieceId}</TableCell>
                        <TableCell sx={{ maxWidth: 420 }}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                          >
                            {t.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(t)}>
                              Editar
                            </Button>
                            <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(t)}>
                              Excluir
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={columns.length}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              {loading ? 'Carregando...' : 'Nenhum tópico encontrado.'}
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
                onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
                labelRowsPerPage={isMobile ? 'Por página' : 'Linhas por página'}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
              />
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      {/* Dialog de criar/editar */}
      <TopicFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingId={editId}
        initial={editInitial || undefined}
        onSaved={() => { setPage(0); load(); }}
      />

      {/* Confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onCancel={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setDeleting(true);
            const res = await deleteTopic(deleteTarget.id);
            openSnackbar({ open: true, message: res.message || 'Tópico removido!', variant: 'alert', alert: { color: 'success' } } as any);
            if (items.length === 1 && page > 0) setPage((p) => p - 1);
            else load();
          } catch (err: any) {
            openSnackbar({ open: true, message: err?.response?.data?.message || 'Não foi possível remover', variant: 'alert', alert: { color: 'error' } } as any);
          } finally {
            setDeleting(false);
            setDeleteOpen(false);
            setDeleteTarget(null);
          }
        }}
        loading={deleting}
        title="Remover tópico"
        description={<span>Esta ação <b>não pode ser desfeita</b>. Deseja remover o tópico <b>{deleteTarget?.name}</b>?</span>}
      />
    </Grid>
  );
}
