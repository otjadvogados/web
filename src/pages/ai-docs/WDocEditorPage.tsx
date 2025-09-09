import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Stack, Typography, Paper, Divider, TextField, Button, Chip, IconButton, MenuItem, Select } from '@mui/material';
import { SaveOutlined, FilePdfOutlined, FileWordOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import LoadingTicker from 'components/LoadingTicker';
import A4Editor from 'components/A4Editor';
import { openSnackbar } from 'api/snackbar';

import type { WDoc, WBlock, WRun, AiDraft, AiSuggestion } from 'types/wdoc';
import type { DocflowDoc } from 'types/docflow';
import {
  generateDraft,
  getDraft,
  updateDraft,
  exportDraft,
  getExportFileBlob,
  listChatMessages,
  postChatMessage,
  acceptSuggestion,
  rejectSuggestion,
  type AiChatMessage
} from 'api/aiDocs';
import { useAnchoredSuggestions, type AnchoredSuggestion } from 'hooks/useAnchoredSuggestions';
import { isDocflowDoc, docflowToWDoc, wdocToDocflow } from 'utils/docflow';

// Helper para normalizar paths do Docflow para WDoc
function normalizeOpsToWDoc(ops: Array<{ op: string; path: string; value?: any }>) {
  return ops.map(({ op, path, value }) => {
    let p = path || '';
    // blocks -> content
    p = p.replace(/^\/blocks\//, '/content/');
    // inlines/<n>/content -> runs/<n>/text
    p = p.replace(/\/inlines\/(\d+)\/content$/i, '/runs/$1/text');
    // content -> text (quando é um parágrafo simples)
    if (/\/content$/i.test(p)) p = p.replace(/\/content$/i, '/text');
    return { op, path: p, value };
  });
}

// Helper para verificar qual bloco será alterado (debug)
function getBlockIndexFromOpPath(path: string): number | null {
  const toks = path.split('/').slice(1).map(tok => {
    if (/^\d+$/.test(tok)) return Number(tok);
    return tok.replace(/~1/g, '/').replace(/~0/g, '~');
  });

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

export default function WDocEditorPage() {
  const [params] = useSearchParams();
  const caseId = params.get('caseId')!;
  const templateId = params.get('templateId') || undefined;
  const draftId = params.get('draftId');  // NEW

  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [json, setJson] = useState<WDoc | null>(null);
  const [serverFormat, setServerFormat] = useState<'docflow' | 'wdoc'>('wdoc');
  const [saving, setSaving] = useState(false);
  const [expLoading, setExpLoading] = useState(false);
  const [lastFileId, setLastFileId] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(true);
  const [showTicker, setShowTicker] = useState(true);

  const [chat, setChat] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setGenLoading(true);
        setShowTicker(true);

        let d: AiDraft;

        if (draftId) {
          d = await getDraft(draftId);         // carrega existente
        } else {
          d = await generateDraft(caseId, templateId); // só gera se não tiver draftId
        }

        setDraft(d);
        const raw = d.json as any;
        if (isDocflowDoc(raw)) {
          setServerFormat('docflow');
          // 👇 preferir content quando houver mismatch, para refletir sugestões aceitas
          setJson(docflowToWDoc(raw, { preferContentOnMismatch: true }));
        } else {
          setServerFormat('wdoc');
          setJson(raw as WDoc);
        }

        openSnackbar({ open: true, message: draftId ? 'Rascunho carregado.' : 'Documento gerado (WDoc).', variant: 'alert', alert: { color: 'success' } } as any);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setGenLoading(false);
        setShowTicker(false);
      }
    })();
  }, [caseId, templateId, draftId]);

  // carrega histórico do chat na montagem
  useEffect(() => {
    (async () => {
      if (!caseId) return;
      try {
        setMessages(await listChatMessages(caseId));
      } catch { }
    })();
  }, [caseId]);

  async function save() {
    if (!draft || !json) return;
    setSaving(true);
    try {
      const payload = serverFormat === 'docflow' ? wdocToDocflow(json, draft.json) : json;
      const updated = await updateDraft(draft.id, { json: payload });
      setDraft(updated);
      // reflete formato novo do servidor (converte novamente se necessário)
      const raw = updated.json as any;
      setJson(isDocflowDoc(raw) ? docflowToWDoc(raw, { preferContentOnMismatch: true }) : (raw as WDoc));
      openSnackbar({ open: true, message: 'Rascunho salvo', variant: 'alert', alert: { color: 'success' } } as any);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(kind: 'DOCX' | 'PDF') {
    if (!draft) return;
    setExpLoading(true);
    try {
      // garante salvar estado atual no formato esperado antes de exportar
      if (json) await updateDraft(draft.id, { json: serverFormat === 'docflow' ? wdocToDocflow(json, draft.json) : json });
      const ex = await exportDraft(draft.id, kind);
      setLastFileId(ex.fileId || null);
      openSnackbar({ open: true, message: kind === 'DOCX' ? 'DOCX gerado' : 'Export solicitado', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.message || 'Falha ao exportar', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setExpLoading(false);
    }
  }

  async function openExported() {
    if (!lastFileId) return;
    const { blob } = await getExportFileBlob(lastFileId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function sendChat() {
    if (!caseId || !chat.trim()) return;
    setChatLoading(true);
    try {
      const out = await postChatMessage(caseId, chat.trim());

      // 1) atualiza histórico (puxa do backend)
      try {
        setMessages(await listChatMessages(caseId));
      } catch { }

      // 2) aplica sugestões vindas desta rodada na UI (normalizadas para WDoc)
      const normalized = (out.suggestions || []).map(s => ({ ...s, ops: normalizeOpsToWDoc(s.ops) }));
      setSuggestions(normalized);

      // debug rápido: mostra as ops das sugestões
      console.table((out.suggestions || []).flatMap(s =>
        s.ops.map(o => {
          const blockIdx = getBlockIndexFromOpPath(o.path);
          const blockContent = blockIdx !== null && draft?.json && isDocflowDoc(draft.json) && draft.json.blocks?.[blockIdx]?.content
            ? String(draft.json.blocks[blockIdx].content).slice(0, 50) + '...'
            : 'N/A';
          return {
            sug: s.id,
            op: o.op,
            path: o.path,
            blockIdx,
            currentContent: blockContent,
            newValue: String(o.value).slice(0, 80)
          };
        })
      ));

      // 3) trata diferentes modos de resposta (chat vs suggest)
      const hasSuggestions = out.suggestions && out.suggestions.length > 0;
      const isSuggestMode = hasSuggestions && out.suggestions.some(s => s.ops && s.ops.length > 0);

      if (isSuggestMode) {
        // Modo "suggest": mostra rationale das sugestões com ops
        const rationale = out.suggestions
          .map((s, idx) => `• ${s.rationale || `Sugestão ${idx + 1}`}`)
          .join('\n');

        setMessages(prev => [
          ...prev,
          {
            id: out.messageId,
            role: 'user',
            text: chat.trim(),
            createdAt: new Date().toISOString()
          },
          {
            id: out.messageId + '-a',
            role: 'assistant',
            text: `Sugestões geradas:\n${rationale}`,
            createdAt: new Date().toISOString()
          }
        ]);
      } else if (hasSuggestions) {
        // Modo "chat": apenas orientação textual, sem ops
        const rationale = out.suggestions
          .map((s, idx) => `• ${s.rationale || `Resposta ${idx + 1}`}`)
          .join('\n');

        setMessages(prev => [
          ...prev,
          {
            id: out.messageId,
            role: 'user',
            text: chat.trim(),
            createdAt: new Date().toISOString()
          },
          {
            id: out.messageId + '-a',
            role: 'assistant',
            text: rationale,
            createdAt: new Date().toISOString()
          }
        ]);
      } else {
        // Sem sugestões: apenas adiciona a mensagem do usuário
        setMessages(prev => [
          ...prev,
          {
            id: out.messageId,
            role: 'user',
            text: chat.trim(),
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setChatLoading(false);
      setChat('');
    }
  }

  const styleKeys = useMemo(() => Object.keys(json?.styles || {}), [json]);

  // agrupa sugestões por bloco
  const anchored = useAnchoredSuggestions(json!, suggestions);

  // handlers usados pelo A4Editor
  async function onAcceptAnchored(s: AnchoredSuggestion) {
    if (!draft) return;
    const res = await acceptSuggestion(draft.id, s.id);
    setDraft(res.draft);
    // converte p/ WDoc se necessário (você já tem utilidades aí)
    const raw = res.draft.json as any;
    setJson(isDocflowDoc(raw) ? docflowToWDoc(raw, { preferContentOnMismatch: true }) : raw);

    // remove a sugestão aplicada da lista atual
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
  }

  async function onRejectAnchored(s: AnchoredSuggestion) {
    if (!draft) return;
    await rejectSuggestion(draft.id, s.id);
    setSuggestions(prev => prev.filter(x => x.id !== s.id));
  }

  function updateBlock(i: number, patch: Partial<WBlock>) {
    setJson((prev) => {
      if (!prev) return prev;
      const next = { ...prev, content: prev.content.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) };
      return next;
    });
  }

  function addBlock(kind: WBlock['type']) {
    setJson((prev) => {
      if (!prev) return prev;
      const firstStyle = Object.keys(prev.styles || {})[0] || 'paragraph';
      const b: WBlock =
        kind === 'paragraph'
          ? ({ type: 'paragraph', style: firstStyle, runs: [{ text: '' }] } as WBlock)
          : ({ type: 'heading', style: firstStyle, text: '' } as WBlock);
      return { ...prev, content: [...prev.content, b] };
    });
  }

  if (!json) return (
    <Box p={3}>
      <MainCard>
        <LoadingTicker
          running={genLoading || showTicker}
          size="medium"
          showSpinner
          spinnerSize={18}
          minDuration={12000}
          script={[
            'Preparando documento...',
            'Analisando template...',
            'Processando conteúdo...',
            'Gerando estrutura...',
            'Aplicando formatação...',
            'Finalizando documento...',
            'Quase pronto...'
          ]}
        />
      </MainCard>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <MainCard
        title="Editor (WDoc)"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {draft && <Chip size="small" label={`draftId: ${draft.id}`} />}
            <IconButton onClick={save} disabled={saving || !draft} color="primary" title="Salvar">
              <SaveOutlined />
            </IconButton>
            <IconButton onClick={() => handleExport('DOCX')} disabled={!draft || expLoading} title="Exportar DOCX">
              <FileWordOutlined />
            </IconButton>
            <IconButton onClick={() => handleExport('PDF')} disabled={!draft || expLoading} title="Exportar PDF">
              <FilePdfOutlined />
            </IconButton>
            {lastFileId && <Button size="small" onClick={openExported}>Abrir export</Button>}
          </Stack>
        }
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {/* Editor A4 */}
          <Box sx={{ flex: 1 }}>
            {json && (
              <A4Editor
                value={json}
                onChange={setJson}
                anchors={anchored}
                onAcceptSuggestion={onAcceptAnchored}
                onRejectSuggestion={onRejectAnchored}
              />
            )}
          </Box>

          {/* CHAT */}
          <Box sx={{
            width: 360,
            height: '100svh',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '60svh',
          }}>
            <Paper
              variant="outlined"
              sx={{
                position: 'sticky',
                top: '80px',
                p: 1.5,
                width: 360,
                height: '100svh',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '60svh',
              }}
            >

              <Stack spacing={1.25} sx={{ height: '100%', overflow: 'hidden' }}>
                <Typography variant="subtitle2">Chat</Typography>

                {/* histórico */}
                <Stack
                  spacing={1}
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    minHeight: 0
                  }}
                >
                  {messages.map(m => (
                    <Paper key={m.id} variant="outlined" sx={{ p: 1, bgcolor: m.role === 'assistant' ? 'grey.50' : 'background.paper' }}>
                      <Typography variant="caption" color="text.secondary">{m.role === 'assistant' ? 'Assistente' : 'Você'}</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.text}</Typography>
                    </Paper>
                  ))}

                  {/* Sugestões ativas */}
                  {suggestions.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 1, bgcolor: 'warning.light', border: '2px solid', borderColor: 'warning.main' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        Sugestões Pendentes ({suggestions.length})
                      </Typography>
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {suggestions.map(s => (
                          <Box key={s.id} sx={{ p: 0.5, bgcolor: 'background.paper', borderRadius: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {s.rationale || 'Sugestão sem descrição'}
                            </Typography>
                            {s.ops && s.ops.length > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                {s.ops.length} operação(ões) - Use os botões no editor para aceitar/rejeitar
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  )}
                </Stack>

                {/* input */}
                <Box sx={{ flexShrink: 0 }}>
                  <TextField
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                    placeholder="Peça ajustes…"
                    multiline
                    minRows={3}
                    fullWidth
                  />
                  <Button
                    onClick={sendChat}
                    disabled={chatLoading || !caseId}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    {chatLoading ? 'Enviando…' : 'Enviar'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </MainCard>
    </Box>
  );
}
