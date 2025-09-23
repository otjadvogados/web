import { useMemo } from 'react';
import { Box } from '@mui/material';
import type { WDoc, WBlock, WRun } from 'types/wdoc';
import type { AnchoredSuggestion, AnchoredOp, AnchoredFinding } from 'hooks/useAnchoredSuggestions';
import type { JSX } from 'react';

type Props = {
  value: WDoc | any; // pode vir no formato WDoc OU backend (docflow-like) OU embrulhado em { json }
  onChange: (next: WDoc | any) => void;
  anchors?: Map<number, AnchoredSuggestion[]>;
  onAcceptSuggestion?: (sug: AnchoredSuggestion) => void;
  onRejectSuggestion?: (sug: AnchoredSuggestion) => void;
  // Novas props para operações individuais
  opAnchors?: Map<number, AnchoredOp[]>;
  onAcceptOp?: (aop: AnchoredOp) => void;
  onRejectOp?: (aop: AnchoredOp) => void;
  // Props para findings de análise
  findingAnchors?: Map<number, AnchoredFinding[]>;
};

/* ==================================== util ==================================== */
const PT_TO_PX = 96 / 72;
const ptToPx = (pt?: number | null) => (typeof pt === 'number' ? pt * PT_TO_PX : 0);
const twipToPx = (twip?: number | null) =>
  (typeof twip === 'number' ? (twip / 20) * PT_TO_PX : 0);
const ptToMm = (pt?: number | null) =>
  (typeof pt === 'number' ? pt * 0.3527777778 : undefined);

/* ========================= Normalização backend -> WDoc-like ========================= */
type DocflowInline = { content?: string; text?: string; style?: any };
type DocflowItem = { runs?: DocflowInline[]; text?: string; content?: string };
type DocflowBlock = {
  type?: string | null;
  styleName?: string | null;
  style?: any;
  content?: string;
  inlines?: DocflowInline[] | string;
  items?: DocflowItem[];
  list?: any;
};

function normalizeRunsFromInlines(inl: DocflowInline[] | string | undefined): WRun[] | undefined {
  if (!inl) return undefined;
  if (typeof inl === 'string') return [{ text: inl }];
  return inl.map((r) => ({
    text: r?.content ?? r?.text ?? '',
    bold: !!r?.style?.bold,
    italic: !!r?.style?.italic,
    underline: !!r?.style?.underline,
    font: r?.style?.fontFamily,
    // fontSize vem em pt no backend -> px na tela
    size: typeof r?.style?.fontSize === 'number' ? ptToPx(r.style.fontSize) : undefined,
    color: r?.style?.color ? `#${r.style.color}` : undefined,
    highlight: r?.style?.highlight ? `#${r.style.highlight}` : undefined
  }));
}

function isAlreadyWDocBlock(b: any): boolean {
  return ['paragraph', 'heading', 'bulletList', 'numberedList', 'pageBreak', 'table'].includes(b?.type);
}

/**
 * asWBlocks(root)
 * Aceita:
 *  - root.content (WDoc)
 *  - root.blocks (backend)
 */
