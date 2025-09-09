import { useMemo } from 'react';
import { Box } from '@mui/material';
import type { WDoc, WBlock, WRun } from 'types/wdoc';
import type { AnchoredSuggestion } from 'hooks/useAnchoredSuggestions';
import type { JSX } from 'react';

type Props = {
  value: WDoc;
  onChange: (next: WDoc) => void;
  anchors?: Map<number, AnchoredSuggestion[]>;
  onAcceptSuggestion?: (sug: AnchoredSuggestion) => void;
  onRejectSuggestion?: (sug: AnchoredSuggestion) => void;
};

export default function A4Editor({ value, onChange, anchors, onAcceptSuggestion, onRejectSuggestion }: Props) {
  const styleMap = value?.styles || {};
  const content: WBlock[] = Array.isArray(value?.content) ? value.content : [];
  if (!Array.isArray(content)) return null;

  const pageStyle = useMemo(
    () => ({
      width: '210mm',
      minHeight: '297mm',
      background: '#fff',
      boxShadow: '0 0 6px rgba(0,0,0,.15)',
      margin: '0 auto',
      padding: '25mm 20mm',
      color: '#111',
      lineHeight: 1.5
    }),
    []
  );

  const paragraphCss = (b: WBlock) => {
    const s = (b.style && styleMap[b.style]) || styleMap['Normal'] || {};
    const sp = s.paragraph?.spacing || {};
    const lineHeight = sp.line ?? 1.15;
    const marginTop = (sp.before ?? 0) / 20;
    const marginBottom = (sp.after ?? 0) / 20;
    return {
      lineHeight,
      margin: `${marginTop}px 0 ${marginBottom}px 0`,
      whiteSpace: 'pre-wrap',
      outline: '0',
      caretColor: '#000'
    } as React.CSSProperties;
  };

  function setParagraphText(i: number, text: string) {
    const next = { ...value };
    const block = next.content[i];
    if (block.type === 'heading') {
      (block as any).text = text;
    } else if (block.type === 'paragraph') {
      (block as any).runs = [{ text } as WRun];
    } else if (block.type === 'bulletList' || block.type === 'numberedList') {
      (block as any).items = text.split('\n').map((t) => ({ runs: [{ text: t }] }));
    } else {
      (block as any).text = text;
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

  const redWrap = {
    background: 'rgba(244, 67, 54, 0.12)', // vermelho claro
  } as React.CSSProperties;

  const greenWrap = {
    background: 'rgba(76, 175, 80, 0.12)', // verde claro
    marginTop: 6
  } as React.CSSProperties;

  const btnAccept: React.CSSProperties = {
    border: 0,
    backgroundColor: '#2e7d32',
    padding: '4px 10px',
    borderRadius: 0,
    color: '#fff',
    cursor: 'pointer'
  };

  const btnReject: React.CSSProperties = {
    border: 0,
    padding: '4px 10px',
    backgroundColor: '#9e9e9e',
    borderRadius: 0,
    color: '#fff',
    cursor: 'pointer'
  };

  return (
    <Box sx={{ background: '#f2f2f6', py: 2 }}>
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
            baseEl = <div {...commonProps} style={{ ...paragraphCss(b), fontWeight: 700, fontSize: '1.2rem' }}>{text}</div>;
          } else if (b.type === 'paragraph') {
            baseEl = <div {...commonProps} style={paragraphCss(b)}>{text}</div>;
          } else if (b.type === 'bulletList' || b.type === 'numberedList') {
            baseEl = <div {...commonProps} style={paragraphCss(b)}>{text}</div>;
          } else if (b.type === 'pageBreak') {
            baseEl = <hr style={{ border: 0, borderTop: '1px dashed #ccc', margin: '16mm 0' }} />;
          } else {
            baseEl = <div style={paragraphCss(b)}>{text}</div>;
          }

          const blockAnchors = anchors?.get(i) || [];
          const hasSug = blockAnchors.length > 0;

          return (
            <div key={i}>
              {/* bloco original — só o fundo vermelho, sem alterar formatação do texto */}
              <div style={hasSug ? redWrap : undefined}>{baseEl}</div>

              {/* bloco sugerido — só o fundo verde, texto com a MESMA formatação do bloco */}
              {blockAnchors.map((s) => {
                const preview = typeof s.previewText === 'string' ? s.previewText : '';
                return (
                  <div key={s.id} style={greenWrap}>
                    <div style={{ ...paragraphCss(b), whiteSpace: 'pre-wrap' }}>
                      {preview}
                    </div>

                    {/* ações abaixo do texto, sem sobrepor */}
                    <div style={{ display: 'flex', gap: 0, justifyContent: 'flex-end', marginTop: 0 }}>
                      <button style={btnAccept} onClick={() => onAcceptSuggestion?.(s)}>Aceitar</button>
                      <button style={btnReject} onClick={() => onRejectSuggestion?.(s)}>Recusar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Box>
    </Box>
  );
}