import { useState, useEffect, useMemo } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import Avatar from 'components/@extended/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { listCaseResults, CaseResult } from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import useAvatarUrl from 'hooks/useAvatarUrl';

interface PieceProductivitySectionProps {
  startDate?: string;
  endDate?: string;
  getDefaultStartDate: () => string;
}

type ProductivityItem = {
  pieceId: string;
  pieceName: string;
  createdAt: string;
  finalizedAt?: string | null;
  approvedAt?: string | null;
  releasedAt?: string | null;
  finalizedBy?: { id: string; name: string; email?: string } | null;
  approvedBy?: { id: string; name: string; email?: string } | null;
  releasedBy?: { id: string; name: string; email?: string } | null;
  timeToFinalize?: number | null;
  timeToApprove?: number | null;
  timeToRelease?: number | null;
  totalTime?: number | null;
  formattedTimeToFinalize?: string;
  formattedTimeToApprove?: string;
  formattedTimeToRelease?: string;
  formattedTotalTime?: string;
};

// Função auxiliar para formatar duração
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else if (minutes > 0) {
    return `${minutes}min ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

// Avatar protegido por token
function UserAvatar({ userId, name }: { userId: string; name: string }) {
  const url = useAvatarUrl(userId, null);
  return (
    <Avatar
      src={url ?? undefined}
      alt={name}
      size="sm"
      color="primary"
    >
      {name?.charAt(0)?.toUpperCase() || 'U'}
    </Avatar>
  );
}

export default function PieceProductivitySection({ startDate, endDate, getDefaultStartDate }: PieceProductivitySectionProps) {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<CaseResult[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const dateStart = startDate || getDefaultStartDate();
      
      const params: any = {
        page: 1,
        pageSize: 200, // Máximo permitido pelo backend
        includeApprovalFlow: true
      };

      if (dateStart) {
        params.createdFrom = dateStart + 'T00:00:00.000Z';
      }
      
      if (endDate) {
        params.createdTo = endDate + 'T23:59:59.999Z';
      }

      const result = await listCaseResults(params);
      setCases(result.data || result.items || []);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Falha ao carregar dados de produtividade';
      openSnackbar({
        open: true,
        message: errorMessage,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  // Processar casos para dados de produtividade - apenas casos finalizados
  const data = useMemo(() => {
    const items: ProductivityItem[] = [];

    cases.forEach((caseItem) => {
      // Apenas casos que foram finalizados
      if (!caseItem.approvalFlow?.finalizedAt) return;
      if (!caseItem.pieceId) return;

      const pieceId = caseItem.pieceId;
      const pieceName = caseItem.pieceName || caseItem.piece?.name || 'Peça sem nome';
      const createdAt = caseItem.createdAt;
      const approvalFlow = caseItem.approvalFlow;

      // Calcular tempos
      const createdTime = new Date(createdAt).getTime();
      const finalizedTime = approvalFlow?.finalizedAt ? new Date(approvalFlow.finalizedAt).getTime() : null;
      const approvedTime = approvalFlow?.approvedAt ? new Date(approvalFlow.approvedAt).getTime() : null;
      const releasedTime = approvalFlow?.releasedAt ? new Date(approvalFlow.releasedAt).getTime() : null;

      const timeToFinalize = finalizedTime ? Math.floor((finalizedTime - createdTime) / 1000) : null;
      const timeToApprove = approvedTime && finalizedTime ? Math.floor((approvedTime - finalizedTime) / 1000) : null;
      const timeToRelease = releasedTime && approvedTime ? Math.floor((releasedTime - approvedTime) / 1000) : null;
      const totalTime = releasedTime ? Math.floor((releasedTime - createdTime) / 1000) : null;

      const item: ProductivityItem = {
        pieceId: caseItem.id, // Usar ID do caso como identificador único
        pieceName: caseItem.name || pieceName, // Nome do caso ou peça
        createdAt,
        finalizedAt: approvalFlow?.finalizedAt || null,
        approvedAt: approvalFlow?.approvedAt || null,
        releasedAt: approvalFlow?.releasedAt || null,
        finalizedBy: approvalFlow?.finalizedByUser ? {
          id: approvalFlow.finalizedByUser.id,
          name: approvalFlow.finalizedByUser.name,
          email: undefined
        } : null,
        approvedBy: approvalFlow?.approvedByUser ? {
          id: approvalFlow.approvedByUser.id,
          name: approvalFlow.approvedByUser.name,
          email: undefined
        } : null,
        releasedBy: approvalFlow?.releasedByUser ? {
          id: approvalFlow.releasedByUser.id,
          name: approvalFlow.releasedByUser.name,
          email: undefined
        } : null,
        timeToFinalize,
        timeToApprove,
        timeToRelease,
        totalTime,
        formattedTimeToFinalize: timeToFinalize ? formatDuration(timeToFinalize) : undefined,
        formattedTimeToApprove: timeToApprove ? formatDuration(timeToApprove) : undefined,
        formattedTimeToRelease: timeToRelease ? formatDuration(timeToRelease) : undefined,
        formattedTotalTime: totalTime ? formatDuration(totalTime) : undefined
      };

      items.push(item);
    });

    // Ordenar por data de criação (mais recentes primeiro)
    return items.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cases]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

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

  // Calcular estatísticas
  const stats = {
    total: data.length,
    finalized: data.filter(item => item.finalizedAt).length,
    approved: data.filter(item => item.approvedAt).length,
    released: data.filter(item => item.releasedAt).length,
    avgTimeToFinalize: data.filter(item => item.timeToFinalize).reduce((sum, item) => sum + (item.timeToFinalize || 0), 0) / data.filter(item => item.timeToFinalize).length || 0,
    avgTimeToApprove: data.filter(item => item.timeToApprove).reduce((sum, item) => sum + (item.timeToApprove || 0), 0) / data.filter(item => item.timeToApprove).length || 0,
    avgTimeToRelease: data.filter(item => item.timeToRelease).reduce((sum, item) => sum + (item.timeToRelease || 0), 0) / data.filter(item => item.timeToRelease).length || 0,
    avgTotalTime: data.filter(item => item.totalTime).reduce((sum, item) => sum + (item.totalTime || 0), 0) / data.filter(item => item.totalTime).length || 0
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <FileTextOutlined />
        <Typography variant="h6" fontWeight={700}>
          Produtividade de Casos Finalizados
        </Typography>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : data.length > 0 ? (
        <>
          {/* Cards de Estatísticas */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Total de Casos Finalizados</Typography>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Finalizadas</Typography>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {stats.finalized}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Aprovadas</Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {stats.approved}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Liberadas</Typography>
                  <Typography variant="h4" fontWeight={700} color="info.main">
                    {stats.released}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {stats.avgTimeToFinalize > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Tempo Médio até Finalizar</Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      {formatDuration(stats.avgTimeToFinalize)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {stats.avgTimeToApprove > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Tempo Médio até Aprovar</Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      {formatDuration(stats.avgTimeToApprove)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {stats.avgTimeToRelease > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Tempo Médio até Liberar</Typography>
                    <Typography variant="h6" fontWeight={700} color="warning.main">
                      {formatDuration(stats.avgTimeToRelease)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {stats.avgTotalTime > 0 && (
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Tempo Médio Total</Typography>
                    <Typography variant="h6" fontWeight={700} color="error.main">
                      {formatDuration(stats.avgTotalTime)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Tabela de Detalhes */}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Caso</TableCell>
                  <TableCell>Criada em</TableCell>
                  <TableCell>Finalizada</TableCell>
                  <TableCell>Finalizada por</TableCell>
                  <TableCell>Aprovada</TableCell>
                  <TableCell>Aprovada por</TableCell>
                  <TableCell>Liberada</TableCell>
                  <TableCell>Liberada por</TableCell>
                  <TableCell align="right">Tempo Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.pieceId} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {item.pieceName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(item.createdAt)}</Typography>
                    </TableCell>
                    <TableCell>
                      {item.finalizedAt ? (
                        <>
                          <Typography variant="body2">{formatDate(item.finalizedAt)}</Typography>
                          {item.formattedTimeToFinalize && (
                            <Typography variant="caption" color="text.secondary">
                              {item.formattedTimeToFinalize}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Chip label="Pendente" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.finalizedBy ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UserAvatar userId={item.finalizedBy.id} name={item.finalizedBy.name} />
                          <Typography variant="body2">{item.finalizedBy.name}</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.approvedAt ? (
                        <>
                          <Typography variant="body2">{formatDate(item.approvedAt)}</Typography>
                          {item.formattedTimeToApprove && (
                            <Typography variant="caption" color="text.secondary">
                              {item.formattedTimeToApprove}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Chip label="Pendente" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.approvedBy ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UserAvatar userId={item.approvedBy.id} name={item.approvedBy.name} />
                          <Typography variant="body2">{item.approvedBy.name}</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.releasedAt ? (
                        <>
                          <Typography variant="body2">{formatDate(item.releasedAt)}</Typography>
                          {item.formattedTimeToRelease && (
                            <Typography variant="caption" color="text.secondary">
                              {item.formattedTimeToRelease}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Chip label="Pendente" size="small" color="default" />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.releasedBy ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <UserAvatar userId={item.releasedBy.id} name={item.releasedBy.name} />
                          <Typography variant="body2">{item.releasedBy.name}</Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {item.formattedTotalTime ? (
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {item.formattedTotalTime}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
          <CardContent>
            <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
              <FileTextOutlined style={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="h6" color="text.secondary" fontWeight={600}>
                Nenhum caso finalizado disponível
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
                Não há casos finalizados para o período selecionado. Tente ajustar as datas.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