function asWBlocks(root: any): WBlock[] {
  const raw: any[] =
    Array.isArray(root?.content) ? root.content :
    Array.isArray(root?.blocks)  ? root.blocks  :
    [];

  return raw.map((b: DocflowBlock): any => {
    // Se já for WDoc, mantém
    if (isAlreadyWDocBlock(b)) return b as any;

    const text = typeof b?.content === 'string' ? b.content : '';
    const runsFromInlines = normalizeRunsFromInlines(b?.inlines);

    // Listas estruturadas vindas do backend
    if (Array.isArray(b.items) && b.items.length) {
      const items = b.items.map((it) => {
        const r = normalizeRunsFromInlines((it as any).runs) ?? [{ text: it?.text ?? it?.content ?? '' }];
        return { runs: r as WRun[] };
      });
      return {
        id: (b as any).id,                    // << preserva id para ancoragem
        type: b?.list?.type === 'numbered' ? 'numberedList' : 'bulletList',
        style: b?.styleName || 'Normal',
        items,
        _pStyle: { ...(b?.style || {}) }, // para paragraphCss
      };
    }

    // Heurística para bullets (texto começa com •/-/•)
    const looksLikeBullet = /^\s*(?:•|-|\u2022)\s+/.test(text);
    if (looksLikeBullet) {
      const items = text.split(/\n+/).map((line) => ({
        runs: [{ text: line.replace(/^\s*(?:•|-|\u2022)\s*/, '') }]
      }));
      return { type: 'bulletList', style: b?.styleName || 'Normal', items, _pStyle: { ...(b?.style || {}) } };
    }

    // Heurística para heading “curto centralizado e em caps/bold”
    const isHeading =
      (b?.style?.textAlign === 'center' || b?.styleName === 'Heading') &&
      (text?.trim()?.length ?? 0) <= 80 &&
      ((Array.isArray(b?.inlines) && b.inlines.some((r: any) => r?.style?.bold)) || /^[A-Z0-9 .–—-]+$/.test(text?.trim() ?? ''));

    if (isHeading) {
      return {
        id: (b as any).id,                    // << preserva id
        type: 'heading',
        style: 'Heading',
        text: text.trim(),
        content: text.trim(),                 // << ajuda os fallbacks do hook
        runs: runsFromInlines ?? [{ text: text.trim() }]  // << preserva runs com fontSize
      };
    }

    // Parágrafo comum
    const runs: WRun[] = (runsFromInlines ?? [{ text }]) as WRun[];
    return {
      id: (b as any).id,                      // << preserva id
      type: 'paragraph',
      style: b?.styleName || 'Normal',
      runs,
      text,                                   // << texto cru p/ hash/snippet
      content: text,                          // << idem
      _pStyle: { ...(b?.style || {}) } // guardamos estilo do backend para CSS
    };
  });
}

