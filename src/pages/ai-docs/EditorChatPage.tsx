// src/pages/ai-docs/EditorChatPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Stack, Typography, Paper, Divider, TextField, Button, Chip, CircularProgress, IconButton
} from '@mui/material';
import { SaveOutlined, FilePdfOutlined, FileWordOutlined, ReloadOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import LoadingTicker from 'components/LoadingTicker';
import { openSnackbar } from 'api/snackbar';

import {
  generateDraft,
  updateDraft,
  exportDraft,
  getExportFileBlob,
  postChatMessage,
  acceptSuggestion,
  rejectSuggestion,
  type AiDraft,
  type AiSuggestion
} from 'api/aiDocs';
import A4Editor from 'components/A4Editor';
import type { WDoc } from 'types/wdoc';
import { isDocflowDoc, docflowToWDoc, wdocToDocflow } from 'utils/docflow';

// Helper para verificar se uma sugestão está pendente, independente do formato do status
const isPending = (s: AiSuggestion) => (s.status || 'PENDING').toUpperCase() === 'PENDING';

export default function EditorChatPage() {
  const [params] = useSearchParams();
  const caseId = params.get('caseId');
  const templateId = params.get('templateId') || undefined;
  const pedido = params.get('pedido') ? decodeURIComponent(params.get('pedido') as string) : '';

  const [genLoading, setGenLoading] = useState(true);
  const [ticker, setTicker] = useState(true);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [wdoc, setWdoc] = useState<WDoc | any>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Chat
  const [chatText, setChatText] = useState(
    pedido ? `Considere o pedido inicial: ${pedido}` : 'Refine o texto com base na tese X.'
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  // Export
  const [expLoading, setExpLoading] = useState(false);
  const [lastFileId, setLastFileId] = useState<string | null>(null);


  // ======================= INIT (gera rascunho) =======================
  useEffect(() => {
    (async () => {
      if (!caseId) return;
      try {
        setGenLoading(true);
        setTicker(true);
        const d = await generateDraft(caseId, templateId);
        setDraft(d);
        
        // 🔧 USA EXATAMENTE O MESMO SAMPLE DO A4PLAYGROUND:
        const SAMPLE: WDoc = {
          meta: {
            sections: [{
              page: { size: { name: 'A4', widthPt: 595.28, heightPt: 841.89 }, orientation: 'portrait' },
              margins: { top: 85.05, left: 85.05, right: 56.7, bottom: 56.7 }
            }]
          },
          styles: {
            Normal: {
              paragraph: { spacing: { line: 1.15, before: 12, after: 12 }, textAlign: 'left' },
              run: {}
            },
            Heading: {
              paragraph: { spacing: { line: 1.15, before: 12, after: 12 }, textAlign: 'center' },
              run: { bold: true }
            }
          },
          content: [
            { type: 'heading', style: 'Heading', text: 'RECLAMAÇÃO TRABALHISTA — PRÉVIA A4' },
            { type: 'paragraph', style: 'Normal', runs: [
              { text: 'Este é um parágrafo com ' },
              { text: 'negrito', bold: true },
              { text: ' e ' },
              { text: 'itálico', italic: true },
              { text: '.' }
            ]},
            { type: 'bulletList', style: 'Normal', items: [
              { runs: [{ text: 'Item 1' }] },
              { runs: [{ text: 'Item 2' }] },
              { runs: [{ text: 'Item 3' }] }
            ]},
            { type: 'pageBreak' as const },
            { type: 'heading', style: 'Heading', text: 'PÁGINA 2' },
            { type: 'paragraph', style: 'Normal', runs: [{ text: 'Texto na segunda página.' }] }
          ]
        };
        
        setWdoc(SAMPLE);
        openSnackbar({ open: true, message: 'Documento gerado pela IA.', variant: 'alert', alert: { color: 'success' } } as any);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setGenLoading(false);
        setTicker(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, templateId]);

  // ======================= SAVE =======================
  async function handleSave() {
    if (!draft) return;
    try {
      setSaveLoading(true);
      // Se o servidor espera docflow, converte de volta
      const jsonToSave = isDocflowDoc(draft.json) ? wdocToDocflow(wdoc, draft.json) : wdoc;
      const updated = await updateDraft(draft.id, { json: jsonToSave });
      setDraft(updated);
      
      // Normaliza a resposta também
      const raw = updated.json as any;
      setWdoc(isDocflowDoc(raw) ? docflowToWDoc(raw, { preferContentOnMismatch: true }) : raw);
      openSnackbar({ open: true, message: 'Rascunho salvo!', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setSaveLoading(false);
    }
  }

  // ======================= CHAT =======================
  async function handleChatSend() {
    if (!caseId || !chatText.trim()) return;
    try {
      setChatLoading(true);
      const out = await postChatMessage(caseId, chatText.trim());
      setSuggestions(out.suggestions || []);
      
      // debug rápido: mostra as ops das sugestões
      console.table((out.suggestions || []).flatMap(s =>
        s.ops.map(o => ({ 
          sug: s.id, 
          op: o.op, 
          path: o.path, 
          value: String(o.value).slice(0, 80) 
        }))
      ));
      
      const hasSuggestions = out.suggestions && out.suggestions.length > 0;
      const isSuggestMode = hasSuggestions && out.suggestions.some(s => s.ops && s.ops.length > 0);
      
      if (isSuggestMode) {
        openSnackbar({ open: true, message: `Geradas ${out.suggestions?.length || 0} sugestão(ões) com operações`, variant: 'alert', alert: { color: 'success' } } as any);
      } else if (hasSuggestions) {
        openSnackbar({ open: true, message: `Resposta de chat (${out.suggestions?.length || 0} item(s))`, variant: 'alert', alert: { color: 'info' } } as any);
      } else {
        openSnackbar({ open: true, message: 'Resposta recebida', variant: 'alert', alert: { color: 'info' } } as any);
      }
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setChatLoading(false); }
  }

  async function accept(s: AiSuggestion) {
    if (!draft) return;
    try {
      const res = await acceptSuggestion(draft.id, s.id);
      setDraft(res.data.draft);
      
      // Normaliza a resposta também
      const raw = res.data.draft.json as any;
      setWdoc(isDocflowDoc(raw) ? docflowToWDoc(raw, { preferContentOnMismatch: true }) : raw);
      setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'ACCEPTED' } : x));
      openSnackbar({ open: true, message: 'Sugestão aplicada.', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    }
  }
  async function reject(s: AiSuggestion) {
    if (!draft) return;
    try {
      await rejectSuggestion(draft.id, s.id);
      setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: 'REJECTED' } : x));
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    }
  }

  // ======================= EXPORT =======================
  async function handleExport(kind: 'DOCX' | 'PDF') {
    if (!draft) return;
    try {
      setExpLoading(true);
      // Se o servidor espera docflow, converte de volta
      const jsonToSave = isDocflowDoc(draft.json) ? wdocToDocflow(wdoc, draft.json) : wdoc;
      await updateDraft(draft.id, { json: jsonToSave });
      const ex = await exportDraft(draft.id, kind);
      setLastFileId(ex.fileId || null);
      openSnackbar({ open: true, message: `Export ${kind} gerado.`, variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setExpLoading(false);
    }
  }

  async function openExported() {
    if (!lastFileId) return;
    try {
      setExpLoading(true);
      const { blob } = await getExportFileBlob(lastFileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setExpLoading(false); }
  }


  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <MainCard
        title="Editor do Documento"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {draft && <Chip size="small" label={`draftId: ${draft.id}`} />}
            {draft && <Chip size="small" label={`v${draft.version}`} variant="outlined" />}
            <IconButton onClick={handleSave} disabled={!draft || saveLoading} color="primary">
              {saveLoading ? <CircularProgress size={18} /> : <SaveOutlined />}
            </IconButton>
            <Divider flexItem orientation="vertical" />
            <IconButton onClick={() => handleExport('DOCX')} disabled={!draft || expLoading}><FileWordOutlined /></IconButton>
            <IconButton onClick={() => handleExport('PDF')} disabled={!draft || expLoading}><FilePdfOutlined /></IconButton>
            {lastFileId && (
              <Button size="small" variant="outlined" onClick={openExported} disabled={expLoading}>
                Abrir export
              </Button>
            )}
          </Stack>
        }
      >
        {/* Loader ao gerar o rascunho */}
        {(genLoading || ticker) && (
          <Box sx={{ mb: 2 }}>
            <LoadingTicker
              running={genLoading || ticker}
              size="medium"
              showSpinner
              spinnerSize={18}
              minDuration={12000}
            />
          </Box>
        )}

        {/* Layout 2 colunas: editor | chat */}
        <Stack direction="row" spacing={2} alignItems="stretch">
          {/* EDITOR (com formatação preservada) */}
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            {!draft || !wdoc ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '40vh' }}>
                <CircularProgress />
              </Stack>
            ) : (
              <>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Minuta gerada pela IA</Typography>
                <Divider sx={{ mb: 1 }} />
                <A4Editor
                  value={wdoc}
                  onChange={(next) => {
                    // mantém o A4 igual ao Playground: editor é a fonte da verdade
                    setWdoc(next as WDoc);
                  }}
                />
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button onClick={handleSave} variant="contained" startIcon={<SaveOutlined /> as any} disabled={saveLoading}>
                    {saveLoading ? <CircularProgress size={18} /> : 'Salvar alterações'}
                  </Button>
                  <Button onClick={() => handleExport('PDF')} startIcon={<FilePdfOutlined /> as any} disabled={!draft || expLoading}>
                    Exportar PDF
                  </Button>
                  <Button onClick={() => handleExport('DOCX')} startIcon={<FileWordOutlined /> as any} disabled={!draft || expLoading}>
                    Exportar DOCX
                  </Button>
                </Stack>
              </>
            )}
          </Paper>

          {/* CHAT */}
          <Paper
            variant="outlined"
            sx={{
              position: 'sticky',
              top: 88,
              p: 1.5,
              width: 360,
              maxHeight: '60svh',
              overflow: 'auto'
            }}
          >
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Chat1</Typography>
              <TextField
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Diga o que precisa ajustar…"
                multiline minRows={3}
              />
              <Button onClick={handleChatSend} variant="contained" disabled={!caseId || !draft || chatLoading}>
                {chatLoading ? <CircularProgress size={18} /> : 'Enviar'}
              </Button>
              <Divider />
              <Typography variant="subtitle2">Sugestões</Typography>
              <Stack spacing={1}>
                {suggestions.length === 0 && (
                  <Typography variant="body2" color="text.secondary">Sem sugestões ainda.</Typography>
                )}
                {suggestions.map((s) => (
                  <Paper key={s.id} variant="outlined" sx={{ p: 1 }}>
                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={s.status} color={s.status === 'PENDING' ? 'warning' : s.status === 'ACCEPTED' ? 'success' : 'default'} />
                        {!!s.targets?.length && <Chip size="small" variant="outlined" label={s.targets.join(', ')} />}
                        {typeof s.confidence === 'number' && <Chip size="small" variant="outlined" label={`conf. ${(s.confidence * 100).toFixed(0)}%`} />}
                      </Stack>
                      {s.rationale && <Typography variant="caption" color="text.secondary">{s.rationale}</Typography>}
                      <Box sx={{ bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                        <Typography variant="caption" color="text.secondary">ops (RFC-6902):</Typography>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(s.ops, null, 2)}</pre>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="contained" onClick={() => accept(s)} disabled={!draft || !isPending(s)}>
                          Aceitar
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained" 
                          sx={{ 
                            backgroundColor: '#9e9e9e', 
                            color: 'white',
                            '&:hover': { backgroundColor: '#757575' }
                          }} 
                          onClick={() => reject(s)} 
                          disabled={!draft || !isPending(s)}
                        >
                          Rejeitar
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </MainCard>
    </Box>
  );
}
