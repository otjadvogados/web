import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import MailOutlined from '@ant-design/icons/MailOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import {
  listReportFolders,
  deleteReport,
  type ReportFolderResponse,
  ReportType,
  type ReportEmail,
  getGeneralReportEmails,
  createGeneralReportEmail,
  updateGeneralReportEmail,
  deleteGeneralReportEmail,
  getCustomerReportEmails,
  createCustomerReportEmail,
  updateCustomerReportEmail,
  deleteCustomerReportEmail
} from 'api/reports';
import Permission from 'components/Permission';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';

export default function ReportsFolderPage() {
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();
  const [folder, setFolder] = useState<ReportFolderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Estados para gerenciamento de e-mails
  const [emails, setEmails] = useState<ReportEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailsModalOpen, setEmailsModalOpen] = useState(false);
  const [emailFormDialogOpen, setEmailFormDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<ReportEmail | null>(null);
  const [emailForm, setEmailForm] = useState({ email: '', label: '' });
  const [savingEmail, setSavingEmail] = useState(false);
  const [deleteEmailDialogOpen, setDeleteEmailDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<ReportEmail | null>(null);
  const [deletingEmail, setDeletingEmail] = useState(false);

  const loadFolder = async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      
      // Busca a pasta na lista de pastas de relatórios
      const folders = await listReportFolders();
      // Busca por id ou por id === 'general' se o folderId for 'general'
      const foundFolder = folders.find((f) => 
        f.id === folderId || 
        (folderId === 'general' && (f.id === 'general' || f.type === 'general'))
      );
      
      if (!foundFolder) {
        openSnackbar({
          open: true,
          message: 'Pasta não encontrada',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        navigate('/ai/reports');
        return;
      }

      // Para pasta geral, garante que o tipo está correto
      const folderToSet = folderId === 'general' && foundFolder.type !== 'general'
        ? { ...foundFolder, type: 'general' as const, customerId: null }
        : foundFolder;

      setFolder(folderToSet);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar relatórios',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      navigate('/ai/reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  // Carregar e-mails quando a pasta for carregada
  useEffect(() => {
    if (folder) {
      loadEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const loadEmails = async () => {
    if (!folder) return;

    try {
      setLoadingEmails(true);
      let emailsData: ReportEmail[] = [];
      
      if (folder.type === 'general' || !folder.customerId) {
        // Pasta geral: busca e-mails gerais
        emailsData = await getGeneralReportEmails();
      } else {
        // Pasta de cliente: busca e-mails do cliente
        emailsData = await getCustomerReportEmails(folder.customerId);
      }
      
      setEmails(emailsData);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar e-mails',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      setEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  const applySearchFilter = (reports: ReportFolderResponse['reports'], q: string) => {
    const term = q.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((report) => 
      (report.title || '').toLowerCase().includes(term) ||
      (report.reportType || '').toLowerCase().includes(term)
    );
  };

  const filteredReports = useMemo(() => {
    if (!folder || !folder.reports) return [];
    
    // Para pasta geral, filtra apenas relatórios com customerId null ou undefined
    let reportsToShow = folder.reports;
    const isGeneralFolder = folder.type === 'general' || folder.customerId === null || folder.id === 'general';
    
    if (isGeneralFolder) {
      // Mostra apenas relatórios que não têm customerId (null ou undefined)
      reportsToShow = folder.reports.filter(report => 
        report.customerId === null || 
        report.customerId === undefined ||
        !report.customerId
      );
    } else {
      // Para pasta de cliente, mostra todos os relatórios dessa pasta
      reportsToShow = folder.reports;
    }
    
    return applySearchFilter(reportsToShow, search);
  }, [folder, search]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getReportTypeLabel = (type: ReportType) => {
    const labels: Record<ReportType, string> = {
      [ReportType.RELATORIO_SENTENCA]: 'Relatório de Sentença',
      [ReportType.ANALISE_PRELIMINAR_RISCO]: 'Análise Preliminar de Risco',
      [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA]: 'Relatório de Audiência Trabalhista'
    };
    return labels[type] || type;
  };


  const handleDeleteClick = (report: ReportFolderResponse['reports'][0]) => {
    setReportToDelete({ id: report.id, title: report.title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;

    try {
      setDeleting(true);
      await deleteReport(reportToDelete.id);
      
      openSnackbar({
        open: true,
        message: 'Relatório removido com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      setDeleteDialogOpen(false);
      setReportToDelete(null);

      // Recarrega a pasta para atualizar a lista
      try {
        const folders = await listReportFolders();
        const foundFolder = folders.find((f) => f.id === folderId);
        
        if (foundFolder) {
          setFolder(foundFolder);
        } else {
          // Se a pasta não foi encontrada, volta para lista
          navigate('/ai/reports');
        }
      } catch (err: any) {
        // Em caso de erro ao recarregar, apenas loga o erro
        console.error('Erro ao recarregar pasta após exclusão:', err);
      }
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleting(false);
    }
  };

  // Handlers para e-mails
  const handleOpenEmailsModal = () => {
    setEmailsModalOpen(true);
    loadEmails();
  };

  const handleAddEmail = () => {
    setEditingEmail(null);
    setEmailForm({ email: '', label: '' });
    setEmailFormDialogOpen(true);
  };

  const handleEditEmail = (email: ReportEmail) => {
    setEditingEmail(email);
    setEmailForm({ email: email.email, label: email.label || '' });
    setEmailFormDialogOpen(true);
  };

  const handleSaveEmail = async () => {
    if (!emailForm.email.trim()) {
      openSnackbar({
        open: true,
        message: 'E-mail é obrigatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      return;
    }

    if (!folder) return;

    try {
      setSavingEmail(true);
      
      if (folder.type === 'general' || !folder.customerId) {
        // Pasta geral
        if (editingEmail) {
          const updateData: { email?: string; label?: string | null } = {};
          // Se o email foi alterado, inclui no update
          if (emailForm.email.trim() !== editingEmail.email) {
            updateData.email = emailForm.email.trim();
          }
          // Se o label foi alterado ou precisa ser limpo, inclui no update
          if (emailForm.label.trim() !== (editingEmail.label || '')) {
            updateData.label = emailForm.label.trim() || null;
          }
          await updateGeneralReportEmail(editingEmail.id, updateData);
        } else {
          await createGeneralReportEmail({
            email: emailForm.email.trim(),
            label: emailForm.label.trim() || undefined
          });
        }
      } else {
        // Pasta de cliente
        if (editingEmail) {
          const updateData: { email?: string; label?: string | null } = {};
          // Se o email foi alterado, inclui no update
          if (emailForm.email.trim() !== editingEmail.email) {
            updateData.email = emailForm.email.trim();
          }
          // Se o label foi alterado ou precisa ser limpo, inclui no update
          if (emailForm.label.trim() !== (editingEmail.label || '')) {
            updateData.label = emailForm.label.trim() || null;
          }
          await updateCustomerReportEmail(folder.customerId, editingEmail.id, updateData);
        } else {
          await createCustomerReportEmail(folder.customerId, {
            email: emailForm.email.trim(),
            label: emailForm.label.trim() || undefined
          });
        }
      }

      openSnackbar({
        open: true,
        message: editingEmail ? 'E-mail atualizado com sucesso!' : 'E-mail cadastrado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      setEmailFormDialogOpen(false);
      setEditingEmail(null);
      setEmailForm({ email: '', label: '' });
      await loadEmails();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao salvar e-mail',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleDeleteEmailClick = (email: ReportEmail) => {
    setEmailToDelete(email);
    setDeleteEmailDialogOpen(true);
  };

  const handleDeleteEmailConfirm = async () => {
    if (!emailToDelete || !folder) return;

    try {
      setDeletingEmail(true);
      
      if (folder.type === 'general' || !folder.customerId) {
        await deleteGeneralReportEmail(emailToDelete.id);
      } else {
        await deleteCustomerReportEmail(folder.customerId, emailToDelete.id);
      }

      openSnackbar({
        open: true,
        message: 'E-mail removido com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      setDeleteEmailDialogOpen(false);
      setEmailToDelete(null);
      await loadEmails();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover e-mail',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeletingEmail(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                startIcon={<ArrowLeftOutlined />}
                onClick={() => navigate('/ai/reports')}
                sx={{ mr: 1 }}
              >
                Voltar
              </Button>
              <Typography variant="h6" fontWeight={700}>
                {folder?.name || 'Carregando...'}
              </Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : !folder ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Pasta não encontrada.
                </Typography>
              </Stack>
            ) : !folder.reports || folder.reports.length === 0 ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum relatório encontrado nesta pasta.
                </Typography>
              </Stack>
            ) : (
              <>
                {/* Busca */}
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <TextField
                    label="Buscar  relatórios"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome..."
                    sx={{ flex: 1 }}
                    size="small"
                  />
                    <Stack direction="row" spacing={1}>
                    <Permission resources={['customers.create']}>
                      <Tooltip title="Gerenciar e-mails para envio de relatórios">
                        <IconButton
                          color="primary"
                          onClick={handleOpenEmailsModal}
                        >
                          <MailOutlined />
                        </IconButton>
                      </Tooltip>
                    </Permission>
                    <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={loadFolder} disabled={loading}>
                      Atualizar
                    </Button>
                  </Stack>
                </Stack>

                <Divider />

                {/* Lista de Relatórios */}
                <Permission resources={['customers.read']}>
                  {filteredReports.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Nenhum resultado encontrado.' : 'Nenhum relatório encontrado nesta pasta.'}
                      </Typography>
                    </Stack>
                  ) : (
                    <>
                      {/* Header estilo Explorer */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {folder.name || 'Relatórios'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {filteredReports.length} {filteredReports.length === 1 ? 'relatório' : 'relatórios'}
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          minHeight: '60vh',
                          p: 2,
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(auto-fill, minmax(300px, 1fr))',
                            md: 'repeat(auto-fill, minmax(320px, 1fr))',
                            lg: 'repeat(auto-fill, minmax(340px, 1fr))'
                          },
                          gap: 1.5,
                          alignContent: 'start',
                          justifyItems: 'stretch'
                        }}
                      >
                        {filteredReports.map((report) => (
                          <Box
                            key={report.id}
                            sx={{
                              p: 2,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1.5,
                              bgcolor: 'background.paper',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 2,
                                borderColor: 'primary.main'
                              }
                            }}
                          >
                            <Stack spacing={1.5}>
                              {/* Cabeçalho do Relatório */}
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <FileTextOutlined style={{ fontSize: 20, color: folder.customerId ? '#4CAF50' : '#2196F3' }} />
                                  <Typography fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                    {report.title}
                                  </Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {getReportTypeLabel(report.reportType)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(report.createdAt)}
                                </Typography>
                              </Stack>

                              <Divider />

                              {/* Status e Ações */}
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                                  <Chip
                                    label={report.isFinalized ? 'Finalizado' : 'Rascunho'}
                                    size="small"
                                    color={report.isFinalized ? 'success' : 'default'}
                                  />
                                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => {
                                        // Para relatórios gerais, usa 'general', caso contrário usa customerId
                                        const customerIdToUse = report.customerId || folder.customerId || 
                                          (folder.type === 'general' || folder.id === 'general' ? 'general' : null);
                                        if (customerIdToUse) {
                                          navigate(`/ai/reports/${customerIdToUse}/${report.id}/edit`, {
                                            state: { folderId: folder.id }
                                          });
                                        }
                                      }}
                                    >
                                      {report.isFinalized ? 'Ver' : 'Editar'}
                                    </Button>
                                    <Permission resources={['customers.delete']}>
                                      <Tooltip title="Excluir relatório">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => handleDeleteClick(report)}
                                          disabled={deleting}
                                        >
                                          <DeleteOutlined />
                                        </IconButton>
                                      </Tooltip>
                                    </Permission>
                                  </Stack>
                                </Stack>
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Permission>
              </>
            )}
          </Stack>
        </MainCard>
      </Grid>

      {/* Dialog de Confirmação de Exclusão de Relatório */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        title="Excluir Relatório"
        description={
          <Typography variant="body2">
            Tem certeza que deseja excluir o relatório <strong>{reportToDelete?.title}</strong>?
            Esta ação não pode ser desfeita.
          </Typography>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!deleting) {
            setDeleteDialogOpen(false);
            setReportToDelete(null);
          }
        }}
      />

      {/* Modal Principal de Gerenciamento de E-mails */}
      <Dialog 
        open={emailsModalOpen} 
        onClose={() => !savingEmail && setEmailsModalOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <MailOutlined style={{ fontSize: 24 }} />
              <Typography variant="h6">
                E-mails para Envio de Relatórios
              </Typography>
            </Stack>
            <Permission resources={['customers.create']}>
              <Button
                variant="contained"
                size="small"
                startIcon={<PlusOutlined />}
                onClick={handleAddEmail}
              >
                Adicionar E-mail
              </Button>
            </Permission>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {loadingEmails ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : emails.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <MailOutlined style={{ fontSize: 48, color: 'text.secondary', opacity: 0.5, marginBottom: 2 }} />
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                Nenhum e-mail cadastrado
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center', maxWidth: 400 }}>
                Adicione um e-mail para receber relatórios automaticamente ao finalizar.
              </Typography>
            </Stack>
          ) : (
            <List sx={{ py: 1 }}>
              {emails.map((email) => (
                <ListItem
                  key={email.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    mb: 1.5,
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={500}>
                          {email.email}
                        </Typography>
                        {email.label && (
                          <Chip
                            label={email.label}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.75rem' }}
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {folder?.type === 'general' 
                          ? 'Recebe relatórios gerais' 
                          : `Recebe relatórios de ${folder?.name || 'cliente'}`}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={0.5}>
                      <Permission resources={['customers.create']}>
                        <Tooltip title="Editar rótulo">
                          <IconButton
                            size="small"
                            onClick={() => handleEditEmail(email)}
                          >
                            <EditOutlined />
                          </IconButton>
                        </Tooltip>
                      </Permission>
                      <Permission resources={['customers.delete']}>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteEmailClick(email)}
                          >
                            <DeleteOutlined />
                          </IconButton>
                        </Tooltip>
                      </Permission>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailsModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Formulário para Adicionar/Editar E-mail */}
      <Dialog 
        open={emailFormDialogOpen} 
        onClose={() => !savingEmail && setEmailFormDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <MailOutlined />
            <Typography variant="h6">
              {editingEmail ? 'Editar E-mail' : 'Adicionar E-mail'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="E-mail *"
              type="email"
              value={emailForm.email}
              onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
              fullWidth
              required
              helperText="E-mail que receberá os relatórios"
            />
            <TextField
              label="Rótulo (opcional)"
              value={emailForm.label}
              onChange={(e) => setEmailForm({ ...emailForm, label: e.target.value })}
              placeholder="Ex.: Administrador, Gerente de Relatórios"
              fullWidth
              helperText="Descrição opcional para identificar o e-mail"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailFormDialogOpen(false)} disabled={savingEmail}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveEmail}
            variant="contained"
            disabled={savingEmail || !emailForm.email.trim()}
            startIcon={savingEmail ? <CircularProgress size={16} /> : null}
          >
            {savingEmail ? 'Salvando...' : editingEmail ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão de E-mail */}
      <ConfirmDeleteDialog
        open={deleteEmailDialogOpen}
        title="Excluir E-mail"
        description={
          <Typography variant="body2">
            Tem certeza que deseja remover o e-mail <strong>{emailToDelete?.email}</strong>?
            Esta ação não pode ser desfeita.
          </Typography>
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        loading={deletingEmail}
        onConfirm={handleDeleteEmailConfirm}
        onCancel={() => {
          if (!deletingEmail) {
            setDeleteEmailDialogOpen(false);
            setEmailToDelete(null);
          }
        }}
      />
    </Grid>
  );
}
