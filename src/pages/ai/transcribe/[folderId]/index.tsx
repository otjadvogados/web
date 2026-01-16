import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import TranscriptionViewDialog from 'sections/ai/transcribe/TranscriptionViewDialog';
import GenerateReportsDialog from 'sections/ai/transcribe/GenerateReportsDialog';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import Permission from 'components/Permission';
import { TranscriptionRecord, TranscriptionFolder, listTranscriptionFolders, deleteTranscription } from 'api/aiTranscribe';

export default function TranscriptionFolderPage() {
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();
  const [folder, setFolder] = useState<TranscriptionFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | null>(null);
  const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TranscriptionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [generateReportsDialogOpen, setGenerateReportsDialogOpen] = useState(false);
  const [selectedTranscriptionForReport, setSelectedTranscriptionForReport] = useState<TranscriptionRecord | null>(null);
  const [search, setSearch] = useState('');

  const loadFolder = async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      const folders = await listTranscriptionFolders();
      const foundFolder = folders.find((f) => f.id === folderId);
      
      if (foundFolder) {
        setFolder(foundFolder);
      } else {
        openSnackbar({
          open: true,
          message: 'Pasta não encontrada',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        navigate('/ai/transcribe');
      }
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar pasta',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  const handleViewTranscription = (id: string) => {
    // Tenta encontrar a transcrição nos dados já carregados da pasta
    if (!folder) {
      openSnackbar({
        open: true,
        message: 'Pasta ainda não carregada. Aguarde...',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }

    const transcription = folder.items.find((item) => item.id === id);
    if (transcription) {
      setSelectedTranscription(transcription);
      setSelectedTranscriptionId(id);
      setViewDialogOpen(true);
    } else {
      // Se não encontrou, mostra erro
      openSnackbar({
        open: true,
        message: `Transcrição ${id} não encontrada na pasta ${folder.name}`,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const applySearchFilter = (items: TranscriptionRecord[], q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => 
      (item.filename || '').toLowerCase().includes(term) ||
      (item.textPreview || '').toLowerCase().includes(term)
    );
  };

  const filteredItems = useMemo(() => {
    if (!folder || !folder.items) return [];
    return applySearchFilter(folder.items, search);
  }, [folder, search]);

  const handleRequestDelete = (item: TranscriptionRecord) => {
    setDeleteTarget(item);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      setDeleting(true);
      await deleteTranscription(deleteTarget.id);
      
      openSnackbar({
        open: true,
        message: 'Transcrição removida com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      
      // Recarrega a pasta para atualizar a lista
      loadFolder();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover transcrição',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                startIcon={<ArrowLeftOutlined />}
                onClick={() => navigate('/ai/transcribe')}
                sx={{ mr: 1 }}
              >
                Voltar
              </Button>
              <Typography variant="h6" fontWeight={700}>
                {folder?.name || 'Carregando...'}
              </Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !folder ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Pasta não encontrada.
                </Typography>
              </Stack>
            ) : folder.items.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhuma transcrição nesta pasta.
                </Typography>
              </Stack>
            ) : (
              <>
                {/* Busca */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <TextField
                    label="Buscar transcrições"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome..."
                    sx={{ flex: 1 }}
                    size="small"
                  />
                  <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={loadFolder} disabled={loading}>
                    Atualizar
                  </Button>
                </Stack>

                <Divider />

                {/* Lista de Transcrições */}
                <Permission resources={['transcriptions.read']}>
                  {filteredItems.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Nenhum resultado encontrado.' : 'Nenhuma transcrição nesta pasta.'}
                      </Typography>
                    </Stack>
                  ) : (
                    <>
                      {/* Header estilo Explorer */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {folder.name || 'Transcrições'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {filteredItems.length} {filteredItems.length === 1 ? 'transcrição' : 'transcrições'}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          minHeight: '60vh',
                          p: 2,
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(auto-fill, minmax(300px, 1fr))',
                            md: 'repeat(auto-fill, minmax(320px, 1fr))',
                            lg: 'repeat(auto-fill, minmax(340px, 1fr))'
                          },
                          gap: 1.5,
                          alignContent: 'start',
                          justifyItems: 'stretch'
                        }}
                      >
                        {filteredItems.map((item) => (
                          <Box
                            key={item.id}
                            sx={{
                              p: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 2,
                                borderColor: 'primary.main'
                              }
                            }}
                          >
                            <Stack spacing={1.5}>
                              {/* Cabeçalho da Transcrição */}
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <FileTextOutlined style={{ fontSize: 20, color: folder.customerId ? '#4CAF50' : '#2196F3' }} />
                                  <Typography fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                    {item.filename}
                                  </Typography>
                                </Stack>
                                {item.textPreview && (
                                  <Typography variant="caption" color="text.secondary" sx={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                  }}>
                                    {item.textPreview}
                                  </Typography>
                                )}
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(item.createdAt)}
                                  </Typography>
                                  {item.durationSeconds && (
                                    <>
                                      <Typography variant="caption" color="text.secondary">•</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {formatDuration(item.durationSeconds)}
                                      </Typography>
                                    </>
                                  )}
                                </Stack>
                              </Stack>

                              <Divider />

                              {/* Relatórios se houver */}
                              {item.reports && item.reports.length > 0 && (
                                <Stack spacing={1}>
                                  <Typography variant="subtitle2" fontWeight={600}>
                                    Relatórios ({item.reports.length})
                                  </Typography>
                                  {item.reports.map((report) => (
                                    <Chip
                                      key={report.id}
                                      label={report.reportType}
                                      size="small"
                                      variant="outlined"
                                      color={report.isFinalized ? 'success' : 'default'}
                                    />
                                  ))}
                                </Stack>
                              )}

                              {/* Ações */}
                              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                                {item.files?.audio?.url && (
                                  <Tooltip title="Download Áudio">
                                    <IconButton
                                      size="small"
                                      component="a"
                                      href={item.files.audio.url}
                                      target="_blank"
                                      download
                                    >
                                      <DownloadOutlined />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <Tooltip title="Ver">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewTranscription(item.id)}
                                  >
                                    <EyeOutlined />
                                  </IconButton>
                                </Tooltip>
                                <Permission resources={['customers.create']}>
                                  <Tooltip title="Gerar Relatórios">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        setSelectedTranscriptionForReport(item);
                                        setGenerateReportsDialogOpen(true);
                                      }}
                                    >
                                      <FileTextOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                                <Permission resources={['transcriptions.delete']}>
                                  <Tooltip title="Excluir">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleRequestDelete(item)}
                                    >
                                      <DeleteOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Permission>
              </>
            )}
          </Stack>
        </MainCard>
      </Grid>

      {/* Dialog de Visualização */}
      {selectedTranscriptionId && (
        <TranscriptionViewDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedTranscriptionId(null);
            setSelectedTranscription(null);
          }}
          transcriptionId={selectedTranscriptionId}
          initialTranscription={selectedTranscription || undefined}
          onDeleted={() => {
            // Recarrega a pasta após deletar
            loadFolder();
          }}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onCancel={() => {
          if (deleting) return;
          setDeleteDialogOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Excluir Transcrição"
        description={
          deleteTarget ? (
            <>
              Tem certeza que deseja excluir a transcrição <strong>{deleteTarget.filename}</strong>?
              <br />
              Esta ação não pode ser desfeita.
            </>
          ) : undefined
        }
      />

      {/* Dialog de Gerar Relatórios */}
      {selectedTranscriptionForReport && (
        <GenerateReportsDialog
          open={generateReportsDialogOpen}
          onClose={() => {
            setGenerateReportsDialogOpen(false);
            setSelectedTranscriptionForReport(null);
          }}
          customerId={selectedTranscriptionForReport.customerId || (folder?.type === 'customer' ? folder.customerId : null)}
          transcriptionId={selectedTranscriptionForReport.id}
          onSuccess={(reports) => {
            // Navega para o primeiro relatório gerado para edição
            if (reports && reports.length > 0 && reports[0]?.id) {
              openSnackbar({
                open: true,
                message: 'Relatórios gerados! Redirecionando para edição...',
                variant: 'alert',
                alert: { color: 'success' }
              } as any);
              
              // Determina o customerId para navegação (pode ser null para relatórios gerais)
              const customerIdForReport = selectedTranscriptionForReport?.customerId || (folder?.type === 'customer' ? folder.customerId : null);
              
              // Se for relatório geral (sem customerId), usa 'general' na rota
              const routeCustomerId = customerIdForReport || 'general';
              
              // Navega para a edição do primeiro relatório
              setTimeout(() => {
                navigate(`/ai/reports/${routeCustomerId}/${reports[0].id}/edit`, {
                  state: { folderId: folder?.id || 'general' }
                });
              }, 500);
            }
          }}
        />
      )}
    </Grid>
  );
}
