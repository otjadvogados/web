import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { getUsageRanking, UsageRankingItem } from 'api/dashboard';
import AIUsageSection from 'sections/dashboard/AIUsageSection';
import UsageRankingSection from 'sections/dashboard/UsageRankingSection';
import PieceProductivitySection from 'sections/dashboard/PieceProductivitySection';

export default function DashboardPage() {
  const [ranking, setRanking] = useState<UsageRankingItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(10);

  // Calcular data padrão (30 dias atrás)
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const loadRanking = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (startDate) {
        params.startDate = startDate;
      } else {
        params.startDate = getDefaultStartDate();
      }
      
      if (endDate) {
        params.endDate = endDate;
      }
      
      if (limit) {
        params.limit = limit;
      }

      const data = await getUsageRanking(params);
      setRanking(data);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Falha ao carregar ranking de uso';
      openSnackbar({
        open: true,
        message: errorMessage,
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearch = () => {
    loadRanking();
  };

  const onClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setLimit(10);
    setTimeout(() => {
      loadRanking();
    }, 100);
  };


  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          contentSX={{ p: 0 }}
        >
          <Stack spacing={2} sx={{ p: 3 }}>
            {/* Cabeçalho com título */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Typography variant="h4" fontWeight={700}>
                Rankings
              </Typography>
            </Stack>

            {/* Filtros de data e quantidade (colapsáveis) */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Data Inicial"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
                size="small"
              />
              <TextField
                label="Data Final"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 180 }}
                size="small"
              />
              <TextField
                label="Quantidade"
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10) || 10)}
                inputProps={{ min: 1, max: 100 }}
                sx={{ minWidth: 120 }}
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<ReloadOutlined />} onClick={onSearch} disabled={loading}>
                  Buscar
                </Button>
                <Button variant="text" onClick={onClearFilters} disabled={loading}>
                  Limpar
                </Button>
              </Stack>
            </Stack>

            <Divider />

            {/* Seção de Uso da IA */}
            <AIUsageSection
              startDate={startDate}
              endDate={endDate}
              getDefaultStartDate={getDefaultStartDate}
            />

            {/* Espaçamento entre Uso da IA e Produtividade */}
            <Box sx={{ mt: 4 }} />

            <Divider />

            {/* Seção de Produtividade de Peças */}
            <PieceProductivitySection
              startDate={startDate}
              endDate={endDate}
              getDefaultStartDate={getDefaultStartDate}
            />

            {/* Espaçamento entre Produtividade e Ranking */}
            <Box sx={{ mt: 4 }} />

            <Divider />

            {/* Seção de Ranking */}
            <UsageRankingSection ranking={ranking} loading={loading} />
          </Stack>
        </MainCard>
      </Grid>
    </Grid>
  );
}
