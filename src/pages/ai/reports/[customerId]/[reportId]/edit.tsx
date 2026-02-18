import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Toolbar from '@mui/material/Toolbar';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import HtmlEditor from 'sections/ai/edit-case/HtmlEditor';
import { 
  getReport, 
  updateReport, 
  finalizeCustomerReport,
  finalizeGeneralReport,
  CustomerReport, 
  ReportType,
  getCustomerReportEmails,
  getGeneralReportEmails
} from 'api/reports';
import { openSnackbar } from 'api/snackbar';
import Permission from 'components/Permission';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

export default function EditReportPage() {
  const { customerId, reportId } = useParams<{ customerId: string; reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reportData, setReportData] = useState<CustomerReport | null>(null);
  const [html, setHtml] = useState('');
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [emailsCount, setEmailsCount] = useState<number | null>(null);
  const [loadingEmails, setLoadingEmails] = useState(false);
  /** Auto-save: 'idle' | 'saving' | 'saved' */
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHtmlRef = useRef<string>('');
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    if (!customerId || !reportId) {
      navigate('/ai/reports');
      return;
    }

    (async () => {
      try {
        setLoading(true);
        await loadReportData();
      } catch (err: any) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Erro ao carregar relatório',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        navigate('/ai/reports');
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, reportId, navigate]);

  const loadReportData = async () => {
    if (!reportId) return;

    try {
      // Usa customerId do parâmetro ou 'general' como fallback para relatórios gerais
      const customerIdToUse = customerId || 'general';
      const data = await getReport(customerIdToUse, reportId);
      setReportData(data);
      const content = data.htmlContent || '';
      setHtml(content);
      lastSavedHtmlRef.current = content;
      initialLoadDoneRef.current = true;
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      throw err;
    }
  };

  // Auto-save: debounce 3s após parar de digitar; só envia se htmlContent tiver pelo menos 1 caractere
  useEffect(() => {
    if (!reportId || !reportData || reportData.isFinalized || !initialLoadDoneRef.current) return;
    if (html.trim().length < 1) return;
    if (html === lastSavedHtmlRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      autoSaveTimerRef.current = null;
      const customerIdToUse = reportData.customerId || customerId || 'general';
      const htmlToSave = html;
      try {
        setAutoSaveStatus('saving');
        await updateReport(customerIdToUse, reportId, { htmlContent: htmlToSave });
        lastSavedHtmlRef.current = htmlToSave;
        setReportData(prev => prev ? { ...prev, htmlContent: htmlToSave } : null);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } catch (err: any) {
        setAutoSaveStatus('idle');
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao salvar automaticamente',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      }
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [html, reportId, reportData, customerId]);

  const handleSave = async () => {
    if (!reportId) return;

    try {
      setSaving(true);
      
      // Usa customerId do reportData se disponível, caso contrário usa do parâmetro
      const customerIdToUse = reportData?.customerId || customerId || 'general';
      
      await updateReport(customerIdToUse, reportId, { htmlContent: html });
      
      // Atualiza o reportData local
      setReportData(prev => prev ? { ...prev, htmlContent: html } : null);

      openSnackbar({
        open: true,
        message: 'Relatório salvo com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao salvar relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    // Prioridade 1: backTo do location.state (sempre disponível quando vem da lista)
    // O backTo já inclui os query params (location.pathname + location.search)
    const backTo = (location.state as any)?.backTo as string | undefined;
    
    if (backTo) {
      // Separa pathname e search para garantir que os query params sejam preservados
      const url = new URL(backTo, window.location.origin);
      navigate({
        pathname: url.pathname,
        search: url.search
      }, { replace: true });
      return;
    }
    
    // Fallback quando abrir em nova aba / refresh (state some)
    // Tenta construir o backTo baseado no tipo de relatório
    const folder = reportData?.customerId || customerId;
    const reportType = reportData?.reportType;
    
    if (folder && folder !== 'general' && reportType) {
      // Constrói query param baseado no tipo de relatório
      const params = new URLSearchParams();
      params.set('reportTypeFilter', reportType);
      navigate({
        pathname: `/ai/reports/${folder}`,
        search: `?${params.toString()}`
      }, { replace: true });
      return;
    }
    
    if (folder && folder !== 'general') {
      navigate(`/ai/reports/${folder}`, { replace: true });
      return;
    }
    
    // Último fallback: volta para a lista geral de pastas
    navigate('/ai/reports', { replace: true });
  };

  const handleFinalize = async () => {
    if (!reportId) return;

    try {
      setFinalizing(true);
      
      // Determina se é relatório geral (sem customerId ou customerId = 'general') ou de cliente
      const isGeneralReport = !customerId || customerId === 'general' || !reportData?.customerId;
      
      if (isGeneralReport) {
        // Relatório geral: usa endpoint /reports/:reportId/finalize
        // Envia apenas para e-mails gerais (/report-emails)
        await finalizeGeneralReport(reportId);
      } else {
        // Relatório de cliente: usa endpoint /customers/:customerId/reports/:reportId/finalize
        // Envia para e-mails do cliente e e-mails gerais
        const customerIdToUse = reportData?.customerId || customerId;
        if (!customerIdToUse) {
          throw new Error('CustomerId não encontrado para finalizar relatório de cliente');
        }
        await finalizeCustomerReport(customerIdToUse, reportId);
      }
      
      openSnackbar({
        open: true,
        message: 'Relatório finalizado e enviado por e-mail com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      
      setFinalizeDialogOpen(false);
      
      // Recarrega os dados do relatório para sincronizar
      await loadReportData();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao finalizar relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setFinalizing(false);
    }
  };

  const checkEmails = async () => {
    if (!reportData) return;
    
    try {
      setLoadingEmails(true);
      let emails: any[] = [];
      
      // Determina se é relatório geral ou de cliente
      const isGeneralReport = !reportData.customerId || !customerId || customerId === 'general';
      
      if (isGeneralReport) {
        emails = await getGeneralReportEmails();
      } else {
        const customerIdToUse = reportData.customerId || customerId;
        if (customerIdToUse) {
          emails = await getCustomerReportEmails(customerIdToUse);
        }
      }
      
      setEmailsCount(emails.length);
    } catch (err: any) {
      // Em caso de erro, assume que não há e-mails
      setEmailsCount(0);
      console.error('Erro ao verificar e-mails:', err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels: Partial<Record<ReportType, string>> = {
      [ReportType.RELATORIO_SENTENCA]: 'Relatório de Sentença',
      [ReportType.ANALISE_PRELIMINAR_RISCO]: 'Análise Preliminar de Risco',
      [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA]: 'Relatório de Audiência Trabalhista',
      [ReportType.RELATORIO_PROVISIONAMENTO_RISCO]: 'Provisionamento e Risco',
      [ReportType.RELATORIO_PRE_AUDIENCIA]: 'Pré-Audiência',
      [ReportType.RELATORIO_POS_AUDIENCIA]: 'Pós-Audiência',
      [ReportType.RELATORIO_DECISOES_SENTENCA]: 'Decisões - Sentença',
      [ReportType.RELATORIO_DECISOES_ACORDAO]: 'Decisões - Acórdão',
      [ReportType.RELATORIO_PROCESSUAL]: 'Processual'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Relatório não encontrado.</Typography>
      </Box>
    );
  }

  return (
    <Permission resources={['customers.update']}>
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
                  Editar Relatório
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {reportData.title} - {getReportTypeLabel(reportData.reportType)}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              {!reportData.isFinalized && autoSaveStatus !== 'idle' && (
                <Typography variant="caption" color={autoSaveStatus === 'saving' ? 'text.secondary' : 'success.main'}>
                  {autoSaveStatus === 'saving' ? 'Salvando…' : 'Salvo'}
                </Typography>
              )}
              {reportData.isFinalized && (
                <Chip
                  label="Finalizado"
                  color="success"
                  icon={<CheckCircleOutlined />}
                />
              )}
              
              {!reportData.isFinalized && (
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleOutlined />}
                  onClick={async () => {
                    // Verifica e-mails antes de abrir o dialog
                    await checkEmails();
                    setFinalizeDialogOpen(true);
                  }}
                  disabled={finalizing}
                >
                  {finalizing ? 'Finalizando...' : 'Finalizar e Enviar'}
                </Button>
              )}

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

        {/* Área de conteúdo */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <HtmlEditor
              html={html}
              onChange={setHtml}
              editable={!reportData.isFinalized}
            />
          </Box>
        </Box>
      </Box>

      {/* Dialog de Confirmação de Finalização */}
      <Dialog open={finalizeDialogOpen} onClose={() => !finalizing && setFinalizeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Finalizar Relatório
          </Typography>
        </DialogTitle>
        <DialogContent>
          {loadingEmails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : emailsCount === 0 ? (
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 2, color: 'error.main' }}>
                Não é possível finalizar o relatório
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.primary' }}>
                É necessário cadastrar pelo menos um e-mail para envio antes de finalizar o relatório.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Acesse a pasta do relatório e clique no ícone de e-mail para cadastrar os destinatários.
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 2, color: 'text.primary' }}>
                Tem certeza que deseja finalizar este relatório? Após finalizar:
              </Typography>
              <Box component="ul" sx={{ mt: 2, pl: 2, mb: 0 }}>
                <Typography 
                  component="li" 
                  variant="body2" 
                  sx={{ mb: 1.5, color: 'text.primary' }}
                >
                  Um PDF será gerado automaticamente
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  sx={{ mb: 1.5, color: 'text.primary' }}
                >
                  O relatório será enviado por e-mail para {emailsCount === 1 ? 'o endereço' : 'os endereços'} cadastrado{emailsCount !== 1 ? 's' : ''} ({emailsCount} {emailsCount === 1 ? 'e-mail' : 'e-mails'})
                </Typography>
                <Typography 
                  component="li" 
                  variant="body2" 
                  sx={{ color: 'text.primary' }}
                >
                  O relatório não poderá mais ser editado
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFinalizeDialogOpen(false)} disabled={finalizing || loadingEmails}>
            {emailsCount === 0 ? 'Fechar' : 'Cancelar'}
          </Button>
          <Button
            onClick={handleFinalize}
            variant="contained"
            color="success"
            disabled={finalizing || loadingEmails || emailsCount === 0}
            startIcon={finalizing ? <CircularProgress size={16} /> : <CheckCircleOutlined />}
          >
            {finalizing ? 'Finalizando...' : 'Finalizar e Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Permission>
  );
}
