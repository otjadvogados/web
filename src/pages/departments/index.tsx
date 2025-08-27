import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from '../../components/@extended/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import MainCard from '../../components/MainCard';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';

import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';

import { listDepartments, deleteDepartment, getDepartment } from '../../api/departments';
import { DepartmentRow } from '../../types/departments';
import { openSnackbar } from '../../api/snackbar';
import DepartmentFormDialog from '../../sections/departments/DepartmentFormDialog';
import ConfirmDeleteDialog from '../../components/ConfirmDeleteDialog';

export default function DepartmentsPage() {
  const [items, setItems] = useState<DepartmentRow[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<any | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  async function load() {
    try {
      setLoading(true);
      const res = await listDepartments({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar departamentos', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, limit, sortBy, sortOrder]);

  const openCreate = () => {
    setEditId(null);
    setEditInitial(null);
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      setEditId(id);
      const r = await getDepartment(id);
      setEditInitial({ name: r.name, description: r.description ?? '' });
      setFormOpen(true);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Não foi possível carregar o departamento', variant: 'alert', alert: { color: 'error' } } as any);
    }
  };

  const requestDelete = (d: DepartmentRow) => {
    setDeleteTarget({ id: d.id, name: d.name });
    setDeleteOpen(true);
  };

  const DeptCard = ({ dept }: { dept: DepartmentRow }) => (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center">
            <AppstoreOutlined />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{dept.name}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Editar"><IconButton color="secondary" onClick={() => openEdit(dept.id)}><EditOutlined /></IconButton></Tooltip>
            <Tooltip title="Excluir"><IconButton color="error" onClick={() => requestDelete(dept)}><DeleteOutlined /></IconButton></Tooltip>
          </Stack>
        </Stack>
        {dept.description && <Typography variant="body2" color="text.secondary">{dept.description}</Typography>}
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">Empresa:</Typography>
          <Chip size="small" label={dept.company?.name ?? '—'} />
        </Stack>
      </Stack>
    </Box>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard title="Departamentos" contentSX={{ p: 0 }}>
          <Stack direction={isMobile ? 'column' : 'row'} spacing={isMobile ? 2 : 1.5} sx={{ p: 2, pb: 1 }} alignItems={isMobile ? 'stretch' : 'center'}>
            <TextField
              label="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load())}
              sx={{ minWidth: isMobile ? '100%' : 280, flex: isMobile ? 'none' : 1 }}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={() => (setPage(0), load())} disabled={loading}>
                Buscar
              </Button>
              <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
                Novo Departamento
              </Button>
            </Stack>
          </Stack>

          <Divider />

          {isMobile ? (
            <Box>
              {items.map((d) => <DeptCard key={d.id} dept={d} />)}
              {!items.length && (
                <Stack alignItems="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">{loading ? 'Carregando...' : 'Nenhum departamento encontrado.'}</Typography>
                </Stack>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                                 <TableHead>
                   <TableRow>
                     <TableCell onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Nome</TableCell>
                     <TableCell>Descrição</TableCell>
                     <TableCell align="right">Ações</TableCell>
                   </TableRow>
                 </TableHead>
                <TableBody>
                  {items.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Stack>
                          <Typography fontWeight={600}>{d.name}</Typography>
                          {d.createdAt && <Typography variant="caption" color="text.secondary">Criado em {new Date(d.createdAt).toLocaleString()}</Typography>}
                        </Stack>
                      </TableCell>
                                             <TableCell sx={{ maxWidth: 420 }}>
                         <Typography variant="body2" color="text.secondary">{d.description || '—'}</Typography>
                       </TableCell>
                       <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar"><IconButton color="secondary" onClick={() => openEdit(d.id)}><EditOutlined /></IconButton></Tooltip>
                          <Tooltip title="Excluir"><IconButton color="error" onClick={() => requestDelete(d)}><DeleteOutlined /></IconButton></Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                                     {!items.length && (
                     <TableRow>
                       <TableCell colSpan={3}>
                         <Stack alignItems="center" sx={{ py: 6 }}>
                           <Typography variant="body2" color="text.secondary">{loading ? 'Carregando...' : 'Nenhum departamento encontrado.'}</Typography>
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
              labelRowsPerPage={isMobile ? "Por página" : "Linhas por página"}
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
            />
          </Stack>
        </MainCard>
      </Grid>

      <DepartmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingId={editId}
        initial={editInitial || undefined}
        onSaved={load}
      />

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
            const response = await deleteDepartment(deleteTarget.id);
            openSnackbar({ open: true, message: response.message || 'Departamento removido!', variant: 'alert', alert: { color: 'success' } } as any);
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
        title="Remover departamento"
        description={<span>Esta ação <b>não pode ser desfeita</b>. Deseja remover o departamento <b>{deleteTarget?.name}</b>?</span>}
      />
    </Grid>
  );
}
