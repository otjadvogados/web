import { useEffect, useState, useMemo, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import MainCard from 'components/MainCard';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from 'components/@extended/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';

import PlusOutlined from '@ant-design/icons/PlusOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';

import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';
import SensitiveFieldFormDialog from 'sections/users/SensitiveFieldFormDialog';
import { listSensitiveFields, deleteSensitiveField, updateSensitiveField } from 'api/sensitiveFields';
import { SensitiveField } from 'types/privacy';
import { openSnackbar } from 'api/snackbar';

function scopeLabel(sf: SensitiveField) {
  return 'Global';
}

export default function SensitiveFieldsPage() {
  const [items, setItems] = useState<SensitiveField[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // filtros
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<boolean | undefined>(undefined);

  // formulário
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<any | null>(null);

  // delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SensitiveField | null>(null);
  const [deleting, setDeleting] = useState(false);

  // status update
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Debounce para busca
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Responsividade
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  async function load() {
    try {
      setLoading(true);
      const res = await listSensitiveFields({
        page: page + 1,
        limit,
        search: debouncedSearch.trim() || undefined,
        active
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar dados sensíveis', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  // Debounce para busca automática
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // Aguarda 500ms após parar de digitar

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { load(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [page, limit, debouncedSearch, active]);

  const openCreate = () => {
    setEditId(null);
    setEditInitial(null);
    setFormOpen(true);
  };

  const openEdit = (sf: SensitiveField) => {
    setEditId(sf.id);
    setEditInitial({
      entity: sf.entity,
      field: sf.field,
      moduleName: sf.moduleName || '',
      label: sf.label || '',
      description: sf.description || '',
      readRule: sf.readRule || '',
      writeRule: sf.writeRule || '',
      active: sf.active
    });
    setFormOpen(true);
  };

  const askDelete = (sf: SensitiveField) => {
    setDeleteTarget(sf);
    setDeleteOpen(true);
  };

  const handleStatusChange = async (sf: SensitiveField, newActive: boolean) => {
    try {
      setUpdatingStatus(sf.id);
      await updateSensitiveField(sf.id, {
        active: newActive
      });
      openSnackbar({ 
        open: true, 
        message: `Campo ${newActive ? 'ativado' : 'desativado'} com sucesso!`, 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
      // Atualiza o item localmente em vez de recarregar toda a lista
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === sf.id ? { ...item, active: newActive } : item
        )
      );
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || 'Falha ao atualizar status', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Componente de card para mobile
  const SensitiveFieldCard = ({ sf }: { sf: SensitiveField }) => (
    <Card sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
      <CardContent sx={{ p: isSmallMobile ? 1.5 : 2 }}>
        <Stack spacing={1.5}>
          {/* Cabeçalho do card */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                {sf.moduleName}
              </Typography>
              {sf.label && (
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                  {sf.label}
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Editar">
                <IconButton size="small" color="secondary" onClick={() => openEdit(sf)}>
                  <EditOutlined />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" color="error" onClick={() => askDelete(sf)}>
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

                     {/* Informações do campo sensível */}
           <Stack spacing={isSmallMobile ? 0.5 : 1}>
             <Stack direction="row" alignItems="center" spacing={isSmallMobile ? 0.5 : 1}>
               <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 60 : 80 }}>
                 Status:
               </Typography>
               <FormControlLabel
                 control={
                   <Switch 
                     checked={sf.active} 
                     onChange={(_, v) => handleStatusChange(sf, v)}
                     disabled={updatingStatus === sf.id}
                     size="small"
                     color="primary"
                   />
                 }
                 label={
                   <Typography variant="caption" color="text.secondary">
                     {sf.active ? 'Ativo' : 'Inativo'}
                   </Typography>
                 }
                 sx={{ margin: 0 }}
               />
             </Stack>
           </Stack>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <MainCard title="Dados sensíveis" contentSX={{ p: 0, width: '100%' }}>
          {/* Cabeçalho responsivo */}
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={isMobile ? 2 : 1.5} 
            sx={{ p: 2, pb: 1 }} 
            alignItems={isMobile ? "stretch" : "center"}
          >
            {/* Campo de busca */}
            <TextField
              label="Buscar por rótulo ou módulo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite para buscar automaticamente..."
              sx={{ 
                minWidth: isMobile ? '100%' : 220,
                flex: isMobile ? 'none' : 1
              }}
            />
            
            {/* Filtro de ativos */}
            <FormControlLabel 
              control={<Switch checked={active ?? false} onChange={(_, v) => setActive(v ? true : undefined)} />} 
              label="Somente ativos" 
            />
            
            {/* Botão de ação */}
            <Button 
              variant="contained" 
              startIcon={<PlusOutlined />} 
              onClick={openCreate}
              size={isSmallMobile ? "small" : "medium"}
            >
              {isSmallMobile ? 'Novo' : 'Novo'}
            </Button>
          </Stack>

          <Divider />

          {/* Conteúdo responsivo */}
          {isMobile ? (
            // Layout de cards para mobile
            <Box sx={{ p: 2 }}>
              {items.map((sf) => (
                <SensitiveFieldCard key={sf.id} sf={sf} />
              ))}
              
              {!items.length && (
                <Stack alignItems="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Carregando...' : 'Nenhum registro encontrado.'}
                  </Typography>
                </Stack>
              )}
            </Box>
          ) : (
            // Layout de tabela para desktop
            <TableContainer sx={{ width: '100%' }}>
              <Table size="small" sx={{ width: '100%', '& td, & th': { whiteSpace: 'nowrap' } }}>
                                 <TableHead>
                   <TableRow>
                     <TableCell>Módulo</TableCell>
                     <TableCell>Rótulo</TableCell>
                     <TableCell>Status</TableCell>
                     <TableCell align="right">Ações</TableCell>
                   </TableRow>
                 </TableHead>
                <TableBody>
                  {items.map((sf) => (
                    <TableRow key={sf.id} hover>
                                             <TableCell>
                         <Typography fontWeight={600}>{sf.moduleName}</Typography>
                       </TableCell>
                       <TableCell>{sf.label || '—'}</TableCell>
                       <TableCell>
                         <FormControlLabel
                           control={
                             <Switch 
                               checked={sf.active} 
                               onChange={(_, v) => handleStatusChange(sf, v)}
                               disabled={updatingStatus === sf.id}
                               size="small"
                               color="primary"
                             />
                           }
                           label={
                             <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                               {sf.active ? 'Ativo' : 'Inativo'}
                             </Typography>
                           }
                           sx={{ margin: 0 }}
                         />
                       </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton color="secondary" onClick={() => openEdit(sf)}>
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton color="error" onClick={() => askDelete(sf)}>
                              <DeleteOutlined />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!items.length && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Stack alignItems="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">{loading ? 'Carregando...' : 'Nenhum registro encontrado.'}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Divider />

          {/* Paginação responsiva */}
          <Stack 
            direction="row" 
            justifyContent="center" 
            sx={{ 
              p: isMobile ? 1 : 2,
              '& .MuiTablePagination-root': {
                margin: 0
              }
            }}
          >
            <TablePagination
              component="div"
              rowsPerPageOptions={isMobile ? [5, 10] : [5, 10, 20, 50]}
              count={total}
              rowsPerPage={limit}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage={isMobile ? "Por página" : "Linhas por página"}
              labelDisplayedRows={isMobile ? 
                ({ from, to, count }) => `${from}-${to} de ${count}` :
                ({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Stack>
        </MainCard>

        {/* Modais */}
        <SensitiveFieldFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          editingId={editId || undefined}
          initial={editInitial || undefined}
          onSaved={load}
        />

        <ConfirmDeleteDialog
          open={deleteOpen}
          onCancel={() => {
            if (deleting) return;
            setDeleteOpen(false);
            setDeleteTarget(null);
          }}
          onConfirm={async () => {
            if (!deleteTarget) return;
            try {
              setDeleting(true);
              await deleteSensitiveField(deleteTarget.id);
              openSnackbar({ open: true, message: 'Campo removido!', variant: 'alert', alert: { color: 'success' } } as any);
              if (items.length === 1 && page > 0) setPage((p) => p - 1);
              else load();
            } catch (err: any) {
              openSnackbar({ open: true, message: err?.response?.data?.message || 'Não foi possível remover', variant: 'alert', alert: { color: 'error' } } as any);
            } finally {
              setDeleting(false);
              setDeleteOpen(false);
              setDeleteTarget(null);
            }
          }}
          loading={deleting}
          title="Remover dado sensível"
          description={
            <span>
              Esta ação <b>não pode ser desfeita</b>. Remover o campo <b>{deleteTarget?.entity}.{deleteTarget?.field}</b>?
            </span>
          }
        />
      </Box>
  );
}
