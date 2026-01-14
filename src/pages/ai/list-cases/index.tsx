import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Avatar from 'components/@extended/Avatar';
import useAvatarUrl from 'hooks/useAvatarUrl';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';
import Checkbox from '@mui/material/Checkbox';
import Menu from '@mui/material/Menu';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import MoreOutlined from '@ant-design/icons/MoreOutlined';
import AIIcon from 'components/icons/AIIcon';
import MainCard from 'components/MainCard';
import { listCaseResults, deleteCaseResults, finalizeCase, approveCase, releaseCase, CaseResult, generateAudit, generateQuestions } from 'api/aiCases';
import { listDepartments } from 'api/departments';
import { listPieces } from 'api/aiPieces';
import { openSnackbar } from 'api/snackbar';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import CaseViewDialog from 'sections/ai/list-cases/CaseViewDialog';
import Permission from 'components/Permission';
import useAuth from 'hooks/useAuth';
import { usePermissions } from 'hooks/usePermissions';

function AuthorCell({ requesterId, userName, userRoleName, userAvatarFileId }: { requesterId?: string; userName?: string | null; userRoleName?: string | null; userAvatarFileId?: string | null }) {
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

export default function ListCasesPage() {
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermissions();
  const { user } = useAuth();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  // Lista e paginação
  const [items, setItems] = useState<CaseResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [deptId, setDeptId] = useState<string>('');
  const [pieceId, setPieceId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // Catálogos
  const [deptCatalog, setDeptCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [pieceCatalog, setPieceCatalog] = useState<Array<{ id: string; name: string }>>([]);

  // Seleção múltipla
  const [selected, setSelected] = useState<string[]>([]);

  // Dialogs
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewCaseId, setViewCaseId] = useState<string | null>(null);
  
  // Ações de auditoria e perguntas
  const [generatingAuditId, setGeneratingAuditId] = useState<string | null>(null);
  const [generatingQuestionsId, setGeneratingQuestionsId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{ el: HTMLElement; caseId: string } | null>(null);

  async function load() {
    try {
      setLoading(true);
      const res = await listCaseResults({
        page: page + 1,
        pageSize: limit,
        search: search.trim() || undefined,
        departmentId: deptId || undefined,
        pieceId: pieceId || undefined,
        customerName: customerName.trim() || undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined
      });
      const resultItems = res.data || res.items || [];
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
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    // Carregar catálogo de departamentos
    (async () => {
      try {
        const res = await listDepartments({ page: 1, limit: 100 });
        // @ts-ignore
        setDeptCatalog(res.data?.map((d: any) => ({ id: d.id, name: d.name })) || []);
      } catch {}
    })();

    // Carregar catálogo de peças
    (async () => {
      try {
        const res = await listPieces({ page: 1, limit: 100 });
        setPieceCatalog(res.data?.map((p) => ({ id: p.id, name: p.name })) || []);
      } catch {}
    })();
  }, []);

  const onSearch = () => {
    setPage(0);
    setSelected([]);
    load();
  };

  const onClearFilters = () => {
    setSearch('');
    setDeptId('');
    setPieceId('');
    setCustomerName('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
    setSelected([]);
    load();
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(items.map((item) => item.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleDeleteSelected = () => {
    if (selected.length === 0) {
      openSnackbar({
        open: true,
        message: 'Selecione ao menos um caso para excluir',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteCaseResults(selected);
      openSnackbar({
        open: true,
        message: `${selected.length} caso(s) excluído(s) com sucesso!`,
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      setSelected([]);
      load();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao excluir casos',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleView = (caseId: string) => {
    setViewCaseId(caseId);
    setViewOpen(true);
  };

  const handleEdit = (caseId: string) => {
    navigate(`/ai/cases/${caseId}/edit`);
  };

  const handleGenerateAudit = async (caseId: string) => {
    try {
      setGeneratingAuditId(caseId);
      await generateAudit(caseId);
      openSnackbar({
        open: true,
        message: 'Auditoria gerada com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      load(); // Recarrega a lista para atualizar os badges
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao gerar auditoria',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGeneratingAuditId(null);
      setActionMenuAnchor(null);
    }
  };

  const handleGenerateQuestions = async (caseId: string) => {
    try {
      setGeneratingQuestionsId(caseId);
      await generateQuestions(caseId);
      openSnackbar({
        open: true,
        message: 'Perguntas geradas com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      load(); // Recarrega a lista para atualizar os badges
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao gerar perguntas',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGeneratingQuestionsId(null);
      setActionMenuAnchor(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  const selectedCount = selected.length;
  const isAllSelected = items.length > 0 && selected.length === items.length;
  const isSomeSelected = selected.length > 0 && selected.length < items.length;

  return (
    <Permission resources={['ai.cases.read']}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
              <Typography variant="h6" fontWeight={700}>
                Casos
              </Typography>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {/* Filtros */}
            <Stack spacing={1.25}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  label="Buscar em nome da peça e HTML"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                  sx={{ minWidth: 200 }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <TextField
                  select
                  label="Departamento"
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {deptCatalog.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Peça"
                  value={pieceId}
                  onChange={(e) => setPieceId(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {pieceCatalog.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  type="date"
                  label="Data inicial"
                  value={createdFrom}
                  onChange={(e) => setCreatedFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />

                <TextField
                  type="date"
                  label="Data final"
                  value={createdTo}
                  onChange={(e) => setCreatedTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 160 }}
                />
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>
                  Buscar
                </Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>
                  Limpar
                </Button>
                {selectedCount > 0 && (
                  <Permission resources={['ai.cases.delete']}>
                    <Button variant="contained" color="error" startIcon={<DeleteOutlined />} onClick={handleDeleteSelected}>
                      Excluir selecionados ({selectedCount})
                    </Button>
                  </Permission>
                )}
              </Stack>
            </Stack>

            <Divider />

            {/* Listagem */}
            {isMobile ? (
              <Box>
                {items.map((item) => (
                  <Box key={item.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Checkbox checked={selected.includes(item.id)} onChange={() => handleSelect(item.id)} size="small" />
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={700}>
                            {item.name || '—'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.pieceName || (item.infos as any)?.piece?.name || item.piece?.name || '—'}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={`Depto: ${item.departmentName || (item.infos as any)?.piece?.department?.name || item.department?.name || '—'}`}
                        />
                        <StatusCell 
                          status={item.status} 
                          caseId={item.id}
                          requesterId={item.requesterId}
                          onStatusChange={load}
                        />
                      </Stack>

                      {(() => {
                        const approvedBy = item.approvalFlow?.approvedBy;
                        const approvedByUser = item.approvalFlow?.approvedByUser;
                        
                        if (approvedByUser?.name) {
                          return (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                Aprovado por:
                              </Typography>
                              <AuthorCell
                                requesterId={approvedBy}
                                userName={approvedByUser.name}
                                userAvatarFileId={approvedByUser.avatarFileId}
                              />
                            </Stack>
                          );
                        }
                        
                        if (approvedBy) {
                          return (
                            <Typography variant="caption" color="text.secondary">
                              Aprovado por: ID {approvedBy}
                            </Typography>
                          );
                        }
                        
                        return null;
                      })()}

                      <Typography variant="caption" color="text.secondary">
                        Criado em {item.createdAt ? formatDate(item.createdAt) : '—'}
                      </Typography>

                      <Stack direction="row" spacing={0.5} justifyContent="flex-end" flexWrap="wrap">
                        <Stack direction="row" spacing={0.5}>
                          {item.hasAudit && (
                            <Chip label="Auditado" color="success" size="small" />
                          )}
                          {item.hasQuestions && (
                            <Chip label={`${item.suggestedQuestions?.length || 0} perguntas`} color="info" size="small" />
                          )}
                        </Stack>
                        <Permission resources={['ai.cases.read']}>
                          <Button size="small" color="secondary" startIcon={<EyeOutlined />} onClick={() => handleView(item.id)}>
                            Ver
                          </Button>
                        </Permission>
                        <Permission resources={['ai.cases.update']}>
                          <Button size="small" color="primary" startIcon={<EditOutlined />} onClick={() => handleEdit(item.id)}>
                            Editar
                          </Button>
                        </Permission>
                        <IconButton
                          size="small"
                          onClick={(e) => setActionMenuAnchor({ el: e.currentTarget, caseId: item.id })}
                        >
                          <MoreOutlined />
                        </IconButton>
                      </Stack>
                      <Menu
                        anchorEl={actionMenuAnchor?.el || null}
                        open={Boolean(actionMenuAnchor && actionMenuAnchor.caseId === item.id)}
                        onClose={() => setActionMenuAnchor(null)}
                      >
                        <MenuItem
                          onClick={() => handleGenerateAudit(item.id)}
                          disabled={generatingAuditId === item.id || generatingQuestionsId === item.id}
                        >
                          {generatingAuditId === item.id ? (
                            <CircularProgress size={16} sx={{ mr: 1 }} />
                          ) : (
                            <FileTextOutlined style={{ marginRight: 8 }} />
                          )}
                          {item.hasAudit ? 'Regenerar Auditoria' : 'Fazer Auditoria'}
                        </MenuItem>
                        <MenuItem
                          onClick={() => handleGenerateQuestions(item.id)}
                          disabled={generatingAuditId === item.id || generatingQuestionsId === item.id}
                        >
                          {generatingQuestionsId === item.id ? (
                            <CircularProgress size={16} sx={{ mr: 1 }} />
                          ) : (
                            <QuestionCircleOutlined style={{ marginRight: 8 }} />
                          )}
                          {item.hasQuestions ? 'Regenerar Perguntas' : 'Gerar Perguntas'}
                        </MenuItem>
                      </Menu>
                    </Stack>
                  </Box>
                ))}
                {!items.length && (
                  <Stack alignItems="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? 'Carregando...' : 'Nenhum caso encontrado.'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isAllSelected}
                          indeterminate={isSomeSelected}
                          onChange={handleSelectAll}
                          disabled={items.length === 0}
                        />
                      </TableCell>
                      <TableCell>Nome do caso</TableCell>
                      <TableCell>Peça</TableCell>
                      <TableCell>Departamento</TableCell>
                      <TableCell>Redator</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Aprovado por</TableCell>
                      <TableCell>Criado em</TableCell>
                        <TableCell>Auditoria</TableCell>
                        {hasAnyPermission(['ai.cases.read', 'ai.cases.update']) && (
                          <TableCell align="right">Ações</TableCell>
                        )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} hover selected={selected.includes(item.id)}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selected.includes(item.id)} onChange={() => handleSelect(item.id)} />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={700}>
                            {item.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={600}>
                            {item.pieceName || (item.infos as any)?.piece?.name || item.piece?.name || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {item.departmentName || (item.infos as any)?.piece?.department?.name || item.department?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <AuthorCell
                            requesterId={item.requesterId}
                            userName={item.userName}
                            userRoleName={item.userRoleName}
                            userAvatarFileId={item.userAvatarFileId}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusCell 
                            status={item.status} 
                            caseId={item.id}
                            requesterId={item.requesterId}
                            onStatusChange={load}
                          />
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Tenta várias formas de acessar os dados do aprovador
                            const approvedBy = item.approvalFlow?.approvedBy;
                            const approvedByUser = item.approvalFlow?.approvedByUser;
                            
                            if (approvedByUser?.name) {
                              return (
                                <AuthorCell
                                  requesterId={approvedBy}
                                  userName={approvedByUser.name}
                                  userAvatarFileId={approvedByUser.avatarFileId}
                                />
                              );
                            }
                            
                            // Fallback: se tiver apenas o ID, mostra o ID
                            if (approvedBy) {
                              return (
                                <Typography variant="body2" color="text.secondary">
                                  ID: {approvedBy}
                                </Typography>
                              );
                            }
                            
                            return '—';
                          })()}
                        </TableCell>
                        <TableCell>{item.createdAt ? formatDate(item.createdAt) : '—'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap">
                            {item.hasAudit && (
                              <Chip label="Auditado" color="success" size="small" />
                            )}
                            {item.hasQuestions && (
                              <Chip label={`${item.suggestedQuestions?.length || 0} perguntas`} color="info" size="small" />
                            )}
                            {!item.hasAudit && !item.hasQuestions && (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </Stack>
                        </TableCell>
                        {hasAnyPermission(['ai.cases.read', 'ai.cases.update']) && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Permission resources={['ai.cases.read']}>
                                <Button size="small" color="secondary" startIcon={<EyeOutlined />} onClick={() => handleView(item.id)}>
                                  Ver
                                </Button>
                              </Permission>
                              <Permission resources={['ai.cases.update']}>
                                <Button size="small" color="primary" startIcon={<EditOutlined />} onClick={() => handleEdit(item.id)}>
                                  Editar
                                </Button>
                              </Permission>
                              <IconButton
                                size="small"
                                onClick={(e) => setActionMenuAnchor({ el: e.currentTarget, caseId: item.id })}
                              >
                                <MoreOutlined />
                              </IconButton>
                            </Stack>
                            <Menu
                              anchorEl={actionMenuAnchor?.el || null}
                              open={Boolean(actionMenuAnchor && actionMenuAnchor.caseId === item.id)}
                              onClose={() => setActionMenuAnchor(null)}
                            >
                              <MenuItem
                                onClick={() => handleGenerateAudit(item.id)}
                                disabled={generatingAuditId === item.id || generatingQuestionsId === item.id}
                              >
                                {generatingAuditId === item.id ? (
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                ) : (
                                  <FileTextOutlined style={{ marginRight: 8 }} />
                                )}
                                {item.hasAudit ? 'Regenerar Auditoria' : 'Fazer Auditoria'}
                              </MenuItem>
                              <MenuItem
                                onClick={() => handleGenerateQuestions(item.id)}
                                disabled={generatingAuditId === item.id || generatingQuestionsId === item.id}
                              >
                                {generatingQuestionsId === item.id ? (
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                ) : (
                                  <QuestionCircleOutlined style={{ marginRight: 8 }} />
                                )}
                                {item.hasQuestions ? 'Regenerar Perguntas' : 'Gerar Perguntas'}
                              </MenuItem>
                            </Menu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    {!items.length && (
                      <TableRow>
                        <TableCell colSpan={hasAnyPermission(['ai.cases.read', 'ai.cases.update']) ? 10 : 9}>
                          <Stack alignItems="center" sx={{ py: 6 }}>
                            <Typography variant="body2" color="text.secondary">
                              {loading ? 'Carregando...' : 'Nenhum caso encontrado.'}
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Divider />

            <Stack direction="row" justifyContent="center" sx={{ p: isMobile ? 1 : 2 }}>
              <TablePagination
                component="div"
                rowsPerPageOptions={isMobile ? [5, 10] : [5, 10, 20, 50]}
                count={total}
                rowsPerPage={limit}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                onRowsPerPageChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage={isMobile ? 'Por página' : 'Linhas por página'}
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`}
              />
            </Stack>
          </Stack>
        </MainCard>
      </Grid>

      {/* Confirmação de exclusão */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onCancel={() => {
          if (deleting) return;
          setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Excluir casos"
        description={
          <span>
            Esta ação <b>não pode ser desfeita</b>. Deseja remover <b>{selectedCount}</b> caso(s)?
          </span>
        }
      />

      {/* Visualizar caso */}
      <CaseViewDialog open={viewOpen} onClose={() => setViewOpen(false)} caseId={viewCaseId} />
      </Grid>
    </Permission>
  );
}
