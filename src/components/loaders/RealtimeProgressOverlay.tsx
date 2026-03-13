import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import CodeOutlined from '@ant-design/icons/CodeOutlined';
import { getRealtimeSocket, type CaseProgressEvent, type TimelineItem } from 'api/realtime';

type Props = {
  open: boolean;
  /** opcional: se você já tiver o runId (ex.: retornado na resposta) */
  knownRunId?: string | null;
  /** chamado quando detectamos o primeiro runId vindo do WS */
  onDetectRunId?: (runId: string | null) => void;
  /** fechar manual (ex.: ao concluir) */
  onRequestClose?: () => void;
  /** quando não há eventos do servidor, mostra este texto em vez de "Aguardando eventos…" (ex.: "Gerando relatório...") */
  fallbackLabel?: string;
  /** chamado assim que o overlay se inscreveu no WebSocket (use para só então disparar o POST e não perder Fase 1/2) */
  onSubscribed?: () => void;
};

const PHASE_ORDER = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const PROGRESS_BY_PHASE: Record<string, number> = {
  '1': 10,
  '2': 20,
  '3': 30,
  '4': 40,
  '5': 50,
  '6': 60,
  '7': 70,
  '8': 80,
  '9': 95
};

function normalizeTs(ts?: string | number): number {
  if (ts == null) return Date.now();
  let ms: number;
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    ms = ts;
    // Backend pode enviar Unix em segundos; Date.now() é em ms. Valores < 1e12 são segundos.
    if (ms > 0 && ms < 1e12) ms *= 1000;
  } else {
    const n = Date.parse(String(ts));
    ms = Number.isFinite(n) ? n : Date.now();
  }
  return ms;
}

