import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import AIIcon from 'components/icons/AIIcon';
import { listAiUsage, AiUsageAgg } from 'api/aiUsage';

interface AIUsageSectionProps {
  startDate?: string;
  endDate?: string;
  getDefaultStartDate: () => string;
}

export default function AIUsageSection({ startDate, endDate, getDefaultStartDate }: AIUsageSectionProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAggregates, setAiAggregates] = useState<AiUsageAgg | null>(null);
  const [aiTotalCostUsd, setAiTotalCostUsd] = useState<number | undefined>(undefined);

  const loadAiUsage = async () => {
    try {
      setAiLoading(true);
      const params: any = {
        limit: 1,
        offset: 0,
        order: 'desc'
      };

      const dateStart = startDate || getDefaultStartDate();
      if (dateStart) {
        const [year, month, day] = dateStart.split('-').map(Number);
        const from = new Date(year, month - 1, day, 0, 0, 0, 0);
        params.from = from.toISOString();
      }

      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        const to = new Date(year, month - 1, day, 23, 59, 59, 999);
        params.to = to.toISOString();
      }

      const res = await listAiUsage(params);
      const topLevelAgg =
        'calls' in res
          ? {
              calls: (res as any).calls,
              promptTokens: (res as any).promptTokens,
              completionTokens: (res as any).completionTokens,
              cachedTokens: (res as any).cachedTokens,
              totalTokens: (res as any).totalTokens,
              totalCostUsd: (res as any).totalCostUsd,
              costUsd: (res as any).costUsd,
              updatedAt: (res as any).updatedAt
            }
          : null;

      const agg =
        (res as any).aggregates ??
        (res as any).summary ??
        (res as any).global ??
        (res as any).totals ??
        topLevelAgg ??
        null;
      setAiAggregates(agg);
      const nextTotalCostUsd = agg?.costUsd ?? agg?.totalCostUsd ?? res.totalCostUsd;
      setAiTotalCostUsd(nextTotalCostUsd);
    } catch (err: any) {
      console.error('Erro ao carregar uso da IA:', err);
      setAiAggregates(null);
      setAiTotalCostUsd(undefined);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadAiUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatCurrency = (num?: number) => {
    if (num === undefined || num === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(num);
  };

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <AIIcon />
        <Typography variant="h6" fontWeight={700}>
          Uso da IA
        </Typography>
      </Stack>

      {aiLoading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : (aiAggregates || aiTotalCostUsd !== undefined) ? (
        <Grid container spacing={2}>
          {aiAggregates && (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total de Chamadas</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {formatNumber(aiAggregates.calls)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Tokens do Prompt</Typography>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {formatNumber(aiAggregates.promptTokens)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Tokens de Completion</Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {formatNumber(aiAggregates.completionTokens)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Cached Tokens</Typography>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {formatNumber(aiAggregates.cachedTokens)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">Total de Tokens</Typography>
                    <Typography variant="h4" fontWeight={700} color="warning.main">
                      {formatNumber(aiAggregates.totalTokens)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </>
          )}
          {aiTotalCostUsd !== undefined && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">Custo Total (USD)</Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {formatCurrency(aiTotalCostUsd)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Nenhum dado de uso da IA encontrado para o período selecionado.
        </Typography>
      )}
    </Box>
  );
}

