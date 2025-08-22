import { useState, useEffect, useRef } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ClockCircleOutlined from '@ant-design/icons/ClockCircleOutlined';
import { clearToken } from 'utils/axios';
import { openSnackbar } from 'api/snackbar';

interface SessionTimerProps {
  expiresIn: {
    hours: number;
    minutes: number;
    seconds: number;
  };
}

export default function SessionTimer({ expiresIn }: SessionTimerProps) {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>(expiresIn);
  
  // Refs para controlar se os alertas já foram mostrados
  const warningShown = useRef(false);
  const criticalShown = useRef(false);

  useEffect(() => {
    // Atualiza o tempo inicial quando expiresIn mudar
    setTimeLeft(expiresIn);
    
    // Reseta os alertas quando o tempo for renovado
    const totalSeconds = expiresIn.hours * 3600 + expiresIn.minutes * 60 + expiresIn.seconds;
    if (totalSeconds > 600) {
      warningShown.current = false;
    }
    if (totalSeconds > 120) {
      criticalShown.current = false;
    }
  }, [expiresIn]);

  useEffect(() => {
    // Calcula o tempo total em segundos
    const totalSeconds = expiresIn.hours * 3600 + expiresIn.minutes * 60 + expiresIn.seconds;
    let remainingSeconds = totalSeconds;

    const timer = setInterval(() => {
      remainingSeconds -= 1;

      if (remainingSeconds <= 0) {
        clearInterval(timer);
        // Sessão expirou - limpa token e redireciona
        clearToken();
        window.location.href = '/login';
        return;
      }

      // Verifica se restam 10 minutos (600 segundos) e mostra alerta
      if (remainingSeconds <= 600 && !warningShown.current) {
        warningShown.current = true;
        openSnackbar({
          open: true,
          message: '⚠️ Atenção! Sua sessão expira em 10 minutos. Salve suas alterações para não perdê-las.',
          variant: 'alert',
          alert: { 
            color: 'warning',
            variant: 'filled'
          },
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
      }

      // Verifica se restam 2 minutos (120 segundos) e mostra alerta crítico
      if (remainingSeconds <= 120 && !criticalShown.current) {
        criticalShown.current = true;
        openSnackbar({
          open: true,
          message: '🚨 URGENTE! Sua sessão expira em 2 minutos. Salve suas alterações imediatamente!',
          variant: 'alert',
          alert: { 
            color: 'error',
            variant: 'filled'
          },
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
      }

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresIn]);

  // Calcula a porcentagem de tempo restante
  const totalSeconds = expiresIn.hours * 3600 + expiresIn.minutes * 60 + expiresIn.seconds;
  const currentSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const progressPercentage = Math.max(0, Math.min(100, (currentSeconds / totalSeconds) * 100));

  // Determina a cor baseada no tempo restante
  const getColor = () => {
    const totalSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
    
    // Se restam menos de 2 minutos, vermelho crítico
    if (totalSeconds <= 120) return theme.palette.error.main;
    // Se restam menos de 10 minutos, laranja de aviso
    if (totalSeconds <= 600) return theme.palette.warning.main;
    // Caso contrário, verde
    return theme.palette.success.main;
  };

  // Formata o tempo para exibição
  const formatTime = () => {
    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m`;
    }
    if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    }
    return `${timeLeft.seconds}s`;
  };

  // Verifica se está no estado crítico (menos de 2 minutos)
  const isCritical = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds <= 120;

  return (
    <Box sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ClockCircleOutlined 
          style={{ 
            color: getColor(), 
            fontSize: 16,
            animation: isCritical ? 'blink 1s infinite' : 'none'
          }} 
        />
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 500,
            color: isCritical ? getColor() : 'text.secondary',
            animation: isCritical ? 'blink 1s infinite' : 'none'
          }}
        >
          Sessão expira em: {formatTime()}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progressPercentage}
        sx={{
          height: 3,
          borderRadius: 1.5,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: getColor(),
            borderRadius: 1.5,
            animation: isCritical ? 'pulse 1s infinite' : 'none'
          },
          '@keyframes blink': {
            '0%, 50%': { opacity: 1 },
            '51%, 100%': { opacity: 0.5 }
          },
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.7 },
            '100%': { opacity: 1 }
          }
        }}
      />
    </Box>
  );
}
