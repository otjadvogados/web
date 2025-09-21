import { useMemo } from 'react';
import type { WDoc, SuggestionOp, AnalysisFinding } from 'types/wdoc';
import type { AiSuggestion } from 'types/wdoc';

export type AnchoredSuggestion = AiSuggestion & {
  blockIndex: number;
  previewText?: string; // opcional, se der pra extrair do 'value'
};

export type AnchoredOp = {
  suggestionId: string;
  opId: string;
  blockIndex: number;
  previewText: string;  // do tryPreviewTextFromOps([op])
  op: SuggestionOp;
};

export type AnchoredFinding = {
  findingId: string;
  blockIndex: number;
  finding: AnalysisFinding;
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

function findBlockIndexById(blockId: string, doc: any): number {
  const blocks = getBlocksArray(doc);
  const index = blocks.findIndex((b: any) => 
    b?.id === blockId || b?._id === blockId || b?.anchorId === blockId
  );
  return index >= 0 ? index : -1;
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

function normTxt(s: any): string {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findBlockIndexBySnippet(doc: any, snippet?: string): number {
  if (!snippet) return -1;
  const want = normTxt(snippet);
  const blocks = getBlocksArray(doc);
  let best = { idx: -1, score: -1 };
  for (let i = 0; i < blocks.length; i++) {
    const txt = normTxt(blocks[i]?.content ?? blocks[i]?.text ?? '');
    if (!txt) continue;
    // score simples: começa com (2), inclui (1)
    let score = -1;
    if (txt.startsWith(want)) score = 2;
    else if (txt.includes(want)) score = 1;
    if (score > best.score) best = { idx: i, score };
  }
  return best.idx;
}

function tryPreviewTextFromOps(ops: SuggestionOp[]): string | undefined {
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
      // agrega ops por bloco (apenas PENDING)
      const perBlock = new Map<number, any[]>();

      for (const op of (s.ops || []).filter(o => o.status === 'PENDING')) {
        let idx = findBlockIndexByAnchor(op, doc);
        if (idx < 0) {
          const byPath = getBlockIndexFromOpPath(op.path || '', doc);
          idx = typeof byPath === 'number' ? byPath : -1;
        }
        if (idx < 0) continue;
        const arr = perBlock.get(idx) || [];
        arr.push(op);
        perBlock.set(idx, arr);
      }

      // cria uma "cópia" da sugestão para cada bloco afetado
      perBlock.forEach((opsForIdx, bi) => {
        const arr = map.get(bi) || [];
        arr.push({
          ...s,
          ops: opsForIdx,                  // só as ops daquele bloco
          blockIndex: bi,
          previewText: tryPreviewTextFromOps(opsForIdx)
        });
        map.set(bi, arr);
      });
    }
    return map; // Map<blockIndex, AnchoredSuggestion[]>
  }, [doc, suggestions]);
}

// Nova função para criar anchors por operação individual
export function useAnchoredOps(doc: WDoc | null, suggestions: AiSuggestion[]) {
  return useMemo(() => {
    const perBlock: Map<number, AnchoredOp[]> = new Map();

    // Novo: resolve bloco a partir de meta.anchorId OU do token após /blocks/
    const resolveBlockIndex = (op: SuggestionOp): number | null => {
      const path = String(op?.path ?? '');
      const blocks = getBlocksArray(doc);

      // 1) prioridade: anchorId estável
      const meta: any = (op as any)?.meta || {};
      const anchor = meta.anchorId as string | undefined;
      if (anchor) {
        const bi = findBlockIndexById(anchor, doc);
        if (bi >= 0) return bi;
      }

      // 2) /blocks/<token>/...
      const m = path.match(/^\/blocks\/([^/]+)/);
      if (!m) return null;
      const token = m[1];
      if (/^\d+$/.test(token)) {
        const idx = parseInt(token, 10);
        return idx >= 0 && idx < blocks.length ? idx : null;
      }
      // 3) token é um ID → procurar por ID
      const byId = findBlockIndexById(token, doc);
      if (byId >= 0) return byId;

      // 4) FALLBACK por evidência textual (beforeSnippet)
      //    cobre casos em que IDs não batem, mas o texto alvo está presente.
      const bySnippet = findBlockIndexBySnippet(doc, meta.beforeSnippet);
      if (bySnippet >= 0) return bySnippet;

      return null;
    };

    for (const s of suggestions) {
      for (const op of (s.ops || []).filter(o => o.status === 'PENDING')) {
        const bi = resolveBlockIndex(op as any);
        if (bi == null || bi < 0) continue;
        
        const arr = perBlock.get(bi) || [];
        arr.push({
          suggestionId: s.id,
          opId: op.id,
          blockIndex: bi,
          previewText: tryPreviewTextFromOps([op]) || 'Sem prévia disponível',
          op
        });
        perBlock.set(bi, arr);
      }
    }
    
    return perBlock; // Map<blockIndex, AnchoredOp[]>
  }, [doc, suggestions]);
}

// Hook para ancorar findings por bloco
export function useAnchoredFindings(doc: WDoc | null, findings: AnalysisFinding[]) {
  return useMemo(() => {
    const perBlock: Map<number, AnchoredFinding[]> = new Map();
    
    for (const finding of findings) {
      // Para cada anchor do finding, tenta encontrar o bloco correspondente
      for (const anchor of finding.anchors || []) {
        const bi = findBlockIndexById(anchor, doc);
        if (bi < 0) continue;
        
        const arr = perBlock.get(bi) || [];
        arr.push({
          findingId: finding.id,
          blockIndex: bi,
          finding
        });
        perBlock.set(bi, arr);
      }
    }
    
    return perBlock; // Map<blockIndex, AnchoredFinding[]>
  }, [doc, findings]);
}
