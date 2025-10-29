import { useEffect, useState, useRef } from 'react';
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
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import MainCard from 'components/MainCard';
import AIIcon from 'components/icons/AIIcon';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import {
  listTopicSpecifics,
  deleteTopicSpecific,
  uploadTopicSpecificDocx,
  deleteTopicSpecificDocx,
  fetchTopicSpecificDocx,
  AiTopicSpecific
} from 'api/aiTopicSpecifics';
import { listTopics } from 'api/aiTopics';
import TopicSpecificFormDialog from 'sections/ai/topic-specifics/TopicSpecificFormDialog';

export default function AITopicSpecificsPage() {
  const [items, setItems] = useState<AiTopicSpecific[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [topicId, setTopicId] = useState<string>('');
  const [topicCatalog, setTopicCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<AiTopicSpecific | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  async function load() {
    try {
      setLoading(true);
      const res = await listTopicSpecifics({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        topicId: topicId || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar tópicos específicos', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder]);

  useEffect(() => {
    (async () => {
      try {
        const res = await listTopics({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
        // @ts-ignore
        setTopicCatalog((res.data || []).map((t: any) => ({ id: t.id, name: t.name })));
      } catch {}
    })();
  }, []);

  const onSearch = () => { setPage(0); load(); };
  const onClearFilters = () => { setSearch(''); setTopicId(''); setPage(0); load(); };

  const openCreate = () => { setEditId(null); setEditInitial(null); setFormOpen(true); };
  const openEdit = (row: AiTopicSpecific) => { setEditId(row.id); setEditInitial(row); setFormOpen(true); };
  const requestDelete = (row: AiTopicSpecific) => { setDeleteTarget({ id: row.id, name: row.name }); setDeleteOpen(true); };

  const triggerUpload = (id: string) => { setPendingUploadId(id); fileRef.current?.click(); };
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingUploadId) return;
    try {
      // validação simples no front: .docx
      if (!/\.docx$/i.test(file.name)) {
        openSnackbar({ open: true, message: 'Envie apenas arquivos .docx', variant: 'alert', alert: { color: 'warning' } } as any);
        return;
      }
      await uploadTopicSpecificDocx(pendingUploadId, file);
      openSnackbar({ open: true, message: 'Documento anexado com sucesso!', variant: 'alert', alert: { color: 'success' } } as any);
      load();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha no upload do documento', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setPendingUploadId(null);
    }
  };

  const handleDownloadDocx = async (s: AiTopicSpecific) => {
    try {
      const { blob, filename } = await fetchTopicSpecificDocx(s.id, s.docxFileId ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename && filename.trim()) || `${(s.name || 'documento').replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || err?.message || 'Falha ao baixar o documento', variant: 'alert', alert: { color: 'error' } } as any);
    }
  };

  const handleDeleteDocx = async (id: string) => {
    try {
      await deleteTopicSpecificDocx(id);
      openSnackbar({ open: true, message: 'Documento removido com sucesso!', variant: 'alert', alert: { color: 'success' } } as any);
      load();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao remover documento', variant: 'alert', alert: { color: 'error' } } as any);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>Tópicos Específicos</Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Buscar por nome/instrução"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                sx={{ minWidth: 240, flex: 1 }}
              />
              <TextField
                select
                label="Tópico"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                sx={{ minWidth: 240 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {topicCatalog.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>Buscar</Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>Limpar</Button>
                <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>Novo Tópico Específico</Button>
              </Stack>
            </Stack>

            <Divider />

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
                    <TableCell>Tópico</TableCell>
                    <TableCell>Instrução</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>Criado em</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell><Typography fontWeight={600}>{s.name}</Typography></TableCell>
                      <TableCell>{s.topic?.name ?? s.topicId}</TableCell>
                      <TableCell sx={{ maxWidth: 420 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                          {s.instruction || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => triggerUpload(s.id)}>
                            {s.docxFileId ? 'Trocar' : 'Anexar'}
                          </Button>
                          {s.docxFileId && (
                            <>
                              <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} onClick={() => handleDownloadDocx(s)}>
                                Baixar
                              </Button>
                              <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteDocx(s.id)}>
                                Remover
                              </Button>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(s)}>Editar</Button>
                          <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(s)}>Excluir</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!items.length && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Stack alignItems="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">{loading ? 'Carregando...' : 'Nenhum registro encontrado.'}</Typography>
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
          </Stack>
        </MainCard>
      </Grid>

      <TopicSpecificFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingId={editId}
        initial={editInitial || undefined}
        onSaved={() => { setPage(0); load(); }}
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
            const res = await deleteTopicSpecific(deleteTarget.id);
            openSnackbar({ open: true, message: res.message || 'Tópico específico removido!', variant: 'alert', alert: { color: 'success' } } as any);
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
        title="Remover tópico específico"
        description={<span>Esta ação <b>não pode ser desfeita</b>. Deseja remover <b>{deleteTarget?.name}</b>?</span>}
      />

      <input
        ref={fileRef}
        onChange={onPickFile}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
      />
    </Grid>
  );
}
