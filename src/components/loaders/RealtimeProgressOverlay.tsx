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

function normalizeTs(ts?: string): number {
  if (!ts) return Date.now();
  const n = Date.parse(ts);
  return Number.isFinite(n) ? n : Date.now();
}

export default function RealtimeProgressOverlay({ open, knownRunId, onDetectRunId, onRequestClose }: Props) {
  const [items, setItems] = React.useState<TimelineItem[]>([]);
  const [activeRunId, setActiveRunId] = React.useState<string | null | undefined>(knownRunId);
  const startRef = React.useRef<number>(0);
  const [showJson, setShowJson] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  // reset a cada "open"
  React.useEffect(() => {
    if (open) {
      startRef.current = Date.now();
      setItems([]);
      setActiveRunId(knownRunId);
    }
  }, [open, knownRunId]);

  // subscreve eventos do WS
  React.useEffect(() => {
    if (!open) return;
    const socket = getRealtimeSocket();

    const onEvt = (evt: CaseProgressEvent) => {
      // Proteção: só eventos posteriores à abertura do overlay
      const tsNum = normalizeTs(evt.ts);
      if (tsNum + 10 < startRef.current) return;

      // Seta runId, se ainda não temos e o evento trouxe algum
      if (activeRunId === undefined || activeRunId === null) {
        if (typeof evt.runId !== 'undefined') {
          setActiveRunId(evt.runId ?? null);
          onDetectRunId?.(evt.runId ?? null);
        }
      }

      // Filtragem: se já temos runId definido, descarta de outros runs
      if (activeRunId && evt.runId && evt.runId !== activeRunId) return;

      const id = `${tsNum}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((prev) => [
        ...prev,
        { id, ts: tsNum, runId: evt.runId ?? null, kind: evt.kind, code: evt.code, message: evt.message, meta: evt.meta }
      ]);
    };

    socket.on('case:progress', onEvt);

    return () => {
      socket.off('case:progress', onEvt);
    };
  }, [open, activeRunId, onDetectRunId]);

  // progresso estimado com base na última phase
  const progress = React.useMemo(() => {
    // pega a última phase válida
    const phases = items.filter((i) => i.kind === 'phase' && i.code).map((i) => i.code!) as string[];
    if (!phases.length) return null; // null indica que não há progresso conhecido ainda
    const last = phases[phases.length - 1];
    return PROGRESS_BY_PHASE[last] ?? null;
  }, [items]);
  
  // determina se deve usar modo indeterminado (quando não há progresso conhecido)
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
        {/* Barra de progresso fina no topo (sem moldura) */}
        <Box sx={{ position: 'sticky', top: 0, left: 0, right: 0, mb: 1 }}>
          <LinearProgress
            variant={hasKnownProgress ? "determinate" : "indeterminate"}
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
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Aguardando eventos…
            </Typography>
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


