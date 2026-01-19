import { useState, useEffect, useRef } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ClockCircleOutlined from '@ant-design/icons/ClockCircleOutlined';
import { clearToken } from 'utils/axios';
import { openSnackbar } from 'api/snackbar';
import { getRealtimeSocket } from 'api/realtime';

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
    // Conecta ao WebSocket para receber atualizações de tempo do servidor
    const socket = getRealtimeSocket();
    
    // Função para atualizar o tempo e verificar notificações
    const updateTimeAndCheckNotifications = (time: { hours: number; minutes: number; seconds: number }) => {
      setTimeLeft(time);
      
      const totalSeconds = time.hours * 3600 + time.minutes * 60 + time.seconds;
      
      // Se o tempo expirou
      if (totalSeconds <= 0) {
        clearToken();
        window.location.href = '/login';
        return;
      }
      
      // Verifica se restam 10 minutos (600 segundos) e mostra alerta
      if (totalSeconds <= 600 && !warningShown.current) {
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
        } as any);
      }
      
      // Verifica se restam 2 minutos (120 segundos) e mostra alerta crítico
      if (totalSeconds <= 120 && !criticalShown.current) {
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
        } as any);
      }
    };
    
    // Escuta eventos de tempo da sessão do servidor
    const handleSessionTime = (data: { hours: number; minutes: number; seconds: number } | { expiresAt: number }) => {
      let time: { hours: number; minutes: number; seconds: number };
      
      // Se o servidor envia timestamp de expiração
      if ('expiresAt' in data && typeof data.expiresAt === 'number') {
        const now = Date.now();
        const remainingMs = Math.max(0, data.expiresAt - now);
        const totalSeconds = Math.floor(remainingMs / 1000);
        time = {
          hours: Math.floor(totalSeconds / 3600),
          minutes: Math.floor((totalSeconds % 3600) / 60),
          seconds: totalSeconds % 60
        };
      } else {
        // Se o servidor envia diretamente { hours, minutes, seconds }
        time = data as { hours: number; minutes: number; seconds: number };
      }
      
      updateTimeAndCheckNotifications(time);
    };
    
    // Registra o handler para eventos de tempo da sessão
    socket.on('session:time', handleSessionTime);
    
    return () => {
      socket.off('session:time', handleSessionTime);
    };
  }, []);

  // Calcula a porcentagem de tempo restante (baseado em 2 horas = 7200 segundos)
  const SESSION_DURATION_SECONDS = 2 * 3600; // 2 horas em segundos
  const currentSeconds = timeLeft.hours * 3600 + timeLeft.minutes * 60 + timeLeft.seconds;
  const progressPercentage = Math.max(0, Math.min(100, (currentSeconds / SESSION_DURATION_SECONDS) * 100));

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
