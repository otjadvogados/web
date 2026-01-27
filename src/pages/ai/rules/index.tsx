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
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
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
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import {
  AiRulebook,
  listRulebooks,
  getRulebook,
  deleteRulebook,
  uploadRulebookFile,
  deleteRulebookFile,
  fetchRulebookFile,
  activateRulebook
} from 'api/aiRulebooks';
import RulebookFormDialog from 'sections/ai/rules/RulebookFormDialog';
import TextCarouselOverlay from 'components/loaders/TextCarouselOverlay';
import Permission from 'components/Permission';
import useAuth from 'hooks/useAuth';
import { usePermissions } from 'hooks/usePermissions';

export default function AIRulebooksPage() {
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const [items, setItems] = useState<AiRulebook[]>([]);
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
  const [editInitial, setEditInitial] = useState<AiRulebook | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // file upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  
  // overlay loading IA - mostra até "Salvando..."
  const [overlayOpen, setOverlayOpen] = useState(false);
  const overlayTexts = useMemo(
    () => [
      'Enviando arquivo…',
      'Analisando arquivo…',
      'Detectando contencioso/consultivo…',
      'Normalizando formatação…',
      'Detectando estilos/tamanhos…',
      'Identificando regras ABNT…',
      'Validando estrutura…',
      'Citações/jurisprudência com autos, relator, data e link…',
      'Assinaturas centralizadas…',
      'Persistindo resultado…',
      'Salvando…'
    ],
    []
  );
  
  // polling para verificar status de processamento
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listRulebooks({
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
        message: err?.response?.data?.message || 'Falha ao carregar regras e tipografia',
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

  // Polling para verificar status de processamento
  useEffect(() => {
    if (processingIds.size === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const checkStatus = async () => {
      for (const id of processingIds) {
        try {
          const rulebook = await getRulebook(id);
          // Se não está mais processando, remove do set
          if (rulebook.fileStatus !== 'PROCESSING') {
            setProcessingIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            // Recarrega a lista para atualizar o status
            load();
          }
        } catch (err) {
          // Em caso de erro, continua tentando
          console.warn('Erro ao verificar status do arquivo:', err);
        }
      }
    };

    // Verifica imediatamente e depois a cada 5 segundos
    checkStatus();
    pollingIntervalRef.current = setInterval(checkStatus, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [processingIds, load]);


  const onSearch = () => { setPage(0); load(); };
  const onClearFilters = () => { setSearch(''); setPage(0); load(); };

  const openCreate = () => { setEditId(null); setEditInitial(null); setFormOpen(true); };
  const openEdit = (row: AiRulebook) => { setEditId(row.id); setEditInitial(row); setFormOpen(true); };
  const requestDelete = (row: AiRulebook) => { setDeleteTarget({ id: row.id, name: row.name }); setDeleteOpen(true); };

  // ATIVAR (toggle simples)
  const handleActivate = async (id: string) => {
    try {
      await activateRulebook(id);
      openSnackbar({
        open: true,
        message: 'Regra ativada!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      load();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao ativar',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

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
    
    // Mostra overlay imediatamente para começar a animação
    setOverlayOpen(true);
    
    // Calcula tempo mínimo para mostrar todas as etapas
    // 11 etapas × 1.5s (stepMs + holdMs médio) = ~16.5s mínimo
    const minDisplayTime = overlayTexts.length * 1500;
    
    const uploadPromise = uploadRulebookFile(uploadId, file);
    const minTimePromise = new Promise(resolve => setTimeout(resolve, minDisplayTime));
    
    try {
      // Aguarda o upload OU o tempo mínimo (o que demorar mais)
      await Promise.all([uploadPromise, minTimePromise]);
      
      // Mantém overlay aberto um pouco mais para garantir que mostre "Salvando..."
      setTimeout(() => {
        setOverlayOpen(false);
      }, 2000);
      
      openSnackbar({
        open: true,
        message: 'Arquivo enviado com sucesso! O processamento está em andamento.',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      
      // Adiciona ao set de processamento para polling
      setProcessingIds((prev) => new Set(prev).add(uploadId));
      
      // Recarrega a lista para mostrar o arquivo
      load();
    } catch (err: any) {
      // Aguarda o tempo mínimo mesmo em caso de erro para mostrar as etapas
      await minTimePromise.catch(() => {});
      
      // Fecha overlay após mostrar as etapas
      setTimeout(() => {
        setOverlayOpen(false);
      }, 1000);
      
      // Trata timeout como sucesso parcial - arquivo foi enviado mas processamento continua
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        openSnackbar({
          open: true,
          message: 'Arquivo enviado, processamento em andamento. Você pode acompanhar o status na lista.',
          variant: 'alert',
          alert: { color: 'info' }
        } as any);
        
        // Adiciona ao set de processamento para polling
        setProcessingIds((prev) => new Set(prev).add(uploadId));
        
        // Recarrega após um tempo para verificar se o arquivo foi salvo
        setTimeout(() => {
          load();
        }, 2000);
        return;
      }
      
      // Outros erros
      const errorMessage = err?.response?.data?.reason
        ? `${err?.response?.data?.message || 'Falha no upload'} — ${err?.response?.data?.reason}`
        : err?.response?.data?.message || 'Falha no upload do arquivo';
      
      openSnackbar({
        open: true,
        message: errorMessage,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

  const handleDownload = async (r: AiRulebook) => {
    try {
      const { blob, filename } = await fetchRulebookFile(r.id, r.fileId ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (filename && filename.trim()) || `${(r.originalName || r.name || 'regras').replace(/[\\/:*?"<>|]/g, '_')}`;
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
      await deleteRulebookFile(id);
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

  const titleNode = useMemo(() => (
    <Stack direction="row" spacing={1} alignItems="center">
      <AIIcon />
      <Typography variant="h6" fontWeight={700}>Regras e tipografia</Typography>
    </Stack>
  ), []);

  return (
    <Permission resources={['ai.rules.read']}>
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
                <Permission resources={['ai.rules.create']}>
                  <Button variant="contained" startIcon={<PlusOutlined />} onClick={() => { setEditId(null); setEditInitial(null); setFormOpen(true); }}>
                    Nova Regra
                  </Button>
                </Permission>
              </Stack>
            </Stack>

            <Divider />

            {/* Lista */}
            {isMobile ? (
              <Box>
                {items.map((r) => (
                  <Box key={r.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography fontWeight={700}>{r.name}</Typography>
                        <Chip size="small" label={r.isActive ? 'ativa' : 'inativa'} color={r.isActive ? 'success' : 'default'} variant="outlined" />
                      </Stack>
                      {r.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">Responsável:</Typography>
                        {r.signatureUser ? (
                          <Chip size="small" icon={<Avatar sx={{ width: 16, height: 16 }}>{r.signatureUser.name?.[0] ?? 'R'}</Avatar>} label={r.signatureUser.name} />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {r.createdAt && (
                          <Typography variant="caption" color="text.secondary">
                            Criada em {new Date(r.createdAt).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                        <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => triggerUpload(r.id)}>
                          {r.fileId ? 'Trocar arquivo' : 'Anexar arquivo'}
                        </Button>
                        {r.fileId && (
                          <>
                            <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} onClick={() => handleDownload(r)}>
                              Baixar
                            </Button>
                            <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteFile(r.id)}>
                              Remover
                            </Button>
                          </>
                        )}
                        {!r.isActive && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleActivate(r.id)}
                          >
                            Ativar
                          </Button>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Permission resources={['ai.rules.update']}>
                          <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(r)}>
                            Editar
                          </Button>
                        </Permission>
                        <Permission resources={['ai.rules.delete']}>
                          <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(r)}>
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
                      {loading ? 'Carregando...' : 'Nenhuma regra e tipografia encontrada.'}
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
                      <TableCell>Responsável</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Arquivo</TableCell>
                      <TableCell>Criada em</TableCell>
                      {hasAnyPermission(['ai.rules.update', 'ai.rules.delete']) && (
                        <TableCell align="right">Ações</TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell><Typography fontWeight={600}>{r.name}</Typography></TableCell>
                        <TableCell sx={{ maxWidth: 420 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.signatureUser ? (
                            <Chip size="small" label={r.signatureUser.name} />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={r.isActive ? 'ativa' : 'inativa'} color={r.isActive ? 'success' : 'default'} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Button size="small" variant="outlined" startIcon={<UploadOutlined />} onClick={() => triggerUpload(r.id)}>
                              {r.fileId ? 'Trocar' : 'Anexar'}
                            </Button>
                            {r.fileId && (
                              <>
                                <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} onClick={() => handleDownload(r)}>
                                  Baixar
                                </Button>
                                <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteFile(r.id)}>
                                  Remover
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</TableCell>
                        {hasAnyPermission(['ai.rules.update', 'ai.rules.delete']) && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              {!r.isActive && (
                                <Permission resources={['ai.rules.update']}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleActivate(r.id)}
                                  >
                                    Ativar
                                  </Button>
                                </Permission>
                              )}
                              <Permission resources={['ai.rules.update']}>
                                <Button size="small" color="secondary" startIcon={<EditOutlined />} onClick={() => openEdit(r)}>
                                  Editar
                                </Button>
                              </Permission>
                              <Permission resources={['ai.rules.delete']}>
                                <Button size="small" color="error" startIcon={<DeleteOutlined />} onClick={() => requestDelete(r)}>
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
                        <TableCell colSpan={hasAnyPermission(['ai.rules.update', 'ai.rules.delete']) ? 7 : 6}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              {loading ? 'Carregando...' : 'Nenhuma regra e tipografia encontrada.'}
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
      <RulebookFormDialog
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
            const res = await deleteRulebook(deleteTarget.id);
            openSnackbar({ open: true, message: res.message || 'Regra e tipografia removida!', variant: 'alert', alert: { color: 'success' } } as any);
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
        title="Remover regra e tipografia"
        description={<span>Esta ação <b>não pode ser desfeita</b>. Deseja remover a regra e tipografia <b>{deleteTarget?.name}</b>?</span>}
      />

      {/* Input de arquivo oculto */}
      <input
        ref={fileRef}
        onChange={onPickFile}
        type="file"
        accept=".docx,.pdf,.md,.txt,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
      />

      {/* Overlay de processamento - mostra até "Salvando..." */}
      <TextCarouselOverlay
        open={overlayOpen}
        texts={overlayTexts}
        stepMs={1200}
        holdMs={1500}
        startAt="Enviando arquivo…"
      />
      </Grid>
    </Permission>
  );
}
