import { useMemo, useState, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Autocomplete from '@mui/material/Autocomplete';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import { openSnackbar } from 'api/snackbar';
import MenuItem from '@mui/material/MenuItem';
import { CONTESTATION_CATEGORIES, getContestationCategoryLabel } from 'api/aiCases';
import { BRAND_GOLD } from 'config';
import { useCaseWizard } from '../CaseWizardContext';
import { testOcr, type OcrTestResponse } from 'api/aiDocs';
import { listPromptFolders, type Prompt } from 'api/prompts';
import useDebounced from 'utils/useDebounced';

function StepAttachments() {
  const {
    instruction,
    setInstruction,
    specs,
    attachments,
    addAttachments,
    removeAttachment,
    validateAttachments,
    topics,
    commonAttachments,
    addCommonAttachments,
    removeCommonAttachment,
    processAttachments,
    addProcessAttachments,
    removeProcessAttachment,
    updateProcessAttachmentOcr,
    updateAttachmentOcr,
    updateCommonAttachmentOcr,
    hasOcrErrors,
    dept,
    customers,
    topicSpecificsByCategory,
    model,
    setModel
  } = useCaseWizard();
  const [verifyingOcr, setVerifyingOcr] = useState<Set<string>>(new Set());
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [ocrMessageDialog, setOcrMessageDialog] = useState<{ open: boolean; message: string; fileName: string }>({ open: false, message: '', fileName: '' });
  /** Zona de drag ativa: 'common' ou `${topicSpecificId}-${box}` (claimant/client) */
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  
  // Estados para seletor de prompts
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptSearch, setPromptSearch] = useState('');
  const dPromptSearch = useDebounced(promptSearch);

  // Carrega prompts disponíveis
  useEffect(() => {
    (async () => {
      try {
        setLoadingPrompts(true);
        // Usa o cliente selecionado no wizard para buscar prompts
        // Segundo a documentação, quando passamos customerId como filtro,
        // o backend retorna prompts gerais (customerId = null) + prompts desse cliente
        const customerId = customers.length > 0 ? customers[0].id : undefined;
        
        // listPromptFolders retorna todos os prompts organizados por pastas
        // O backend já filtra baseado nas permissões do usuário
        const folders = await listPromptFolders();
        
        // Coleta todos os prompts de todas as pastas
        const allPrompts: Prompt[] = [];
        folders.forEach(folder => {
          if (folder.items && folder.items.length > 0) {
            allPrompts.push(...folder.items);
          }
        });
        
        // Remove duplicatas
        const uniquePrompts = Array.from(
          new Map(allPrompts.map(p => [p.id, p])).values()
        );
        
        // Filtra prompts baseado no cliente selecionado
        // Mostra: prompts gerais (sem customerId) + prompts do cliente selecionado
        const filteredPrompts = customerId
          ? uniquePrompts.filter(p => !p.customerId || p.customerId === customerId)
          : uniquePrompts.filter(p => !p.customerId); // Sem cliente selecionado: apenas gerais
        
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
  }, [customers.map(c => c.id).join('|')]);

  const isValidType = (file: File) =>
    /(^application\/pdf$)|(^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$)|(^image\/(png|jpeg|jpg|webp|gif)$)/i.test(file.type);

  const verifyFileOcr = async (
    file: File,
    attachmentId: string,
    target: 'topic' | 'common' | 'process' = 'topic'
  ): Promise<void> => {
    // Usa apenas attachmentId como chave para garantir unicidade por anexo
    // Isso evita conflitos quando o mesmo arquivo é usado em múltiplos tópicos
    const fileKey = attachmentId;
    setVerifyingOcr((prev) => new Set(prev).add(fileKey));

    try {
      // Clona o arquivo para evitar problemas quando o mesmo File object é usado
      // em múltiplas requisições (o stream pode ser consumido na primeira)
      const fileClone = new File([file], file.name, { type: file.type, lastModified: file.lastModified });
      const result = await testOcr(fileClone);

      if (result.alreadyRunning) {
        openSnackbar({
          open: true,
          message: 'Teste em andamento.',
          variant: 'alert',
          alert: { color: 'default' }
        } as any);
      } else {
        if (target === 'common') {
          updateCommonAttachmentOcr(attachmentId, result);
        } else if (target === 'process') {
          updateProcessAttachmentOcr(attachmentId, result);
        } else {
          updateAttachmentOcr(attachmentId, result);
        }
        if (result.ocr === 'Sucesso') {
          const desc = result.message?.trim();
          const msg = desc
            ? `OCR verificado: ${file.name}. ${desc.length > 220 ? desc.slice(0, 220) + '...' : desc}`
            : `OCR verificado: ${file.name}`;
          openSnackbar({
            open: true,
            message: msg,
            variant: 'alert',
            alert: { color: 'success' }
          } as any);
        } else if (result.ocr === 'Atenção') {
          const desc = result.message?.trim();
          const msg = desc
            ? `Atenção no OCR: ${file.name}. ${desc.length > 220 ? desc.slice(0, 220) + '...' : desc}`
            : `Atenção no OCR: ${file.name}`;
          openSnackbar({
            open: true,
            message: msg,
            variant: 'alert',
            alert: { color: 'warning' }
          } as any);
        } else {
          openSnackbar({
            open: true,
            message: result.message?.trim() || `Erro no OCR: ${file.name}`,
            variant: 'alert',
            alert: { color: 'error' }
          } as any);
        }
      }
    } catch (err: any) {
      const isAlreadyRunning = err?.response?.data?.alreadyRunning === true;
      if (isAlreadyRunning) {
        openSnackbar({
          open: true,
          message: 'Teste em andamento.',
          variant: 'alert',
          alert: { color: 'default' }
        } as any);
      } else {
        openSnackbar({
          open: true,
          message: `Falha ao verificar OCR de ${file.name}: ${err?.response?.data?.message || err?.message || 'Erro desconhecido'}`,
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      }
    } finally {
      setVerifyingOcr((prev) => {
        const next = new Set(prev);
        next.delete(fileKey);
        return next;
      });
    }
  };

  const getOcrStatusIcon = (ocrResult?: OcrTestResponse) => {
    if (!ocrResult) return null;
    
    if (ocrResult.ocr === 'Sucesso') {
      return <CheckCircleOutlined style={{ color: '#4caf50', fontSize: 18 }} />;
    } else if (ocrResult.ocr === 'Atenção') {
      return <WarningOutlined style={{ color: '#ff9800', fontSize: 18 }} />;
    } else {
      return <CloseCircleOutlined style={{ color: '#f44336', fontSize: 18 }} />;
    }
  };

  const handleShowOcrMessage = (message: string, fileName: string) => {
    setOcrMessageDialog({ open: true, message, fileName });
  };

  const processFilesForBox = async (topicSpecificId: string, box: 'claimant' | 'client', files: File[]) => {
    if (!files.length) return;
    const valid = files.filter(isValidType);
    if (valid.length !== files.length) {
      openSnackbar({
        open: true,
        message: 'Alguns arquivos foram ignorados (somente PDF, DOCX e imagens).',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      if (!valid.length) return;
    }
    const attachmentIds = addAttachments(topicSpecificId, box, valid);
    setUploadingFiles(prev => {
      const next = new Set(prev);
      attachmentIds.forEach(id => next.add(id));
      return next;
    });
    try {
      await Promise.all(valid.map((file, index) =>
        verifyFileOcr(file, attachmentIds[index], 'topic')
      ));
    } finally {
      setUploadingFiles(prev => {
        const next = new Set(prev);
        attachmentIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const processFilesCommon = async (files: File[]) => {
    if (!files.length) return;
    const valid = files.filter(isValidType);
    if (valid.length !== files.length) {
      openSnackbar({
        open: true,
        message: 'Alguns arquivos foram ignorados (somente PDF, DOCX e imagens).',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      if (!valid.length) return;
    }
    const attachmentIds = addCommonAttachments(valid);
    setUploadingFiles(prev => {
      const next = new Set(prev);
      attachmentIds.forEach(id => next.add(id));
      return next;
    });
    try {
      await Promise.all(valid.map((file, index) =>
        verifyFileOcr(file, attachmentIds[index], 'common')
      ));
    } finally {
      setUploadingFiles(prev => {
        const next = new Set(prev);
        attachmentIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handlePick = (topicSpecificId: string, box: 'claimant' | 'client') =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = Array.from(e.target.files || []);
      e.target.value = '';
      await processFilesForBox(topicSpecificId, box, f);
    };

  const handlePickCommon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    e.target.value = '';
    await processFilesCommon(f);
  };

  const processFilesProcess = async (files: File[]) => {
    if (!files.length) return;
    const valid = files.filter(isValidType);
    if (valid.length !== files.length) {
      openSnackbar({
        open: true,
        message: 'Alguns arquivos foram ignorados (somente PDF, DOCX e imagens).',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      if (!valid.length) return;
    }
    const attachmentIds = addProcessAttachments(valid);
    setUploadingFiles((prev) => {
      const next = new Set(prev);
      attachmentIds.forEach((id) => next.add(id));
      return next;
    });
    try {
      await Promise.all(
        valid.map((file, index) => verifyFileOcr(file, attachmentIds[index], 'process'))
      );
    } finally {
      setUploadingFiles((prev) => {
        const next = new Set(prev);
        attachmentIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handlePickProcess = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = Array.from(e.target.files || []);
    e.target.value = '';
    await processFilesProcess(f);
  };

  const handleDragOver = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setDragOverZone(zone);
    }
  };

  const handleDragLeave = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget;
    if (dragOverZone === zone && (!related || !current.contains(related))) setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone(null);
    if (isProcessingFiles) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    if (zone === 'common') {
      processFilesCommon(files);
    } else if (zone === 'process') {
      processFilesProcess(files);
    } else {
      const sep = '::';
      const idx = zone.indexOf(sep);
      if (idx !== -1) {
        const topicSpecificId = zone.slice(0, idx);
        const box = zone.slice(idx + sep.length) as 'claimant' | 'client';
        if (box === 'claimant' || box === 'client') {
          processFilesForBox(topicSpecificId, box, files);
        }
      }
    }
  };

  /** ID da zona de drop para tópico: specId::claimant ou specId::client */
  const dropZoneId = (topicSpecificId: string, box: 'claimant' | 'client') => `${topicSpecificId}::${box}`;

  /** Agrupa os tópicos específicos pelas mesmas categorias definidas em Tópicos Específicos (cada categoria vira uma seção com título) */
  const specsByCategory = useMemo(() => {
    const hasCategories = topicSpecificsByCategory && Object.values(topicSpecificsByCategory).some((arr) => arr && arr.length > 0);
    const byId = new Map(specs.map((s) => [s.id, s]));
    const result: { label: string; specs: typeof specs }[] = [];
    if (hasCategories) {
      for (const { code } of CONTESTATION_CATEGORIES) {
        const ids = topicSpecificsByCategory[code] || [];
        const categorySpecs = ids.map((id) => byId.get(id)).filter(Boolean) as typeof specs;
        if (categorySpecs.length > 0) {
          result.push({
            label: getContestationCategoryLabel(code, categorySpecs.length),
            specs: categorySpecs,
          });
        }
      }
      const inCategory = new Set(result.flatMap((r) => r.specs.map((s) => s.id)));
      const others = specs.filter((s) => !inCategory.has(s.id));
      if (others.length > 0) {
        result.push({ label: 'Outros', specs: others });
      }
    } else if (specs.length > 0) {
      result.push({ label: '', specs });
    }
    return result;
  }, [specs, topicSpecificsByCategory]);

  const bySpec = useMemo(() => {
    const map: Record<string, { claimant: any[]; client: any[] }> = {};
    for (const s of specs) map[s.id] = { claimant: [], client: [] };
    for (const a of attachments) {
      if (!map[a.topicSpecificId]) continue;
      map[a.topicSpecificId][a.box].push(a);
    }
    return map;
  }, [
    specs.map(s => s.id).join('|'), 
    attachments.map(a => `${a.id}-${a.ocrResult?.ocr || 'none'}`).join('|')
  ]);

  const validation = useMemo(() => validateAttachments(), [specs.map(s => s.id).join('|'), attachments.map(a => a.id).join('|'), commonAttachments.map(a => a.id).join('|'), validateAttachments]);
  const ocrErrors = useMemo(() => hasOcrErrors(), [attachments.map(a => `${a.id}-${a.ocrResult?.ocr || 'none'}`).join('|'), commonAttachments.map(a => `${a.id}-${a.ocrResult?.ocr || 'none'}`).join('|')]);

  // Verifica se há algum arquivo sendo processado
  const isProcessingFiles = uploadingFiles.size > 0 || verifyingOcr.size > 0;

  return (
    <Stack spacing={1.5}>
      <Typography fontWeight={700}>6. Instruções & Anexos</Typography>
      
      {ocrErrors.hasErrors && (
        <Alert 
          severity="error" 
          icon={<CloseCircleOutlined />}
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Erro: Existem arquivos com erro de OCR. Remova-os antes de criar o caso.
          </Typography>
          <Typography variant="body2">
            Arquivos com erro: <strong>{ocrErrors.errorFiles.join(', ')}</strong>
          </Typography>
        </Alert>
      )}
      {specs.length > 0 && !validation.valid && (
        <Alert 
          severity="warning" 
          icon={<WarningOutlined />}
          sx={{ mb: 1 }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
            Para criar o caso, adicione ao menos um documento por tópico (reclamante ou reclamada) ou use arquivos em comum.
          </Typography>
          {validation.missingSpecs.length > 0 && (
            <Typography variant="body2">
              Faltam anexos nos tópicos: <strong>{validation.missingSpecs.join(', ')}</strong>
            </Typography>
          )}
        </Alert>
      )}
      
      {/* Modelo de IA */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          select
          label="Modelo de IA"
          size="small"
          value={model || 'gpt-5.1'}
          onChange={(e) => setModel(e.target.value || null)}
          sx={{
            width: { xs: '100%', sm: 260 },
            minWidth: 200
          }}
        >
          <MenuItem value="gpt-5.1">GPT-5.1</MenuItem>
          <MenuItem value="claude-sonnet-4-6">Claude Sonnet 4.6</MenuItem>
        </TextField>
      </Stack>

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
          // Apenas limpa a busca após selecionar, sem preencher instruções
          if (value) {
            setPromptSearch('');
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Selecionar Prompt (opcional)"
            placeholder="Busque e selecione um prompt do sistema para visualizar..."
            helperText="Selecione um prompt para visualizar sua descrição como referência"
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
      />
      
      <TextField
        label="Instruções"
        placeholder="Ex.: pontos específicos do cliente, observações, fatos relevantes…"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        multiline
        minRows={3}
        helperText="Instruções adicionais para o processamento do caso"
      />

      {/* Campos de Arquivos em comum e Documentos de processo (lado a lado) */}
      {specs.length > 0 && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          {/* Arquivos em comum */}
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 1.5,
              transition: 'border-color 0.2s, background-color 0.2s',
              ...(dragOverZone === 'common'
                ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.hover' }
                : {})
            }}
            onDragOver={(e) => handleDragOver(e, 'common')}
            onDragLeave={(e) => handleDragLeave(e, 'common')}
            onDrop={(e) => handleDrop(e, 'common')}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
              <Stack>
                <Typography fontWeight={700}>Arquivos em comum</Typography>
                <Typography variant="caption" color="text.secondary">
                  Arquivos que serão aplicados a todos os tópicos específicos (ex.: petição inicial completa).
                </Typography>
              </Stack>
              <input
                id="common-attachments-input"
                type="file"
                multiple
                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handlePickCommon}
              />
            </Stack>
            <Box
              component="label"
              htmlFor="common-attachments-input"
              sx={{
                border: '2px dashed',
                borderColor: dragOverZone === 'common' ? 'primary.main' : 'divider',
                borderRadius: 1,
                py: 2,
                px: 2,
                textAlign: 'center',
                bgcolor: dragOverZone === 'common' ? 'action.hover' : 'grey.50',
                transition: 'border-color 0.2s, background-color 0.2s',
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: isProcessingFiles ? 'not-allowed' : 'pointer'
              }}
            >
              <UploadOutlined style={{ fontSize: 28, color: dragOverZone === 'common' ? 'var(--mui-palette-primary-main)' : undefined }} />
              <Typography variant="body2" color={dragOverZone === 'common' ? 'primary.main' : 'text.secondary'} fontWeight={500}>
                {dragOverZone === 'common' ? 'Solte os arquivos aqui' : 'Arraste e solte ou clique para selecionar'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, DOCX ou imagens (PNG, JPEG, WebP, GIF)
              </Typography>
            </Box>
            {commonAttachments.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {commonAttachments.map((a) => {
                const f = a.file as File;
                const isImg = /^image\//i.test(f.type);
                const isPdf = /^application\/pdf$/i.test(f.type);
                const isDocx = /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(f.type);
                const url = URL.createObjectURL(f);
                const isUploading = uploadingFiles.has(a.id);
                const isVerifying = verifyingOcr.has(a.id);
                const isLoading = isUploading || isVerifying;
                const ocrStatusIcon = getOcrStatusIcon(a.ocrResult);
                return (
                  <Paper variant="outlined" sx={{ p: 1 }} key={a.id}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'grid', placeItems: 'center' }}>
                        {isImg ? (
                          <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Typography variant="caption">{isDocx ? 'DOCX' : (isPdf ? 'PDF' : 'ARQ')}</Typography>
                        )}
                      </Box>
                      <Stack flex={1} minWidth={0}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography noWrap title={f.name}>{f.name}</Typography>
                          {isLoading && <CircularProgress size={12} />}
                          {ocrStatusIcon && !isLoading && ocrStatusIcon}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">{(f.size / 1024).toFixed(1)} KB</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5}>
                        {a.ocrResult && (
                          <Tooltip title="Ver mensagem do OCR">
                            <IconButton 
                              size="small" 
                              onClick={() => handleShowOcrMessage(a.ocrResult!.message, f.name)}
                              title="Ver mensagem do OCR"
                            >
                              <InfoCircleOutlined />
                            </IconButton>
                          </Tooltip>
                        )}
                        <IconButton size="small" onClick={() => window.open(url, '_blank') as any} title="Visualizar arquivo">
                          <EyeOutlined />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => removeCommonAttachment(a.id)} title="Remover">
                          <CloseOutlined />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {/* Documentos de processo (capa/intimação, despacho, etc.) */}
          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 1.5,
              transition: 'border-color 0.2s, background-color 0.2s',
              ...(dragOverZone === 'process'
                ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.hover' }
                : {})
            }}
            onDragOver={(e) => handleDragOver(e, 'process')}
            onDragLeave={(e) => handleDragLeave(e, 'process')}
            onDrop={(e) => handleDrop(e, 'process')}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
              <Stack>
                <Typography fontWeight={700}>Documentos de processo</Typography>
                <Typography variant="caption" color="text.secondary">
                  Use para capa/intimação com Autos nº ou despacho/intimação com Vara (usado para extrair NR_AUTOS e NR_VARA).
                </Typography>
              </Stack>
              <input
                id="process-attachments-input"
                type="file"
                multiple
                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handlePickProcess}
              />
            </Stack>
            <Box
              component="label"
              htmlFor="process-attachments-input"
              sx={{
                border: '2px dashed',
                borderColor: dragOverZone === 'process' ? 'primary.main' : 'divider',
                borderRadius: 1,
                py: 2,
                px: 2,
                textAlign: 'center',
                bgcolor: dragOverZone === 'process' ? 'action.hover' : 'grey.50',
                transition: 'border-color 0.2s, background-color 0.2s',
                minHeight: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                cursor: isProcessingFiles ? 'not-allowed' : 'pointer'
              }}
            >
              <UploadOutlined style={{ fontSize: 28, color: dragOverZone === 'process' ? 'var(--mui-palette-primary-main)' : undefined }} />
              <Typography variant="body2" color={dragOverZone === 'process' ? 'primary.main' : 'text.secondary'} fontWeight={500}>
                {dragOverZone === 'process' ? 'Solte os arquivos aqui' : 'Arraste e solte ou clique para selecionar'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, DOCX ou imagens (PNG, JPEG, WebP, GIF)
              </Typography>
            </Box>
            {processAttachments.length > 0 && (
              <Stack spacing={1} sx={{ mt: 1.5 }}>
                {processAttachments.map((a) => {
                  const f = a.file as File;
                  const isImg = /^image\//i.test(f.type);
                  const isPdf = /^application\/pdf$/i.test(f.type);
                  const isDocx = /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i.test(f.type);
                  const url = URL.createObjectURL(f);
                  const isUploading = uploadingFiles.has(a.id);
                  const isVerifying = verifyingOcr.has(a.id);
                  const isLoading = isUploading || isVerifying;
                  const ocrStatusIcon = getOcrStatusIcon(a.ocrResult);
                  return (
                    <Paper variant="outlined" sx={{ p: 1 }} key={a.id}>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'grid', placeItems: 'center' }}>
                          {isImg ? (
                            <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Typography variant="caption">{isDocx ? 'DOCX' : (isPdf ? 'PDF' : 'ARQ')}</Typography>
                          )}
                        </Box>
                        <Stack flex={1} minWidth={0}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography noWrap title={f.name}>{f.name}</Typography>
                            {isLoading && <CircularProgress size={12} />}
                            {ocrStatusIcon && !isLoading && ocrStatusIcon}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{(f.size / 1024).toFixed(1)} KB</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          {a.ocrResult && (
                            <Tooltip title="Ver mensagem do OCR">
                              <IconButton 
                                size="small" 
                                onClick={() => handleShowOcrMessage(a.ocrResult!.message, f.name)}
                                title="Ver mensagem do OCR"
                              >
                                <InfoCircleOutlined />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton size="small" onClick={() => window.open(url, '_blank') as any} title="Visualizar arquivo">
                            <EyeOutlined />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => removeProcessAttachment(a.id)} title="Remover">
                            <CloseOutlined />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}

      {!specs.length ? (
        <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          Selecione ao menos 1 tópico específico para organizar anexos por caixa.
        </Paper>
      ) : (
        <Stack spacing={2}>
          {specsByCategory.map(({ label, specs: categorySpecs }) => {
            const categoryHasMissing = categorySpecs.some((spec) => validation.missingSpecs.includes(spec.name));
            return (
            <Paper
              key={label || 'uncategorized'}
              variant="outlined"
              sx={{
                p: 1.5,
                ...(categoryHasMissing
                  ? { borderColor: 'warning.main', borderWidth: 2, borderStyle: 'solid' }
                  : {})
              }}
            >
              <Stack spacing={1.5}>
                {label && (
                  <Typography variant="subtitle1" fontWeight={700} color="primary" sx={{ pt: 0.5 }}>
                    {label}
                  </Typography>
                )}
                {categorySpecs.map((spec) => {
                const group = bySpec[spec.id] || { claimant: [], client: [] };

                const renderBox = (boxKey: 'claimant' | 'client', title: string) => {
              const items = group[boxKey] || [];
              const inputId = `att-${spec.id}-${boxKey}`;
              const zoneId = dropZoneId(spec.id, boxKey);
              const isDragOver = dragOverZone === zoneId;
              return (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    flex: 1,
                    minWidth: 280,
                    transition: 'border-color 0.2s, background-color 0.2s',
                    ...(isDragOver ? { borderColor: 'primary.main', borderWidth: 2, bgcolor: 'action.hover' } : {})
                  }}
                  onDragOver={(e) => handleDragOver(e, zoneId)}
                  onDragLeave={(e) => handleDragLeave(e, zoneId)}
                  onDrop={(e) => handleDrop(e, zoneId)}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={700} variant="body2">{title}</Typography>
                    <input
                      id={inputId}
                      type="file"
                      multiple
                      accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,image/gif"
                      style={{ display: 'none' }}
                      onChange={handlePick(spec.id, boxKey)}
                    />
                  </Stack>

                  <Box
                    component="label"
                    htmlFor={inputId}
                    sx={{
                      border: '2px dashed',
                      borderColor: isDragOver ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      py: 1.5,
                      px: 1.5,
                      mt: 1,
                      textAlign: 'center',
                      bgcolor: isDragOver ? 'action.hover' : 'grey.50',
                      transition: 'border-color 0.2s, background-color 0.2s',
                      minHeight: 72,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.25,
                      cursor: isProcessingFiles ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <UploadOutlined style={{ fontSize: 22, color: isDragOver ? 'var(--mui-palette-primary-main)' : undefined }} />
                    <Typography variant="caption" color={isDragOver ? 'primary.main' : 'text.secondary'} fontWeight={500}>
                      {isDragOver ? 'Solte os arquivos aqui' : 'Arraste e solte ou clique para selecionar'}
                    </Typography>
                  </Box>
                  {items.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {items.map((a: any) => {
                        const f = a.file as File;
                        const isImg = /^image\//i.test(f.type);
                        const isPdf = /^application\/pdf$/i.test(f.type);
                        const isDocx = /^application\/vnd\.openxmlformats-officedocument.wordprocessingml\.document$/i.test(f.type);
                        const url = URL.createObjectURL(f);
                        const isUploading = uploadingFiles.has(a.id);
                        const isVerifying = verifyingOcr.has(a.id);
                        const isLoading = isUploading || isVerifying;
                        const ocrStatusIcon = getOcrStatusIcon(a.ocrResult);
                        return (
                          <Paper variant="outlined" sx={{ p: 1 }} key={a.id}>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Box sx={{ width: 48, height: 48, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', display: 'grid', placeItems: 'center' }}>
                                {isImg ? (
                                  <img src={url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <Typography variant="caption">{isDocx ? 'DOCX' : (isPdf ? 'PDF' : 'ARQ')}</Typography>
                                )}
                              </Box>
                              <Stack flex={1} minWidth={0}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Typography noWrap title={f.name}>{f.name}</Typography>
                                  {isLoading && <CircularProgress size={12} />}
                                  {ocrStatusIcon && !isLoading && ocrStatusIcon}
                                </Stack>
                                <Typography variant="caption" color="text.secondary">{(f.size / 1024).toFixed(1)} KB</Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5}>
                                {a.ocrResult && (
                                  <Tooltip title="Ver mensagem do OCR">
                                    <IconButton 
                                      size="small" 
                                      onClick={() => handleShowOcrMessage(a.ocrResult!.message, f.name)}
                                      title="Ver mensagem do OCR"
                                    >
                                      <InfoCircleOutlined />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                <IconButton size="small" onClick={() => window.open(url, '_blank') as any} title="Visualizar arquivo">
                                  <EyeOutlined />
                                </IconButton>
                                <IconButton size="small" color="error" onClick={() => removeAttachment(a.id)} title="Remover">
                                  <CloseOutlined />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  )}
                </Paper>
              );
            };

            const hasAttachments = (group.claimant?.length || 0) + (group.client?.length || 0) > 0;
            const specMissing = validation.missingSpecs.includes(spec.name);

            // Busca o nome do tópico: primeiro tenta spec.topic?.name, depois busca em topics pelo topicId
            const topicName = spec.topic?.name || (spec.topicId ? topics.find(t => t.id === spec.topicId)?.name : null);

            return (
              <Paper 
                key={spec.id} 
                variant="outlined" 
                sx={{ p: 1.5 }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography fontWeight={700} component="span">
                    {spec.name}
                    {topicName && (
                      <>
                        {' - '}
                        <Typography component="span" sx={{ color: BRAND_GOLD }}>
                          {topicName}
                        </Typography>
                      </>
                    )}
                  </Typography>
                  {!hasAttachments && (
                    <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <WarningOutlined style={{ fontSize: 14 }} />
                      Sem anexos
                    </Typography>
                  )}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  {renderBox('claimant', 'Documentos do reclamante')}
                  {renderBox('client', 'Documentos da Reclamada')}
                </Stack>
              </Paper>
            );
          })}
              </Stack>
            </Paper>
          );
          })}
        </Stack>
      )}

      {/* Dialog para exibir mensagem completa do OCR */}
      <Dialog 
        open={ocrMessageDialog.open} 
        onClose={() => setOcrMessageDialog({ open: false, message: '', fileName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Mensagem do OCR - {ocrMessageDialog.fileName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {ocrMessageDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOcrMessageDialog({ open: false, message: '', fileName: '' })}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default StepAttachments;
