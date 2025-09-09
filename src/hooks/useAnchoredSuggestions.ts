import { useMemo } from 'react';
import type { WDoc } from 'types/wdoc';
import type { AiSuggestion } from 'types/wdoc';

export type AnchoredSuggestion = AiSuggestion & {
  blockIndex: number;
  previewText?: string; // opcional, se der pra extrair do 'value'
};

function parsePath(path: string): (string|number)[] {
  // JSON Pointer -> tokens
  return path.split('/').slice(1).map(tok => {
    if (/^\d+$/.test(tok)) return Number(tok);
    return tok.replace(/~1/g,'/').replace(/~0/g,'~');
  });
}

function getBlockIndexFromOpPath(path: string): number | null {
  const toks = parsePath(path || '');
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    // WDoc: /content/<N>/...
    // Docflow: /blocks/<N>/...
    if ((t === 'content' || t === 'blocks') && typeof toks[i + 1] === 'number') {
      return toks[i + 1] as number;
    }
  }
  return null;
}

function tryPreviewTextFromOps(ops: AnchoredSuggestion['ops']): string | undefined {
  for (const op of ops) {
    if (op.op !== 'replace') continue;
    const p = op.path || '';
    // WDoc texto plano
    if (/\/text$/i.test(p) && typeof op.value === 'string') return op.value;
    // Docflow inline content
    if (/\/inlines\/\d+\/content$/i.test(p) && typeof op.value === 'string') return op.value;
    // also allow .../content no-inline
    if (/\/content$/i.test(p) && typeof op.value === 'string') return op.value;
  }
  return undefined;
}

export function useAnchoredSuggestions(doc: WDoc | null, suggestions: AiSuggestion[]) {
  return useMemo(() => {
    const map = new Map<number, AnchoredSuggestion[]>();
    for (const s of suggestions) {
      let bestIdx: number | null = null;
      for (const op of s.ops || []) {
        const bi = getBlockIndexFromOpPath(op.path || '');
        if (typeof bi === 'number') { bestIdx = bi; break; }
      }
      if (bestIdx == null) continue;
      const arr = map.get(bestIdx) || [];
      arr.push({ ...s, blockIndex: bestIdx, previewText: tryPreviewTextFromOps(s.ops) });
      map.set(bestIdx, arr);
    }
    return map; // Map<blockIndex, AnchoredSuggestion[]>
  }, [doc, suggestions]);
}
