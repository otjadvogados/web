import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

type Props = {
  open: boolean;
  /**
   * Lista de mensagens que rodam no carrossel.
   * Se não for informada, usa uma lista padrão voltada ao fluxo do .docx → IA.
   */
  texts?: string[];
  /**
   * Duração (ms) de cada passo (avanço de um item).
   * Default: 900ms.
   */
  stepMs?: number;
  /**
   * Altura (px) do "visor" do carrossel.
   * Default: 140.
   */
  viewportHeight?: number;
  /**
   * Altura (px) de cada item (linha) do carrossel.
   * Default: 32.
   */
  itemHeight?: number;
  /**
   * Título exibido acima do carrossel.
   */
  title?: string;
  /**
   * Subtítulo exibido abaixo do título.
   */
  subtitle?: string;
  /**
   * Easing CSS para o passo. Default: cubic-bezier(0.25, 0.9, 0.3, 1.0) (acelera e desacelera).
   */
  easing?: string;
  /**
   * Pausar a rotação (útil para debug).
   */
  paused?: boolean;
  /**
   * Revelar gradualmente as linhas de cima na abertura (1 → total visível).
   */
  introReveal?: boolean;
  /**
   * Tempo parado em cada item antes do próximo movimento (ms).
   */
  holdMs?: number;
  /**
   * Posição inicial do destaque no SLOT INFERIOR.
   * Pode ser um índice (0-based) relativo a `texts`/`defaultTexts`,
   * uma string (match por includes case-insensitive) ou uma RegExp.
   * Padrão: tenta encontrar "lendo .docx".
   */
  startAt?: number | string | RegExp;
};

const defaultTexts = [
  'Lendo .docx…',
  'Enfileirando upload…',
  'Enviando arquivo…',
  'Extraindo texto do documento…',
  'Preparando prompt…',
  'Consultando IA…',
  'Gerando checklist em JSON…',
  'Validando estrutura…',
  'Persistindo resultado…',
];

/**
 * Overlay com roleta vertical de textos (estilo "slot machine").
 * Destaca o item INFERIOR; animação por passos com easing (não linear).
 */
