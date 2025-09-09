// src/pages/ai-docs/EditorChatPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
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
  type DraftJson,
  type AiSuggestion
} from 'api/aiDocs';

const EMPTY: DraftJson = {
  enderecamento: '',
  qualificacao: '',
  fatos: '',
  fundamentos: '',
  pedidos: [],
  jurisprudencia: [],
  observacoes: ''
};

const SECTIONS: Array<{ key: keyof DraftJson; label: string; multiline?: boolean }> = [
  { key: 'enderecamento', label: 'Endereçamento', multiline: true },
  { key: 'qualificacao', label: 'Qualificação', multiline: true },
  { key: 'fatos', label: 'Fatos', multiline: true },
  { key: 'fundamentos', label: 'Fundamentos', multiline: true },
  { key: 'pedidos', label: 'Pedidos', multiline: true },
  { key: 'jurisprudencia', label: 'Jurisprudência', multiline: true },
  { key: 'observacoes', label: 'Observações', multiline: true }
];

export default function EditorChatPage() {
  const [params] = useSearchParams();
  const caseId = params.get('caseId');
  const templateId = params.get('templateId') || undefined;
  const pedido = params.get('pedido') ? decodeURIComponent(params.get('pedido') as string) : '';

  const [genLoading, setGenLoading] = useState(true);
  const [ticker, setTicker] = useState(true);
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [json, setJson] = useState<DraftJson>(EMPTY);
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

  // refs para "sumário" rolar até a seção
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ======================= INIT (gera rascunho) =======================
  useEffect(() => {
    (async () => {
      if (!caseId) return;
      try {
        setGenLoading(true);
        setTicker(true);
        const d = await generateDraft(caseId, templateId);
        setDraft(d);
        setJson(d.json);
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
      const updated = await updateDraft(draft.id, { json });
      setDraft(updated);
      setJson(updated.json);
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
      openSnackbar({ open: true, message: `Geradas ${out.suggestions?.length || 0} sugestão(ões)`, variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setChatLoading(false); }
  }

  async function accept(s: AiSuggestion) {
    if (!draft) return;
    try {
      const res = await acceptSuggestion(draft.id, s.id);
      setDraft(res.draft);
      setJson(res.draft.json);
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

  // ======================= UI helpers =======================
  const outline = useMemo(
    () => [
      { k: 'enderecamento', t: 'Endereçamento' },
      { k: 'qualificacao', t: 'Qualificação' },
      { k: 'fatos', t: 'Fatos' },
      { k: 'fundamentos', t: 'Fundamentos' },
      { k: 'pedidos', t: 'Pedidos' },
      { k: 'jurisprudencia', t: 'Jurisprudência' },
      { k: 'observacoes', t: 'Observações' }
    ],
    []
  );
  const scrollTo = (key: string) => {
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

        {/* Layout 3 colunas: sumário | editor | chat */}
        <Stack direction="row" spacing={2} alignItems="stretch">
          {/* SUMÁRIO */}
          <Paper variant="outlined" sx={{ p: 1.25, width: 260, position: 'sticky', top: 88, height: 'calc(100vh - 140px)', overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Estrutura do documento</Typography>
            <Stack spacing={0.5}>
              {outline.map((o) => (
                <Button key={o.k} onClick={() => scrollTo(o.k)} sx={{ justifyContent: 'flex-start' }} size="small" variant="text">
                  {o.t}
                </Button>
              ))}
            </Stack>
          </Paper>

          {/* EDITOR */}
          <Paper variant="outlined" sx={{ p: 2, flex: 1, minHeight: '70vh' }}>
            {!draft ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '40vh' }}>
                <CircularProgress />
              </Stack>
            ) : (
              <Stack spacing={2}>
                <Typography variant="h5" fontWeight={700}>Minuta gerada pela IA</Typography>
                <Divider />
                {SECTIONS.map((s) => {
                  const value =
                    s.key === 'pedidos'
                      ? (json.pedidos || []).join('\n')
                      : s.key === 'jurisprudencia'
                      ? (json.jurisprudencia || []).join('\n')
                      : (json[s.key] as string);
                  return (
                    <Box key={s.key as string} ref={(el) => (sectionRefs.current[s.key as string] = el)}>
                      <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{s.label}</Typography>
                      <TextField
                        value={value}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (s.key === 'pedidos') {
                            setJson((prev) => ({ ...prev, pedidos: v.split('\n').filter(Boolean) }));
                          } else if (s.key === 'jurisprudencia') {
                            setJson((prev) => ({ ...prev, jurisprudencia: v.split('\n').filter(Boolean) }));
                          } else {
                            setJson((prev) => ({ ...prev, [s.key]: v }));
                          }
                        }}
                        fullWidth
                        multiline
                        minRows={s.multiline ? 3 : 1}
                        placeholder={`Escreva a seção "${s.label}"...`}
                      />
                    </Box>
                  );
                })}
                <Stack direction="row" spacing={1}>
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
              </Stack>
            )}
          </Paper>

          {/* CHAT */}
          <Paper variant="outlined" sx={{ p: 1.5, width: 360 }}>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">Chat</Typography>
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
                        <Button size="small" variant="contained" onClick={() => accept(s)} disabled={!draft || s.status !== 'PENDING'}>
                          Aceitar
                        </Button>
                        <Button size="small" color="secondary" onClick={() => reject(s)} disabled={!draft || s.status !== 'PENDING'}>
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
