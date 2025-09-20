// src/pages/ai-docs/A4Playground.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, Alert, CircularProgress, Paper, Stack, Typography, 
  TextField, Button
} from '@mui/material';
import MainCard from 'components/MainCard';
import A4Editor from 'components/A4Editor';
import { useAnchoredSuggestions, useAnchoredOps, type AnchoredSuggestion, type AnchoredOp } from 'hooks/useAnchoredSuggestions';
import { 
  listChatMessages, 
  postChatMessage, 
  acceptSuggestion, 
  rejectSuggestion,
  acceptSuggestionOps,
  rejectSuggestionOps,
  updateDraft,
  type AiChatMessage,
  type AiSuggestion 
} from 'api/aiDocs';
import { openSnackbar } from 'api/snackbar';
import axios from 'utils/axios';



export default function A4Playground() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  
  // Chat states
  const [chat, setChat] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  
  // Sugestões ancoradas - garante que documento tenha content para alinhamento correto com A4Editor
  const docForAnchors = (doc && (doc as any).blocks && !(doc as any).content)
    ? { ...doc, content: (doc as any).blocks }
    : doc;
  const anchored = useAnchoredSuggestions(docForAnchors, suggestions || []);
  const opAnchored = useAnchoredOps(docForAnchors, suggestions || []);

  // Função para aceitar sugestão
  async function onAcceptAnchored(suggestion: AnchoredSuggestion) {
    if (!id) {
      openSnackbar({ 
        open: true, 
        message: 'ID do draft não encontrado', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
      return;
    }
    try {
      const res = await acceptSuggestion(id, suggestion.id);
      
      // Atualiza o documento com o que veio do back
      const nextDoc = res?.data?.draft?.json ?? null;
      if (nextDoc) {
        setDoc(nextDoc);
      }
      
      // Remove a sugestão aceita da lista local
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      openSnackbar({ 
        open: true, 
        message: 'Sugestão aceita com sucesso!', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || err?.message || 'Erro ao aceitar sugestão', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  }

  // Função para rejeitar sugestão
  async function onRejectAnchored(suggestion: AnchoredSuggestion) {
    if (!id) {
      openSnackbar({ 
        open: true, 
        message: 'ID do draft não encontrado', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
      return;
    }
    try {
      await rejectSuggestion(id, suggestion.id);
      
      // Remove a sugestão rejeitada da lista local
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      openSnackbar({ 
        open: true, 
        message: 'Sugestão rejeitada.', 
        variant: 'alert', 
        alert: { color: 'info' } 
      } as any);
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || err?.message || 'Erro ao rejeitar sugestão', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  }

  // Função para aceitar operação individual
  async function onAcceptOp(aop: AnchoredOp) {
    if (!id) {
      openSnackbar({ 
        open: true, 
        message: 'ID do draft não encontrado', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
      return;
    }
    try {
      const res = await acceptSuggestionOps(id, aop.suggestionId, [aop.opId]);
      
      // Atualiza o documento com o que veio do back
      const nextDoc = res?.data?.draft?.json ?? null;
      if (nextDoc) {
        setDoc(nextDoc);
      }
      
      // Atualiza a sugestão com o novo status das ops
      setSuggestions(prev => prev.map(s => 
        s.id === res.data.suggestion.id ? res.data.suggestion : s
      ));
      
      openSnackbar({ 
        open: true, 
        message: 'Operação aceita com sucesso!', 
        variant: 'alert', 
        alert: { color: 'success' } 
      } as any);
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || err?.message || 'Erro ao aceitar operação', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  }

  // Função para rejeitar operação individual
  async function onRejectOp(aop: AnchoredOp) {
    if (!id) {
      openSnackbar({ 
        open: true, 
        message: 'ID do draft não encontrado', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
      return;
    }
    try {
      const res = await rejectSuggestionOps(id, aop.suggestionId, [aop.opId]);
      
      // Atualiza a sugestão com o novo status das ops
      setSuggestions(prev => prev.map(s => 
        s.id === res.data.suggestion.id ? res.data.suggestion : s
      ));
      
      openSnackbar({ 
        open: true, 
        message: 'Operação rejeitada.', 
        variant: 'alert', 
        alert: { color: 'info' } 
      } as any);
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || err?.message || 'Erro ao rejeitar operação', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    }
  }

  // carregar dados da API
  useEffect(() => {
    if (!id) {
      setApiError('ID do draft não fornecido');
      return;
    }

    const loadFromApi = async () => {
      setLoading(true);
      setApiError(null);
      
      try {
        const response = await axios.get(`/ai/drafts/${id}`);
        const data = response.data;
        
        if (data?.data?.json) {
          // Usa apenas o conteúdo da prop json
          setDoc(data.data.json);
          setCaseId(data.data.caseId); // Salva o caseId para o chat
        } else {
          setApiError('Resposta da API não contém dados válidos');
        }
      } catch (err: any) {
        setApiError(err?.response?.data?.message || err?.message || 'Erro ao carregar dados da API');
      } finally {
        setLoading(false);
      }
    };

    loadFromApi();
  }, [id]);

  // carrega histórico do chat
  useEffect(() => {
    if (!caseId) return;
    
    const loadChatMessages = async () => {
      try {
        const chatMessages = await listChatMessages(caseId);
        setMessages(chatMessages);
      } catch (error) {
        console.error('Erro ao carregar mensagens do chat:', error);
      }
    };

    loadChatMessages();
  }, [caseId]);

  // Função para enviar mensagem do chat
  async function sendChat() {
    if (!caseId || !chat.trim()) return;
    
    setChatLoading(true);
    try {
      const out = await postChatMessage(caseId, chat.trim());

      // 1) atualiza histórico
      try {
        setMessages(await listChatMessages(caseId));
      } catch { }

      // 2) aplica sugestões vindas desta rodada na UI (mantenha os paths originais (/blocks/<id>/...) para ancorar por ID)
      setSuggestions(out.suggestions || []);

      // 3) feedback visual
      const hasSuggestions = out.suggestions && out.suggestions.length > 0;
      if (hasSuggestions) {
        openSnackbar({ 
          open: true, 
          message: `${out.suggestions.length} sugestão(ões) recebida(s). Use os botões no documento para aceitar/rejeitar.`, 
          variant: 'alert', 
          alert: { color: 'info' } 
        } as any);
      }

      setChat(''); // limpa input
    } catch (err: any) {
      openSnackbar({ 
        open: true, 
        message: err?.response?.data?.message || err?.message || 'Erro ao enviar mensagem', 
        variant: 'alert', 
        alert: { color: 'error' } 
      } as any);
    } finally {
      setChatLoading(false);
    }
  }



  return (
    <Box sx={{ p: { xs: 1, md: 3 }, pr: { md: '400px' } }}>
      <MainCard title="Prévia do Documento">
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError(null)}>
            {apiError}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <CircularProgress />
          </Box>
        ) : doc ? (
          <A4Editor
            value={doc}
            onChange={setDoc}
            anchors={anchored}
            onAcceptSuggestion={onAcceptAnchored}
            onRejectSuggestion={onRejectAnchored}
            opAnchors={opAnchored}
            onAcceptOp={onAcceptOp}
            onRejectOp={onRejectOp}
          />
        ) : (
          <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
            Nenhum documento para exibir
          </Box>
        )}
      </MainCard>

      {/* CHAT FLUTUANTE */}
      <Box sx={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        width: '360px',
        height: 'calc(100vh - 104px)',
        zIndex: 1000,
        display: { xs: 'none', md: 'block' }
      }}>
        <Paper
          variant="outlined"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: 1.5,
            maxHeight: '70vh',
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
                  <Typography variant="caption" color="text.secondary">
                    {m.role === 'assistant' ? 'Assistente' : 'Você'}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </Typography>
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
                placeholder="Peça ajustes no documento..."
                multiline
                minRows={3}
                fullWidth
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <Button
                onClick={sendChat}
                disabled={chatLoading || !caseId || !chat.trim()}
                fullWidth
                sx={{ mt: 1 }}
              >
                {chatLoading ? 'Enviando…' : 'Enviar (Ctrl+Enter)'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
