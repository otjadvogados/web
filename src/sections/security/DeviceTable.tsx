import * as React from 'react';
import useSWR from 'swr';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableSortLabel,
  TablePagination,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Chip,
  Divider
} from '@mui/material';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import RollbackOutlined from '@ant-design/icons/RollbackOutlined';

import MainCard from 'components/MainCard';
import { fetchDevices, removeDevice, restoreDevice, ListKind, DeviceRecord } from 'api/deviceAccess';

type Order = 'asc' | 'desc';

type Props = {
  kind: ListKind; // 'trusted' | 'blocked'
  title: string; // "Dispositivos confiáveis" | "Dispositivos bloqueados"
  subtitle?: string;
};

export default function DeviceTable({ kind, title, subtitle }: Props) {
  const defaultSort = kind === 'trusted' ? 'lastSeen' : 'createdAt';

  const [page, setPage] = React.useState(0); // UI é 0-based
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [orderBy, setOrderBy] = React.useState(defaultSort);
  const [order, setOrder] = React.useState<Order>('desc');
  const [showHistory, setShowHistory] = React.useState(false);

  const queryKey = ['devices', kind, page, rowsPerPage, orderBy, order, showHistory] as const;

  const { data, isLoading, mutate, error } = useSWR(queryKey, () =>
    fetchDevices(kind, {
      page: page + 1, // backend é 1-based
      limit: rowsPerPage,
      sortBy: orderBy,
      sortOrder: order,
      history: showHistory
    })
  );

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const onRemove = async (id: string) => {
    await removeDevice(kind, id);
    mutate();
  };

  const onRestore = async (id: string) => {
    await restoreDevice(kind, id);
    mutate();
  };

  const items: DeviceRecord[] = data?.items || [];
  const total = data?.total || 0;

  return (
    <MainCard title={title} subheader={subtitle}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showHistory}
              onChange={(_, v) => {
                setShowHistory(v);
                setPage(0);
              }}
            />
          }
          label="Ver histórico"
        />
        <Chip
          label={kind === 'trusted' ? 'Lista de confiança' : 'Lista bloqueada'}
          color={kind === 'trusted' ? 'success' : 'error'}
          variant="outlined"
          size="small"
        />
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <Table size="small" aria-label="tabela-dispositivos">
          <TableHead>
            <TableRow>
              <TableCell>IP (sub-rede)</TableCell>
              <TableCell>Dispositivo</TableCell>
              <TableCell sortDirection={orderBy === (kind === 'trusted' ? 'lastSeen' : 'createdAt') ? order : false}>
                <TableSortLabel
                  active={orderBy === (kind === 'trusted' ? 'lastSeen' : 'createdAt')}
                  direction={orderBy === (kind === 'trusted' ? 'lastSeen' : 'createdAt') ? order : 'asc'}
                  onClick={() => handleRequestSort(kind === 'trusted' ? 'lastSeen' : 'createdAt')}
                >
                  {kind === 'trusted' ? 'Último acesso' : 'Criado em'}
                </TableSortLabel>
              </TableCell>
              <TableCell width={110} align="right">
                Ações
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    Carregando...
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum registro encontrado.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {items.map((row) => {
              const ip = row.ipSubnet || '-';
              const ua = row.userAgent || '-';
              const date = (kind === 'trusted' ? row.lastSeen : row.createdAt) || '-';
              const isDeleted = !!row.deletedAt;

              return (
                <TableRow key={row.id} hover>
                  <TableCell>{ip}</TableCell>
                  <TableCell>{ua}</TableCell>
                  <TableCell>{date ? new Date(date).toLocaleString('pt-BR') : '-'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      {!isDeleted && !showHistory && (
                        <Tooltip 
                          title="Remover da lista"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                border: '1px solid',
                                borderColor: 'divider'
                              }
                            }
                          }}
                        >
                          <IconButton size="small" onClick={() => onRemove(row.id)}>
                            <DeleteOutlined />
                          </IconButton>
                        </Tooltip>
                      )}

                      {(isDeleted || showHistory) && (
                        <Tooltip 
                          title="Restaurar"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                border: '1px solid',
                                borderColor: 'divider'
                              }
                            }
                          }}
                        >
                          <IconButton size="small" onClick={() => onRestore(row.id)} color="primary">
                            <RollbackOutlined />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Linhas por página"
        />
      </Box>

      {error && (
        <Typography variant="caption" color="error">
          Erro ao carregar dados. Tente novamente.
        </Typography>
      )}
    </MainCard>
  );
}
