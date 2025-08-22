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

// Ilustração minimalista da balança (sem dependências externas)
function LawScales({ color, stroke = 2 }: { color: string; stroke?: number }) {
  return (
    <Box
      component="svg"
      role="img"
      aria-label="Balança da justiça"
      viewBox="0 0 240 180"
      sx={{ width: { xs: 180, sm: 280 }, height: 'auto' }}
    >
      <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {/* base */}
        <path d="M40 170h160" />
        <path d="M85 170h70" />
        {/* coluna */}
        <path d="M120 30v110" />
        <circle cx="120" cy="24" r="6" />
        {/* travessão */}
        <path d="M60 70h120" />
        {/* cabos */}
        <path d="M90 70l-20 40" />
        <path d="M150 70l20 40" />
        {/* pratos (triângulos) */}
        <path d="M55 110l15 26h30l15-26z" />
        <path d="M125 110l15 26h30l15-26z" />
      </g>
    </Box>
  );
}

// ==============================|| ERRO 404 - MAIS SÓBRIO ||============================== //

export default function Error404() {
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
      {/* número fantasma 404 ao fundo */}
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
        404
      </Box>

      <Grid size={12} sx={{ position: 'relative', marginTop: '60px' }}>
        <LawScales color={colors.gold} />
      </Grid>

      <Grid size={12} sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 720, px: 2 }}>
          <Typography variant="h3" sx={{ fontFamily: `'Merriweather', serif`, fontWeight: 700 }}>
            Página não encontrada
          </Typography>

          <Divider flexItem sx={{ width: 120, borderColor: colors.gold, opacity: 0.6 }} />

          <Typography color="text.secondary">
            O endereço acessado não existe ou foi movido. Verifique o link ou volte para a página inicial.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
            <Button component={Link} to={APP_DEFAULT_PATH} variant="contained">
              Voltar ao início
            </Button>

          </Stack>
        </Stack>
      </Grid>
    </Grid>
  );
}
