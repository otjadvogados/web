import { useEffect, useMemo, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Tooltip from 'components/@extended/Tooltip';
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
import useMediaQuery from '@mui/material/useMediaQuery';
import { Theme } from '@mui/material/styles';

import EditOutlined from '@ant-design/icons/EditOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import TeamOutlined from '@ant-design/icons/TeamOutlined';
import UserAddOutlined from '@ant-design/icons/UserAddOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';


import { listUsers, deleteUser, getUser } from 'api/users';
import { UserRow } from 'types/users';
import { openSnackbar } from 'api/snackbar';
import { formatDateOnlyBR, toDateOnly } from 'utils/date';
import { formatCPF, formatPhoneBR } from 'utils/mask';
import { FormattedMessage } from 'react-intl';

import UserFormDialog from 'sections/users/UserFormDialog';
import RolePickerDialog from 'sections/users/RolePickerDialog';
import ConfirmDeleteDialog from 'components/ConfirmDeleteDialog';

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(0); // zero-based
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editInitial, setEditInitial] = useState<any | null>(null);

  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [roleUserId, setRoleUserId] = useState<string | null>(null);
  const [roleCurrentId, setRoleCurrentId] = useState<string | null>(null);

  // --- Confirmação de deleção ---
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Responsividade
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const hasCPF = useMemo(
    () => items.some((u) => Object.prototype.hasOwnProperty.call(u, 'cpf')),
    [items]
  );
  const hasBirth = useMemo(
    () => items.some((u) => Object.prototype.hasOwnProperty.call(u, 'birthdate')),
    [items]
  );
  const hasOAB = useMemo(
    () => items.some((u) => Object.prototype.hasOwnProperty.call(u, 'oab')),
    [items]
  );

  async function load() {
    try {
      setLoading(true);
      const res = await listUsers({
        page: page + 1,
        limit,
        search: search.trim() || undefined,
        sortBy,
        sortOrder
      });
      setItems(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar usuários', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, limit, sortBy, sortOrder]);

  const requestDelete = (u: UserRow) => {
    setDeleteTarget({ id: u.id, name: u.name, email: u.email });
    setDeleteOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setEditInitial(null);
    setFormOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      setEditId(id);
      const u = await getUser(id);
      // Preserve a AUSÊNCIA do campo (permite esconder no form)
      const initial: any = {
        name: u.name,
        email: u.email,
        emailVerifiedAt: u.emailVerifiedAt ?? null,
        roleId: u.role?.id ?? null,
        roleName: u.role?.name ?? null
      };
      if (Object.prototype.hasOwnProperty.call(u, 'phone')) {
        initial.phone = u.phone || '';
      }
      if (Object.prototype.hasOwnProperty.call(u, 'cpf')) {
        initial.cpf = u.cpf || '';
      }
      if (Object.prototype.hasOwnProperty.call(u, 'birthdate')) {
        initial.birthdate = toDateOnly(u.birthdate) || '';
      }
      setEditInitial(initial);
      setFormOpen(true);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Não foi possível carregar o usuário', variant: 'alert', alert: { color: 'error' } } as any);
    }
  };

  const openRole = (u: UserRow) => {
    setRoleUserId(u.id);
    setRoleCurrentId(u.role?.id || null);
    setRolePickerOpen(true);
  };

  // Componente de card para mobile
  const UserCard = ({ user }: { user: UserRow }) => (
         <Card 
       sx={{ 
         mb: 2, 
         '&:hover': { boxShadow: 3 },
         ...(user.isBlocked && {
           backgroundColor: 'error.lighter',
           '& .MuiTypography-root': {
             color: 'error.contrastText',
           },
           '& .MuiChip-root': {
             backgroundColor: 'error.main',
             color: 'error.contrastText',
           }
         }),
         ...(!user.emailVerifiedAt && !user.isBlocked && {
           backgroundColor: 'warning.lighter',
          //  '& .MuiTypography-root': {
          //    color: 'warning.contrastText',
          //  },
           '& .MuiChip-root': {
             backgroundColor: 'warning.main',
             color: 'warning.contrastText',
           }
         })
       }}
     >
      <CardContent sx={{ p: isSmallMobile ? 1.5 : 2 }}>
        <Stack spacing={1.5}>
          {/* Cabeçalho do card */}
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
                             <Tooltip 
                 title={
                   user.isBlocked ? <FormattedMessage id="user-blocked" /> :
                   !user.emailVerifiedAt ? <FormattedMessage id="user-unverified" /> : ''
                 }
                 disableHoverListener={!user.isBlocked && !!user.emailVerifiedAt}
               >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {user.name}
                </Typography>
              </Tooltip>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {user.email}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Definir função">
                <IconButton size="small" color="primary" onClick={() => openRole(user)}>
                  <TeamOutlined />
                </IconButton>
              </Tooltip>
              <Tooltip title="Editar">
                <IconButton size="small" color="secondary" onClick={() => openEdit(user.id)}>
                  <EditOutlined />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" color="error" onClick={() => requestDelete(user)}>
                  <DeleteOutlined />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

                     {/* Informações do usuário */}
           <Stack spacing={isSmallMobile ? 0.5 : 1}>
                         {user.phone && (
               <Stack direction="row" alignItems="center" spacing={isSmallMobile ? 0.5 : 1}>
                 <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 50 : 60 }}>
                   Telefone:
                 </Typography>
                 <Typography variant="body2">{formatPhoneBR(user.phone)}</Typography>
               </Stack>
             )}
             
             {hasCPF && user.cpf && (
               <Stack direction="row" alignItems="center" spacing={isSmallMobile ? 0.5 : 1}>
                 <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 50 : 60 }}>
                   CPF:
                 </Typography>
                 <Typography variant="body2">{formatCPF(user.cpf)}</Typography>
               </Stack>
             )}
             
             {hasOAB && user.oab && (
               <Stack direction="row" alignItems="center" spacing={isSmallMobile ? 0.5 : 1}>
                 <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 50 : 60 }}>
                   OAB:
                 </Typography>
                 <Typography variant="body2">{user.oab}</Typography>
               </Stack>
             )}
             
             {hasBirth && user.birthdate && (
               <Stack direction="row" alignItems="center" spacing={isSmallMobile ? 0.5 : 1}>
                 <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 50 : 60 }}>
                   Nascimento:
                 </Typography>
                 <Typography variant="body2">{formatDateOnlyBR(user.birthdate)}</Typography>
               </Stack>
             )}
             
             <Stack direction="row" alignItems="center" spacing={isSmallMobile ? 0.5 : 1}>
               <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 50 : 60 }}>
                 Função:
               </Typography>
               {user.role ? (
                 <Chip label={user.role.name} size="small" />
               ) : (
                 <Chip label="—" size="small" variant="outlined" />
               )}
             </Stack>
            
                         {(user.departments || []).length > 0 && (
               <Stack direction="row" alignItems="flex-start" spacing={isSmallMobile ? 0.5 : 1}>
                 <Typography variant="caption" color="text.secondary" sx={{ minWidth: isSmallMobile ? 50 : 60, mt: 0.5 }}>
                   Departamentos:
                 </Typography>
                 <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ flex: 1 }}>
                   {user.departments?.map((d) => (
                     <Chip key={d.id} label={d.name} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                   ))}
                 </Stack>
               </Stack>
             )}
          </Stack>

          {/* Data de criação */}
          <Typography variant="caption" color="text.secondary">
            Criado em {new Date(user.createdAt).toLocaleString()}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard title="Colaboradores" contentSX={{ p: 0 }}>
          {/* Cabeçalho responsivo */}
          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={isMobile ? 2 : 1.5} 
            sx={{ p: 2, pb: 1 }} 
            alignItems={isMobile ? "stretch" : "center"}
          >
            {/* Campo de busca */}
            <TextField
              label="Buscar por nome ou e-mail"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(0), load())}
              sx={{ 
                minWidth: isMobile ? '100%' : 280,
                flex: isMobile ? 'none' : 1
              }}
              autoComplete="off"
              inputProps={{
                'data-form-type': 'other',
                'autocomplete': 'off'
              }}
            />
            
                         {/* Botões de ação */}
             <Stack 
               direction="row" 
               spacing={1} 
               sx={{ 
                 justifyContent: isMobile ? 'space-between' : 'flex-start'
               }}
             >
              <Button 
                variant="outlined" 
                startIcon={<ReloadOutlined />} 
                onClick={() => (setPage(0), load())} 
                disabled={loading}
                size={isSmallMobile ? "small" : "medium"}
              >
                {isSmallMobile ? 'Buscar' : 'Buscar'}
              </Button>
              
              <Button 
                variant="contained" 
                startIcon={<UserAddOutlined />} 
                onClick={openCreate}
                size={isSmallMobile ? "small" : "medium"}
              >
                {isSmallMobile ? 'Novo' : 'Novo colaborador'}
              </Button>
            </Stack>
          </Stack>

          <Divider />

          {/* Conteúdo responsivo */}
          {isMobile ? (
            // Layout de cards para mobile
            <Box sx={{ p: 2 }}>
              {items.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
              
              {!items.length && (
                <Stack alignItems="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? 'Carregando...' : 'Nenhum colaborador encontrado.'}
                  </Typography>
                </Stack>
              )}
            </Box>
          ) : (
            // Layout de tabela para desktop
            <TableContainer>
              <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>Nome</TableCell>
                    <TableCell onClick={() => { setSortBy('email'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }} sx={{ cursor: 'pointer' }}>E-mail</TableCell>
                    <TableCell>Telefone</TableCell>
                    {hasCPF && <TableCell>CPF</TableCell>}
                    {hasOAB && <TableCell>OAB</TableCell>}
                    {hasBirth && <TableCell>Nascimento</TableCell>}
                    <TableCell>Função</TableCell>
                    <TableCell>Departamentos</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((u) => (
                                         <TableRow 
                       key={u.id} 
                       hover
                       sx={{
                         ...(u.isBlocked && {
                           backgroundColor: 'error.lighter',
                           '&:hover': {
                             backgroundColor: 'error.main',
                           },
                           '& .MuiTableCell-root': {
                             color: 'error.contrastText',
                           }
                         }),
                         ...(!u.emailVerifiedAt && !u.isBlocked && {
                           backgroundColor: 'warning.lighter',
                           '&:hover': {
                             backgroundColor: 'warning.light',
                           },
                          //  '& .MuiTableCell-root': {
                          //    color: 'warning.contrastText',
                          //  }
                         })
                       }}
                     >
                                             <TableCell>
                         <Tooltip 
                           title={
                             u.isBlocked ? <FormattedMessage id="user-blocked" /> :
                             !u.emailVerifiedAt ? <FormattedMessage id="user-unverified" /> : ''
                           }
                           disableHoverListener={!u.isBlocked && !!u.emailVerifiedAt}
                         >
                          <Stack>
                            <Typography fontWeight={600}>{u.name}</Typography>
                            <Typography variant="caption" color="text.secondary">Criado em {new Date(u.createdAt).toLocaleString()}</Typography>
                          </Stack>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                                              <TableCell>{u.phone ? formatPhoneBR(u.phone) : '-'}</TableCell>
                        {hasCPF && <TableCell>{u.cpf ? formatCPF(u.cpf) : '-'}</TableCell>}
                        {hasOAB && <TableCell>{u.oab || '-'}</TableCell>}
                        {hasBirth && <TableCell>{formatDateOnlyBR(u.birthdate)}</TableCell>}
                      <TableCell>
                        {u.role ? <Chip label={u.role.name} size="small" /> : <Chip label="—" size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {(u.departments || []).map((d) => (
                            <Chip key={d.id} label={d.name} size="small" variant="outlined" sx={{ mb: 0.5 }} />
                          ))}
                          {!u.departments?.length && <Typography variant="caption" color="text.secondary">—</Typography>}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Definir função">
                            <IconButton color="primary" onClick={() => openRole(u)}>
                              <TeamOutlined />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Editar">
                            <IconButton color="secondary" onClick={() => openEdit(u.id)}>
                              <EditOutlined />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton color="error" onClick={() => requestDelete(u)}>
                              <DeleteOutlined />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!items.length && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Stack alignItems="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">{loading ? 'Carregando...' : 'Nenhum colaborador encontrado.'}</Typography>
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
      </Grid>

      {/* Dialogs */}
      <UserFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editingId={editId}
        initial={editInitial || undefined}
        onSaved={load}
      />
      <RolePickerDialog
        open={rolePickerOpen}
        onClose={() => setRolePickerOpen(false)}
        userId={roleUserId}
        currentRoleId={roleCurrentId || undefined}
        onChanged={load}
      />

      {/* Confirmação de deleção */}
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
            const response = await deleteUser(deleteTarget.id);
            openSnackbar({ open: true, message: response.message || 'Colaborador removido!', variant: 'alert', alert: { color: 'success' } } as any);
            // se apagou o único da página e não é a primeira, volte uma página
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
        title="Remover colaborador"
        description={
          <span>
            Esta ação <b>não pode ser desfeita</b>. Deseja remover o colaborador{' '}
            <b>{deleteTarget?.name}</b>{deleteTarget?.email ? ` (${deleteTarget.email})` : ''}?
          </span>
        }
      />
    </Grid>
  );
}
