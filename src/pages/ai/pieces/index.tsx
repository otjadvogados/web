import { useEffect, useMemo, useState, useRef } from 'react';
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
import AIIcon from 'components/icons/AIIcon';
import MainCard from 'components/MainCard';
import { listPieces, deletePiece, uploadPieceDocx, deletePieceDocx, fetchPieceDocx, AiPiece } from 'api/aiPieces';
import { listDepartments } from 'api/departments';
import { openSnackbar } from 'api/snackbar';
import PieceFormDialog from '../../../sections/ai/pieces/PieceFormDialog';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';

export default function AIPiecesPage() {
  // filtros/lista
  const [items, setItems] = useState<AiPiece[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [deptId, setDeptId] = useState<string>('');
  const [deptCatalog, setDeptCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<AiPiece | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // DOCX upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  async function load() {
    try {
      setLoading(true);
      const res = await listPieces({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        deptId: deptId || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar peças',
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
    // catálogo de departamentos para filtro e formulário
    (async () => {
      try {
        const res = await listDepartments({ page: 1, limit: 100 });
        // @ts-ignore - compat com seu tipo existente
        setDeptCatalog(res.data?.map((d: any) => ({ id: d.id, name: d.name })) || []);
      } catch {}
    })();
  }, []);

  const onSearch = () => { setPage(0); load(); };
  const onClearFilters = () => { setSearch(''); setDeptId(''); setPage(0); load(); };

  const openCreate = () => { setEditId(null); setEditInitial(null); setFormOpen(true); };
  const openEdit = (row: AiPiece) => { setEditId(row.id); setEditInitial(row); setFormOpen(true); };
  const requestDelete = (row: AiPiece) => { setDeleteTarget({ id: row.id, name: row.name }); setDeleteOpen(true); };

  // DOCX handlers
  const triggerUpload = (id: string) => {
    setPendingUploadId(id);
    fileRef.current?.click();
  };

  // Força o download do DOCX (igual ao fluxo do avatar: busca blob autenticado e baixa)
  const handleDownloadDocx = async (p: AiPiece) => {
    try {
      const { blob, filename } = await fetchPieceDocx(p.id, p.docxFileId ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename && filename.trim()) || `${(p.name || 'documento').replace(/[\\/:*?"<>|]/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao baixar o documento',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingUploadId) return;
    
    try {
      await uploadPieceDocx(pendingUploadId, file);
      openSnackbar({ 
        open: true, 
        message: 'Documento anexado com sucesso!', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
      load(); // recarrega a lista
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || 'Falha no upload do documento', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setPendingUploadId(null);
    }
  };

  const handleDeleteDocx = async (id: string) => {
    try {
      await deletePieceDocx(id);
      openSnackbar({ 
        open: true, 
        message: 'Documento removido com sucesso!', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
      load(); // recarrega a lista
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || 'Falha ao remover documento', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>Peças</Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {/* Filtros / Ações */}
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
                label="Departamento"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {deptCatalog.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name}
                  </MenuItem>
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
                  Nova Peça
                </Button>
              </Stack>
            </Stack>

            <Divider />

            {/* Listing */}
            {isMobile ? (
              <Box>
                {items.map((p) => (
                  <Box key={p.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography fontWeight={700}>{p.name}</Typography>
                        <Chip
                          size="small"
                          label={p.isActive ? 'ativa' : 'inativa'}
                          color={p.isActive ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </Stack>
                      {p.instruction && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%'
                          }}
                        >
                          {p.instruction}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip size="small" label={`Depto: ${p.department?.name ?? '—'}`} />
                        <Chip size="small" label={`Cliente: ${p.customer?.displayName ?? p.customer?.name ?? '—'}`} />
                        {p.createdAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            Criada em {new Date(p.createdAt).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                      
                      {/* Documento DOCX */}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          startIcon={<UploadOutlined />}
                          onClick={() => triggerUpload(p.id)}
                        >
                          {p.docxFileId ? 'Trocar DOCX' : 'Anexar DOCX'}
                        </Button>
                        {p.docxFileId && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<DownloadOutlined />}
                              onClick={() => handleDownloadDocx(p)}
                            >
                              Baixar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() => handleDeleteDocx(p.id)}
                            >
                              Remover
                            </Button>
                          </>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(p)}>
                          Editar
                        </Button>
                        <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(p)}>
                          Excluir
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                {!items.length && (
                  <Stack alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Carregando...' : 'Nenhuma peça encontrada.'}
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
                      <TableCell>Instrução</TableCell>
                      <TableCell>Departamento</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Documento</TableCell>
                      <TableCell>Criada em</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((p) => (
                      <TableRow key={p.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{p.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 420, overflow: 'hidden' }}>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%'
                            }}
                          >
                            {p.instruction || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{p.department?.name ?? '—'}</TableCell>
                        <TableCell>{p.customer?.displayName ?? p.customer?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={p.isActive ? 'ativa' : 'inativa'} color={p.isActive ? 'success' : 'default'} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Button 
                              size="small" 
                              variant="outlined" 
                              startIcon={<UploadOutlined />}
                              onClick={() => triggerUpload(p.id)}
                            >
                              {p.docxFileId ? 'Trocar' : 'Anexar'}
                            </Button>
                            {p.docxFileId && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<DownloadOutlined />}
                                  onClick={() => handleDownloadDocx(p)}
                                >
                                  Baixar
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  onClick={() => handleDeleteDocx(p.id)}
                                >
                                  Remover
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(p)}>
                              Editar
                            </Button>
                            <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(p)}>
                              Excluir
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              {loading ? 'Carregando...' : 'Nenhuma peça encontrada.'}
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
      <PieceFormDialog
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
            const res = await deletePiece(deleteTarget.id);
            openSnackbar({ open: true, message: res.message || 'Peça removida!', variant: 'alert', alert: { color: 'success' } } as any);
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
        title="Remover peça"
        description={<span>Esta ação <b>não pode ser desfeita</b>. Deseja remover a peça <b>{deleteTarget?.name}</b>?</span>}
      />

      {/* Input de arquivo oculto para upload de DOCX */}
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
