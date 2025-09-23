// src/pages/ai-docs/A4Playground.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, Alert, CircularProgress, Paper, Stack, Typography, 
  TextField, Button, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import MainCard from 'components/MainCard';
import A4Editor from 'components/A4Editor';
import CheckedIcon from 'components/icons/CheckedIcon';
import UncheckedIcon from 'components/icons/UncheckedIcon';
import { useAnchoredSuggestions, useAnchoredOps, useAnchoredFindings, type AnchoredSuggestion, type AnchoredOp, type AnchoredFinding } from 'hooks/useAnchoredSuggestions';
import { useWebSocket } from 'hooks/useWebSocket';
import { 
  listChatMessages, 
  postChatMessage, 
  acceptSuggestion, 
  rejectSuggestion,
  acceptSuggestionOps,
  rejectSuggestionOps,
  updateDraft,
  getDraft,
  type AiChatMessage,
  type AiSuggestion,
  type AiChatResponse,
  type AnalysisFinding
} from 'api/aiDocs';
import { openSnackbar } from 'api/snackbar';
import axios from 'utils/axios';



export default function A4Playground() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Chat states
  const [chat, setChat] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [findings, setFindings] = useState<AnalysisFinding[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Sugestões ancoradas - garante que documento tenha content para alinhamento correto com A4Editor
  const docForAnchors = (doc && (doc as any).blocks && !(doc as any).content)
    ? { ...doc, content: (doc as any).blocks }
    : doc;
  const anchored = useAnchoredSuggestions(docForAnchors, suggestions || []);
  const opAnchored = useAnchoredOps(docForAnchors, suggestions || []);
  const findingAnchored = useAnchoredFindings(docForAnchors, findings || []);

  // WebSocket para receber checklists em tempo real
  const { isConnected: wsConnected } = useWebSocket({
    sessionId: sessionId || undefined,
    caseId: caseId || undefined,
    onChecklist: (payload) => {
      // Criar uma nova mensagem com o checklist recebido
      const checklistMessage: AiChatMessage = {
        id: `ws-${Date.now()}`,
        role: 'assistant',
        text: payload.checklist.content,
        createdAt: new Date().toISOString(),
        refs: {
          mode: 'checklist',
          checklist: payload.checklist
        }
      };
      
      // Adicionar a mensagem ao histórico apenas se não existir uma mensagem similar
      setMessages(prev => {
        // Verifica se já existe uma mensagem com o mesmo conteúdo de checklist
        const exists = prev.some(msg => 
          msg.refs?.mode === 'checklist' && 
          msg.refs?.checklist?.id === payload.checklist.id
        );
        
        if (exists) {
          console.log('Checklist já existe, ignorando duplicação via WebSocket');
          return prev;
        }
        
        return [...prev, checklistMessage];
      });
      
      // Feedback visual
      openSnackbar({
        open: true,
        message: 'Checklist recebido em tempo real!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    },
    enabled: !!(sessionId || caseId)
  });

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
      ).filter(s => s.status === 'PENDING' || s.status === 'PARTIAL')); // Remove sugestões completamente processadas
      
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
      ).filter(s => s.status === 'PENDING' || s.status === 'PARTIAL')); // Remove sugestões completamente processadas
      
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
          setSessionId(data.data.sessionId); // Salva o sessionId para o WebSocket
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

  // Rola chat para baixo sempre que mensagens mudarem
  useEffect(() => {
    scrollChatToBottom();
  }, [messages]);

  // Função para rolar chat para baixo
  const scrollChatToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Função para fazer auto-scroll para o item marcado mais abaixo no checklist
  const scrollToLastCheckedItem = useCallback((checklistContainer: HTMLElement) => {
    const checkedItems = checklistContainer.querySelectorAll('[data-checked="true"]');
    if (checkedItems.length > 0) {
      const lastCheckedItem = checkedItems[checkedItems.length - 1] as HTMLElement;
      lastCheckedItem.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, []);

  // Função para remover sugestões completamente processadas
  const cleanupCompletedSuggestions = () => {
    setSuggestions(prev => prev.filter(s => s.status === 'PENDING' || s.status === 'PARTIAL'));
  };

  // Função para enviar mensagem do chat
  async function sendChat() {
    if (!caseId || !chat.trim()) return;
    
    const userMessage = chat.trim();
    
    // Limpa input imediatamente e adiciona mensagem do usuário em tempo real
    setChat('');
    const tempUserMessage: AiChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      text: userMessage,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);
    
    // Rola para baixo após adicionar mensagem
    setTimeout(scrollChatToBottom, 100);
    
    setChatLoading(true);
    try {
      const out = await postChatMessage(caseId, userMessage);

      // 0) pegue o draft ATUAL antes de ancorar sugestões/findings
      try {
        const fresh = await getDraft(out.data.draftId); // retorna { data: AiDraft }
        setDoc(fresh.json || fresh); // ajuste conforme seu shape
      } catch (e) {
        // se falhar, segue com o doc atual (anchors por snippet ainda podem salvar)
        console.warn('Falha ao buscar draft atual:', e);
      }

      // 1) atualiza histórico
      try {
        const updatedMessages = await listChatMessages(caseId);
        setMessages(updatedMessages);
        // Rola para baixo após atualizar mensagens
        setTimeout(scrollChatToBottom, 100);
      } catch { }

      // 2) processa resposta baseada no modo
      if (out.data.mode === 'chat') {
        // Modo análise: atualiza findings e limpa sugestões
        setFindings(out.data.findings || []);
        setSuggestions([]);
        
        // Feedback para findings
        const hasFindings = out.data.findings && out.data.findings.length > 0;
        if (hasFindings) {
          openSnackbar({ 
            open: true, 
            message: `${out.data.findings?.length || 0} item(ns) de análise encontrado(s). Veja os detalhes no chat.`, 
            variant: 'alert', 
            alert: { color: 'info' } 
          } as any);
        }
      } else {
        // Modo sugestão/both: usa data.suggestions
        const sugs = out.data.suggestions || [];
        setSuggestions(sugs);
        setFindings([]);
        
        // Feedback visual para sugestões
        const hasSuggestions = sugs.length > 0;
        if (hasSuggestions) {
          openSnackbar({ 
            open: true, 
            message: `${sugs.length} sugestão(ões) recebida(s). Use os botões no documento para aceitar/rejeitar.`, 
            variant: 'alert', 
            alert: { color: 'info' } 
          } as any);
        }
      }

      // Input já foi limpo no início da função
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
            findingAnchors={findingAnchored}
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
            maxHeight: '100%',
          }}
        >
          <Stack spacing={1.25} sx={{ height: '100%', overflow: 'hidden' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2">Chat</Typography>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: wsConnected ? 'success.main' : 'error.main',
                  animation: wsConnected ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.5 },
                    '100%': { opacity: 1 }
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {wsConnected ? 'Conectado' : 'Desconectado'}
              </Typography>
            </Stack>

            {/* histórico */}
            <Stack
              ref={chatContainerRef}
              spacing={1}
              sx={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}
            >
              {messages.map(m => {
                const isAssistant = m.role?.toLowerCase() === 'assistant';
                const hasChecklist = m.refs?.mode === 'checklist';
                
                return (
                  <Paper 
                    key={m.id} 
                    variant={isAssistant ? 'elevation' : 'outlined'} 
                    elevation={isAssistant ? 0 : undefined}
                    sx={{ 
                      p: 1, 
                      bgcolor: !isAssistant ? 'grey.50' : 'background.paper',
                      border: isAssistant ? 'none' : undefined
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {isAssistant ? 'Assistente' : 'Você'}
                    </Typography>
                    
                    {/* Renderizar checklist se existir */}
                    {hasChecklist && m.refs?.checklist ? (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.primary" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                          {m.refs.checklist.content}
                        </Typography>
                        <Box
                          sx={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper'
                          }}
                          ref={(el: HTMLDivElement | null) => {
                            if (el) {
                              // Auto-scroll para o último item marcado após renderização
                              setTimeout(() => scrollToLastCheckedItem(el), 100);
                            }
                          }}
                        >
                          <List dense sx={{ py: 0 }}>
                            {m.refs.checklist.items.map((item) => (
                              <ListItem 
                                key={item.id} 
                                sx={{ py: 0, px: 1 }}
                                data-checked={item.checked}
                              >
                                <ListItemIcon sx={{ minWidth: 24 }}>
                                  {item.checked ? (
                                    <CheckedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                  ) : (
                                    <UncheckedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  )}
                                </ListItemIcon>
                                <ListItemText 
                                  primary={
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        textDecoration: item.checked ? 'line-through' : 'none',
                                        color: item.checked ? 'text.secondary' : 'text.primary'
                                      }}
                                    >
                                      {item.content}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{color: 'text.primary',  whiteSpace: 'pre-wrap' }}>
                        {m.text}
                      </Typography>
                    )}
                  </Paper>
                );
              })}

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

              {/* Findings de análise */}
              {findings.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1, bgcolor: 'info.light', border: '2px solid', borderColor: 'info.main' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    Análise do Documento ({findings.length})
                  </Typography>
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    {findings.map(f => (
                      <Box key={f.id} sx={{ p: 0.5, bgcolor: 'background.paper', borderRadius: 0.5 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: f.severity === 'error' ? 'error.main' : f.severity === 'warn' ? 'warning.main' : 'info.main' }}>
                          {f.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {f.detail}
                        </Typography>
                        {f.evidence && f.evidence.length > 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                            "{f.evidence[0]}"
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