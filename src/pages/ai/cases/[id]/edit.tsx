import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Drawer from '@mui/material/Drawer';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';
import HtmlEditor from 'sections/ai/edit-case/HtmlEditor';
import AuditTab from 'sections/ai/cases/AuditTab';
import { getCaseResult, updateCaseResultHtml, CaseResult, finalizeCase, approveCase, releaseCase } from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';
import { convertHtmlToDocx, convertHtmlToPdf } from 'api/aiDocs';
import Permission from 'components/Permission';
import { getValidationChecklist } from 'sections/ai/cases/checklists';
import useAuth from 'hooks/useAuth';
import { usePermissions } from 'hooks/usePermissions';
import { useWorkspaceAutosave } from 'hooks/useWorkspaceAutosave';
import { useWorkspaceRestore } from 'hooks/useWorkspaceRestore';

export default function EditCasePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);
  const [caseData, setCaseData] = useState<CaseResult | null>(null);
  const [html, setHtml] = useState('');
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [checklistStatusMenuAnchor, setChecklistStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const [processingStatus, setProcessingStatus] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [currentTab, setCurrentTab] = useState(0);
  const caseDataRef = useRef<CaseResult | null>(null);
  const hasRestoredStateRef = useRef(false);

  // Restaura estado do workspace ao carregar
  const { workspaceState } = useWorkspaceRestore({
    context: 'case-editor',
    expectedResourceId: id || null,
    autoRestore: true
  });

  // Restaura estado do workspace após carregar dados do caso
  useEffect(() => {
    if (!workspaceState || !caseData || hasRestoredStateRef.current) return;
    
    // Restaura scroll position
    if (workspaceState.state.scrollPosition !== undefined) {
      setTimeout(() => {
        window.scrollTo(0, workspaceState.state.scrollPosition as number);
      }, 100);
    }
    
    // Restaura aba selecionada
    if (workspaceState.state.selectedTab !== undefined) {
      setCurrentTab(workspaceState.state.selectedTab as number);
    }
    
    // Restaura checklist se houver (só se não houver checklist salvo no caso)
    const savedChecklist = caseData?.tags?.validationChecklist as Record<string, boolean> | undefined;
    if (!savedChecklist || Object.keys(savedChecklist).length === 0) {
      if (workspaceState.state.checkedItems && typeof workspaceState.state.checkedItems === 'object') {
        setCheckedItems(workspaceState.state.checkedItems as Record<string, boolean>);
      }
    }
    
    hasRestoredStateRef.current = true;
  }, [workspaceState, caseData]);

  // Autosave periódico do estado do workspace
  useWorkspaceAutosave({
    context: 'case-editor',
    resourceId: id || null,
    interval: 30000, // 30 segundos
    getState: () => ({
      scrollPosition: window.scrollY,
      selectedTab: currentTab,
      checkedItems,
      // Não salva html no workspace state (já é salvo no caso)
    }),
    getMetadata: () => ({
      url: window.location.pathname
    }),
    saveOnMount: false, // Não salva ao montar, apenas após interação
    saveOnUnmount: true // Salva antes de desmontar
  });

  const loadCaseData = useCallback(async () => {
    if (!id) return;

    try {
      const data = await getCaseResult(id);
      setCaseData(data);
      caseDataRef.current = data;
      
      const htmlContent = 
        data?.htmlMain || 
        data?.html || 
        (data?._infos as any)?.phase06?.html || 
        data?.infos?.phase06?.html || 
        '';
      
      setHtml(htmlContent);
      
      // A restauração do checklist será feita automaticamente pelo useEffect que monitora caseData?.tags?.validationChecklist
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar caso',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      navigate('/ai/cases');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        await loadCaseData();
      } catch (err: any) {
        navigate('/ai/cases');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, loadCaseData]);

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      // Inclui os dados do checklist de validação nas tags para garantir que esteja salvo
      const tags = {
        ...(caseData?.tags || {}),
        validationChecklist: checkedItems
      };
      
      await updateCaseResultHtml(id, {
        html,
        tags,
        replaceTags: false
      });

      // Atualiza o caseData local para refletir as mudanças
      const updatedCaseData = caseData ? { ...caseData, tags } : null;
      setCaseData(updatedCaseData);
      caseDataRef.current = updatedCaseData;

      openSnackbar({
        open: true,
        message: 'Caso salvo com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao salvar caso',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/ai/cases');
  };

  const handleDownloadDocx = async () => {
    if (!html || downloading) return;

    try {
      setDownloading(true);
      setDownloadMenuAnchor(null);
      const { blob, filename } = await convertHtmlToDocx({
        html,
        filename: caseData?.piece?.name 
          ? `${caseData.piece.name.replace(/[\\/:*?"<>|]/g, '_')}.docx`
          : 'documento.docx'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'documento.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      openSnackbar({
        open: true,
        message: 'Documento DOCX baixado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao converter para DOCX',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!html || downloadingPdf) return;

    try {
      setDownloadingPdf(true);
      setDownloadMenuAnchor(null);
      const { blob, filename } = await convertHtmlToPdf({
        html,
        filename: caseData?.piece?.name 
          ? `${caseData.piece.name.replace(/[\\/:*?"<>|]/g, '_')}.pdf`
          : 'documento.pdf'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      openSnackbar({
        open: true,
        message: 'Documento PDF baixado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao converter para PDF',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  const handleStatusChange = async (action: 'finalize' | 'approve' | 'release') => {
    if (!id) return;
    
    try {
      setProcessingStatus(true);
      
      switch (action) {
        case 'finalize':
          await finalizeCase(id);
          break;
        case 'approve':
          await approveCase(id);
          break;
        case 'release':
          await releaseCase(id);
          break;
      }
      
      openSnackbar({
        open: true,
        message: 'Status alterado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      
      // Recarrega os dados do caso para sincronizar
      await loadCaseData();
      setStatusMenuAnchor(null);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao alterar status',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setProcessingStatus(false);
    }
  };

  const getStatusConfig = (status?: string | null) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendente', color: 'warning' as const };
      case 'finalized':
        return { label: 'Finalizado', color: 'info' as const };
      case 'approved':
        return { label: 'Aprovado', color: 'primary' as const };
      case 'released':
        return { label: 'Liberado', color: 'success' as const };
      default:
        return { label: '—', color: 'default' as const };
    }
  };

  const getAvailableStatusActions = () => {
    const status = caseData?.status;
    const isRequester = user?.id === caseData?.requesterId;
    const hasUpdatePermission = hasAnyPermission(['ai.cases.update']);
    
    if (!hasUpdatePermission) return [];
    
    const actions: Array<{ key: 'finalize' | 'approve' | 'release'; label: string; disabled?: boolean }> = [];
    
    if (status === 'pending') {
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: !isRequester 
      });
      actions.push({ 
        key: 'approve', 
        label: 'Aprovar', 
        disabled: true 
      });
      actions.push({ 
        key: 'release', 
        label: 'Liberar', 
        disabled: true 
      });
    } else if (status === 'finalized') {
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: true 
      });
      actions.push({ 
        key: 'approve', 
        label: 'Aprovar', 
        disabled: false 
      });
      actions.push({ 
        key: 'release', 
        label: 'Liberar', 
        disabled: false 
      });
    } else if (status === 'approved') {
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: true 
      });
      actions.push({ 
        key: 'approve', 
        label: 'Aprovar', 
        disabled: true 
      });
      actions.push({ 
        key: 'release', 
        label: 'Liberar', 
        disabled: false 
      });
    } else if (status === 'released') {
      // Status final - nenhuma ação disponível
      return [];
    } else {
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: !isRequester 
      });
      actions.push({ 
        key: 'approve', 
        label: 'Aprovar', 
        disabled: false 
      });
      actions.push({ 
        key: 'release', 
        label: 'Liberar', 
        disabled: false 
      });
    }
    
    return actions;
  };

  const statusConfig = useMemo(() => {
    const config = getStatusConfig(caseData?.status);
    // Garante que a cor seja válida (remove espaços em branco se houver)
    if (typeof config.color === 'string') {
      config.color = config.color.trim() as any;
    }
    return config;
  }, [caseData?.status]);

  const availableStatusActions = getAvailableStatusActions();
  const validationChecklist = useMemo(() => getValidationChecklist(), []);

  // Restaura os dados do checklist quando o caseData é carregado pela primeira vez
  useEffect(() => {
    if (!caseData) return;
    
    // Se já restaurou do workspace state, não sobrescreve
    if (hasRestoredStateRef.current) return;
    
    const savedChecklist = caseData?.tags?.validationChecklist as Record<string, boolean> | undefined;
    
    // Se houver dados salvos, restaura
    if (savedChecklist && typeof savedChecklist === 'object' && Object.keys(savedChecklist).length > 0) {
      setCheckedItems(savedChecklist);
    } else if (Object.keys(checkedItems).length === 0) {
      // Só inicializa com valores padrão se não houver dados salvos E não houver estado local
      const initial: Record<string, boolean> = {};
      validationChecklist.forEach((section) => {
        section.items.forEach((item) => {
          initial[item.id] = item.checked || false;
          item.subItems?.forEach((subItem) => {
            initial[subItem.id] = subItem.checked || false;
          });
        });
      });
      setCheckedItems(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseData?.id]); // Só executa quando o caso muda (nova carga), não quando tags mudam após auto-save

  const handleChecklistToggle = (itemId: string, item?: { subItems?: Array<{ id: string }> }) => {
    setCheckedItems((prev) => {
      const newState = { ...prev };
      const newValue = !prev[itemId];
      newState[itemId] = newValue;
      
      if (item?.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem) => {
          newState[subItem.id] = newValue;
        });
      }
      
      return newState;
    });
  };

  // Auto-save do checklist no Redis quando os itens são alterados (com debounce)
  useEffect(() => {
    if (!id || Object.keys(checkedItems).length === 0 || !caseData) return;
    
    // Verifica se houve mudança real comparando com os dados salvos
    const savedChecklist = caseData?.tags?.validationChecklist as Record<string, boolean> | undefined;
    const savedChecklistStr = savedChecklist ? JSON.stringify(savedChecklist) : '';
    const currentChecklistStr = JSON.stringify(checkedItems);
    
    if (savedChecklistStr === currentChecklistStr) {
      return; // Não houve mudança, não precisa salvar
    }
    
    // Captura os valores no momento da criação do timeout
    const itemsToSave = checkedItems;
    const htmlToSave = html;
    
    // Debounce para evitar muitas chamadas ao Redis
    const timeoutId = setTimeout(async () => {
      // Usa o ref para obter o valor mais atualizado
      const currentCaseData = caseDataRef.current;
      if (!currentCaseData) return;
      
      // Verifica novamente se ainda há diferença (pode ter mudado durante o debounce)
      const currentSavedChecklist = currentCaseData?.tags?.validationChecklist as Record<string, boolean> | undefined;
      const currentSavedStr = currentSavedChecklist ? JSON.stringify(currentSavedChecklist) : '';
      const currentCheckedStr = JSON.stringify(itemsToSave);
      if (currentSavedStr === currentCheckedStr) {
        return; // Já foi salvo por outra mudança
      }
      
      // Salva o checklist nas tags do caso (o backend salvará no Redis)
      const tags = {
        ...(currentCaseData?.tags || {}),
        validationChecklist: itemsToSave
      };
      
      try {
        // Salva em background (não bloqueia a UI)
        await updateCaseResultHtml(id, {
          html: htmlToSave,
          tags,
          replaceTags: false
        });
        
        // Atualiza o caseData local para refletir que foi salvo
        const updatedCaseData = currentCaseData ? { ...currentCaseData, tags } : null;
        setCaseData(updatedCaseData);
        caseDataRef.current = updatedCaseData;
      } catch (err) {
        console.error('Erro ao salvar checklist no Redis:', err);
        // Não mostra erro ao usuário para não interromper o fluxo
      }
    }, 500); // Aguarda 500ms após a última alteração antes de salvar
    
    return () => clearTimeout(timeoutId);
  }, [checkedItems, id, html, caseData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Permission resources={['ai.cases.update']}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Barra de ferramentas superior */}
      <Paper elevation={2} sx={{ zIndex: 1100 }}>
        <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={handleBack}>
              <ArrowLeftOutlined />
            </IconButton>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Editar Caso
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {caseData?.piece?.name || 'Documento'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => setChecklistOpen(true)}
              color="primary"
              title="Abrir checklist"
            >
              <CheckCircleOutlined />
            </IconButton>
            
            {hasAnyPermission(['ai.cases.update']) && availableStatusActions.length > 0 && (
              <>
                <Chip
                  label={statusConfig.label}
                  color={statusConfig.color}
                  onClick={(e) => setStatusMenuAnchor(e.currentTarget)}
                  sx={{ cursor: 'pointer' }}
                />
                <Menu
                  anchorEl={statusMenuAnchor}
                  open={Boolean(statusMenuAnchor)}
                  onClose={() => setStatusMenuAnchor(null)}
                >
                  {availableStatusActions.map((action) => (
                    <MenuItem
                      key={action.key}
                      onClick={() => !action.disabled && handleStatusChange(action.key)}
                      disabled={action.disabled || processingStatus}
                    >
                      {action.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}
            
            {!hasAnyPermission(['ai.cases.update']) && caseData?.status && (
              <Chip
                label={statusConfig.label}
                color={statusConfig.color}
              />
            )}

            <>
              <Button
                variant="outlined"
                startIcon={<DownloadOutlined />}
                onClick={handleDownloadMenuOpen}
                disabled={downloading || downloadingPdf || !html}
              >
                {downloading || downloadingPdf ? 'Convertendo...' : 'Baixar'}
              </Button>
              <Menu
                anchorEl={downloadMenuAnchor}
                open={Boolean(downloadMenuAnchor)}
                onClose={handleDownloadMenuClose}
              >
               
                <MenuItem
                  onClick={handleDownloadDocx}
                  disabled={downloading || downloadingPdf}
                >
                  Baixar DOCX
                </MenuItem>
              </Menu>
            </>
            <Button
              variant="contained"
              startIcon={<SaveOutlined />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </Stack>
        </Toolbar>
      </Paper>

      {/* Tabs */}
      <Paper elevation={1} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)}>
          <Tab label="Edição" />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Auditoria</span>
                {caseData?.hasAudit && (
                  <Chip label="Auditado" color="success" size="small" />
                )}
              </Stack>
            } 
          />
        </Tabs>
      </Paper>

      {/* Área de conteúdo */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {currentTab === 0 && (
          <Box sx={{ display: currentTab === 0 ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
            <HtmlEditor
              html={html}
              onChange={setHtml}
              editable={true}
            />
          </Box>
        )}
        {caseData && (
          <Box 
            sx={{ 
              display: currentTab === 1 ? 'flex' : 'none', 
              flex: 1, 
              overflow: 'auto',
              flexDirection: 'column'
            }}
          >
            <AuditTab
              caseId={caseData.id}
              hasAudit={caseData.hasAudit}
            />
          </Box>
        )}
      </Box>

      {/* Drawer do Checklist */}
      <Drawer
        anchor="right"
        open={checklistOpen}
        onClose={() => setChecklistOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480, md: 600 } } }}
      >
        <Stack spacing={1.5} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" fontWeight={700}>
              Checklist de Validação
            </Typography>
            <IconButton onClick={() => setChecklistOpen(false)}>
              <CloseOutlined />
            </IconButton>
          </Stack>

          <Divider />

          {/* Status e mudança de status no checklist */}
          {caseData?.status && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" fontWeight={600}>
                Status do Caso:
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {hasAnyPermission(['ai.cases.update']) && availableStatusActions.length > 0 ? (
                  <>
                    <Chip
                      label={statusConfig.label}
                      color={statusConfig.color}
                      size="small"
                      onClick={(e) => setChecklistStatusMenuAnchor(e.currentTarget)}
                      sx={{ cursor: 'pointer' }}
                      disabled={processingStatus}
                    />
                    <Menu
                      anchorEl={checklistStatusMenuAnchor}
                      open={Boolean(checklistStatusMenuAnchor)}
                      onClose={() => setChecklistStatusMenuAnchor(null)}
                    >
                      {availableStatusActions.map((action) => (
                        <MenuItem
                          key={action.key}
                          onClick={() => {
                            handleStatusChange(action.key);
                            setChecklistStatusMenuAnchor(null);
                          }}
                          disabled={action.disabled || processingStatus}
                        >
                          {action.label}
                        </MenuItem>
                      ))}
                    </Menu>
                  </>
                ) : (
                  <Chip
                    label={statusConfig.label}
                    color={statusConfig.color}
                    size="small"
                  />
                )}
              </Stack>
            </Stack>
          )}

          <Divider />

          {/* Checklist de Validação */}
          <Stack spacing={2}>
            {validationChecklist.map((section) => (
              <Accordion
                key={section.id}
                defaultExpanded={section.defaultExpanded !== false}
                disabled={section.collapsible === false}
              >
                <AccordionSummary expandIcon={section.collapsible !== false ? <RightOutlined /> : null}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {section.title}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1.5}>
                    {section.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {section.description}
                      </Typography>
                    )}
                    {section.items.map((item) => (
                      <Box key={item.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={checkedItems[item.id] || false}
                              onChange={() => handleChecklistToggle(item.id, item)}
                              color="primary"
                            />
                          }
                          label={
                            <Stack>
                              <Typography variant="body2" fontWeight={item.required ? 600 : 400}>
                                {item.label}
                                {item.required && (
                                  <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                                    *
                                  </Typography>
                                )}
                              </Typography>
                              {item.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {item.description}
                                </Typography>
                              )}
                            </Stack>
                          }
                        />
                        {item.subItems && item.subItems.length > 0 && (
                          <Box sx={{ pl: 4, mt: 0.5 }}>
                            <Stack spacing={0.5}>
                              {item.subItems.map((subItem) => (
                                <FormControlLabel
                                  key={subItem.id}
                                  control={
                                    <Checkbox
                                      checked={checkedItems[subItem.id] || false}
                                      onChange={() => handleChecklistToggle(subItem.id)}
                                      color="primary"
                                      size="small"
                                    />
                                  }
                                  label={
                                    <Stack>
                                      <Typography variant="body2" fontSize="0.875rem" fontWeight={subItem.required ? 600 : 400}>
                                        {subItem.label}
                                        {subItem.required && (
                                          <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                                            *
                                          </Typography>
                                        )}
                                      </Typography>
                                      {subItem.description && (
                                        <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                                          {subItem.description}
                                        </Typography>
                                      )}
                                    </Stack>
                                  }
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Stack>
      </Drawer>
    </Box>
    </Permission>
  );
}
