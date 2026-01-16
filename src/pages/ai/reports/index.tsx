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

import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import FolderOutlined from '@ant-design/icons/FolderOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';

import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { listReportFolders, type ReportFolderResponse } from 'api/reports';
import Permission from 'components/Permission';
import FolderTile from 'sections/ai/transcribe/FolderTile';

export default function ReportsPage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [folders, setFolders] = useState<ReportFolderResponse[]>([]);
  const [allFolders, setAllFolders] = useState<ReportFolderResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const isDark = theme.palette.mode === 'dark';

  const handleFolderClick = (folderId: string) => {
    navigate(`/ai/reports/${folderId}`);
  };

  const applySearchFilter = (foldersArray: ReportFolderResponse[], q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) return foldersArray;
    return foldersArray.filter((folder) => (folder.name || '').toLowerCase().includes(term));
  };

  const loadFolders = async () => {
    try {
      setLoading(true);
      const foldersArray = await listReportFolders();

      setAllFolders(foldersArray);
      setFolders(applySearchFilter(foldersArray, search));
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar relatórios',
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
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Aplica filtro quando search mudar
    setFolders(applySearchFilter(allFolders, search));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, allFolders]);

  const totalFolders = useMemo(() => (Array.isArray(folders) ? folders.length : 0), [folders]);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <FileTextOutlined />
              <Typography variant="h6" fontWeight={700}>
                Relatórios
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
                }}
                placeholder="Buscar por nome da pasta..."
                sx={{ flex: 1 }}
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Permission resources={['customers.read']}>
                  <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={loadFolders} disabled={loading}>
                    Atualizar
                  </Button>
                </Permission>
              </Stack>
            </Stack>

            <Divider />

            {/* Lista de Pastas */}
            <Permission resources={['customers.read']}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : totalFolders === 0 ? (
                <Stack alignItems="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {search ? 'Nenhuma pasta encontrada.' : 'Nenhuma pasta ainda. Gere relatórios a partir de transcrições para começar.'}
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
                    {folders.map((folder) => {
                      // Converte ReportFolderResponse para formato esperado pelo FolderTile
                      // FolderTile usa items.length para mostrar contador, então usamos reports como items
                      const folderForTile = {
                        ...folder,
                        items: folder.reports || [] // Usa reports como items para o contador funcionar
                      };
                      return (
                        <FolderTile 
                          key={folder.id} 
                          folder={folderForTile as any} 
                          onClick={handleFolderClick} 
                          selected={false} 
                        />
                      );
                    })}
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
    </Grid>
  );
}
