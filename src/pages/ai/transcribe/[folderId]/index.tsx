import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import TranscriptionViewDialog from 'sections/ai/transcribe/TranscriptionViewDialog';
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
              <Permission resources={['transcriptions.read']}>
                <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Arquivo</TableCell>
                      <TableCell>Preview</TableCell>
                      <TableCell>Criado em</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {folder.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography fontWeight={600}>{item.filename}</Typography>
                        </TableCell>
                        <TableCell sx={{ maxWidth: 400 }}>
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
                            {item.textPreview || 'Transcrição em processamento...'}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {item.files?.audio?.url && (
                              <Button
                                size="small"
                                variant="outlined"
                                href={item.files.audio.url}
                                target="_blank"
                                download
                              >
                                Download Áudio
                              </Button>
                            )}
                            <Button size="small" startIcon={<EyeOutlined />} onClick={() => handleViewTranscription(item.id)}>
                              Ver
                            </Button>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              </Permission>
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
    </Grid>
  );
}
