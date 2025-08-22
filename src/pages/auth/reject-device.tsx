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
import { checkToken, extractTokenFromUrl, clearTokenFromUrl } from 'utils/token-utils';

// Ilustração de rejeição
function RejectIcon({ color, stroke = 2 }: { color: string; stroke?: number }) {
  return (
    <Box
      component="svg"
      role="img"
      aria-label="Rejeição"
      viewBox="0 0 240 180"
      sx={{ width: { xs: 180, sm: 280 }, height: 'auto' }}
    >
      <g fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
        {/* Círculo externo */}
        <circle cx="120" cy="90" r="60" />
        {/* X */}
        <path d="M85 85l30 30" />
        <path d="M115 85l-30 30" />
        {/* Dispositivo rejeitado */}
        <rect x="80" y="130" width="80" height="40" rx="4" opacity="0.5" />
        <path d="M85 135l70 30" strokeDasharray="5,5" />
      </g>
    </Box>
  );
}

// ==============================|| REJEIÇÃO DE DISPOSITIVO ||============================== //

export default function RejectDevice() {
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

        // Precheck opcional (pode ser removido se não necessário)
        const precheck = await checkToken('reject', token);
        if (!precheck.valid) {
          setStatus('error');
          setMessage(precheck.message || 'Token inválido ou expirado');
          clearTokenFromUrl();
          return;
        }

        // Chama o endpoint principal
        const response = await axios.post('/auth/reject-device', { token });
        
        // Limpa o token da URL
        clearTokenFromUrl();
        
        setStatus('success');
        setMessage(response.data?.message || 'Dispositivo rejeitado com sucesso!');
      } catch (error: any) {
        // Limpa o token da URL mesmo em caso de erro
        clearTokenFromUrl();
        
        setStatus('error');
        setMessage(error.response?.data?.message || 'Erro na rejeição');
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
          <RejectIcon color={status === 'success' ? colors.gold : '#ef4444'} />
        )}
      </Grid>

      <Grid size={12} sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Stack spacing={2.5} alignItems="center" sx={{ maxWidth: 720, px: 2 }}>
          <Typography variant="h3" sx={{ fontFamily: `'Merriweather', serif`, fontWeight: 700 }}>
            {status === 'loading' ? 'Processando...' : 
             status === 'success' ? 'Dispositivo rejeitado!' : 'Erro na rejeição'}
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
