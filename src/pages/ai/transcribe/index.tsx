import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme, alpha } from '@mui/material/styles';

import UploadOutlined from '@ant-design/icons/UploadOutlined';
import AudioOutlined from '@ant-design/icons/AudioOutlined';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';

import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import TranscriptionUploadDialog from 'sections/ai/transcribe/TranscriptionUploadDialog';
import TranscriptionViewDialog from 'sections/ai/transcribe/TranscriptionViewDialog';
import FolderTile from 'sections/ai/transcribe/FolderTile';
import Permission from 'components/Permission';
import { TranscriptionRecord, TranscriptionFolder, listTranscriptionFolders } from 'api/aiTranscribe';

export default function AITranscribePage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [folders, setFolders] = useState<TranscriptionFolder[]>([]);
  const [allFolders, setAllFolders] = useState<TranscriptionFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTranscriptionId, setSelectedTranscriptionId] = useState<string | null>(null);
  const [selectedTranscription, setSelectedTranscription] = useState<TranscriptionRecord | null>(null);
  const [search, setSearch] = useState('');

  const isDark = theme.palette.mode === 'dark';

  const handleFolderClick = (folderId: string) => {
    navigate(`/ai/transcribe/${folderId}`);
  };

  const applySearchFilter = (foldersArray: TranscriptionFolder[], q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) return foldersArray;
    return foldersArray.filter((folder) => (folder.name || '').toLowerCase().includes(term));
  };

  const loadTranscriptions = async () => {
    try {
      setLoading(true);
      const response = await listTranscriptionFolders();
      const foldersArray = Array.isArray(response) ? response : [];

      setAllFolders(foldersArray);
      setFolders(applySearchFilter(foldersArray, search));
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar transcrições',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);

      setFolders([]);
      setAllFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUploadSuccess = async (record: TranscriptionRecord) => {
    // Abre o modal imediatamente com os dados retornados do upload
    setSelectedTranscription(record);
    setSelectedTranscriptionId(record.id);
    setViewDialogOpen(true);
    
    // Recarrega as pastas em background (para atualizar a lista)
    loadTranscriptions();
    
    openSnackbar({
      open: true,
      message: 'Transcrição iniciada com sucesso!',
      variant: 'alert',
      alert: { color: 'success' }
    } as any);
  };

  const totalFolders = useMemo(() => (Array.isArray(folders) ? folders.length : 0), [folders]);

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
            {/* Ações e Busca */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.25}
              alignItems={{ xs: 'stretch', sm: 'center' }}
              justifyContent="space-between"
            >
              <TextField
                label="Buscar pastas"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  setFolders(applySearchFilter(allFolders, value));
                }}
                placeholder="Buscar por nome da pasta..."
                sx={{ flex: 1 }}
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Permission resources={['transcriptions.read']}>
                  <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={loadTranscriptions} disabled={loading}>
                    Atualizar
                  </Button>
                </Permission>
                <Permission resources={['transcriptions.create']}>
                  <Button variant="contained" startIcon={<UploadOutlined />} onClick={() => setUploadDialogOpen(true)}>
                    Nova Transcrição
                  </Button>
                </Permission>
              </Stack>
            </Stack>

            <Divider />

            {/* Lista de Transcrições */}
            <Permission resources={['transcriptions.read']}>
              {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : totalFolders === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {search ? 'Nenhuma pasta encontrada.' : 'Nenhuma pasta ainda. Faça upload de uma transcrição para começar.'}
                </Typography>
              </Stack>
            ) : (
              <>
                {/* Header estilo Explorer */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Pastas
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totalFolders} {totalFolders === 1 ? 'pasta' : 'pastas'}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    minHeight: '60vh',
                    p: 2,

                    // Explorer-like grid (tiles em linha)
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(auto-fill, minmax(220px, 1fr))',
                      sm: 'repeat(auto-fill, minmax(240px, 1fr))',
                      md: 'repeat(auto-fill, minmax(260px, 1fr))',
                      lg: 'repeat(auto-fill, minmax(280px, 1fr))'
                    },

                    gap: 1.25, // ~10px
                    alignContent: 'start',
                    justifyItems: 'start'
                  }}
                >
                  {folders.map((folder) => (
                    <FolderTile key={folder.id} folder={folder} onClick={handleFolderClick} selected={false} />
                  ))}
                </Box>
              </>
            )}

            {/* Empty state extra (caso folders vire array vazio por algum motivo) */}
            {!loading && totalFolders === 0 && search && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 6
                }}
              >
                <FolderOutlined
                  style={{
                    fontSize: 64,
                    color: alpha(theme.palette.text.primary, isDark ? 0.25 : 0.18),
                    marginBottom: 16
                  }}
                />
                <Typography variant="body1" color="text.secondary">
                  Nenhuma pasta encontrada.
                </Typography>
              </Box>
            )}
            </Permission>
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
            setSelectedTranscription(null);
          }}
          transcriptionId={selectedTranscriptionId}
          initialTranscription={selectedTranscription || undefined}
          onDeleted={() => {
            // Recarrega as pastas após deletar
            loadTranscriptions();
          }}
        />
      )}
    </Grid>
  );
}