export default function RealtimeProgressOverlay({ open, knownRunId, onDetectRunId, onRequestClose, fallbackLabel, onSubscribed }: Props) {
  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [activeRunId, setActiveRunId] = React.useState<string | null | undefined>(knownRunId);
  const startRef = React.useRef<number>(0);
  /** Ref do runId aceito para filtro, evita re-subscription ao detectar runId e perder eventos */
  const activeRunIdRef = React.useRef<string | null | undefined>(undefined);
  const prevOpenRef = React.useRef<boolean>(false);
  const onSubscribedRef = React.useRef(onSubscribed);
  onSubscribedRef.current = onSubscribed;
  const onDetectRunIdRef = React.useRef(onDetectRunId);
  onDetectRunIdRef.current = onDetectRunId;
  const [showJson, setShowJson] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // reset só quando "open" passa a true (não quando knownRunId muda, senão apaga os logs ao chegar runId da API)
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      startRef.current = Date.now();
      activeRunIdRef.current = knownRunId;
      setItems([]);
      setActiveRunId(knownRunId);
    }
    prevOpenRef.current = open;
  }, [open]);

  // atualiza runId aceito quando o pai passa knownRunId (ex.: da resposta da API), sem limpar a lista
  React.useEffect(() => {
    if (open && knownRunId !== undefined) {
      activeRunIdRef.current = knownRunId;
      setActiveRunId(knownRunId);
    }
  }, [open, knownRunId]);

  // useLayoutEffect: inscreve no mesmo tick do commit (igual criar caso), para não perder eventos iniciais
  React.useLayoutEffect(() => {
    if (!open) return;
    const socket = getRealtimeSocket();

    const onEvt = (evt: CaseProgressEvent, eventName: string) => {
      const tsNum = normalizeTs(evt.ts);
      if (tsNum + 300000 < startRef.current) {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[RealtimeProgressOverlay] evento ignorado (antigo)', { ts: evt?.ts, tsNum, startRef: startRef.current });
        }
        return;
      }

      const currentRunId = activeRunIdRef.current;
      if (currentRunId === undefined || currentRunId === null) {
        if (typeof evt.runId !== 'undefined' && evt.runId != null) {
          activeRunIdRef.current = evt.runId ?? null;
          setActiveRunId(evt.runId ?? null);
          onDetectRunIdRef.current?.(evt.runId ?? null);
        }
      }

      if (activeRunIdRef.current && evt.runId && evt.runId !== activeRunIdRef.current) {
        if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[RealtimeProgressOverlay] evento ignorado (runId diferente)', {
            active: activeRunIdRef.current,
            evtRunId: evt.runId
          });
        }
        return;
      }

      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[RealtimeProgressOverlay]', eventName, evt?.kind, evt?.message?.slice?.(0, 50));
      }

      const id = `${tsNum}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [
        ...prev,
        { id, ts: tsNum, runId: evt.runId ?? null, kind: evt.kind, code: evt.code, message: evt.message, meta: evt.meta }
      ]);
    };

    const handlerCase = (data: CaseProgressEvent) => onEvt(data, 'case:progress');
    const handlerReport = (data: CaseProgressEvent) => onEvt(data, 'report:progress');
    socket.on('case:progress', handlerCase);
    socket.on('report:progress', handlerReport);
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[RealtimeProgressOverlay] inscrito em case:progress e report:progress');
    }
    onSubscribedRef.current?.();

    return () => {
      socket.off('case:progress', handlerCase);
      socket.off('report:progress', handlerReport);
    };
  }, [open]);

  // progresso só por phase (backend); sem phase = null → barra indeterminada (fica “correndo” igual criar caso)
  const progress = React.useMemo(() => {
    const phases = items.filter((i) => i.kind === 'phase' && i.code).map((i) => i.code!) as string[];
    if (!phases.length) return null;
    const last = phases[phases.length - 1];
    return PROGRESS_BY_PHASE[last] ?? null;
  }, [items]);

  const hasKnownProgress = progress !== null;

  // agrupa visualmente: novas "phase" viram divisores
  const visual = React.useMemo(() => {
    const rows: Array<{ type: 'phase' | 'msg'; item: TimelineItem }> = [];
    for (const it of items) {
      if (it.kind === 'phase') {
        rows.push({ type: 'phase', item: it });
      } else {
        rows.push({ type: 'msg', item: it });
      }
    }
    return rows;
  }, [items]);

  // auto-scroll para o final conforme chegam eventos
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visual]);

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.modal + 20,
        // Fundo mais escuro para destacar ainda mais os logs
        bgcolor: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(1px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Conteúdo “glassless”: sem caixa, só textos e barra de progresso */}
      <Box
        sx={{
          position: 'relative',
          width: 'min(92vw, 720px)',
          maxHeight: '80vh',
          pointerEvents: 'auto'
        }}
      >
        {/* Barra de progresso — igual ao criar caso */}
        <Box sx={{ position: 'sticky', top: 0, left: 0, right: 0, mb: 1 }}>
          <LinearProgress
            variant={hasKnownProgress ? 'determinate' : 'indeterminate'}
            value={hasKnownProgress ? Math.max(3, Math.min(100, progress!)) : undefined}
            sx={{
              height: 3,
              borderRadius: 1,
              bgcolor: 'rgba(255,255,255,0.12)',
              '& .MuiLinearProgress-bar': { bgcolor: 'rgba(255,255,255,0.85)' }
            }}
          />
        </Box>

        {/* Botões flutuantes (canto superior direito) */}
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 6, right: 6 }}>
          <IconButton size="small" onClick={() => setShowJson((v) => !v)} title="Alternar JSON" sx={{ color: 'white' }}>
            <CodeOutlined />
          </IconButton>
          {onRequestClose && (
            <IconButton size="small" onClick={onRequestClose} sx={{ color: 'white' }}>
              <CloseOutlined />
            </IconButton>
          )}
        </Stack>

        {/* Lista/Timeline — container transparente com scroll */}
        <Box
          ref={listRef}
          sx={{
            height: '60vh',
            overflow: 'auto',
            px: 1,
            bgcolor: 'transparent'
          }}
        >
          {!visual.length ? (
            <Stack spacing={0.5}>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
                {fallbackLabel ?? 'Aguardando eventos…'}
              </Typography>
              {fallbackLabel && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                  Se o servidor enviar logs em tempo real, eles aparecerão aqui.
                </Typography>
              )}
            </Stack>
          ) : (
            <Stack spacing={0.75}>
              {visual.map(({ type, item }) => {
                if (type === 'phase') {
                  const order = item.code ? PHASE_ORDER.indexOf(item.code) : -1;
                  return (
                    <Box key={item.id}>
                      <Typography
                        variant="overline"
                        sx={{
                          display: 'block',
                          letterSpacing: 1,
                          color: order >= 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)'
                        }}
                      >
                        {item.code ? `FASE ${item.code}` : 'FASE'}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                        {item.message}
                      </Typography>
                      {item.meta ? (
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
                          {typeof item.meta === 'string' ? item.meta : JSON.stringify(item.meta)}
                        </Typography>
                      ) : null}
                    </Box>
                  );
                }
                // mensagens comuns (ai/log)
                return (
                  <Stack key={item.id} direction="row" spacing={1} alignItems="baseline">
                    <Typography
                      variant="caption"
                      sx={{
                        width: 64,
                        color: 'rgba(255,255,255,0.45)',
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {new Date(item.ts).toLocaleTimeString()}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'rgba(255,255,255,0.85)',
                        fontStyle: item.kind === 'ai' ? 'italic' : 'normal'
                      }}
                    >
                      {item.message}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Box>

        {/* JSON bruto opcional — flutuante, translúcido */}
        {showJson && (
          <Box
            sx={{
              mt: 1,
              p: 1,
              maxHeight: '18vh',
              overflow: 'auto',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              color: 'rgba(255,255,255,0.9)',
              bgcolor: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 1
            }}
          >
            {JSON.stringify(items, null, 2)}
          </Box>
        )}
      </Box>
    </Backdrop>
  );
}


