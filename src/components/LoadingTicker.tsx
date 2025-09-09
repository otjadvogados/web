// src/components/LoadingTicker.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';

type LoadingTickerProps = {
  running: boolean;
  /** Mensagens "fake" que vão subindo enquanto running=true */
  script?: string[];
  /** Tempo entre mensagens do script */
  intervalMs?: number;
  /** Quantas linhas ficam visíveis no viewport */
  maxVisible?: number;
  /** Altura de cada linha (precisa ser fixa p/ animação suave) */
  rowHeight?: number;
  /** Quando quiser alimentar manualmente (SSE/polling), passe msgs aqui */
  messagesFeed?: string[];
  /** Tamanho do componente: 'small' | 'medium' | 'large' | 'full' */
  size?: 'small' | 'medium' | 'large' | 'full';
  /** Largura máxima do componente */
  maxWidth?: string | number;
  /** Se deve mostrar o CircularProgress junto */
  showSpinner?: boolean;
  /** Tamanho do spinner */
  spinnerSize?: number;
  /** Duração mínima em ms que o ticker deve ficar ativo (mesmo que running vire false) */
  minDuration?: number;
};

type Item = { id: number; text: string };

const DEFAULT_SCRIPT = [
  'Ligando os motores de IA…',
  'Carregando template base…',
  'Lendo anexos do caso…',
  'Buscando jurisprudência relevante…',
  'Extraindo fatos principais…',
  'Montando rascunho…',
  'Verificando coerência…',
  'Quase lá…'
];

export default function LoadingTicker({
  running,
  script = DEFAULT_SCRIPT,
  intervalMs = 1200,
  maxVisible = 3,
  rowHeight = 24,
  messagesFeed,
  size = 'medium',
  maxWidth,
  showSpinner = false,
  spinnerSize = 18,
  minDuration = 0
}: LoadingTickerProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [internalRunning, setInternalRunning] = useState(false);
  const idRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const minDurationTimerRef = useRef<number | null>(null);

  const isManual = Array.isArray(messagesFeed) && messagesFeed.length > 0;

  // Controla a duração mínima
  useEffect(() => {
    if (running && !startTimeRef.current) {
      // Inicia o ticker
      startTimeRef.current = Date.now();
      setInternalRunning(true);
    } else if (!running && startTimeRef.current) {
      // Para o ticker, mas verifica se já passou o tempo mínimo
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = minDuration - elapsed;
      
      if (remaining > 0) {
        // Ainda não passou o tempo mínimo, aguarda
        minDurationTimerRef.current = window.setTimeout(() => {
          setInternalRunning(false);
          startTimeRef.current = null;
        }, remaining);
      } else {
        // Já passou o tempo mínimo, para imediatamente
        setInternalRunning(false);
        startTimeRef.current = null;
      }
    }

    return () => {
      if (minDurationTimerRef.current) {
        window.clearTimeout(minDurationTimerRef.current);
        minDurationTimerRef.current = null;
      }
    };
  }, [running, minDuration]);

  // Configurações baseadas no tamanho
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return { maxVisible: 2, rowHeight: 20, intervalMs: 1000, maxWidth: '200px' };
      case 'medium':
        return { maxVisible: 3, rowHeight: 24, intervalMs: 1200, maxWidth: '300px' };
      case 'large':
        return { maxVisible: 4, rowHeight: 28, intervalMs: 1500, maxWidth: '400px' };
      case 'full':
        return { maxVisible: 5, rowHeight: 32, intervalMs: 1800, maxWidth: '100%' };
      default:
        return { maxVisible: 3, rowHeight: 24, intervalMs: 1200, maxWidth: '300px' };
    }
  }, [size]);

  // Usa configurações do size ou props customizadas
  const finalMaxVisible = maxVisible || sizeConfig.maxVisible;
  const finalRowHeight = rowHeight || sizeConfig.rowHeight;
  const finalIntervalMs = intervalMs || sizeConfig.intervalMs;
  const finalMaxWidth = maxWidth || sizeConfig.maxWidth;

  // Quando for manual (SSE/poll), só refletimos o feed recebido.
  useEffect(() => {
    if (!isManual) return;
    const mapped = messagesFeed.map((text) => ({ id: ++idRef.current, text }));
    setItems(mapped.slice(-20)); // conserva só as últimas 20
  }, [isManual, messagesFeed]);

  // Modo "scriptado" (sem backend): gera as linhas no intervalo definido
  useEffect(() => {
    if (isManual) return; // não roda script se vier feed externo
    if (!internalRunning) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    // zera items ao iniciar
    setItems([{ id: ++idRef.current, text: script[0] }]);
    let i = 1;

    timerRef.current = window.setInterval(() => {
      setItems((prev) => {
        const nextText = script[i % script.length];
        i++;
        const next = [...prev, { id: ++idRef.current, text: nextText }];
        return next.slice(-20);
      });
    }, finalIntervalMs);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [internalRunning, script, finalIntervalMs, isManual]);

  // Calcula deslocamento vertical (scroll) para manter só as últimas N visíveis
  const translateY = useMemo(() => {
    const overflow = Math.max(0, items.length - finalMaxVisible);
    return overflow * finalRowHeight;
  }, [items.length, finalMaxVisible, finalRowHeight]);

  if (!internalRunning && !items.length) return null;

  const tickerContent = (
    <Box sx={{ overflow: 'hidden', height: finalMaxVisible * finalRowHeight, maxWidth: finalMaxWidth }}>
      <Stack
        sx={{
          transform: `translateY(-${translateY}px)`,
          transition: 'transform .45s ease-out'
        }}
      >
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Typography
              key={it.id}
              variant="body2"
              noWrap
              sx={{
                height: finalRowHeight,
                lineHeight: `${finalRowHeight}px`,
                color: isLast ? 'primary.main' : 'text.secondary',
                fontWeight: isLast ? 600 : 400,
                opacity: isLast ? 1 : 0.85
              }}
              title={it.text}
            >
              {it.text}
            </Typography>
          );
        })}
      </Stack>
    </Box>
  );

  if (showSpinner) {
    return (
      <Stack direction="row" spacing={2} alignItems="center">
        <CircularProgress size={spinnerSize} />
        {tickerContent}
      </Stack>
    );
  }

  return tickerContent;
}
