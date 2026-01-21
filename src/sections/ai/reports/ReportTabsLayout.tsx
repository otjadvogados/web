import { useState, useEffect, ReactNode, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import { listReportFolders, type ReportFolderResponse, ReportType } from 'api/reports';
import { openSnackbar } from 'api/snackbar';
import FolderTile from 'sections/ai/transcribe/FolderTile';

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface ReportTabsLayoutProps {
  children: ReactNode;
}

export default function ReportTabsLayout({ children }: ReportTabsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(() => {
    // Verifica se há query param 'tab' na URL (ex: ?tab=pastas)
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    return tabParam === 'pastas' ? 1 : 0;
  });
  const [folders, setFolders] = useState<ReportFolderResponse[]>([]);
  const [allFolders, setAllFolders] = useState<ReportFolderResponse[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [search, setSearch] = useState('');

  // Mapeia a rota atual para o tipo de relatório correspondente
  const getReportTypeFromRoute = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.includes('/provisionamento')) {
      return [ReportType.RELATORIO_PROVISIONAMENTO_RISCO];
    } else if (pathname.includes('/pre-audiencia')) {
      return [ReportType.RELATORIO_PRE_AUDIENCIA];
    } else if (pathname.includes('/pos-audiencia')) {
      return [ReportType.RELATORIO_POS_AUDIENCIA];
    } else if (pathname.includes('/decisoes')) {
      return [ReportType.RELATORIO_DECISOES_SENTENCA, ReportType.RELATORIO_DECISOES_ACORDAO];
    } else if (pathname.includes('/processual')) {
      return [ReportType.RELATORIO_PROCESSUAL];
    }
    return null; // Se não for uma rota específica, não filtra
  }, [location.pathname]);

  // Carrega pastas quando a tab "Pastas" está ativa
  useEffect(() => {
    if (tab === 1) {
      (async () => {
        try {
          setLoadingFolders(true);
          const foldersData = await listReportFolders();
          
          // Filtra relatórios por tipo se houver um tipo correspondente à rota
          let filteredFolders = getReportTypeFromRoute
            ? foldersData.map((folder) => ({
                ...folder,
                reports: folder.reports?.filter((report) =>
                  getReportTypeFromRoute.includes(report.reportType)
                ) || []
              }))
            : foldersData;
          
          // Remove pastas que não têm nenhum relatório após o filtro
          filteredFolders = filteredFolders.filter((folder) => 
            folder.reports && folder.reports.length > 0
          );
          
          setAllFolders(filteredFolders);
          // Aplica filtro inicial de busca
          const term = search.trim().toLowerCase();
          if (!term) {
            setFolders(filteredFolders);
          } else {
            const filtered = filteredFolders.filter((folder) => (folder.name || '').toLowerCase().includes(term));
            setFolders(filtered);
          }
        } catch (err: any) {
          openSnackbar({
            open: true,
            message: err?.response?.data?.message || 'Falha ao carregar pastas',
            variant: 'alert',
            alert: { color: 'error' }
          } as any);
        } finally {
          setLoadingFolders(false);
        }
      })();
    }
  }, [tab, search, getReportTypeFromRoute]);

  // Aplica filtro quando search muda e temos pastas carregadas
  useEffect(() => {
    if (tab === 1 && allFolders.length > 0) {
      const term = search.trim().toLowerCase();
      if (!term) {
        setFolders(allFolders);
      } else {
        const filtered = allFolders.filter((folder) => (folder.name || '').toLowerCase().includes(term));
        setFolders(filtered);
      }
    }
  }, [search, allFolders, tab]);

  // Sincroniza o estado da tab com a URL quando muda via query param (evita dependência circular)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const urlTab = tabParam === 'pastas' ? 1 : 0;
    if (urlTab !== tab) {
      setTab(urlTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    // Atualiza a URL quando a tab muda
    const newSearch = newValue === 1 ? '?tab=pastas' : '';
    navigate(`${location.pathname}${newSearch}`, { replace: true });
  };

  return (
    <>
      <Box sx={{ px: 2.5, pt: 2 }}>
        <Tabs value={tab} onChange={handleTabChange} variant="scrollable" allowScrollButtonsMobile>
          <Tab label="Gerar Relatório" />
          <Tab label="Pastas" />
        </Tabs>
      </Box>

      <Box sx={{ p: 2.5 }}>
        <TabPanel value={tab} index={0}>
          {children}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Stack spacing={1.5}>
            {/* Campo de busca */}
            <TextField
              label="Buscar pastas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome da pasta..."
              size="small"
              fullWidth
            />

            {loadingFolders ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : folders.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  {search.trim() ? 'Nenhuma pasta encontrada.' : 'Nenhuma pasta ainda.'}
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
                    {folders.length} {folders.length === 1 ? 'pasta' : 'pastas'} • {folders.reduce((acc, f) => acc + (f.reports?.length || 0), 0)} {folders.reduce((acc, f) => acc + (f.reports?.length || 0), 0) === 1 ? 'relatório' : 'relatórios'}
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    minHeight: '60vh',
                    p: 2,
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(auto-fill, minmax(220px, 1fr))',
                      sm: 'repeat(auto-fill, minmax(240px, 1fr))',
                      md: 'repeat(auto-fill, minmax(260px, 1fr))',
                      lg: 'repeat(auto-fill, minmax(280px, 1fr))'
                    },
                    gap: 1.25,
                    alignContent: 'start',
                    justifyItems: 'start'
                  }}
                >
                  {folders.map((folder) => {
                    // Converte ReportFolderResponse para formato esperado pelo FolderTile
                    const folderForTile = {
                      ...folder,
                      items: folder.reports || []
                    };
                    return (
                      <FolderTile 
                        key={folder.id} 
                        folder={folderForTile as any} 
                        onClick={(folderId) => {
                          // Adiciona query params com o tipo de relatório correspondente
                          const reportTypes = getReportTypeFromRoute;
                          if (reportTypes && reportTypes.length > 0) {
                            const params = new URLSearchParams();
                            params.set('reportTypeFilter', reportTypes[0]);
                            navigate(`/ai/reports/${folderId}?${params.toString()}`, {
                              state: {
                                from: location.pathname,
                                reportTypeFilter: reportTypes
                              }
                            });
                          } else {
                            navigate(`/ai/reports/${folderId}`, {
                              state: { from: location.pathname }
                            });
                          }
                        }} 
                        selected={false} 
                      />
                    );
                  })}
                </Box>
              </>
            )}
          </Stack>
        </TabPanel>
      </Box>
    </>
  );
}
