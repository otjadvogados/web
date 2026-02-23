import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
import TablePagination from '@mui/material/TablePagination';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import AIIcon from 'components/icons/AIIcon';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import {
  AiOfficeDocument,
  listOfficeDocuments,
  getOfficeDocument,
  deleteOfficeDocument,
  uploadOfficeDocumentFile,
  deleteOfficeDocumentFile,
  fetchOfficeDocumentFile
} from 'api/aiOfficeDocuments';
import OfficeDocumentFormDialog from 'sections/ai/office-documents/OfficeDocumentFormDialog';
import Permission from 'components/Permission';
import { usePermissions } from 'hooks/usePermissions';
import { renderAsync } from 'docx-preview';

export default function AIOfficeDocumentsPage() {
  const { hasAnyPermission } = usePermissions();
  const [items, setItems] = useState<AiOfficeDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  // dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<AiOfficeDocument | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // file upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  
  // visualizar arquivo
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<AiOfficeDocument | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [viewTextContent, setViewTextContent] = useState<string | null>(null);
  const [docxArrayBuffer, setDocxArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [loadingView, setLoadingView] = useState(false);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listOfficeDocuments({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar documentos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, sortBy, sortOrder]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sortBy, sortOrder]);

  // Renderiza DOCX quando o modal abrir e o container estiver disponível
  useEffect(() => {
    if (viewOpen && docxArrayBuffer && docxContainerRef.current && !loadingView) {
      const renderDocx = async () => {
        try {
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
            await renderAsync(docxArrayBuffer, docxContainerRef.current, undefined, {
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              breakPages: false,
              useBase64URL: true
            });
          }
        } catch (err) {
          console.error('Erro ao renderizar DOCX:', err);
          openSnackbar({
            open: true,
            message: 'Erro ao renderizar arquivo DOCX',
            variant: 'alert',
            alert: { color: 'error' }
          } as any);
        }
      };
      const timer = setTimeout(() => {
        renderDocx();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewOpen, docxArrayBuffer, loadingView]);

  const onSearch = () => { setPage(0); load(); };
  const onClearFilters = () => { setSearch(''); setPage(0); load(); };

  const openCreate = () => { setEditId(null); setEditInitial(null); setFormOpen(true); };
  const openEdit = (row: AiOfficeDocument) => { setEditId(row.id); setEditInitial(row); setFormOpen(true); };
  const requestDelete = (row: AiOfficeDocument) => { setDeleteTarget({ id: row.id, name: row.name }); setDeleteOpen(true); };

  // FILE handlers
  const triggerUpload = (id: string) => {
    setPendingUploadId(id);
    fileRef.current?.click();
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingUploadId) return;
    
    const uploadId = pendingUploadId;
    setPendingUploadId(null);
    
    try {
      await uploadOfficeDocumentFile(uploadId, file);
      openSnackbar({
        open: true,
        message: 'Arquivo enviado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      load();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Falha no upload do arquivo';
      openSnackbar({
        open: true,
        message: errorMessage,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

  const handleDownload = async (doc: AiOfficeDocument) => {
    try {
      const { blob, filename } = await fetchOfficeDocumentFile(doc.id, doc.fileId ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename && filename.trim()) || `${(doc.originalName || doc.name || 'documento').replace(/[\\/:*?"<>|]/g, '_')}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao baixar o arquivo',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await deleteOfficeDocumentFile(id);
      openSnackbar({
        open: true,
        message: 'Arquivo removido com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      load();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover arquivo',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

  const getFileType = (mime?: string | null, filename?: string | null) => {
    if (mime) {
      if (mime.includes('pdf')) return 'pdf';
      if (mime.includes('word') || mime.includes('document')) return 'docx';
      if (mime.includes('text')) return 'text';
      if (mime.includes('markdown')) return 'markdown';
    }
    if (filename) {
      const ext = filename.toLowerCase().split('.').pop();
      if (ext === 'pdf') return 'pdf';
      if (ext === 'docx' || ext === 'doc') return 'docx';
      if (ext === 'txt') return 'text';
      if (ext === 'md') return 'markdown';
    }
    return 'unknown';
  };

  const handleViewFile = async (doc: AiOfficeDocument) => {
    if (!doc.fileId) return;
    
    setViewingDocument(doc);
    setViewOpen(true);
    setLoadingView(true);
    setViewUrl(null);
    setViewTextContent(null);
    
    try {
      const { blob } = await fetchOfficeDocumentFile(doc.id, doc.fileId);
      const fileType = getFileType(doc.fileMime, doc.originalName);
      
      // Para arquivos de texto, ler o conteúdo diretamente
      if (fileType === 'text' || fileType === 'markdown') {
        const text = await blob.text();
        setViewTextContent(text);
      } else if (fileType === 'docx') {
        // Para DOCX, armazena o arrayBuffer para o useEffect renderizar
        const arrayBuffer = await blob.arrayBuffer();
        setDocxArrayBuffer(arrayBuffer);
      } else {
        // Para PDF e outros, criar URL do blob
        const url = URL.createObjectURL(blob);
        setViewUrl(url);
      }
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao carregar o arquivo',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      setViewOpen(false);
      setViewingDocument(null);
    } finally {
      setLoadingView(false);
    }
  };

  const handleCloseView = () => {
    if (viewUrl) {
      URL.revokeObjectURL(viewUrl);
    }
    // Limpa o container do DOCX
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
    }
    setViewOpen(false);
    setViewingDocument(null);
    setViewUrl(null);
    setViewTextContent(null);
    setDocxArrayBuffer(null);
    setLoadingView(false);
  };

  const titleNode = useMemo(() => (
    <Stack direction="row" spacing={1} alignItems="center">
      <AIIcon />
      <Typography variant="h6" fontWeight={700}>Documentos Gerais do Escritório</Typography>
    </Stack>
  ), []);

  return (
    <Permission resources={['office-documents.read']}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <MainCard title={titleNode} contentSX={{ p: 0 }}>
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
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>
                  Buscar
                </Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>
                  Limpar
                </Button>
                <Permission resources={['office-documents.create']}>
                  <Button variant="contained" startIcon={<PlusOutlined />} onClick={openCreate}>
                    Novo Documento
                  </Button>
                </Permission>
              </Stack>
            </Stack>

            <Divider />

            {/* Lista */}
            {isMobile ? (
              <Box>
                {items.map((doc) => (
                  <Box key={doc.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={0.75}>
                      <Typography fontWeight={700}>{doc.name}</Typography>
                      {doc.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {doc.createdAt && (
                          <Typography variant="caption" color="text.secondary">
                            Criado em {new Date(doc.createdAt).toLocaleString()}
                          </Typography>
                        )}
                        {doc.uploadedAt && (
                          <Typography variant="caption" color="text.secondary">
                            Upload em {new Date(doc.uploadedAt).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                        <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => triggerUpload(doc.id)}>
                          {doc.fileId ? 'Trocar arquivo' : 'Anexar arquivo'}
                        </Button>
                        {doc.fileId && (
                          <>
                            <Button size="small" variant="outlined" startIcon={<EyeOutlined />} onClick={() => handleViewFile(doc)}>
                              Visualizar
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} onClick={() => handleDownload(doc)}>
                              Baixar
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteFile(doc.id)}>
                              Remover
                            </Button>
                          </>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Permission resources={['office-documents.update']}>
                          <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(doc)}>
                            Editar
                          </Button>
                        </Permission>
                        <Permission resources={['office-documents.delete']}>
                          <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(doc)}>
                            Excluir
                          </Button>
                        </Permission>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                {!items.length && (
                  <Stack alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Carregando...' : 'Nenhum documento encontrado.'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell onClick={() => { setSortBy('name'); setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc')); }} sx={{ cursor: 'pointer' }}>
                        Nome
                      </TableCell>
                      <TableCell>Descrição</TableCell>
                      <TableCell>Arquivo</TableCell>
                      <TableCell>Criado em</TableCell>
                      {hasAnyPermission(['office-documents.update', 'office-documents.delete']) && (
                        <TableCell align="right">Ações</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((doc) => (
                      <TableRow key={doc.id} hover>
                        <TableCell><Typography fontWeight={600}>{doc.name}</Typography></TableCell>
                        <TableCell sx={{ maxWidth: 420 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => triggerUpload(doc.id)}>
                              {doc.fileId ? 'Trocar' : 'Anexar'}
                            </Button>
                            {doc.fileId && (
                              <>
                                <Button size="small" variant="outlined" startIcon={<EyeOutlined />} onClick={() => handleViewFile(doc)}>
                                  Visualizar
                                </Button>
                                <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} onClick={() => handleDownload(doc)}>
                                  Baixar
                                </Button>
                                <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteFile(doc.id)}>
                                  Remover
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{doc.createdAt ? new Date(doc.createdAt).toLocaleString() : '—'}</TableCell>
                        {hasAnyPermission(['office-documents.update', 'office-documents.delete']) && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Permission resources={['office-documents.update']}>
                                <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(doc)}>
                                  Editar
                                </Button>
                              </Permission>
                              <Permission resources={['office-documents.delete']}>
                                <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(doc)}>
                                  Excluir
                                </Button>
                              </Permission>
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={hasAnyPermission(['office-documents.update', 'office-documents.delete']) ? 5 : 4}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              {loading ? 'Carregando...' : 'Nenhum documento encontrado.'}
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

      {/* Dialog criar/editar */}
      <OfficeDocumentFormDialog
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
            const res = await deleteOfficeDocument(deleteTarget.id);
            openSnackbar({ open: true, message: res.message || 'Documento removido!', variant: 'alert', alert: { color: 'success' } } as any);
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
        title="Remover documento"
        description={<span>Esta ação <b>não pode ser desfeita</b>. Deseja remover o documento <b>{deleteTarget?.name}</b>?</span>}
      />

      {/* Modal de visualização de arquivo */}
      <Dialog
        open={viewOpen}
        onClose={handleCloseView}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            height: '90vh',
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {viewingDocument?.originalName || viewingDocument?.name || 'Visualizar arquivo'}
            </Typography>
            <IconButton size="small" onClick={handleCloseView}>
              <CloseOutlined />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          dividers={false}
          sx={{
            p: 0,
            height: '100%',
            overflow: 'auto',
            bgcolor: '#f1f3f4',
            '&::-webkit-scrollbar': {
              width: '8px'
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f3f4'
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#dadce0',
              borderRadius: '4px'
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#bdc1c6'
            }
          }}
        >
          {loadingView ? (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', minHeight: 400 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Carregando arquivo...
              </Typography>
            </Stack>
          ) : viewingDocument ? (
            (() => {
              const fileType = getFileType(viewingDocument.fileMime, viewingDocument.originalName);
              
              if (fileType === 'pdf') {
                return (
                  <Box
                    component="iframe"
                    src={viewUrl || ''}
                    sx={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      minHeight: 500
                    }}
                  />
                );
              } else if (fileType === 'docx') {
                return (
                  <Box
                    sx={{
                      minHeight: '100%',
                      px: 4,
                      py: 3,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-start'
                    }}
                  >
                    <Box
                      ref={docxContainerRef}
                      sx={{
                        width: '100%',
                        maxWidth: '900px',
                        bgcolor: '#fff',
                        borderRadius: '4px',
                        boxShadow: '0 1px 3px rgba(60,64,67,.3), 0 4px 8px rgba(60,64,67,.15)',
                        padding: '48px 56px',
                        boxSizing: 'border-box',
                        '& .docx-wrapper': {
                          background: 'transparent !important',
                          boxShadow: 'none !important',
                          border: 'none !important',
                          padding: '0 !important',
                          margin: '0 !important'
                        },
                        '& .docx': {
                          background: 'transparent !important',
                          boxShadow: 'none !important',
                          border: 'none !important',
                          margin: '0 !important'
                        },
                        '& .docx-wrapper > section': {
                          background: 'transparent !important',
                          boxShadow: 'none !important',
                          border: 'none !important'
                        },
                        '& .docx-wrapper [style*="position:absolute"], & .docx-wrapper [style*="position: absolute"]': {
                          background: 'transparent !important',
                          boxShadow: 'none !important'
                        },
                        '& .docx-wrapper div': {
                          maxWidth: '100%'
                        },
                        '& .docx-wrapper div[style*="width:"][style*="height:"]': {
                          background: 'transparent !important'
                        },
                        '& img': {
                          maxWidth: '100%',
                          height: 'auto',
                          display: 'block'
                        }
                      }}
                    />
                  </Box>
                );
              } else if (fileType === 'text' || fileType === 'markdown') {
                return (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      overflow: 'auto',
                      p: 2,
                      bgcolor: 'background.default'
                    }}
                  >
                    <Box
                      component="pre"
                      sx={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0
                      }}
                    >
                      {viewTextContent || 'Carregando conteúdo...'}
                    </Box>
                  </Box>
                );
              } else {
                return (
                  <Stack spacing={2} sx={{ p: 3, alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                    <Typography variant="h6" color="text.secondary">
                      Tipo de arquivo não suportado para visualização
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Este tipo de arquivo não pode ser visualizado diretamente no navegador.
                      <br />
                      Use o botão "Baixar" para abrir o arquivo.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DownloadOutlined />}
                      onClick={() => {
                        if (viewingDocument) {
                          handleDownload(viewingDocument);
                        }
                      }}
                    >
                      Baixar arquivo
                    </Button>
                  </Stack>
                );
              }
            })()
          ) : (
            <Stack alignItems="center" justifyContent="center" sx={{ height: '100%', minHeight: 400 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum arquivo para visualizar
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseView}>Fechar</Button>
          {viewingDocument && (
            <Button
              variant="contained"
              startIcon={<DownloadOutlined />}
              onClick={() => {
                if (viewingDocument) {
                  handleDownload(viewingDocument);
                }
              }}
            >
              Baixar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Input de arquivo oculto */}
      <input
        ref={fileRef}
        onChange={onPickFile}
        type="file"
        accept=".docx,.pdf,.md,.txt,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
      />
      </Grid>
    </Permission>
  );
}
