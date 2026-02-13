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
import Avatar from 'components/@extended/Avatar';
import useAvatarUrl from 'hooks/useAvatarUrl';
import { containsNormalized } from 'utils/normalize';

import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';

import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { 
  getCaseFolder, 
  listCaseResults, 
  deleteCaseResults,
  finalizeCase,
  approveCase,
  releaseCase,
  isGeneralFolder,
  type CaseFolder,
  type CaseResult 
} from 'api/aiCases';
import Permission from 'components/Permission';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import CaseViewDialog from 'sections/ai/list-cases/CaseViewDialog';
import AIIcon from 'components/icons/AIIcon';
import useAuth from 'hooks/useAuth';
import { usePermissions } from 'hooks/usePermissions';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Pagination from '@mui/material/Pagination';

function AuthorCell({ requesterId, userName, userRoleName, userAvatarFileId }: { 
  requesterId?: string; 
  userName?: string | null; 
  userRoleName?: string | null; 
  userAvatarFileId?: string | null 
}) {
  const avatarUrl = useAvatarUrl(requesterId || null, userAvatarFileId || null);
  const name = userName || '—';
  const role = userRoleName || '';
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Avatar src={avatarUrl ?? undefined} alt={name} size="sm" color="primary">
        {name.charAt(0)}
      </Avatar>
      <Stack spacing={0} minWidth={0}>
        <Typography fontWeight={600} noWrap>
          {name}
        </Typography>
        {role ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {role}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}

function StatusCell({ 
  status, 
  caseId, 
  requesterId, 
  onStatusChange 
}: { 
  status?: 'pending' | 'finalized' | 'approved' | 'released' | null;
  caseId: string;
  requesterId?: string;
  onStatusChange: () => void;
}) {
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'finalize' | 'approve' | 'release' | null>(null);
  const [processing, setProcessing] = useState(false);

  const getStatusConfig = (s?: string | null) => {
    switch (s) {
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

  const config = getStatusConfig(status);
  const isRequester = user?.id === requesterId;
  const hasUpdatePermission = hasAnyPermission(['ai.cases.update']);

  // Determina ações disponíveis baseado no status
  const getAvailableActions = () => {
    if (!hasUpdatePermission) return [];
    
    const actions: Array<{ key: 'finalize' | 'approve' | 'release'; label: string; disabled?: boolean }> = [];
    
    // Sempre mostra todas as ações, mas desabilita as que não são válidas no fluxo
    if (status === 'pending') {
      // Pendente: pode finalizar (se for o criador)
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: !isRequester 
      });
      actions.push({ 
        key: 'approve', 
        label: 'Aprovar', 
        disabled: true // Não pode aprovar direto de pending
      });
      actions.push({ 
        key: 'release', 
        label: 'Liberar', 
        disabled: true // Não pode liberar direto de pending
      });
    } else if (status === 'finalized') {
      // Finalizado: pode aprovar ou liberar
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: true // Já está finalizado
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
      // Aprovado: pode liberar
      actions.push({ 
        key: 'finalize', 
        label: 'Finalizar', 
        disabled: true // Já passou dessa etapa
      });
      actions.push({ 
        key: 'approve', 
        label: 'Aprovar', 
        disabled: true // Já está aprovado
      });
      actions.push({ 
        key: 'release', 
        label: 'Liberar', 
        disabled: false 
      });
    } else if (status === 'released') {
      // Liberado: nenhuma ação disponível (status final)
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
        disabled: true 
      });
    } else {
      // Status desconhecido: mostra todas as opções
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

  const availableActions = getAvailableActions();
  const canChangeStatus = hasUpdatePermission;

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (canChangeStatus) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: 'finalize' | 'approve' | 'release') => {
    setCurrentAction(action);
    setActionDialogOpen(true);
    handleClose();
  };

  const handleConfirmAction = async () => {
    if (!currentAction) return;
    
    try {
      setProcessing(true);
      
      switch (currentAction) {
        case 'finalize':
          await finalizeCase(caseId);
          break;
        case 'approve':
          await approveCase(caseId);
          break;
        case 'release':
          await releaseCase(caseId);
          break;
      }
      
      openSnackbar({
        open: true,
        message: `Status alterado com sucesso!`,
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      
      setActionDialogOpen(false);
      setCurrentAction(null);
      onStatusChange();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao alterar status',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelAction = () => {
    setActionDialogOpen(false);
    setCurrentAction(null);
  };

  return (
    <>
      <Chip 
        size="small" 
        label={config.label} 
        color={config.color}
        onClick={canChangeStatus ? handleClick : undefined}
        sx={{ 
          cursor: canChangeStatus ? 'pointer' : 'default',
          '&:hover': canChangeStatus ? { opacity: 0.8 } : {}
        }}
      />
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {availableActions.map((action) => (
          <MenuItem 
            key={action.key} 
            onClick={() => !action.disabled && handleActionClick(action.key)}
            disabled={action.disabled}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={actionDialogOpen} onClose={handleCancelAction} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentAction === 'finalize' && 'Finalizar Caso'}
          {currentAction === 'approve' && 'Aprovar Caso'}
          {currentAction === 'release' && 'Liberar Caso'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {currentAction === 'finalize' && 'Deseja finalizar este caso? Após finalizar, ele ficará aguardando aprovação ou liberação.'}
            {currentAction === 'approve' && 'Deseja aprovar este caso? Após aprovar, ele ficará aguardando liberação pela empresa.'}
            {currentAction === 'release' && 'Deseja liberar este caso? Esta é a etapa final do fluxo de aprovação.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelAction} disabled={processing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            variant="contained" 
            disabled={processing}
          >
            {processing ? 'Processando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function CasesFolderPage() {
  const navigate = useNavigate();
  const { folderId } = useParams<{ folderId: string }>();

  const [folder, setFolder] = useState<CaseFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Lista de casos (paginada)
  const [items, setItems] = useState<CaseResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [loadingCases, setLoadingCases] = useState(false);

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCaseId, setViewCaseId] = useState<string | null>(null);

  const loadFolder = async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      const folderData = await getCaseFolder(folderId);
      setFolder(folderData);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar pasta',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      navigate('/ai/cases');
    } finally {
      setLoading(false);
    }
  };

  const loadCases = async (overridePage?: number) => {
    if (!folderId) return;
    if (!folder) return; // espera a pasta estar carregada para saber se é geral

    const currentPage = overridePage !== undefined ? overridePage : page;
    try {
      setLoadingCases(true);
      const isGeneral = isGeneralFolder(folder);
      const res = await listCaseResults({
        page: currentPage + 1,
        pageSize,
        folderId: isGeneral ? undefined : folderId,
        noCustomer: isGeneral ? true : undefined
      });
      let resultItems = res.items || res.data || [];
      if (isGeneral) {
        resultItems = resultItems.filter(
          (c) => !c.customers || (Array.isArray(c.customers) && c.customers.length === 0)
        );
      }
      setItems(Array.isArray(resultItems) ? resultItems : []);
      setTotal(res.total || 0);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao carregar casos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      setItems([]);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    loadFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  useEffect(() => {
    if (folderId && folder) {
      loadCases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, folder, page]);

  const applySearchFilter = (cases: CaseResult[], q: string) => {
    const term = q.trim();
    if (!term) return cases;
    return cases.filter((caseItem) => 
      containsNormalized(caseItem.name || '', term) ||
      containsNormalized(caseItem.pieceName || '', term) ||
      containsNormalized(caseItem.departmentName || '', term)
    );
  };

  const filteredCases = useMemo(() => applySearchFilter(items, search), [items, search]);

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

  const handleDeleteClick = (caseItem: CaseResult) => {
    setCaseToDelete({ id: caseItem.id, name: caseItem.name || 'Caso' });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return;

    try {
      setDeleting(true);
      await deleteCaseResults([caseToDelete.id]);
      
      openSnackbar({
        open: true,
        message: 'Caso removido com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      setDeleteDialogOpen(false);
      setCaseToDelete(null);
      loadCases();
      loadFolder(); // Atualiza contagem de casos na pasta
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover caso',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleting(false);
    }
  };

  const handleView = (caseId: string) => {
    setViewCaseId(caseId);
    setViewOpen(true);
  };

  const handleEdit = (caseId: string) => {
    navigate(`/ai/cases/${caseId}/edit`);
  };

  const folderDisplayName = !folder
    ? 'Carregando...'
    : (isGeneralFolder(folder) ? 'Geral' : (folder.name || 'Casos'));

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                startIcon={<ArrowLeftOutlined />}
                onClick={() => navigate('/ai/cases')}
                sx={{ mr: 1 }}
              >
                Voltar
              </Button>
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>
                {folderDisplayName}
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
            ) : (
              <>
                {/* Busca */}
                <TextField
                  label="Buscar casos"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Digite para buscar (ex: Salario ou Salário)"
                  sx={{ width: '100%' }}
                  size="small"
                />

                <Divider />

                {/* Lista de Casos */}
                <Permission resources={['ai.cases.read']}>
                  {loadingCases ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : filteredCases.length === 0 ? (
                    <Stack alignItems="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        {search ? 'Nenhum resultado encontrado.' : 'Nenhum caso encontrado nesta pasta.'}
                      </Typography>
                    </Stack>
                  ) : (
                    <>
                      {/* Header estilo Explorer */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 0.5, mt: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {folderDisplayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {total} {total === 1 ? 'caso' : 'casos'}
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
                        {filteredCases.map((caseItem) => (
                          <Box
                            key={caseItem.id}
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
                              {/* Cabeçalho do Caso */}
                              <Stack spacing={0.5}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <FileTextOutlined style={{ fontSize: 20, color: folder.customerId ? '#4CAF50' : '#2196F3' }} />
                                  <Typography fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                                    {caseItem.name || '—'}
                                  </Typography>
                                </Stack>
                                <Typography variant="caption" color="text.secondary" sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}>
                                  {caseItem.pieceName || (caseItem.infos as any)?.piece?.name || caseItem.piece?.name || '—'}
                                </Typography>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(caseItem.createdAt)}
                                  </Typography>
                                  {(caseItem.departmentName || caseItem.department) && (
                                    <>
                                      <Typography variant="caption" color="text.secondary">•</Typography>
                                      <Chip
                                        label={caseItem.departmentName || caseItem.department?.name || '—'}
                                        size="small"
                                        variant="outlined"
                                      />
                                    </>
                                  )}
                                  {caseItem.status && (
                                    <>
                                      <Typography variant="caption" color="text.secondary">•</Typography>
                                      <StatusCell 
                                        status={caseItem.status} 
                                        caseId={caseItem.id}
                                        requesterId={caseItem.requesterId}
                                        onStatusChange={loadCases}
                                      />
                                    </>
                                  )}
                                </Stack>
                                {caseItem.userName && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <AuthorCell
                                      requesterId={caseItem.requesterId}
                                      userName={caseItem.userName}
                                      userRoleName={caseItem.userRoleName}
                                      userAvatarFileId={caseItem.userAvatarFileId}
                                    />
                                  </Stack>
                                )}
                                {(caseItem.hasAudit || caseItem.hasQuestions) && (
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                    {caseItem.hasAudit && (
                                      <Chip label="Auditado" color="success" size="small" />
                                    )}
                                    {caseItem.hasQuestions && (
                                      <Chip label={`${caseItem.suggestedQuestions?.length || 0} perguntas`} color="info" size="small" />
                                    )}
                                  </Stack>
                                )}
                              </Stack>

                              <Divider />

                              {/* Ações */}
                              <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                                <Permission resources={['ai.cases.read']}>
                                  <Tooltip title="Visualizar">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleView(caseItem.id)}
                                    >
                                      <EyeOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                                <Permission resources={['ai.cases.update']}>
                                  <Tooltip title="Editar">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEdit(caseItem.id)}
                                    >
                                      <EditOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                                <Permission resources={['ai.cases.delete']}>
                                  <Tooltip title="Excluir">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeleteClick(caseItem)}
                                    >
                                      <DeleteOutlined />
                                    </IconButton>
                                  </Tooltip>
                                </Permission>
                              </Stack>
                            </Stack>
                          </Box>
                        ))}
                      </Box>

                      {total > pageSize && (
                        <Stack direction="row" justifyContent="center" sx={{ py: 2 }}>
                          <Pagination
                            count={Math.ceil(total / pageSize) || 1}
                            page={page + 1}
                            onChange={(_, p) => setPage(p - 1)}
                            color="primary"
                            showFirstButton
                            showLastButton
                            siblingCount={1}
                            boundaryCount={1}
                          />
                        </Stack>
                      )}
                    </>
                  )}
                </Permission>
              </>
            )}
          </Stack>
        </MainCard>
      </Grid>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCaseToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={caseToDelete?.name || ''}
        loading={deleting}
      />

      {/* Visualizar caso */}
      <CaseViewDialog open={viewOpen} onClose={() => setViewOpen(false)} caseId={viewCaseId} />
    </Grid>
  );
}
