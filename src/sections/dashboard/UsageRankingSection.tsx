import { useMemo, Fragment } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import TrophyOutlined from '@ant-design/icons/TrophyOutlined';
import { UsageRankingItem } from 'api/dashboard';

interface UsageRankingSectionProps {
  ranking: UsageRankingItem[];
  loading: boolean;
}

export default function UsageRankingSection({ ranking, loading }: UsageRankingSectionProps) {
  const theme = useTheme();

  const formatHours = (hours: number) => {
    if (hours === 0) return '0min';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}min`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h${m}min`;
  };

  const maxHours = useMemo(() => {
    if (ranking.length === 0) return 0;
    return Math.max(...ranking.map((item) => item.totalHours));
  }, [ranking]);

  // Ticks do eixo X (horas) — 0%, 25%, 50%, 75%, 100%
  const xTicks = useMemo(() => {
    if (maxHours <= 0) return [0];
    const tickCount = 5;
    return Array.from({ length: tickCount }, (_, i) => (maxHours * i) / (tickCount - 1));
  }, [maxHours]);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <TrophyOutlined />
        <Typography variant="h6" fontWeight={700}>
          Ranking de Uso
        </Typography>
      </Stack>

      {loading ? (
        <Stack alignItems="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Stack>
      ) : ranking.length > 0 ? (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Horas
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' },
                columnGap: 1.5,
                rowGap: 1.5,
                alignItems: 'center'
              }}
            >
              {/* Eixo X (ticks de horas) — só no desktop */}
              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box sx={{ position: 'relative', height: 26, display: { xs: 'none', sm: 'block' }, pr: 1 }}>
                {xTicks.map((t, i) => {
                  const pct = maxHours === 0 ? 0 : (t / maxHours) * 100;
                  const isLast = i === xTicks.length - 1;
                  return (
                    <Box
                      key={`${t}-${i}`}
                      sx={{
                        position: 'absolute',
                        left: `${pct}%`,
                        top: 0,
                        transform: isLast ? 'translateX(-100%)' : 'translateX(-50%)'
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {formatHours(t)}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              {/* Linhas (usuário + barra) */}
              {ranking.map((item, index) => {
                const barWidth = maxHours === 0 ? 0 : (item.totalHours / maxHours) * 100;
                const colors = [
                  theme.palette.primary.main,
                  theme.palette.secondary.main,
                  theme.palette.warning.main,
                  theme.palette.info.main,
                  theme.palette.success.main
                ];
                const color = colors[index % colors.length];
                return (
                  <Fragment key={item.userId}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      noWrap
                      title={item.userName}
                      sx={{
                        textAlign: 'left'
                      }}
                    >
                      {item.userName}
                    </Typography>

                    <Box
                      sx={{
                        position: 'relative',
                        height: 40,
                        borderRadius: 1,
                        bgcolor: theme.palette.action.hover,
                        overflow: 'visible'
                      }}
                    >
                      {/* Gridlines (marcas do eixo X) */}
                      {xTicks.slice(1).map((t, i) => {
                        const pct = maxHours === 0 ? 0 : (t / maxHours) * 100;
                        return (
                          <Box
                            key={`grid-${item.userId}-${i}`}
                            sx={{
                              position: 'absolute',
                              left: `${pct}%`,
                              top: 0,
                              bottom: 0,
                              width: 1,
                              bgcolor: theme.palette.divider,
                              opacity: 0.35
                            }}
                          />
                        );
                      })}

                      {/* Barra preenchida */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${barWidth}%`,
                          bgcolor: color,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          pr: 2,
                          transition: 'width 0.3s ease',
                          overflow: 'hidden'
                        }}
                      >
                        {barWidth > 22 && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'common.white', fontWeight: 700, whiteSpace: 'nowrap' }}
                          >
                            {item.formattedTotal}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Fragment>
                );
              })}
            </Box>
            {/* Legenda */}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {ranking.map((item, index) => {
                const colors = [
                  theme.palette.primary.main,
                  theme.palette.secondary.main,
                  theme.palette.warning.main,
                  theme.palette.info.main,
                  theme.palette.success.main
                ];
                const color = colors[index % colors.length];
                return (
                  <Stack key={item.userId} direction="row" spacing={0.5} alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: color
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {item.userName}
                    </Typography>
                  </Stack>
                );
              })}
            </Box>
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          Nenhum dado de ranking encontrado para o período selecionado.
        </Typography>
      )}
    </Box>
  );
}
