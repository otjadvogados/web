import type { DocflowDoc, DocflowBlock, DocflowInline } from 'types/docflow';
import type { WDoc, WBlock, WRun } from 'types/wdoc';

export function isDocflowDoc(json: any): json is DocflowDoc {
  return json && Array.isArray(json.blocks);
}

// ---------------------------
// Docflow (blocks/inlines) -> WDoc
// ---------------------------

function asString(x: any) { return String(x ?? ''); }

function selectInlineSource(block: any) {
  // MESMA regra do exporter: usa inlines se tiver (mesmo que vazios ignore),
  // caso contrário sintetiza a partir de content.
  if (Array.isArray(block?.inlines) && block.inlines.length > 0) {
    return block.inlines.map((i: any) => ({ text: asString(i?.content ?? '') }));
  }
  return [{ text: asString(block?.content ?? '') }];
}

export function docflowToWDoc(
  docflow: any,
  opts?: { preferContentOnMismatch?: boolean }
): WDoc {
  const styles: WDoc['styles'] = {
    Normal: {
      paragraph: {
        spacing: {
          line: 1.15,
          before: 0,
          after: 0
        }
      },
      run: {}
    }
  };

  const blocks = Array.isArray(docflow?.blocks) ? docflow.blocks : [];

  const content: WBlock[] = blocks.map((b: any) => {
    const runsFromInlines = selectInlineSource(b);               // regra do exporter
    const inlineText = runsFromInlines.map((r: any) => r.text).join('');
    const contentText = asString(b?.content ?? '');

    // No editor: se houve sugestão que alterou só `content`,
    // mostramos `content` imediatamente (sem esperar sync dos inlines).
    const shouldPreferContent =
      !!opts?.preferContentOnMismatch &&
      inlineText.trim() !== contentText.trim() &&
      contentText.trim().length > 0;

    const runs: WRun[] = (shouldPreferContent ? [{ text: contentText }] : runsFromInlines).map((r: any) => ({
      text: r.text,
      bold: bool(b.inlines?.[0]?.style?.bold),
      italic: bool(b.inlines?.[0]?.style?.italic),
      underline: bool(b.inlines?.[0]?.style?.underline),
      size: num(b.inlines?.[0]?.style?.fontSize) || undefined,
      font: b.inlines?.[0]?.style?.fontFamily || undefined
    }));

    // tenta detectar headings simples pelo styleName (opcional)
    const styleName = b.styleName || 'Normal';
    const asHeading =
      /heading|t[ií]tulo|titulo|heading\s*[\d]/i.test(styleName || '') ||
      false;

    // cria/garante style no mapa
    if (!styles[styleName]) {
      styles[styleName] = {
        paragraph: {
          spacing: {
            line: b.style?.spacing?.line ?? 1.15,
            before: b.style?.spacing?.before ?? 0,
            after: b.style?.spacing?.after ?? 0
          }
        },
        run: {}
      };
    }

    if (asHeading) {
      return {
        type: 'heading',
        style: styleName,
        text: runs.map(r => r.text).join('')
      } as WBlock;
    }

    return {
      type: 'paragraph',
      style: styleName,
      runs
    } as WBlock;
  });

  const doc: WDoc = {
    meta: { source: 'docflow' },
    styles,
    content
  };
  return doc;
}

// ---------------------------
// WDoc -> Docflow (blocks/inlines)
// ---------------------------
export function wdocToDocflow(wdoc: WDoc, origDocflow?: any): DocflowDoc {
  const out = { ...(origDocflow || {}) };
  const blocks = Array.isArray(out.blocks) ? out.blocks : [];
  
  const newBlocks: DocflowBlock[] = (wdoc.content || []).map((wb, i) => {
    const prev = blocks[i] || {};
    
    if (wb.type === 'heading') {
      const text = (wb as any).text || '';
      const firstInlineStyle = prev?.inlines?.[0]?.style || { bold: true };
      return {
        ...prev,
        styleName: wb.style || 'Normal',
        content: text,
        inlines: [{ style: firstInlineStyle, content: text }],
        style: paragraphStyleFromWDoc(wdoc, wb.style)
      };
    }

    if (wb.type === 'paragraph') {
      const runs: WRun[] = (wb as any).runs?.length
        ? (wb as any).runs
        : [{ text: (wb as any).text || '' }];
      const text = runs.map((r) => r.text).join('');
      const firstInlineStyle = prev?.inlines?.[0]?.style || {};
      return {
        ...prev,
        styleName: wb.style || 'Normal',
        content: text,
        inlines: [{ style: firstInlineStyle, content: text }],
        style: paragraphStyleFromWDoc(wdoc, wb.style)
      };
    }

    // Simplificação: listas/tabelas viram parágrafos concatenados
    if (wb.type === 'bulletList' || wb.type === 'numberedList') {
      const items = (wb as any).items || [];
      const flat = items
        .map((it: { runs: WRun[] }) => (it.runs || [{ text: '' }]).map(r => r.text).join(''))
        .join('\n');
      const firstInlineStyle = prev?.inlines?.[0]?.style || {};
      return {
        ...prev,
        styleName: wb.style || 'Normal',
        content: flat,
        inlines: [{ style: firstInlineStyle, content: flat }],
        style: paragraphStyleFromWDoc(wdoc, wb.style)
      };
    }

    if (wb.type === 'table') {
      const rows = (wb as any).rows || [];
      const flat = rows.map((row: { runs: WRun[] }[]) =>
        row.map(cell => (cell?.runs || [{ text: '' }]).map(r => r.text).join('')).join('\t')
      ).join('\n');
      const firstInlineStyle = prev?.inlines?.[0]?.style || {};
      return {
        ...prev,
        styleName: wb.style || 'Normal',
        content: flat,
        inlines: [{ style: firstInlineStyle, content: flat }],
        style: paragraphStyleFromWDoc(wdoc, wb.style)
      };
    }

    // fallback
    const firstInlineStyle = prev?.inlines?.[0]?.style || {};
    return {
      ...prev,
      styleName: wb.style || 'Normal',
      content: '',
      inlines: [{ style: firstInlineStyle, content: '' }],
      style: paragraphStyleFromWDoc(wdoc, wb.style)
    };
  });

  return { ...out, blocks: newBlocks };
}

function paragraphStyleFromWDoc(wdoc: WDoc, styleKey?: string | null) {
  const s = (styleKey && wdoc.styles?.[styleKey]) || wdoc.styles?.['Normal'];
  const spacing = s?.paragraph?.spacing || {};
  return {
    spacing: {
      line: spacing.line ?? 1.15,
      before: spacing.before ?? 0,
      after: spacing.after ?? 0,
      lineRule: spacing.lineRule ?? 'auto'
    }
  };
}

function runToInline(r: WRun): DocflowInline {
  return {
    content: r.text || '',
    style: {
      bold: bool(r.bold),
      italic: bool(r.italic),
      underline: bool(r.underline),
      fontSize: num(r.size),
      fontFamily: r.font || null
    }
  };
}

function bool(v: any): boolean | null {
  return typeof v === 'boolean' ? v : null;
}
function num(v: any): number | null {
  return typeof v === 'number' ? v : (v == null ? null : Number(v) || null);
}
