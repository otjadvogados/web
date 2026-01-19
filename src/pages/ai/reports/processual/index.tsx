import { useState, useRef, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import { useTheme, alpha } from '@mui/material/styles';
import UploadOutlined from '@ant-design/icons/UploadOutlined';

import MainCard from 'components/MainCard';
import Permission from 'components/Permission';
import { listPromptFolders, type Prompt } from 'api/prompts';
import { openSnackbar } from 'api/snackbar';
import useDebounced from 'utils/useDebounced';
import { listCustomersAdvanced, type Customer, sortCustomersMatrizFilialPF } from 'api/customers';
import ReportTabsLayout from 'sections/ai/reports/ReportTabsLayout';

type OptionCust = Pick<Customer, 'id' | 'displayName' | 'name' | 'kind' | 'isMatriz' | 'isFilial'>;

const labelCustomer = (c?: OptionCust | null) => c?.displayName ?? c?.name ?? '';

export default function ProcessualReportPage() {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [instructions, setInstructions] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<OptionCust | null>(null);
  
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
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    // TODO: Implementar geração de relatório
    console.log('Gerar relatório com:', { files, instructions });
  };

  return (
    <Permission resources={['reports.read', 'reports.create']}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <MainCard title="Processual" contentSX={{ p: 0 }}>
            <ReportTabsLayout>
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

              {/* Upload de Documentos */}
              <Box>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Upload de Documentos
                </Typography>
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
                {files.length > 0 && (
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    {files.map((file, index) => (
                      <Paper key={index} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">{file.name}</Typography>
                        <Button size="small" onClick={() => handleRemoveFile(index)}>
                          Remover
                        </Button>
                      </Paper>
                    ))}
                  </Stack>
                )}
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
                  onChange={(_, value) => {
                    if (value) {
                      setInstructions(value.description);
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Selecionar Prompt (opcional)"
                      placeholder="Busque e selecione um prompt do sistema..."
                      helperText="Selecione um prompt para preencher automaticamente o campo de instruções abaixo"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
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
                  )}
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
                  onClick={handleGenerate}
                  disabled={files.length === 0}
                >
                  Gerar Relatório
                </Button>
              </Box>
              </Stack>
            </ReportTabsLayout>
          </MainCard>
        </Grid>
      </Grid>
    </Permission>
  );
}