export default function TextCarouselOverlay({
  open,
  texts = defaultTexts,
  stepMs = 1200,
  viewportHeight = 140,
  itemHeight = 32,
  title = 'Analisando o documento…',
  subtitle = 'Isso pode levar alguns instantes.',
  easing = 'cubic-bezier(0.25, 0.9, 0.3, 1.0)',
  paused = false,
  introReveal = true,
  holdMs = 1000,
  startAt
}: Props) {
  // Base mínima
  const base = React.useMemo(() => (texts.length ? texts : defaultTexts), [texts]);
  const N = Math.max(3, base.length);

  // Triplicamos para permitir "wrap" suave e manter o ativo sempre no meio
  const items = React.useMemo(() => [...base, ...base, ...base], [base]);
  const centerStart = base.length; // ainda usamos o bloco central para wrap

  // ---------- resolve índice inicial no bloco BASE ----------
  const startBaseIndex = React.useMemo(() => {
    const clamp = (n: number) => Math.max(0, Math.min(base.length - 1, n | 0));
    if (typeof startAt === 'number') return clamp(startAt);
    if (typeof startAt === 'string' && startAt.trim()) {
      const needle = startAt.toLowerCase();
      const i = base.findIndex((t) => t.toLowerCase().includes(needle));
      if (i >= 0) return i;
    }
    if (startAt instanceof RegExp) {
      const i = base.findIndex((t) => startAt.test(t));
      if (i >= 0) return i;
    }
    // Padrão: tenta "lendo .docx" primeiro, senão cai no índice 0
    const defaultNeedles = [/lendo\s*\.?docx/i, /lendo/i];
    for (const rx of defaultNeedles) {
      const i = base.findIndex((t) => rx.test(t));
      if (i >= 0) return i;
    }
    return 0;
  }, [base, startAt]);

  // índice ativo absoluto dentro do array triplicado (âncora no bloco central)
  const initialActive = centerStart + startBaseIndex;

  // Índice ativo dentro do array triplicado
  const [active, setActive] = React.useState(initialActive);
  // Ao abrir (ou ao mudar a base/startAt), posiciona no item desejado
  React.useEffect(() => {
    if (open) setActive(initialActive);
  }, [open, initialActive]);

  // fase da animação e nível de "reveal" (qtd. de linhas acima que já podem aparecer)
  const [phase, setPhase] = React.useState<'hold' | 'move'>('hold');
  React.useEffect(() => { if (open) setPhase('hold'); }, [open, initialActive]);
  const visibleCount = Math.max(3, Math.floor(viewportHeight / itemHeight) | 0);
  const [introLevel, setIntroLevel] = React.useState(1);
  React.useEffect(() => { if (open) setIntroLevel(1); }, [open, viewportHeight, itemHeight]);

  const half = Math.floor(visibleCount / 2); // ainda útil para wrap

  // Offset para manter o item ativo NO FUNDO (slot inferior)
  const offsetY = React.useMemo(() => {
    const bottomY = viewportHeight - itemHeight / 2;
    const activeY = active * itemHeight + itemHeight / 2;
    return bottomY - activeY; // valor negativo sobe a trilha
  }, [active, viewportHeight, itemHeight]);

  // Máquina de estados: HOLD (espera) → MOVE (transiciona) → HOLD...
  React.useEffect(() => {
    if (!open || paused) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const effStep = Math.max(400, reduce ? stepMs * 2 : stepMs);
    const effHold = Math.max(0, reduce ? holdMs * 2 : holdMs);

    let t: number | undefined;

    const schedule = () => {
      if (phase === 'hold') {
        // aguarda parado, então inicia movimento
        t = window.setTimeout(() => {
          setPhase('move');
          // avançar o ativo (o transform mudará e a transição ocorrerá)
          setActive((prev) => {
            const nearEnd = centerStart + base.length + half + 2;
            if (prev >= nearEnd) return prev - base.length;
            return prev + 1;
          });
        }, effHold);
      } else {
        // após a duração da transição, volta para hold
        t = window.setTimeout(() => {
          setPhase('hold');
          // durante a introdução, revele mais uma linha acima até encher o visor
          if (introReveal) {
            setIntroLevel((lvl) => {
              const maxLvl = visibleCount; // ex.: 4
              return Math.min(maxLvl, lvl + 1);
            });
          }
        }, effStep);
      }
    };

    schedule();
    return () => { if (t) clearTimeout(t); };
  }, [open, paused, phase, stepMs, holdMs, base.length, centerStart, half, introReveal, visibleCount]);

  return (
    <Backdrop
      open={open}
      sx={{
        zIndex: (t) => t.zIndex.modal + 10,
        bgcolor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(1px)'
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: { xs: '88%', sm: 520 },
          maxWidth: '92%',
          borderRadius: 2,
          p: 3,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={22} />
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: -0.5 }}>
            {subtitle}
          </Typography>
        )}

        <Box
          sx={{
            position: 'relative',
            mt: 1,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50'),
            overflow: 'hidden',
            height: viewportHeight
          }}
        >
          {/* máscara de gradiente para fade top/bottom */}
          <Box
            sx={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              // Top bem mais forte; base quase limpa para mostrar o slot inferior
              background: `linear-gradient(to bottom,
                rgba(0,0,0,0.18),
                rgba(0,0,0,0.02) 28%,
                rgba(0,0,0,0.00) 80%,
                rgba(0,0,0,0.00))`,
              mixBlendMode: (t) => (t.palette.mode === 'dark' ? 'lighten' : 'multiply')
            }}
          />

          {/* trilha com transição por passo (não linear) */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              willChange: 'transform',
              transform: `translateY(${offsetY}px)`,
              transition:
                phase === 'move'
                  ? `transform ${Math.max(150, Math.min(1400, stepMs))}ms ${easing}`
                  : 'none'
            }}
          >
            {items.map((txt, idx) => {
              const isSlot = idx === active;           // item no slot inferior
              const dist = active - idx;               // negativo = está ACIMA; positivo = está ABAIXO
              const above = dist > 0;                  // já passou do slot (acima)
              const below = dist < 0;                  // ainda vai chegar (abaixo)

              // Gate de revelação inicial (só para os itens ACIMA do slot)
              // Ex.: introLevel = 1 → apenas o QUARTO visível;
              //      2 → TERCEIRO+QUARTO; 3 → SEGUNDO+TERCEIRO+QUARTO; 4 → PRIMEIRO+...
              const shouldHideByIntro =
                introReveal && above && Math.abs(dist) > (introLevel - 1);

              // Escala/opacidade: slot destacado; acima vai desvanecendo; abaixo quase invisível
              const step = Math.min(Math.abs(dist), 3);
              const scale = isSlot ? 1.08 : above && step === 1 ? 1.02 : 1.0;
              const opacity = shouldHideByIntro
                ? 0
                : isSlot
                ? 1
                : below
                ? 0.04                                   // quase invisível abaixo do slot
                : [0.88, 0.6, 0.38][step - 1] ?? 0.3;    // acima do slot
              const blur = shouldHideByIntro ? '0px' : below ? '1.5px' : step >= 3 ? '1px' : '0px';

              return (
              <Box
                key={`${idx}-${txt}`}
                sx={{
                  height: itemHeight,
                  display: 'flex',
                  alignItems: 'center',
                  px: 2,
                  transform: `scale(${scale})`,
                  opacity,
                  filter: `blur(${blur})`,
                  transition:
                    phase === 'move'
                      ? `transform ${stepMs}ms ${easing}, opacity ${stepMs}ms ${easing}, filter ${stepMs}ms ${easing}`
                      : 'none'
                }}
              >
                <Typography
                  variant={isSlot ? 'body1' : 'body2'}
                  sx={{
                    fontWeight: isSlot ? 700 : 400,
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                >
                  {txt}
                </Typography>
              </Box>
              );
            })}
          </Box>

          {/* guia do SLOT INFERIOR */}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: 8,
              right: 8,
              bottom: itemHeight / 2,
              transform: 'translateY(50%)',
              borderTop: '1px dashed',
              borderColor: 'divider',
              opacity: 0.35,
              pointerEvents: 'none'
            }}
          />
        </Box>
      </Paper>
    </Backdrop>
  );
}
