import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Stack, Typography, Paper, Divider, TextField, Button, Chip, IconButton, MenuItem, Select } from '@mui/material';
import { SaveOutlined, FilePdfOutlined, FileWordOutlined } from '@ant-design/icons';
import MainCard from 'components/MainCard';
import LoadingTicker from 'components/LoadingTicker';
import { openSnackbar } from 'api/snackbar';

import type { WDoc, WBlock, WRun, AiDraft, AiSuggestion } from 'types/wdoc';
import {
  generateDraft,
  updateDraft,
  exportDraft,
  getExportFileBlob,
  postChatMessage,
  acceptSuggestion,
  rejectSuggestion
} from 'api/aiDocs';

export default function WDocEditorPage() {
  const [params] = useSearchParams();
  const caseId = params.get('caseId')!;
  const templateId = params.get('templateId') || undefined;

  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [json, setJson] = useState<WDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [expLoading, setExpLoading] = useState(false);
  const [lastFileId, setLastFileId] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(true);
  const [showTicker, setShowTicker] = useState(true);

  const [chat, setChat] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setGenLoading(true);
        setShowTicker(true);
        const d = await generateDraft(caseId, templateId);
        setDraft(d);
        setJson(d.json as WDoc);
        openSnackbar({ open: true, message: 'Documento gerado (WDoc).', variant: 'alert', alert: { color: 'success' } } as any);
      } catch (e: any) {
        openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setGenLoading(false);
        setShowTicker(false);
      }
    })();
  }, [caseId, templateId]);

  async function save() {
    if (!draft || !json) return;
    setSaving(true);
    try {
      const updated = await updateDraft(draft.id, { json });
      setDraft(updated);
      setJson(updated.json as WDoc);
      openSnackbar({ open: true, message: 'Rascunho salvo', variant: 'alert', alert: { color: 'success' } } as any);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(kind: 'DOCX'|'PDF') {
    if (!draft) return;
    setExpLoading(true);
    try {
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
      setSuggestions(out.suggestions || []);
    } finally {
      setChatLoading(false);
    }
  }

  const styleKeys = useMemo(() => Object.keys(json?.styles || {}), [json]);

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
          {/* Outline */}
          <Paper variant="outlined" sx={{ p: 1.25, width: 260 }}>
            <Typography variant="subtitle2">Estrutura</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Button size="small" onClick={() => addBlock('heading')}>+ Heading</Button>
              <Button size="small" onClick={() => addBlock('paragraph')}>+ Parágrafo</Button>
              <Button size="small" onClick={() => addBlock('bulletList')}>+ Lista com marcadores</Button>
            </Stack>
          </Paper>

          {/* Editor */}
          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Stack spacing={2}>
              {json.content.map((b, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip size="small" label={b.type} />
                    <Select
                      size="small"
                      value={(b as any).style || ''}
                      onChange={(e) => updateBlock(i, { ...(b as any), style: String(e.target.value) })}
                    >
                      {styleKeys.map((k) => (
                        <MenuItem key={k} value={k}>{k}</MenuItem>
                      ))}
                    </Select>
                  </Stack>

                  {b.type === 'heading' && (
                    <TextField
                      fullWidth
                      value={(b as any).text || ''}
                      onChange={(e) => updateBlock(i, { ...(b as any), text: e.target.value })}
                    />
                  )}

                  {b.type === 'paragraph' && (
                    <TextField
                      fullWidth multiline minRows={2}
                      value={((b as any).runs?.map((r: WRun) => r.text).join('')) || (b as any).text || ''}
                      onChange={(e) => updateBlock(i, { ...(b as any), runs: [{ text: e.target.value }] })}
                    />
                  )}

                  {(b.type === 'bulletList' || b.type === 'numberedList') && (
                    <Stack spacing={1}>
                      {(((b as any).items as { runs: WRun[] }[]) || [{ runs: [{ text: '' }] }]).map((it, idx) => (
                        <TextField
                          key={idx}
                          value={it.runs?.map((r) => r.text).join('') || ''}
                          onChange={(e) => {
                            const next = [ ...(((b as any).items as { runs: WRun[] }[]) || []) ];
                            next[idx] = { runs: [{ text: e.target.value }] };
                            updateBlock(i, { ...(b as any), items: next });
                          }}
                        />
                      ))}
                      <Button
                        size="small"
                        onClick={() => {
                          const current = ((b as any).items as { runs: WRun[] }[]) || [];
                          updateBlock(i, { ...(b as any), items: [ ...current, { runs: [{ text: '' }] } ] });
                        }}
                      >
                        + Item
                      </Button>
                    </Stack>
                  )}
                </Paper>
              ))}
            </Stack>
          </Paper>

          {/* Chat */}
          <Paper variant="outlined" sx={{ p: 1.5, width: 360 }}>
            <Typography variant="subtitle2">Chat</Typography>
            <TextField value={chat} onChange={(e) => setChat(e.target.value)} multiline minRows={3} sx={{ mt: 1 }} />
            <Button sx={{ mt: 1 }} onClick={sendChat} disabled={chatLoading}>Enviar</Button>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Sugestões</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {suggestions.map((s) => (
                <Paper key={s.id} variant="outlined" sx={{ p: 1 }}>
                  <Typography variant="body2">{s.rationale || 'Sugestão'}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={async () => {
                        if (!draft) return;
                        const res = await acceptSuggestion(draft.id, s.id);
                        setDraft(res.draft);
                        setJson(res.draft.json as WDoc);
                      }}
                    >
                      Aceitar
                    </Button>
                    <Button
                      size="small"
                      onClick={async () => {
                        if (!draft) return;
                        await rejectSuggestion(draft.id, s.id);
                        setSuggestions((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: 'REJECTED' } : x)));
                      }}
                    >
                      Rejeitar
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Stack>
      </MainCard>
    </Box>
  );
}