/* ==================================== componente ==================================== */
export default function A4Editor({
  value,
  onChange,
  anchors,
  onAcceptSuggestion,
  onRejectSuggestion,
  opAnchors,
  onAcceptOp,
  onRejectOp,
  findingAnchors
}: Props) {
  // Pode vir “embrulhado”: { json: { blocks, sections, ... } }
  const root: any = (value as any)?.json ?? value;

  // styles globais (WDoc). Se não vier nada, define Normal/Heading básicos.
  const styleMap = useMemo(() => {
    const base = (root?.styles as any) || {};
    return {
      Normal: {
        paragraph: {
          spacing: { line: 1.15, before: 0, after: 0 },
          textAlign: 'left',
          ...(base.Normal?.paragraph || {})
        },
        run: { ...(base.Normal?.run || {}) }
      },
      Heading: {
        paragraph: {
          spacing: { line: 1.15, before: 12, after: 6 },
          textAlign: 'center',
          ...(base.Heading?.paragraph || {})
        },
        run: { bold: true, ...(base.Heading?.run || {}) }
      },
      ...base
    };
  }, [root?.styles]);

  // Conteúdo normalizado
  const content: WBlock[] = asWBlocks(root);
  if (!Array.isArray(content)) return null;

  // ---- Section/page/margins (aceita root.sections ou root.meta.sections etc.) ----
  type SectionLike = {
    page?: { size?: { name?: string; widthPt?: number; heightPt?: number } | null; orientation?: 'portrait'|'landscape'|string };
    margins?: { top?: number; right?: number; bottom?: number; left?: number } | null;
  };
  const section: SectionLike | undefined =
    (root as any)?.sections?.[0] ??
    (root as any)?.meta?.sections?.[0] ??
    (root as any)?.meta?.pageSection?.[0];

  const sizeName = section?.page?.size?.name;
  const wMmFromPt  = ptToMm(section?.page?.size?.widthPt);
  const hMmFromPt  = ptToMm(section?.page?.size?.heightPt);
  const isA4 = String(sizeName || '').toUpperCase() === 'A4';

  let pageWidthMm  = isA4 ? 210 : (wMmFromPt  ?? 210);
  let pageHeightMm = isA4 ? 297 : (hMmFromPt ?? 297);
  if (String(section?.page?.orientation).toLowerCase() === 'landscape') {
    [pageWidthMm, pageHeightMm] = [pageHeightMm, pageWidthMm];
  }

  const mTopMm    = ptToMm(section?.margins?.top)    ?? 25;
  const mRightMm  = ptToMm(section?.margins?.right)  ?? 20;
  const mBottomMm = ptToMm(section?.margins?.bottom) ?? 20;
  const mLeftMm   = ptToMm(section?.margins?.left)   ?? 25;

  const pageStyle = useMemo(
    () => ({
      width: `${pageWidthMm}mm`,
      minHeight: `${pageHeightMm}mm`,
      background: '#fff',
      boxShadow: '0 0 6px rgba(0,0,0,.15)',
      margin: '0 auto',
      padding: `${mTopMm}mm ${mRightMm}mm ${mBottomMm}mm ${mLeftMm}mm`,
      color: '#111',
      lineHeight: 1.5
    }),
    [pageWidthMm, pageHeightMm, mTopMm, mRightMm, mBottomMm, mLeftMm]
  );

  /* ============================ paragraph CSS (mistura estilo global + do bloco) ============================ */
  const paragraphCss = (b: WBlock) => {
    const styleGlobal = (b.style && styleMap[b.style]) || styleMap['Normal'] || {};
    const pBackend = (b as any)._pStyle || {};     // style do backend por bloco
    const spacing = {
      line:   pBackend?.spacing?.line   ?? styleGlobal?.paragraph?.spacing?.line ?? 1.15,
      before: pBackend?.spacing?.before ?? styleGlobal?.paragraph?.spacing?.before ?? 0,
      after:  pBackend?.spacing?.after  ?? styleGlobal?.paragraph?.spacing?.after  ?? 0,
    };
    const lineHeight   = spacing.line ?? 1.15;
    const marginTop    = (spacing.before ?? 0) > 60 ? twipToPx(spacing.before) : ptToPx(spacing.before);
    const marginBottom = (spacing.after  ?? 0) > 60 ? twipToPx(spacing.after)  : ptToPx(spacing.after);

    const textAlign =
      pBackend?.textAlign ??
      styleGlobal?.paragraph?.textAlign ??
      (styleGlobal?.paragraph as any)?.alignment ??
      'start';

    // indent (em pt)
    const indent = pBackend?.indent || {};
    const leftPx = ptToPx(indent.left);
    const firstPx = ptToPx(indent.firstLine);
    const hangingPx = ptToPx(indent.hanging);

    const hangingStyles = hangingPx
      ? { textIndent: `-${hangingPx}px`, paddingLeft: `${hangingPx}px` }
      : {};

    return {
      lineHeight,
      margin: `${marginTop}px 0 ${marginBottom}px 0`,
      textAlign,
      whiteSpace: 'pre-wrap',
      outline: 0,
      caretColor: '#000',
      ...(leftPx ? { marginLeft: `${leftPx}px` } : {}),
      ...(firstPx ? { textIndent: `${firstPx}px` } : {}),
      ...hangingStyles
    } as React.CSSProperties;
  };

  /* =============================== edição =============================== */
  function setParagraphText(i: number, text: string) {
    const next: any = { ...(value as any) };
    const nextRoot: any = next?.json ?? next;

    if (Array.isArray(nextRoot.content)) {
      // WDoc
      const block = nextRoot.content[i];
      if (block?.type === 'heading') {
        block.text = text;
      } else if (block?.type === 'paragraph') {
        (block as any).runs = [{ text } as WRun];
      } else if (block?.type === 'bulletList' || block?.type === 'numberedList') {
        (block as any).items = text.split('\n').map((t) => ({ runs: [{ text: t }] }));
      } else if (block) {
        (block as any).text = text;
      }
    } else if (Array.isArray(nextRoot.blocks)) {
      // Backend
      const b = nextRoot.blocks[i];
      if (b) {
        b.content = text;
        b.inlines = [{ content: text, style: b?.inlines?.[0]?.style ?? {} }];
      }
    } else {
      // cria WDoc mínimo se não houver estrutura
      nextRoot.content = [...content];
      if (nextRoot.content[i]?.type === 'heading') nextRoot.content[i].text = text;
      else nextRoot.content[i] = { type: 'paragraph', style: 'Normal', runs: [{ text }] } as any;
    }

    onChange(next);
  }

  function blockToPlainText(b: WBlock): string {
    if (b.type === 'heading') return String((b as any).text || '');
    if (b.type === 'paragraph') {
      const runs = (b as any).runs as WRun[] | undefined;
      return runs?.map((r) => r.text).join('') || String((b as any).text || '');
    }
    if (b.type === 'bulletList' || b.type === 'numberedList') {
      const items = (b as any).items || [];
      return items.map((it: { runs: WRun[] }) => (it.runs || [{ text: '' }]).map(r => r.text).join('')).join('\n');
    }
    if (b.type === 'table') {
      const rows = (b as any).rows || [];
      return rows.map((row: { runs: WRun[] }[]) => row.map(c => (c?.runs || [{ text: '' }]).map(r => r.text).join('')).join('\t')).join('\n');
    }
    return '';
  }

  /* =============================== UI =============================== */
  const redWrap: React.CSSProperties = { background: 'rgba(244, 67, 54, 0.12)' };
  const greenWrap: React.CSSProperties = { background: 'rgba(76, 175, 80, 0.12)', marginTop: 6 };
  const blueWrap: React.CSSProperties = { background: 'rgba(33, 150, 243, 0.12)', marginTop: 6 };
  const btnAccept: React.CSSProperties = { border: 0, backgroundColor: '#2e7d32', padding: '4px 10px', borderRadius: 0, color: '#fff', cursor: 'pointer' };
  const btnReject: React.CSSProperties = { border: 0, padding: '4px 10px', backgroundColor: '#9e9e9e', borderRadius: 0, color: '#fff', cursor: 'pointer' };

  return (
    <Box sx={{
      background: 'transparent',
      py: 2,
      // protege o conteúdo de resets globais / MUI Typography / extensões
      '& *': {
        fontVariantLigatures: 'none',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      }
    }}>
      <style>{`
        @page {
          size: ${pageWidthMm}mm ${pageHeightMm}mm;
          margin: ${mTopMm}mm ${mRightMm}mm ${mBottomMm}mm ${mLeftMm}mm;
        }
      `}</style>

      <Box sx={pageStyle}>
        {content.map((b, i) => {
          const commonProps = {
            contentEditable: true,
            suppressContentEditableWarning: true,
            onInput: (e: any) => setParagraphText(i, (e.currentTarget.innerText ?? '').replace(/\r/g, ''))
          };

          const text = blockToPlainText(b);
          let baseEl: JSX.Element;

          if (b.type === 'heading') {
            // Para headings, usar o fontSize do primeiro run se disponível, senão usar 1.2rem
            const runs = (b as any).runs as WRun[] | undefined;
            const firstRunSize = runs?.[0]?.size;
            const headingFontSize = firstRunSize ? `${firstRunSize}px` : '1.2rem';
            
            baseEl = (
              <div {...commonProps} style={{ ...paragraphCss(b), fontWeight: 700, fontSize: headingFontSize }}>
                {text}
              </div>
            );
          } else if (b.type === 'paragraph') {
            const runs = (b as any).runs as WRun[] | undefined;
            baseEl = (
              <div {...commonProps} style={paragraphCss(b)}>
                {runs && runs.length
                  ? runs.map((r, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontWeight: r.bold ? 700 : undefined,
                          fontStyle: r.italic ? 'italic' : undefined,
                          textDecoration: r.underline ? 'underline' : undefined,
                          fontFamily: r.font ? `"${r.font}", "Century Gothic", "Inter", "Roboto", "Arial", sans-serif` : undefined,
                          fontSize: r.size ? `${r.size}px` : undefined,
                          color: (r as any).color,
                          backgroundColor: (r as any).highlight
                        }}
                      >
                        {r.text}
                      </span>
                    ))
                  : text}
              </div>
            );
          } else if (b.type === 'bulletList' || b.type === 'numberedList') {
            const items = (b as any).items || [];
            const ListTag = (b.type === 'bulletList' ? 'ul' : 'ol') as any;
            baseEl = (
              <ListTag style={{ ...paragraphCss(b), paddingInlineStart: '18px' }}>
                {items.map((it: { runs: WRun[] }, idx: number) => (
                  <li
                    key={idx}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e: any) => {
                      const next: any = { ...(value as any) };
                      const nextRoot: any = next?.json ?? next;
                      const t = (e.currentTarget.innerText ?? '').replace(/\r/g, '');
                      if (Array.isArray(nextRoot.content)) {
                        (nextRoot.content[i] as any).items[idx] = { runs: [{ text: t }] };
                      } else if (Array.isArray(nextRoot.blocks)) {
                        if (!nextRoot.blocks[i].items) nextRoot.blocks[i].items = [];
                        nextRoot.blocks[i].items[idx] = { runs: [{ content: t }] };
                      } else {
                        nextRoot.content = [...content];
                        (nextRoot.content[i] as any).items[idx] = { runs: [{ text: t }] };
                      }
                      onChange(next);
                    }}
                  >
                    {(it.runs || [{ text: '' }]).map((r, k) => <span key={k}>{r.text}</span>)}
                  </li>
                ))}
              </ListTag>
            );
          } else if (b.type === 'pageBreak') {
            baseEl = <div style={{ breakAfter: 'page', height: 0, margin: 0, padding: 0 }} />;
          } else {
            baseEl = <div style={paragraphCss(b)}>{text}</div>;
          }

          // 1) tenta por índice
          const blockOpAnchors = opAnchors?.get(i) || [];
          const blockFindingAnchors = findingAnchors?.get(i) || [];
          const hasOps = blockOpAnchors.length > 0;
          let blockAnchors = hasOps ? [] : (anchors?.get(i) || []); // não renderiza sugestões se tiver ops
          
          // 2) fallback: tenta por id estável do bloco (apenas se não tiver ops)
          const blkId = (b as any)?.id;
          if (!hasOps && (!blockAnchors || blockAnchors.length === 0) && blkId && anchors) {
            const byId: AnchoredSuggestion[] = [];
            anchors.forEach((arr) => {
              (arr || []).forEach((s) => {
                if (Array.isArray(s.ops) && s.ops.some((op: any) => op?.meta?.anchorId === blkId)) {
                  byId.push(s as any);
                }
              });
            });
            if (byId.length) blockAnchors = byId;
          }
          
          const hasSug = blockAnchors.length > 0 || blockOpAnchors.length > 0 || blockFindingAnchors.length > 0;

          return (
            <div key={i}>
              {/* bloco original — só o fundo vermelho, sem alterar formatação do texto */}
              <div style={hasSug ? redWrap : undefined}>{baseEl}</div>

              {/* bloco sugerido — só o fundo verde, com a MESMA formatação do bloco */}
              {blockAnchors.map((s) => {
                const preview = typeof s.previewText === 'string' ? s.previewText : '';
                return (
                  <div
                    key={s.id}
                    style={{ ...greenWrap, position: 'relative', zIndex: 2 }}
                    // evita que o bloco "vermelho" de cima capture foco/clique
                    contentEditable={false}
                    suppressContentEditableWarning
                  >
                    <div style={{ ...paragraphCss(b), whiteSpace: 'pre-wrap' }}>
                      {preview}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 0,
                        justifyContent: 'flex-end',
                        marginTop: 4,
                        position: 'relative',
                        zIndex: 3,
                        pointerEvents: 'auto'
                      }}
                    >
                      <button style={btnAccept} onClick={() => onAcceptSuggestion?.(s)}>Aceitar</button>
                      <button style={btnReject} onClick={() => onRejectSuggestion?.(s)}>Recusar</button>
                    </div>
                  </div>
                );
              })}

              {/* Operações individuais - um cartão por op */}
              {(opAnchors?.get(i) || []).map((aop) => (
                <div
                  key={aop.opId}
                  style={{ ...greenWrap, position: 'relative', zIndex: 2 }}
                  contentEditable={false}
                  suppressContentEditableWarning
                >
                  <div style={{ ...paragraphCss(b), whiteSpace: 'pre-wrap' }}>
                    {aop.previewText}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'flex-end',
                      marginTop: 4,
                      position: 'relative',
                      zIndex: 3,
                      pointerEvents: 'auto'
                    }}
                  >
                    <button style={btnAccept} onClick={() => onAcceptOp?.(aop)}>Aceitar</button>
                    <button style={btnReject} onClick={() => onRejectOp?.(aop)}>Recusar</button>
                  </div>
                </div>
              ))}

              {/* Findings de análise - apenas destaque visual */}
              {(findingAnchors?.get(i) || []).map((af) => (
                <div
                  key={af.findingId}
                  style={{ ...blueWrap, position: 'relative', zIndex: 1 }}
                  contentEditable={false}
                  suppressContentEditableWarning
                >
                  <div style={{ ...paragraphCss(b), opacity: 0.8 }}>
                    <strong>{af.finding.title}</strong>
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#666', marginTop: 2 }}>
                    {af.finding.detail}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </Box>
    </Box>
  );
}