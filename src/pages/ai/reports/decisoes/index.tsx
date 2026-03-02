import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import { useTheme, alpha } from '@mui/material/styles';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

import MainCard from 'components/MainCard';
import Permission from 'components/Permission';
import { listPromptFolders, type Prompt } from 'api/prompts';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { listCustomersAdvanced, type Customer, sortCustomersMatrizFilialPF } from 'api/customers';
import { listReportFolders, type ReportFolderResponse, ReportType, generateReportFromFile } from 'api/reports';
import FolderTile from 'sections/ai/transcribe/FolderTile';
import { useReportFilesWithOcr } from 'sections/ai/reports/useReportFilesWithOcr';
import ReportFileListWithOcr from 'sections/ai/reports/ReportFileListWithOcr';

type OptionCust = Pick<Customer, 'id' | 'displayName' | 'name' | 'kind' | 'isMatriz' | 'isFilial'>;

const labelCustomer = (c?: OptionCust | null) => c?.displayName ?? c?.name ?? '';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function DecisoesReportPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    filesWithOcr,
    files,
    addFiles,
    removeFile,
    hasOcrError,
    ocrErrorFileNames,
    isVerifying
  } = useReportFilesWithOcr();
  const [instructions, setInstructions] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<OptionCust | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ocrErrorConfirmOpen, setOcrErrorConfirmOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(ReportType.RELATORIO_DECISOES_SENTENCA);
  
  // Estados para tabs principais
  const [mainTab, setMainTab] = useState(0); // 0 = Gerar Relatório, 1 = Pastas
  const [folderTab, setFolderTab] = useState(0); // 0 = Pasta Sentença, 1 = Pasta Acórdão
  
  // Estados para pastas
  const [foldersSentenca, setFoldersSentenca] = useState<ReportFolderResponse[]>([]);
  const [foldersAcordao, setFoldersAcordao] = useState<ReportFolderResponse[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [searchSentenca, setSearchSentenca] = useState('');
  const [searchAcordao, setSearchAcordao] = useState('');
  
  // Estados para seletor de clientes
  const [customerOptions, setCustomerOptions] = useState<OptionCust[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const dCustomerSearch = useDebounced(customerSearch);
  
  // Estados para seletor de prompts
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const dPromptSearch = useDebounced(promptSearch);

  // Carrega clientes disponíveis
  useEffect(() => {
    (async () => {
      try {
        setLoadingCustomers(true);
        const res = await listCustomersAdvanced({
          page: 1,
          limit: 20,
          search: dCustomerSearch || undefined,
          includeHierarchy: true
        });
        const list = (res?.data ?? []) as OptionCust[];
        setCustomerOptions(sortCustomersMatrizFilialPF(list));
      } catch (err: any) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao buscar clientes',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      } finally {
        setLoadingCustomers(false);
      }
    })();
  }, [dCustomerSearch]);

  // Carrega prompts disponíveis
  useEffect(() => {
    (async () => {
      try {
        setLoadingPrompts(true);
        const folders = await listPromptFolders();
        
        const customerId = selectedCustomer?.id;
        
        const allPrompts: Prompt[] = [];
        folders.forEach(folder => {
          if (folder.items && folder.items.length > 0) {
            allPrompts.push(...folder.items);
          }
        });
        
        const uniquePrompts = Array.from(
          new Map(allPrompts.map(p => [p.id, p])).values()
        );
        
        const filteredPrompts = customerId
          ? uniquePrompts.filter(p => !p.customerId || p.customerId === customerId)
          : uniquePrompts.filter(p => !p.customerId);
        
        setPrompts(filteredPrompts);
      } catch (err: any) {
        console.error('Erro ao carregar prompts:', err);
        openSnackbar({
          open: true,
          message: 'Erro ao carregar prompts disponíveis',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        setPrompts([]);
      } finally {
        setLoadingPrompts(false);
      }
    })();
  }, [selectedCustomer?.id]);

  // Carrega pastas
  useEffect(() => {
    if (mainTab === 1) {
      (async () => {
        try {
          setLoadingFolders(true);
          const foldersData = await listReportFolders();
          
          // Filtra pastas para Sentença
          let filteredSentenca = foldersData.map((folder) => ({
            ...folder,
            reports: folder.reports?.filter((report) =>
              report.reportType === ReportType.RELATORIO_DECISOES_SENTENCA
            ) || []
          }));
          filteredSentenca = filteredSentenca.filter((folder) => 
            folder.reports && folder.reports.length > 0
          );
          
          // Filtra pastas para Acórdão
          let filteredAcordao = foldersData.map((folder) => ({
            ...folder,
            reports: folder.reports?.filter((report) =>
              report.reportType === ReportType.RELATORIO_DECISOES_ACORDAO
            ) || []
          }));
          filteredAcordao = filteredAcordao.filter((folder) => 
            folder.reports && folder.reports.length > 0
          );
          
          setFoldersSentenca(filteredSentenca);
          setFoldersAcordao(filteredAcordao);
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
  }, [mainTab]);

  // Filtra pastas por busca
  const filteredFoldersSentenca = foldersSentenca.filter((folder) =>
    !searchSentenca.trim() || (folder.name || '').toLowerCase().includes(searchSentenca.toLowerCase())
  );

  const filteredFoldersAcordao = foldersAcordao.filter((folder) =>
    !searchAcordao.trim() || (folder.name || '').toLowerCase().includes(searchAcordao.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateClick = () => {
    if (files.length === 0) {
      openSnackbar({
        open: true,
        message: 'Selecione pelo menos um arquivo para gerar o relatório',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }
    if (hasOcrError) {
      setOcrErrorConfirmOpen(true);
      return;
    }
    handleGenerate();
  };

  const handleGenerate = async () => {
    setOcrErrorConfirmOpen(false);
    try {
      setGenerating(true);
      
      const params = {
        files,
        customerId: selectedCustomer?.id,
        reportTypes: [selectedReportType],
        promptId: selectedPrompt?.id,
        additionalInstructions: instructions.trim() || undefined
      };
      
      const reports = await generateReportFromFile(params);

      if (!reports || reports.length === 0) {
        openSnackbar({
          open: true,
          message: 'Nenhum relatório foi criado. Verifique os logs do servidor.',
          variant: 'alert',
          alert: { color: 'warning' }
        } as any);
        return;
      }

      openSnackbar({
        open: true,
        message: `Relatório gerado com sucesso! ${reports.length} relatório(s) criado(s).`,
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      // Redireciona para a página de edição do primeiro relatório gerado
      if (reports.length > 0) {
        const firstReport = reports[0];
        const customerIdToUse = firstReport.customerId || 'general';
        // Constrói o backTo com query params para preservar o filtro ao voltar
        const params = new URLSearchParams();
        params.set('reportTypeFilter', selectedReportType);
        const backTo = `/ai/reports/${customerIdToUse}?${params.toString()}`;
        navigate(`/ai/reports/${customerIdToUse}/${firstReport.id}/edit`, {
          state: { backTo }
        });
      } else {
        // Fallback: se não houver relatórios, volta para a lista
        setTimeout(() => {
          navigate('/ai/reports');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Erro ao gerar relatório:', err);
      
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao gerar relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Permission resources={['reports.read', 'reports.create']}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <MainCard title="Decisões" contentSX={{ p: 0 }}>
            <Box sx={{ px: 2.5, pt: 2 }}>
              <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} variant="scrollable" allowScrollButtonsMobile>
                <Tab label="Gerar Relatório" />
                <Tab label="Pastas" />
              </Tabs>
            </Box>

            <Box sx={{ p: 2.5 }}>
              <TabPanel value={mainTab} index={0}>
                <Stack spacing={3}>
                  {/* Como funciona */}
                  <Paper
                    variant="outlined"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      borderRadius: 2,
                      p: 3
                    }}
                  >
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 2.5 }}>
                      Como funciona:
                    </Typography>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 32,
                            height: 32,
                            fontSize: '1rem',
                            fontWeight: 600
                          }}
                        >
                          1
                        </Avatar>
                        <Typography variant="body1" sx={{ pt: 0.5 }}>
                          Faça upload dos documentos relevantes (petições, decisões, atas, etc.)
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 32,
                            height: 32,
                            fontSize: '1rem',
                            fontWeight: 600
                          }}
                        >
                          2
                        </Avatar>
                        <Typography variant="body1" sx={{ pt: 0.5 }}>
                          Adicione instruções específicas para direcionar a análise da IA
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 32,
                            height: 32,
                            fontSize: '1rem',
                            fontWeight: 600
                          }}
                        >
                          3
                        </Avatar>
                        <Typography variant="body1" sx={{ pt: 0.5 }}>
                          Receba um relatório detalhado com análises e recomendações estratégicas
                        </Typography>
                      </Stack>
                    </Stack>
                  </Paper>

                  {/* Seleção de Tipo de Relatório */}
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Tipo de Relatório
                    </Typography>
                    <FormControl component="fieldset">
                      <RadioGroup
                        row
                        value={selectedReportType}
                        onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
                      >
                        <FormControlLabel
                          value={ReportType.RELATORIO_DECISOES_SENTENCA}
                          control={<Radio />}
                          label="Sentença"
                        />
                        <FormControlLabel
                          value={ReportType.RELATORIO_DECISOES_ACORDAO}
                          control={<Radio />}
                          label="Acórdão"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Box>

                  {/* Seleção de Cliente */}
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Cliente (opcional)
                    </Typography>
                    <Autocomplete<OptionCust, false, false, false>
                      options={customerOptions}
                      loading={loadingCustomers}
                      value={selectedCustomer}
                      onChange={(_, value) => setSelectedCustomer(value)}
                      inputValue={customerSearch}
                      onInputChange={(_, value) => setCustomerSearch(value)}
                      getOptionLabel={labelCustomer}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      filterOptions={(x) => x}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Buscar cliente..."
                          helperText="Selecione um cliente para filtrar os prompts disponíveis"
                        />
                      )}
                    />
                  </Box>

                  {/* Upload de Documentos */}
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Upload de Documentos
                    </Typography>
                    {hasOcrError && (
                      <Alert severity="error" icon={<CloseCircleOutlined />} sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                          Erro: Existem arquivos com erro de OCR. Remova-os ou confirme ao gerar para continuar mesmo assim.
                        </Typography>
                        <Typography variant="body2">
                          Arquivos com erro: <strong>{ocrErrorFileNames.join(', ')}</strong>
                        </Typography>
                      </Alert>
                    )}
                    <Paper
                      variant="outlined"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        border: `2px dashed ${isDragging ? theme.palette.primary.main : theme.palette.divider}`,
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: isDragging ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: theme.palette.primary.main,
                          bgcolor: alpha(theme.palette.primary.main, 0.05)
                        }
                      }}
                    >
                      <Stack spacing={2} alignItems="center">
                        <UploadOutlined style={{ fontSize: 48, color: theme.palette.primary.main }} />
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            Arraste arquivos ou clique para selecionar
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Suporta PDF, DOC, DOCX, TXT, imagens e arquivos de mídia
                          </Typography>
                        </Box>
                      </Stack>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt,image/*,video/*,audio/*"
                      />
                    </Paper>
                    <ReportFileListWithOcr filesWithOcr={filesWithOcr} onRemove={removeFile} />
                  </Box>

                  {/* Instruções Adicionais */}
                  <Box>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Instruções Adicionais
                    </Typography>
                    
                    {/* Seletor de Prompts */}
                    <Autocomplete
                      options={prompts}
                      loading={loadingPrompts}
                      value={selectedPrompt}
                      onChange={(_, value) => {
                        setSelectedPrompt(value);
                        // Não preenche o campo de instruções - o prompt será usado via promptId
                      }}
                      getOptionLabel={(option) => option.name}
                      filterOptions={(x) => {
                        if (!dPromptSearch.trim()) return x;
                        const term = dPromptSearch.trim().toLowerCase();
                        return x.filter(p => 
                          p.name.toLowerCase().includes(term) || 
                          p.description.toLowerCase().includes(term)
                        );
                      }}
                      inputValue={promptSearch}
                      onInputChange={(_, value) => setPromptSearch(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Selecionar Prompt (opcional)"
                          placeholder="Busque e selecione um prompt do sistema..."
                          helperText="Selecione um prompt do sistema ou escreva instruções customizadas abaixo"
                        />
                      )}
                      renderOption={(props, option) => {
                        const { key, ...restProps } = props;
                        return (
                          <Box key={key} component="li" {...restProps}>
                            <Stack spacing={0.5} sx={{ width: '100%' }}>
                              <Typography variant="body2" fontWeight={600}>
                                {option.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical'
                              }}>
                                {option.description}
                              </Typography>
                            </Stack>
                          </Box>
                        );
                      }}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      sx={{ mb: 2 }}
                    />
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      Descreva o que você gostaria que a IA focasse na análise ou adicione contexto específico do caso.
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Ex: Foque nos riscos trabalhistas relacionados a horas extras. O cliente é uma empresa de médio porte do setor de tecnologia..."
                      variant="outlined"
                    />
                  </Box>

                  {/* Botão Gerar */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleGenerateClick}
                      disabled={files.length === 0 || generating || isVerifying}
                      startIcon={generating ? <CircularProgress size={20} /> : null}
                    >
                      {generating ? 'Gerando...' : 'Gerar Relatório'}
                    </Button>
                  </Box>
                </Stack>
              </TabPanel>

              <TabPanel value={mainTab} index={1}>
                <Stack spacing={2}>
                  {/* Tabs internas para Sentença e Acórdão */}
                  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={folderTab} onChange={(_, v) => setFolderTab(v)} variant="scrollable" allowScrollButtonsMobile>
                      <Tab label="Pasta Sentença" />
                      <Tab label="Pasta Acórdão" />
                    </Tabs>
                  </Box>

                  {/* Pasta Sentença */}
                  <TabPanel value={folderTab} index={0}>
                    <Stack spacing={1.5}>
                      <TextField
                        label="Buscar pastas"
                        value={searchSentenca}
                        onChange={(e) => setSearchSentenca(e.target.value)}
                        placeholder="Buscar por nome da pasta..."
                        size="small"
                        fullWidth
                      />

                      {loadingFolders ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : filteredFoldersSentenca.length === 0 ? (
                        <Stack alignItems="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            {searchSentenca.trim() ? 'Nenhuma pasta encontrada.' : 'Nenhuma pasta ainda.'}
                          </Typography>
                        </Stack>
                      ) : (
                        <>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={800}>
                              Pastas Sentença
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {filteredFoldersSentenca.length} {filteredFoldersSentenca.length === 1 ? 'pasta' : 'pastas'} • {filteredFoldersSentenca.reduce((acc, f) => acc + (f.reports?.length || 0), 0)} {filteredFoldersSentenca.reduce((acc, f) => acc + (f.reports?.length || 0), 0) === 1 ? 'relatório' : 'relatórios'}
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
                            {filteredFoldersSentenca.map((folder) => {
                              const folderForTile = {
                                ...folder,
                                items: folder.reports || []
                              };
                              return (
                                <FolderTile 
                                  key={folder.id} 
                                  folder={folderForTile as any} 
                                  onClick={(folderId) => {
                                    const params = new URLSearchParams();
                                    params.set('reportTypeFilter', ReportType.RELATORIO_DECISOES_SENTENCA);
                                    navigate(`/ai/reports/${folderId}?${params.toString()}`, {
                                      state: {
                                        from: location.pathname,
                                        reportTypeFilter: [ReportType.RELATORIO_DECISOES_SENTENCA]
                                      }
                                    });
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

                  {/* Pasta Acórdão */}
                  <TabPanel value={folderTab} index={1}>
                    <Stack spacing={1.5}>
                      <TextField
                        label="Buscar pastas"
                        value={searchAcordao}
                        onChange={(e) => setSearchAcordao(e.target.value)}
                        placeholder="Buscar por nome da pasta..."
                        size="small"
                        fullWidth
                      />

                      {loadingFolders ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                          <CircularProgress />
                        </Box>
                      ) : filteredFoldersAcordao.length === 0 ? (
                        <Stack alignItems="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            {searchAcordao.trim() ? 'Nenhuma pasta encontrada.' : 'Nenhuma pasta ainda.'}
                          </Typography>
                        </Stack>
                      ) : (
                        <>
                          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                            <Typography variant="subtitle1" fontWeight={800}>
                              Pastas Acórdão
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {filteredFoldersAcordao.length} {filteredFoldersAcordao.length === 1 ? 'pasta' : 'pastas'} • {filteredFoldersAcordao.reduce((acc, f) => acc + (f.reports?.length || 0), 0)} {filteredFoldersAcordao.reduce((acc, f) => acc + (f.reports?.length || 0), 0) === 1 ? 'relatório' : 'relatórios'}
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
                            {filteredFoldersAcordao.map((folder) => {
                              const folderForTile = {
                                ...folder,
                                items: folder.reports || []
                              };
                              return (
                                <FolderTile 
                                  key={folder.id} 
                                  folder={folderForTile as any} 
                                  onClick={(folderId) => {
                                    const params = new URLSearchParams();
                                    params.set('reportTypeFilter', ReportType.RELATORIO_DECISOES_ACORDAO);
                                    navigate(`/ai/reports/${folderId}?${params.toString()}`, {
                                      state: {
                                        from: location.pathname,
                                        reportTypeFilter: [ReportType.RELATORIO_DECISOES_ACORDAO]
                                      }
                                    });
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
                </Stack>
              </TabPanel>
            </Box>
          </MainCard>
        </Grid>
      </Grid>

      <Dialog open={ocrErrorConfirmOpen} onClose={() => setOcrErrorConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Atenção: Erro de OCR</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            Alguns arquivos apresentaram erro de OCR. Recomendamos reenviar com PDF nativo ou imagem de melhor qualidade.
            Deseja continuar mesmo assim?
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOcrErrorConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGenerate} color="primary">
            Continuar mesmo assim
          </Button>
        </DialogActions>
      </Dialog>
    </Permission>
  );
}
