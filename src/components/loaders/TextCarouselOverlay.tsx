import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

type Props = {
  open: boolean;
  texts?: string[];
  /** duração da transição (ms) */
  stepMs?: number;
  /** altura de cada linha (px) */
  itemHeight?: number;
  /** título/subtítulo */
  title?: string;
  subtitle?: string;
  /** easing da transição */
  easing?: string;
  /** pausa/retomar (debug) */
  paused?: boolean;
  /** manter parado em cada item (ms) */
  holdMs?: number;
  /**
   * índice inicial (0-based) ou busca por string/RegExp em `texts`.
   * default: tenta "lendo .docx".
   */
  startAt?: number | string | RegExp;
};

const defaultTexts = [
  'Analisando arquivo…',
  'Detectando contencioso/consultivo…',
  'Normalizando formatação…',
  'Detectando estilos/tamanhos…',
  'Identificando regras ABNT…',
  'Validando estrutura…',
  'Citações/jurisprudência com autos, relator, data e link…',
  'Assinaturas centralizadas…',
  'Persistindo resultado…',
  'Salvando…'
];

/**
 * Carrossel vertical com EXACTAMENTE 3 janelas visíveis (topo, meio, fundo).
 * - O item destacado fica no FUNDO.
 * - A cada passo: fundo→meio, meio→topo, entra um novo no fundo.
 * - Primeiros passos revelam gradualmente: 1) só fundo; 2) meio+fundo; 3) topo+meio+fundo.
 *
 * Observação: usamos um item "buffer" fora da área (abaixo) só para a entrada suave,
 * mantendo, visualmente, apenas 3 contents.
 */
