import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

// material-ui
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

// project imports
import { APP_DEFAULT_PATH, getBrandColors } from 'config';
import axios from 'utils/axios';
import { extractTokenFromUrl, clearTokenFromUrl } from 'utils/token-utils';

// Ilustração de report
function ReportIcon({ color, stroke = 2 }: { color: string; stroke?: number }) {
  return (
    <Box
      component="svg"
      role="img"
      aria-label="Report"
      viewBox="0 0 240 180"
      sx={{ width: { xs: 180, sm: 280 }, height: 'auto' }}
    >
      <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {/* Triângulo de alerta */}
        <path d="M120 40l60 100h-120z" />
        {/* Ponto de exclamação */}
        <path d="M120 70v20" />
        <circle cx="120" cy="110" r="2" />
        {/* Dispositivo */}
        <rect x="80" y="130" width="80" height="40" rx="4" />
        <rect x="85" y="135" width="70" height="30" rx="2" fill={color} opacity="0.1" />
      </g>
    </Box>
  );
}

// ==============================|| REPORT DE LOGIN ||============================== //

export default function ReportLogin() {
  const theme = useTheme();
  const colors = getBrandColors(theme.palette.mode === 'dark');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const processToken = async () => {
      try {
        // Extrai token da URL
        const token = extractTokenFromUrl();

        if (!token) {
          setStatus('error');
          setMessage('Token não encontrado');
          return;
        }

        // Chama o endpoint principal (sem precheck por enquanto)
        const response = await axios.post('/auth/report-login', { token });
        
        // Limpa o token da URL
        clearTokenFromUrl();
        
        setStatus('success');
        setMessage(response.data?.message || 'Login reportado com sucesso!');
      } catch (error: any) {
        // Limpa o token da URL mesmo em caso de erro
        clearTokenFromUrl();
        
        setStatus('error');
        setMessage(error.response?.data?.message || 'Erro no report');
      }
    };

    processToken();
  }, []);

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
        position: 'relative',
      }}
    >
      <Grid size={12} sx={{ position: 'relative' }}>
        {status === 'loading' ? (
          <CircularProgress size={80} sx={{ color: colors.gold }} />
        ) : (
          <ReportIcon color={status === 'success' ? colors.gold : '#ef4444'} />
        )}
      </Grid>

      <Grid size={12} sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 720, px: 2 }}>
          <Typography variant="h3" sx={{ fontFamily: `'Merriweather', serif`, fontWeight: 700 }}>
            {status === 'loading' ? 'Processando...' : 
             status === 'success' ? 'Login reportado!' : 'Erro no report'}
          </Typography>

          <Divider flexItem sx={{ width: 120, borderColor: colors.gold, opacity: 0.6 }} />

          <Typography color="text.secondary">
            {message}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
            <Button component={Link} to="/login" variant="contained">
              Fazer login
            </Button>
            <Button component={Link} to={APP_DEFAULT_PATH} variant="outlined" color="inherit">
              Voltar ao início
            </Button>
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  );
}
