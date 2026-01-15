import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { Theme, useTheme } from '@mui/material/styles';
import TrophyOutlined from '@ant-design/icons/TrophyOutlined';
import { UsageRankingItem } from 'api/dashboard';

interface UsageRankingSectionProps {
  ranking: UsageRankingItem[];
  loading: boolean;
}

export default function UsageRankingSection({ ranking, loading }: UsageRankingSectionProps) {
  const theme = useTheme();

  // Calcular máximo de horas para o gráfico
  const maxHours = useMemo(() => {
    if (ranking.length === 0) return 4;
    const max = Math.max(...ranking.map(item => item.totalHours));
    // Arredondar para cima para o próximo múltiplo de 1h
    return Math.ceil(max);
  }, [ranking]);

  // Formatar horas para exibição no eixo Y
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

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
        Ranking de Uso
      </Typography>

      {/* Gráfico de Barras Horizontal */}
      {loading && ranking.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Carregando ranking...
          </Typography>
        </Stack>
      ) : ranking.length > 0 ? (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Horas
            </Typography>
            <Box
              sx={{
                position: 'relative',
                height: Math.max(200, ranking.length * 60),
                borderLeft: `2px solid ${theme.palette.divider}`,
                borderBottom: `2px solid ${theme.palette.divider}`,
                pl: 2,
                pb: 2
              }}
            >
              {/* Eixo Y - Horas */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -40,
                  top: 0,
                  bottom: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: 40
                }}
              >
                {Array.from({ length: maxHours + 1 }, (_, i) => i).map((h) => (
                  <Typography
                    key={h}
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textAlign: 'right',
                      pr: 1,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    {formatHours(h)}
                  </Typography>
                ))}
              </Box>

              {/* Barras */}
              <Stack spacing={2} sx={{ height: '100%', justifyContent: 'space-between' }}>
                {ranking.map((item, index) => {
                  const barWidth = (item.totalHours / maxHours) * 100;
                  const colors = [
                    theme.palette.primary.main,
                    theme.palette.secondary.main,
                    theme.palette.warning.main,
                    theme.palette.info.main,
                    theme.palette.success.main
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <Box key={item.userId} sx={{ position: 'relative' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          sx={{ minWidth: 100, textAlign: 'right' }}
                          fontWeight={600}
                        >
                          {item.userName}
                        </Typography>
                        <Box
                          sx={{
                            flex: 1,
                            position: 'relative',
                            height: 40,
                            bgcolor: theme.palette.grey[200],
                            borderRadius: 1,
                            overflow: 'hidden'
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${barWidth}%`,
                              bgcolor: color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              pr: 2,
                              transition: 'width 0.3s ease'
                            }}
                          >
                            {barWidth > 15 && (
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                {item.formattedTotal}
                              </Typography>
                            )}
                          </Box>
                          {barWidth <= 15 && (
                            <Typography
                              variant="caption"
                              sx={{
                                position: 'absolute',
                                left: `${barWidth}%`,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                ml: 1,
                                fontWeight: 600
                              }}
                            >
                              {item.formattedTotal}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>

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
          </Box>

          <Divider />

          {/* Lista de Rankings */}
          <Stack spacing={2}>
            {ranking.map((item) => (
              <Card key={item.userId} variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar src={item.imageUrl} sx={{ width: 48, height: 48 }}>
                      {item.userName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {item.userName}
                        </Typography>
                        {item.rank === 1 && (
                          <Chip
                            icon={<TrophyOutlined />}
                            label="Líder"
                            color="warning"
                            size="small"
                            sx={{ height: 24 }}
                          />
                        )}
                      </Stack>
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>{item.formattedTotal}</strong> total
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>{item.sessionsCount}</strong> {item.sessionsCount === 1 ? 'sessão' : 'sessões'}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      ) : (
        <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
          <CardContent>
            <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TrophyOutlined style={{ fontSize: 32, color: theme.palette.text.secondary }} />
              </Box>
              <Typography variant="h6" color="text.secondary" fontWeight={600}>
                Nenhum ranking disponível
              </Typography>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ maxWidth: 400 }}>
                Não há dados de uso para o período selecionado. Tente ajustar as datas ou verifique se há usuários com atividade no sistema.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

