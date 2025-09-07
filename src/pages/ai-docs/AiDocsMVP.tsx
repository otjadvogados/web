// src/pages/ai-docs/AiDocsMVP.tsx
import { useState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MainCard from 'components/MainCard';
import LoadingTicker from 'components/LoadingTicker';
import { openSnackbar } from 'api/snackbar';

import {
  createTemplate,
  createCase,
  uploadCaseDoc,
  generateDraft,
  postChatMessage,
  acceptSuggestion,
  rejectSuggestion,
  updateDraft,
  exportDraft,
  getExportFileBlob,
  type AiDraft,
  type DraftJson,
  type AiSuggestion
} from 'api/aiDocs';

const emptyDraft: DraftJson = {
  enderecamento: '',
  qualificacao: '',
  fatos: '',
  fundamentos: '',
  pedidos: [],
  jurisprudencia: [],
  observacoes: ''
};

export default function AiDocsMVP() {
  // ===== Case =====
  const [caseType, setCaseType] = useState('acao-rescisoria');
  const [requestText, setRequestText] = useState('Preciso de uma petição de ação rescisória baseada no fato X ...');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseStatus, setCaseStatus] = useState<string | null>(null);

  // ===== Case Docs =====
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLoading, setDocLoading] = useState(false);

  // ===== Draft =====
  const [draft, setDraft] = useState<AiDraft | null>(null);
  const [draftJson, setDraftJson] = useState<DraftJson>(emptyDraft);
  const [genLoading, setGenLoading] = useState(false);
  const [showTicker, setShowTicker] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // ===== Chat =====
  const [chatText, setChatText] = useState('reforce os fundamentos com X e inclua jurisprudência Y');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  // ===== Export =====
  const [expLoading, setExpLoading] = useState(false);
  const [lastExportFileId, setLastExportFileId] = useState<string | null>(null);

  // Handlers
  async function handleCreateCase() {
    try {
      const c = await createCase({ type: caseType, requestText });
      setCaseId(c.id);
      setCaseStatus(c.status);
      openSnackbar({ open: true, message: 'Caso criado!', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    }
  }

  async function handleUploadDoc() {
    if (!caseId || !docFile) return;
    try {
      setDocLoading(true);
      await uploadCaseDoc(caseId, docFile);
      openSnackbar({ open: true, message: 'Documento anexado!', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setDocLoading(false); }
  }

  async function handleGenerate() {
    if (!caseId) return;
    try {
      setGenLoading(true);
      setShowTicker(true);
      const d = await generateDraft(caseId);
      setDraft(d);
      setDraftJson(d.json);
      openSnackbar({ open: true, message: 'Draft gerado!', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setGenLoading(false);
      // deixa o ticker respirar 1 seg e some
      setTimeout(() => setShowTicker(false), 1000);
    }
  }

  async function handleSaveDraft() {
    if (!draft) return;
    try {
      setSaveLoading(true);
      const updated = await updateDraft(draft.id, { json: draftJson });
      setDraft(updated);
      setDraftJson(updated.json);
      openSnackbar({ open: true, message: 'Rascunho salvo!', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setSaveLoading(false); }
  }

  async function handleChat() {
    if (!caseId) return;
    try {
      setChatLoading(true);
      const out = await postChatMessage(caseId, chatText.trim());
      if (out.draftId && draft && out.draftId !== draft.id) {
        // Se o backend abriu sessão para outro draft (ex.: mais novo), considere buscar…
      }
      setSuggestions(out.suggestions || []);
      openSnackbar({ open: true, message: `Geradas ${out.suggestions?.length || 0} sugestão(ões).`, variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setChatLoading(false); }
  }

  async function onAccept(sug: AiSuggestion) {
    if (!draft) return;
    try {
      const res = await acceptSuggestion(draft.id, sug.id);
      setDraft(res.draft);
      setDraftJson(res.draft.json);
      setSuggestions((prev) => prev.map((s) => (s.id === sug.id ? { ...s, status: 'ACCEPTED' } : s)));
      openSnackbar({ open: true, message: 'Sugestão aplicada!', variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    }
  }

  async function onReject(sug: AiSuggestion) {
    if (!draft) return;
    try {
      await rejectSuggestion(draft.id, sug.id);
      setSuggestions((prev) => prev.map((s) => (s.id === sug.id ? { ...s, status: 'REJECTED' } : s)));
      openSnackbar({ open: true, message: 'Sugestão rejeitada.', variant: 'alert', alert: { color: 'info' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    }
  }

  async function handleExport(kind: 'DOCX'|'PDF') {
    if (!draft) return;
    try {
      setExpLoading(true);
      const ex = await exportDraft(draft.id, kind);
      setLastExportFileId(ex.fileId || null);
      openSnackbar({ open: true, message: `Export ${kind} gerado (fileId: ${ex.fileId || '—'})`, variant: 'alert', alert: { color: 'success' } } as any);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally { setExpLoading(false); }
  }

  // === Abrir/baixar o export via BLOB autenticado (sem expor URL da API) ===
  async function openLastExport() {
    if (!lastExportFileId) return;
    try {
      setExpLoading(true);
      const { blob } = await getExportFileBlob(lastExportFileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // revoga depois de um tempo pra liberar memória
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setExpLoading(false);
    }
  }

  async function downloadLastExport() {
    if (!lastExportFileId) return;
    try {
      setExpLoading(true);
      const { blob, filename } = await getExportFileBlob(lastExportFileId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'documento.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setExpLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
      {/* 1) Case */}
      <MainCard title="1) Criar Caso (Advogado)">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Tipo" value={caseType} onChange={(e) => setCaseType(e.target.value)} sx={{ minWidth: 220 }} />
            <Button variant="contained" onClick={handleCreateCase}>Criar Caso</Button>
            {caseId && <Chip label={`caseId: ${caseId}`} />}
            {caseStatus && <Chip label={`status: ${caseStatus}`} color="info" />}
          </Stack>
          <TextField label="Pedido (linguagem natural)" multiline minRows={3} value={requestText} onChange={(e) => setRequestText(e.target.value)} />
        </Stack>
      </MainCard>

      {/* 2) Upload de Documentos do Caso */}
      <MainCard title="2) (Opcional) Anexar PDFs ao Caso">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-end' }}>
          <Button component="label" variant="outlined" disabled={!caseId}>
            {docFile ? docFile.name : 'Selecionar PDF do Caso'}
            <input type="file" accept="application/pdf" hidden onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
          </Button>
          <Button onClick={handleUploadDoc} variant="contained" disabled={!caseId || !docFile || docLoading}>
            {docLoading ? <CircularProgress size={18} /> : 'Anexar'}
          </Button>
          {!caseId && <Typography variant="caption" color="text.secondary">Crie o caso primeiro</Typography>}
        </Stack>
      </MainCard>

      {/* 3) Gerar Rascunho */}
      <MainCard title="3) Gerar Rascunho (RAG com Templates + Docs do Caso)">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Button variant="contained" onClick={handleGenerate} disabled={!caseId || genLoading}>
            {genLoading ? <CircularProgress size={18} /> : 'Gerar rascunho'}
          </Button>
          <Typography variant="body2" color="text.secondary">(usa templates cadastrados automaticamente)</Typography>
          {draft && (
            <Stack direction="row" spacing={1}>
              <Chip label={`draftId: ${draft.id}`} color="success" variant="outlined" />
              <Chip label={`versão: ${draft.version}`} variant="outlined" />
            </Stack>
          )}
        </Stack>

        {(genLoading || showTicker) && (
          <Box sx={{ mt: 1 }}>
            <LoadingTicker
              running={genLoading || showTicker}
              size="medium"
              showSpinner={true}
              spinnerSize={18}
              // Se quiser customizar as frases, passe "script={[...]}"
            />
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Editor simples do JSON */}
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Endereçamento" value={draftJson.enderecamento} onChange={(e) => setDraftJson({ ...draftJson, enderecamento: e.target.value })} fullWidth multiline minRows={2} />
            <TextField label="Qualificação" value={draftJson.qualificacao} onChange={(e) => setDraftJson({ ...draftJson, qualificacao: e.target.value })} fullWidth multiline minRows={2} />
          </Stack>
          <TextField label="Fatos" value={draftJson.fatos} onChange={(e) => setDraftJson({ ...draftJson, fatos: e.target.value })} fullWidth multiline minRows={3} />
          <TextField label="Fundamentos" value={draftJson.fundamentos} onChange={(e) => setDraftJson({ ...draftJson, fundamentos: e.target.value })} fullWidth multiline minRows={3} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Pedidos (um por linha)" value={(draftJson.pedidos || []).join('\n')} onChange={(e) => setDraftJson({ ...draftJson, pedidos: e.target.value.split('\n').filter(Boolean) })} fullWidth multiline minRows={3} />
            <TextField label="Jurisprudência (uma por linha)" value={(draftJson.jurisprudencia || []).join('\n')} onChange={(e) => setDraftJson({ ...draftJson, jurisprudencia: e.target.value.split('\n').filter(Boolean) })} fullWidth multiline minRows={3} />
          </Stack>
          <TextField label="Observações" value={draftJson.observacoes} onChange={(e) => setDraftJson({ ...draftJson, observacoes: e.target.value })} fullWidth multiline minRows={2} />
          <Stack direction="row" spacing={1}>
            <Button onClick={handleSaveDraft} variant="contained" disabled={!draft || saveLoading}>
              {saveLoading ? <CircularProgress size={18} /> : 'Salvar rascunho'}
            </Button>
            {draft && <Chip label={`versão atual: ${draft.version}`} />}
          </Stack>
        </Stack>
      </MainCard>

      {/* 4) Chat & Sugestões */}
      <MainCard title="4) Chat do Caso (Sugestões em JSON-Patch)">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <TextField label="Mensagem" value={chatText} onChange={(e) => setChatText(e.target.value)} fullWidth />
          <Button variant="contained" onClick={handleChat} disabled={!caseId || !draft || chatLoading}>
            {chatLoading ? <CircularProgress size={18} /> : 'Enviar'}
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          {suggestions.map((s) => (
            <Paper key={s.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={s.status} color={s.status === 'PENDING' ? 'warning' : s.status === 'ACCEPTED' ? 'success' : 'default'} />
                  {typeof s.confidence === 'number' && (
                    <Chip size="small" label={`conf: ${(s.confidence * 100).toFixed(0)}%`} variant="outlined" />
                  )}
                  {!!s.targets?.length && <Chip size="small" variant="outlined" label={`alvo: ${s.targets.join(', ')}`}/>}                    
                </Stack>
                {s.rationale && <Typography variant="body2" color="text.secondary">{s.rationale}</Typography>}
                <Box sx={{ p: 1, bgcolor: 'grey.50', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">ops (RFC-6902):</Typography>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(s.ops, null, 2)}</pre>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="contained" onClick={() => onAccept(s)} disabled={!draft || s.status !== 'PENDING'}>Aceitar</Button>
                  <Button size="small" color="secondary" onClick={() => onReject(s)} disabled={!draft || s.status !== 'PENDING'}>Rejeitar</Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
          {!suggestions.length && (
            <Typography variant="body2" color="text.secondary">Sem sugestões no momento.</Typography>
          )}
        </Stack>
      </MainCard>

      {/* 5) Export */}
      <MainCard title="5) Exportar">
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={() => handleExport('DOCX')} disabled={!draft || expLoading}>DOCX</Button>
            <Button variant="outlined" onClick={() => handleExport('PDF')} disabled={!draft || expLoading}>PDF</Button>
            {expLoading && <CircularProgress size={18} />}
          </Stack>
          {lastExportFileId && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">Documento exportado:</Typography>
              <Button onClick={openLastExport} variant="outlined" size="small" disabled={expLoading}>
                Abrir
              </Button>
              <Button onClick={downloadLastExport} variant="outlined" size="small" disabled={expLoading}>
                Baixar
              </Button>
            </Stack>
          )}
        </Stack>
      </MainCard>
    </Stack>
  );
}
