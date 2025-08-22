import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { APP_DEFAULT_PATH, getBrandColors } from 'config';

// Ilustração minimalista de um tribunal (sem dependências externas)
function Courthouse({ color, stroke = 2 }: { color: string; stroke?: number }) {
  return (
    <Box
      component="svg"
      role="img"
      aria-label="Ícone de tribunal"
      viewBox="0 0 240 180"
      sx={{ width: { xs: 180, sm: 280 }, height: 'auto' }}
    >
      <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {/* frontão */}
        <path d="M40 80 L120 45 L200 80 Z" />
        {/* base superior do frontão */}
        <path d="M48 80 H192" />
        {/* colunas */}
        <path d="M70 80 V150" />
        <path d="M100 80 V150" />
        <path d="M140 80 V150" />
        <path d="M170 80 V150" />
        {/* soleiras e base */}
        <path d="M56 150 H184" />
        <path d="M40 162 H200" />
        {/* pequeno pináculo/medalhão (toque decorativo) */}
        <circle cx="120" cy="60" r="6" />
      </g>
    </Box>
  );
}

// ==============================|| ERRO 500 - MAIS SÓBRIO ||============================== //

export default function Error500() {
  const theme = useTheme();
  const colors = getBrandColors(theme.palette.mode === 'dark');

  return (
    <Grid
      container
      spacing={4}
      direction="column"
      alignItems="center"
      justifyContent="center"
      sx={{
        minHeight: '100vh',
        py: { xs: 6, sm: 8 },
        textAlign: 'center',
        position: 'relative'
      }}
    >
      {/* número fantasma 500 ao fundo */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: { xs: 32, sm: 24 },
          insetInline: 0,
          mx: 'auto',
          fontWeight: 800,
          fontSize: { xs: 120, sm: 200 },
          lineHeight: 1,
          color: colors.navy,
          opacity: theme.palette.mode === 'light' ? 0.06 : 0.12
        }}
      >
        500
      </Box>

      <Grid size={12} sx={{ position: 'relative', mt: '60px' }}>
        <Courthouse color={colors.gold} />
      </Grid>

      <Grid size={12} sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 720, px: 2 }}>
          <Typography variant="h3" sx={{ fontFamily: `'Merriweather', serif`, fontWeight: 700 }}>
            Erro interno do servidor
          </Typography>

          <Divider flexItem sx={{ width: 120, borderColor: colors.gold, opacity: 0.6 }} />

          <Typography color="text.secondary">
            Ocorreu um problema no nosso servidor. Já estamos trabalhando para resolver. Tente novamente em instantes.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
            <Button component={Link} to={APP_DEFAULT_PATH} variant="contained">
              Voltar ao início
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  );
}