export default function TextCarouselOverlay({
  open,
  texts = defaultTexts,
  stepMs = 1200,
  itemHeight = 32,
  // removidos: título/subtítulo/loader — overlay minimalista
  title,
  easing = 'cubic-bezier(0.25, 0.9, 0.3, 1.0)',
  paused = false,
  holdMs = 1000,
  startAt
}: Props) {
  const base = React.useMemo(() => (texts?.length ? texts : defaultTexts), [texts]);
  const len = base.length;

  // --------- resolve start index ----------
  const startIndex = React.useMemo(() => {
    const clamp = (n: number) => Math.max(0, Math.min(len - 1, n | 0));
    if (!len) return 0;
    if (typeof startAt === 'number') return clamp(startAt);
    if (typeof startAt === 'string' && startAt.trim()) {
      const i = base.findIndex((t) => t.toLowerCase().includes(startAt.toLowerCase()));
      if (i >= 0) return i;
    }
    if (startAt instanceof RegExp) {
      const i = base.findIndex((t) => startAt.test(t));
      if (i >= 0) return i;
    }
    const needles = [/lendo\s*\.?docx/i, /lendo/i];
    for (const rx of needles) {
      const i = base.findIndex((t) => rx.test(t));
      if (i >= 0) return i;
    }
    return 0;
  }, [base, len, startAt]);

  // Índice do item destacado (no FUNDO) no estado "parado".
  const [idx, setIdx] = React.useState(startIndex);
  React.useEffect(() => {
    if (open) setIdx(startIndex);
  }, [open, startIndex]);

  // Fases: 'hold' parado; 'move' transicionando a faixa inteira (-itemHeight).
  const [phase, setPhase] = React.useState<'hold' | 'move'>('hold');
  React.useEffect(() => {
    if (open) setPhase('hold');
  }, [open]);

  // Nível de revelação: 1=fundo; 2=meio+fundo; 3=topo+meio+fundo.
  const [reveal, setReveal] = React.useState(1);
  React.useEffect(() => {
    if (open) setReveal(1);
  }, [open]);

  // Timer de ciclo (hold→move→hold)
  React.useEffect(() => {
    if (!open || paused || !len) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const effStep = Math.max(300, reduce ? stepMs * 2 : stepMs);
    const effHold = Math.max(0, reduce ? holdMs * 2 : holdMs);
    let t: number | undefined;

    if (phase === 'hold') {
      t = window.setTimeout(() => {
        // inicia a transição
        setPhase('move');
      }, effHold);
    } else {
      // ao fim da transição, avança índice, aumenta revelação e volta para hold
      t = window.setTimeout(() => {
        setIdx((v) => (v + 1) % len);
        setReveal((r) => Math.min(3, r + 1));
        setPhase('hold');
      }, effStep);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [open, paused, phase, len, stepMs, holdMs]);

  // --------- Mapeia textos visuais para as 3 janelas + buffer ----------
  // Em "hold": posições fixas: [top, mid, bottom, bufferBelow]
  // Em "move": a faixa sobe -itemHeight (top sai, mid→top, bottom→mid, buffer→bottom)
  const prev1 = (idx - 1 + len) % len;   // meio
  const prev2 = (idx - 2 + len) % len;   // topo
  const next1 = (idx + 1) % len;         // buffer (entra)

  // Itens na faixa (ordem vertical): 0=top, 1=mid, 2=bottom, 3=bufferBelow
  const visualTexts = React.useMemo(() => {
    return [base[prev2], base[prev1], base[idx], base[next1]];
  }, [base, prev1, prev2, idx, next1]);

  // deslocamento da faixa
  const trackY = phase === 'move' ? -itemHeight : 0;
  const trans = phase === 'move'
    ? `transform ${Math.max(150, Math.min(1600, stepMs))}ms ${easing}`
    : 'none';

  // Durante "move", deixamos "reveal efetivo" +1, para já mostrar o novo slot
  const revealLive = Math.min(3, reveal + (phase === 'move' ? 1 : 0));

  // estilos por posição virtual (após aplicar o deslocamento -1 quando em 'move')
  const styleForPos = (basePos: number): React.CSSProperties => {
    // basePos: 0..3 (top, mid, bottom, buffer)
    const virtualPos = basePos + (phase === 'move' ? -1 : 0); // -1..2
    // Fora da janela:
    if (virtualPos < 0 || virtualPos > 2) {
      return {
        opacity: 0,
        transform: 'scale(1)',
        transition: phase === 'move' ? `opacity ${stepMs}ms ${easing}, transform ${stepMs}ms ${easing}` : 'none'
      };
    }
    // Gate de revelação progressiva:
    const showTop = revealLive >= 3;
    const showMid = revealLive >= 2;
    const showBottom = revealLive >= 1;

    let opacity = 0;
    let scale = 1;
    let weight = 400;
    let variant: 'body1' | 'body2' = 'body2';

    if (virtualPos === 0) {
      // TOPO
      opacity = showTop ? 0.45 : 0;
      scale = showTop ? 0.96 : 0.96;
      weight = 500;
      variant = 'body2';
    } else if (virtualPos === 1) {
      // MEIO
      opacity = showMid ? 0.75 : 0;
      scale = showMid ? 1.02 : 1.02;
      weight = 500;
      variant = 'body2';
    } else {
      // FUNDO (DESTAQUE)
      opacity = showBottom ? 1 : 0;
      scale = 1.08;
      weight = 700;
      variant = 'body1';
    }
    return {
      opacity,
      transform: `scale(${scale})`,
      transition: phase === 'move'
        ? `opacity ${stepMs}ms ${easing}, transform ${stepMs}ms ${easing}`
        : 'none',
      // guardamos o peso/variant no próprio item (passamos via sx/props)
      // mas retornamos aqui para unificar interface
      // @ts-ignore – vamos ler esses campos adiante
      __variant: variant,
      // @ts-ignore
      __weight: weight
    } as React.CSSProperties;
  };

  // Helper para ler variant/weight "custom" da style e aplicar no Typography
  const getVariant = (s: React.CSSProperties) =>
    (s as any).__variant as ('body1' | 'body2') | undefined;
  const getWeight = (s: React.CSSProperties) =>
    (s as any).__weight as number | undefined;

  // Altura total: três janelas fixas
  const viewportH = itemHeight * 3;

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.modal + 10,
        // fundo mais escuro, sem "caixa"
        bgcolor: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(1px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* VIEWPORT DE 3 CONTENTS — sem moldura/caixa, apenas texto */}
      <Box
        sx={{
          position: 'relative',
          height: viewportH,
          width: 'min(92vw, 560px)',
          overflow: 'hidden',
          // sem borda/fundo: "invisível"
          border: 'none',
          bgcolor: 'transparent',
          // centralizar texto horizontalmente
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        {/* Faixa com 4 itens (top, mid, bottom, buffer) */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            willChange: 'transform',
            transform: `translateY(${trackY}px)`,
            transition: trans
          }}
        >
            {[0, 1, 2, 3].map((pos) => {
              const text = visualTexts[pos];
              const style = styleForPos(pos);
              const variant = getVariant(style) ?? 'body2';
              const weight = getWeight(style) ?? 400;
              return (
                <Box
                  key={`${pos}-${text}`}
                  sx={{
                    height: itemHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 2,
                    ...style
                  }}
                >
                  <Typography
                    variant={variant}
                    sx={{
                      fontWeight: weight,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      textAlign: 'center'
                    }}
                  >
                    {text}
                  </Typography>
                </Box>
              );
            })}
        </Box>
      </Box>
    </Backdrop>
  );
}