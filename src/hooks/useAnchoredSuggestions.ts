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

function sha1(s: string): string {
  // Implementação simples de hash para o frontend
  let hash = 0;
  if (s.length === 0) return hash.toString();
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

function norm(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function getBlockPlainText(b: any): string {
  if (typeof b?.content === 'string' && b.content) return b.content;
  if (typeof b?.text === 'string' && b.text) return b.text;
  if (Array.isArray(b?.runs)) return b.runs.map((r: any) => String(r?.text ?? '')).join('');
  if (Array.isArray(b?.items)) {
    return b.items.map((it: any) =>
      Array.isArray(it?.runs) ? it.runs.map((r: any) => String(r?.text ?? '')).join('') : String(it?.text ?? '')
    ).join('\n');
  }
  return '';
}

function findBlockIndexByAnchor(op: any, doc: any): number {
  const blocks = getBlocksArray(doc);
  if (!blocks.length) return -1;

  // 1) pelo id estável
  const anchorId = op?.meta?.anchorId;
  if (anchorId) {
    const j = blocks.findIndex(b => b?.id === anchorId);
    if (j >= 0) return j;
  }

  // 2) pela hash do texto "antes"
  const beforeHash = op?.meta?.beforeHash;
  if (beforeHash) {
    const j = blocks.findIndex((b) => sha1(norm(getBlockPlainText(b))) === beforeHash);
    if (j >= 0) return j;
  }

  // 3) fallback por snippet (similaridade)
  const snippet = (op?.meta?.beforeSnippet || '').toLowerCase();
  if (snippet) {
    let best = -1, bestScore = 0;
    blocks.forEach((b, i) => {
      const content = getBlockPlainText(b).toLowerCase();
      const score = content.includes(snippet) ? snippet.length : 0;
      if (score > bestScore) {
        best = i;
        bestScore = score;
      }
    });
    if (best >= 0) return best;
  }

  return -1;
}

function getBlocksArray(doc: any): any[] {
  return Array.isArray(doc?.blocks) ? doc.blocks : Array.isArray(doc?.content) ? doc.content : [];
}

function getBlockIndexFromOpPath(path: string, doc: any): number | null {
  const toks = parsePath(path || '');
  const blocks = getBlocksArray(doc);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t === 'blocks' || t === 'content') {
      const key = toks[i + 1];
      if (typeof key === 'number') {
        // caso antigo: índice numérico
        return key;
      }
      if (typeof key === 'string') {
        // novo caso: ID string (ex.: /blocks/ca3gy0.../content)
        const id = key;
        if (!blocks.length) return null;
        const j = blocks.findIndex((b: any) =>
          b?.id === id || b?._id === id || b?.anchorId === id
        );
        if (j >= 0) return j;
      }
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
      
      // Primeiro tenta resolver por âncora
      for (const op of s.ops || []) {
        const anchorIdx = findBlockIndexByAnchor(op, doc);
        if (anchorIdx >= 0) { 
          bestIdx = anchorIdx; 
          break; 
        }
      }
      
      // Se não achou por âncora, usa o método antigo (índice do path)
      if (bestIdx === null) {
        for (const op of s.ops || []) {
          const pathIdx = getBlockIndexFromOpPath(op.path || '', doc);
          if (typeof pathIdx === 'number') { 
            bestIdx = pathIdx; 
            break; 
          }
        }
      }
      
      if (bestIdx === null) continue;
      
      const arr = map.get(bestIdx) || [];
      arr.push({ ...s, blockIndex: bestIdx, previewText: tryPreviewTextFromOps(s.ops) });
      map.set(bestIdx, arr);
    }
    return map; // Map<blockIndex, AnchoredSuggestion[]>
  }, [doc, suggestions]);
}
