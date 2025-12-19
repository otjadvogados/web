import { useEffect, useState } from 'react';
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
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import AudioOutlined from '@ant-design/icons/AudioOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import TranscriptionUploadDialog from 'sections/ai/transcribe/TranscriptionUploadDialog';
import TranscriptionViewDialog from 'sections/ai/transcribe/TranscriptionViewDialog';
import { TranscriptionRecord } from 'api/aiTranscribe';

export default function AITranscribePage() {
  const [items, setItems] = useState<TranscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | null>(null);

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // Nota: Como não há endpoint de listagem, vamos manter um array local de transcrições criadas nesta sessão
  // Você pode expandir isso para usar localStorage ou outra forma de persistência se necessário

  const handleUploadSuccess = (record: TranscriptionRecord) => {
    setItems((prev) => [record, ...prev]);
    openSnackbar({
      open: true,
      message: 'Transcrição iniciada com sucesso!',
      variant: 'alert',
      alert: { color: 'success' }
    } as any);
  };

  const handleViewTranscription = (id: string) => {
    setSelectedTranscriptionId(id);
    setViewDialogOpen(true);
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

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AudioOutlined />
              <Typography variant="h6" fontWeight={700}>
                Transcrições de Áudio/Vídeo
              </Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {/* Ações */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                Faça upload de arquivos de áudio ou vídeo para transcrever
              </Typography>
              <Button variant="contained" startIcon={<UploadOutlined />} onClick={() => setUploadDialogOpen(true)}>
                Nova Transcrição
              </Button>
            </Stack>

            <Divider />

            {/* Lista de Transcrições */}
            {isMobile ? (
              <Box>
                {items.length === 0 ? (
                  <Stack alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma transcrição ainda. Faça upload de um arquivo para começar.
                    </Typography>
                  </Stack>
                ) : (
                  items.map((item) => (
                    <Box key={item.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                          <Typography fontWeight={600}>{item.filename}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {item.textPreview || 'Transcrição em processamento...'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            Modelo: {item.model}
                          </Typography>
                          {item.durationSeconds && (
                            <Typography variant="caption" color="text.secondary">
                              Duração: {formatDuration(item.durationSeconds)}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(item.createdAt)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                          <Button size="small" startIcon={<EyeOutlined />} onClick={() => handleViewTranscription(item.id)}>
                            Ver Detalhes
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  ))
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Arquivo</TableCell>
                      <TableCell>Preview</TableCell>
                      <TableCell>Modelo</TableCell>
                      <TableCell>Duração</TableCell>
                      <TableCell>Criado em</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhuma transcrição ainda. Faça upload de um arquivo para começar.
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
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
                          <TableCell>{item.model}</TableCell>
                          <TableCell>{formatDuration(item.durationSeconds)}</TableCell>
                          <TableCell>{formatDate(item.createdAt)}</TableCell>
                          <TableCell align="right">
                            <Button size="small" startIcon={<EyeOutlined />} onClick={() => handleViewTranscription(item.id)}>
                              Ver Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </MainCard>
      </Grid>

      {/* Dialog de Upload */}
      <TranscriptionUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      {/* Dialog de Visualização */}
      {selectedTranscriptionId && (
        <TranscriptionViewDialog
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedTranscriptionId(null);
          }}
          transcriptionId={selectedTranscriptionId}
        />
      )}
    </Grid>
  );
}

