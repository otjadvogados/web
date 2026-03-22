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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import { useTheme, alpha } from '@mui/material/styles';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';

import MainCard from 'components/MainCard';
import Permission from 'components/Permission';
import { listPromptFolders, type Prompt } from 'api/prompts';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { listCustomersAdvanced, type Customer, sortCustomersMatrizFilialPF } from 'api/customers';
import {
  listReportFolders,
  type ReportFolderResponse,
  ReportType,
  generateReportFromFile
} from 'api/reports';
import FolderTile from 'sections/ai/transcribe/FolderTile';
import { useReportFilesWithOcr } from 'sections/ai/reports/useReportFilesWithOcr';
import ReportFileListWithOcr from 'sections/ai/reports/ReportFileListWithOcr';
import RealtimeProgressOverlay from 'components/loaders/RealtimeProgressOverlay';
import { ensureRealtimeConnected } from 'api/realtime';

type OptionCust = Pick<Customer, 'id' | 'displayName' | 'name' | 'kind' | 'isMatriz' | 'isFilial'>;

const labelCustomer = (c?: OptionCust | null) => c?.displayName ?? c?.name ?? '';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function PreAudienciaReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localInfoFileInputRef = useRef<HTMLInputElement>(null);
  const {
    filesWithOcr,
    files,
    addFiles,
    removeFile,
    hasOcrError,
    ocrErrorFileNames,
    isVerifying
  } = useReportFilesWithOcr();
  const {
    filesWithOcr: localInfoFilesWithOcr,
    files: localInfoFiles,
    addFiles: addLocalInfoFiles,
    removeFile: removeLocalInfoFile,
    hasOcrError: hasLocalInfoOcrError,
    ocrErrorFileNames: localInfoOcrErrorFileNames,
    isVerifying: isVerifyingLocalInfo
  } = useReportFilesWithOcr();
  const [instructions, setInstructions] = useState('');
  const [model, setModel] = useState<'gpt-5.1' | 'claude-sonnet-4-6'>('gpt-5.1');
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingLocalInfo, setIsDraggingLocalInfo] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<OptionCust | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ocrErrorConfirmOpen, setOcrErrorConfirmOpen] = useState(false);
  const [rtOpen, setRtOpen] = useState(false);
  const [rtRunId, setRtRunId] = useState<string | null>(null);
  
  // Estados para pastas
  const [folders, setFolders] = useState<ReportFolderResponse[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  
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
        
        // Filtra prompts baseado no cliente selecionado
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
        
        // Filtra prompts: gerais + prompts do cliente selecionado (se houver)
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

  const MAX_LOCAL_INFO_FILES = 20;
  const MAX_LOCAL_INFO_TOTAL_MB = 100;

  const handleLocalInfoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLocalInfo(true);
  };
  const handleLocalInfoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLocalInfo(false);
  };
  const handleLocalInfoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLocalInfo(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (!dropped.length) return;
    const currentCount = localInfoFiles.length;
    const toAdd = dropped.slice(0, Math.max(0, MAX_LOCAL_INFO_FILES - currentCount));
    if (toAdd.length === 0) {
      openSnackbar({
        open: true,
        message: `Máximo de ${MAX_LOCAL_INFO_FILES} arquivos para documentos de local/audiência`,
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }
    const totalBytes = [...localInfoFiles, ...toAdd].reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > MAX_LOCAL_INFO_TOTAL_MB * 1024 * 1024) {
      openSnackbar({
        open: true,
        message: `Tamanho total dos arquivos não pode ultrapassar ${MAX_LOCAL_INFO_TOTAL_MB} MB`,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      return;
    }
    addLocalInfoFiles(toAdd);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLocalInfoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const currentCount = localInfoFiles.length;
    const toAdd = selected.slice(0, Math.max(0, MAX_LOCAL_INFO_FILES - currentCount));
    if (toAdd.length === 0) {
      openSnackbar({
        open: true,
        message: `Máximo de ${MAX_LOCAL_INFO_FILES} arquivos para documentos de local/audiência`,
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      if (localInfoFileInputRef.current) localInfoFileInputRef.current.value = '';
      return;
    }
    const totalBytes = [...localInfoFiles, ...toAdd].reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > MAX_LOCAL_INFO_TOTAL_MB * 1024 * 1024) {
      openSnackbar({
        open: true,
        message: `Tamanho total dos arquivos não pode ultrapassar ${MAX_LOCAL_INFO_TOTAL_MB} MB`,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      if (localInfoFileInputRef.current) localInfoFileInputRef.current.value = '';
      return;
    }
    addLocalInfoFiles(toAdd);
    if (localInfoFileInputRef.current) localInfoFileInputRef.current.value = '';
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
    const localInfoHasOcrError = localInfoFiles.length > 0 && hasLocalInfoOcrError;
    if (hasOcrError || localInfoHasOcrError) {
      setOcrErrorConfirmOpen(true);
      return;
    }
    handleGenerate();
  };

  const handleGenerate = async () => {
    setOcrErrorConfirmOpen(false);
    try {
      setGenerating(true);
      setRtRunId(null);
      setRtOpen(true);
      await ensureRealtimeConnected(2500);

      const params = {
        files,
        customerId: selectedCustomer?.id,
        reportTypes: [ReportType.RELATORIO_PRE_AUDIENCIA],
        promptId: selectedPrompt?.id,
        additionalInstructions: instructions.trim() || undefined,
        model,
        locationFiles: localInfoFiles.length > 0 ? localInfoFiles : undefined
      };
      
      console.log('Gerando relatório pré-audiência com parâmetros:', {
        fileCount: files.length,
        fileNames: files.map((f) => f.name),
        customerId: params.customerId,
        reportTypes: params.reportTypes,
        hasPromptId: !!params.promptId,
        hasAdditionalInstructions: !!params.additionalInstructions
      });
      
      const reports = await generateReportFromFile(params);
      
      console.log('Relatórios gerados:', reports);

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
        const backToParams = new URLSearchParams();
        backToParams.set('reportTypeFilter', ReportType.RELATORIO_PRE_AUDIENCIA);
        const backTo = `/ai/reports/${customerIdToUse}?${backToParams.toString()}`;
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
      setTimeout(() => setRtOpen(false), 800);
    }
  };

  // Carrega pastas
  useEffect(() => {
    if (tab === 1) {
      (async () => {
        try {
          setLoadingFolders(true);
          const foldersData = await listReportFolders();
          
          // Filtra relatórios por tipo (apenas RELATORIO_PRE_AUDIENCIA)
          let filteredFolders = foldersData.map((folder) => ({
            ...folder,
            reports: folder.reports?.filter((report) =>
              report.reportType === ReportType.RELATORIO_PRE_AUDIENCIA
            ) || []
          }));
          
          // Remove pastas que não têm nenhum relatório após o filtro
          filteredFolders = filteredFolders.filter((folder) => 
            folder.reports && folder.reports.length > 0
          );
          
          setFolders(filteredFolders);
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
  }, [tab]);

  return (
    <Permission resources={['reports.read', 'reports.create']}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <MainCard title="Pré-Audiência" contentSX={{ p: 0 }}>
            <Box sx={{ px: 2.5, pt: 2 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
                <Tab label="Gerar Relatório" />
                <Tab label="Pastas" />
              </Tabs>
            </Box>

            <Box sx={{ p: 2.5 }}>
              <TabPanel value={tab} index={0}>
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

              {/* Modelo de IA */}
              <Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  sx={{ mb: 1.5 }}
                >
                  <TextField
                    select
                    label="Modelo de IA"
                    size="small"
                    value={model}
                    onChange={(e) => setModel(e.target.value as 'gpt-5.1' | 'claude-sonnet-4-6')}
                    sx={{
                      width: { xs: '100%', sm: 260 },
                      minWidth: 200
                    }}
                  >
                    <MenuItem value="gpt-5.1">GPT-5.1</MenuItem>
                    <MenuItem value="claude-sonnet-4-6">Claude Sonnet 4.6</MenuItem>
                  </TextField>
                </Stack>
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

              {/* Documentos para local/audiência (upload igual ao de cima: arrastar/clique) */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Documentos para local/audiência
                </Typography>
                {hasLocalInfoOcrError && (
                  <Alert severity="error" icon={<CloseCircleOutlined />} sx={{ mb: 1 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      Erro de OCR nos documentos de local/audiência. Remova-os ou confirme ao gerar.
                    </Typography>
                    <Typography variant="body2">
                      Arquivos com erro: <strong>{localInfoOcrErrorFileNames.join(', ')}</strong>
                    </Typography>
                  </Alert>
                )}
                <Paper
                  variant="outlined"
                  onDragOver={handleLocalInfoDragOver}
                  onDragLeave={handleLocalInfoDragLeave}
                  onDrop={handleLocalInfoDrop}
                  onClick={() => localInfoFileInputRef.current?.click()}
                  sx={{
                    border: `2px dashed ${isDraggingLocalInfo ? theme.palette.primary.main : theme.palette.divider}`,
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: isDraggingLocalInfo ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
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
                        PDF, DOC, DOCX, TXT, imagens
                      </Typography>
                    </Box>
                  </Stack>
                  <input
                    ref={localInfoFileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    onChange={handleLocalInfoFileSelect}
                  />
                </Paper>
                <ReportFileListWithOcr filesWithOcr={localInfoFilesWithOcr} onRemove={removeLocalInfoFile} />
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
                  isOptionEqualToValue={(option, value) => option.id === value.id}
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
                  disabled={files.length === 0 || generating || isVerifying || isVerifyingLocalInfo}
                  startIcon={generating ? <CircularProgress size={20} /> : null}
                >
                  {generating ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </Box>
                </Stack>
              </TabPanel>

              <TabPanel value={tab} index={1}>
                <Stack spacing={1.5}>
                  {loadingFolders ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : folders.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma pasta ainda.
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
                                const params = new URLSearchParams();
                                params.set('reportTypeFilter', ReportType.RELATORIO_PRE_AUDIENCIA);
                                navigate(`/ai/reports/${folderId}?${params.toString()}`, {
                                  state: {
                                    from: location.pathname,
                                    reportTypeFilter: [ReportType.RELATORIO_PRE_AUDIENCIA]
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
            {(ocrErrorFileNames.length > 0 || localInfoOcrErrorFileNames.length > 0) && (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                {ocrErrorFileNames.length > 0 && (
                  <>Documentos principais: <strong>{ocrErrorFileNames.join(', ')}</strong></>
                )}
                {ocrErrorFileNames.length > 0 && localInfoOcrErrorFileNames.length > 0 && ' • '}
                {localInfoOcrErrorFileNames.length > 0 && (
                  <>Local/audiência: <strong>{localInfoOcrErrorFileNames.join(', ')}</strong></>
                )}
              </Typography>
            )}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOcrErrorConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleGenerate} color="primary">
            Continuar mesmo assim
          </Button>
        </DialogActions>
      </Dialog>

      <RealtimeProgressOverlay
        open={rtOpen || generating}
        knownRunId={rtRunId ?? undefined}
        onDetectRunId={(rid) => setRtRunId(rid)}
        onRequestClose={() => setRtOpen(false)}
      />
    </Permission>
  );
}
