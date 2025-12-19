import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import FileSearchOutlined from '@ant-design/icons/FileSearchOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import { getTranscription, summarizeTranscription, TranscriptionRecord, SummarizeResponse, SummaryJson } from 'api/aiTranscribe';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  transcriptionId: string;
};

export default function TranscriptionViewDialog({ open, onClose, transcriptionId }: Props) {
  const [transcription, setTranscription] = useState<TranscriptionRecord | null>(null);
  const [summary, setSummary] = useState<SummarizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [promptTemplate, setPromptTemplate] = useState<string>('');

  useEffect(() => {
    if (open && transcriptionId) {
      loadTranscription();
    } else {
      // Reset when dialog closes
      setTranscription(null);
      setSummary(null);
      setPromptTemplate('');
    }
  }, [open, transcriptionId]);

  const loadTranscription = async () => {
    try {
      setLoading(true);
      const data = await getTranscription(transcriptionId);
      setTranscription(data);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao carregar transcrição',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!transcription?.text) {
      openSnackbar({
        open: true,
        message: 'Nenhum texto de transcrição disponível para resumir',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }

    try {
      setSummarizing(true);
      const params: any = {};
      if (promptTemplate.trim()) params.promptTemplate = promptTemplate.trim();

      const result = await summarizeTranscription(transcriptionId, params);
      console.log('Resumo recebido:', result); // Debug
      
      // Normaliza a resposta: se vier os campos do SummaryJson na raiz, move para summary
      let normalizedResult: SummarizeResponse;
      if (result && typeof result === 'object' && ('objetivo' in result || 'pontosChave' in result || 'resumo' in result)) {
        // Se tem campos do SummaryJson na raiz e não tem campo summary, move para summary
        if (!('summary' in result)) {
          const { model, tokensUsed, ...summaryData } = result as any;
          normalizedResult = {
            summary: summaryData as SummaryJson,
            model,
            tokensUsed
          };
        } else {
          normalizedResult = result;
        }
      } else {
        normalizedResult = result;
      }
      
      setSummary(normalizedResult);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || err?.message || 'Falha ao gerar resumo',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSummarizing(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    openSnackbar({
      open: true,
      message: 'Texto copiado para a área de transferência!',
      variant: 'alert',
      alert: { color: 'success' }
    } as any);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseSummary = (response: SummarizeResponse | string | SummaryJson): SummaryJson | null => {
    if (typeof response === 'object' && response !== null) {
      // Se tem campos do SummaryJson na raiz (objetivo, pontosChave, resumo, etc)
      if ('objetivo' in response || 'pontosChave' in response || 'resumo' in response) {
        // Extrai apenas os campos do SummaryJson, ignorando model e tokensUsed
        const { model, tokensUsed, summary, ...summaryFields } = response as any;
        return summaryFields as SummaryJson;
      }
      // Se tem campo summary, extrai ele
      if ('summary' in response) {
        const summary = (response as any).summary;
        if (typeof summary === 'object' && summary !== null) {
          return summary as SummaryJson;
        }
        if (typeof summary === 'string') {
          try {
            return JSON.parse(summary) as SummaryJson;
          } catch {
            return null;
          }
        }
      }
    }
    if (typeof response === 'string') {
      try {
        return JSON.parse(response) as SummaryJson;
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'white',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <FileTextOutlined />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Detalhes da Transcrição
              </Typography>
              {transcription?.filename && (
                <Typography variant="body2" color="text.secondary">
                  {transcription.filename}
                </Typography>
              )}
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <CloseOutlined />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : transcription ? (
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Informações */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {transcription.language && <Chip label={`Idioma: ${transcription.language}`} size="small" />}
                  {transcription.durationSeconds && (
                    <Chip label={`Duração: ${formatDuration(transcription.durationSeconds)}`} size="small" />
                  )}
                  <Chip label={`Criado: ${formatDate(transcription.createdAt)}`} size="small" />
                </Stack>
              </Stack>
            </Paper>

            {/* Transcrição Completa */}
            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Texto Transcrito
                </Typography>
                {transcription.text && (
                  <Button
                    size="small"
                    startIcon={<CopyOutlined />}
                    onClick={() => handleCopyText(transcription.text || '')}
                  >
                    Copiar
                  </Button>
                )}
              </Stack>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  minHeight: 200,
                  maxHeight: 400,
                  overflow: 'auto'
                }}
              >
                {transcription.text ? (
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {transcription.text}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Transcrição não disponível ou ainda em processamento...
                  </Typography>
                )}
              </Paper>
            </Box>

            <Divider />

            {/* Resumo */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Gerar Resumo
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Template de Prompt (opcional)"
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  fullWidth
                  multiline
                  rows={3}
                  size="small"
                  placeholder="Ex: Faça um resumo executivo:\n\n{{TRANSCRIPTION}}"
                />

                <Button
                  variant="outlined"
                  startIcon={summarizing ? <CircularProgress size={16} /> : <FileSearchOutlined />}
                  onClick={handleSummarize}
                  disabled={!transcription.text || summarizing}
                >
                  {summarizing ? 'Gerando Resumo...' : 'Gerar Resumo'}
                </Button>

                {summary && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                      Resumo
                    </Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: 'primary.lighter',
                        minHeight: 150,
                        maxHeight: 500,
                        overflow: 'auto'
                      }}
                    >
                      {(() => {
                        const parsed = parseSummary(summary);
                        if (parsed) {
                          // Exibe de forma estruturada
                          return (
                            <Stack spacing={2}>
                              {parsed.objetivo && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Objetivo
                                  </Typography>
                                  <Typography variant="body2">{parsed.objetivo}</Typography>
                                </Box>
                              )}

                              {parsed.pontosChave && parsed.pontosChave.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Pontos Chave
                                  </Typography>
                                  <List dense sx={{ py: 0 }}>
                                    {parsed.pontosChave.map((ponto, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={
                                            <Typography variant="body2" component="span">
                                              • {ponto}
                                            </Typography>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}

                              {parsed.acoes && parsed.acoes.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Ações
                                  </Typography>
                                  <List dense sx={{ py: 0 }}>
                                    {parsed.acoes.map((acao, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={
                                            <Typography variant="body2" component="span">
                                              • {acao}
                                            </Typography>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}

                              {parsed.citacoes && parsed.citacoes.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Citações
                                  </Typography>
                                  <List dense sx={{ py: 0 }}>
                                    {parsed.citacoes.map((citacao, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={
                                            <Typography variant="body2" component="span" sx={{ fontStyle: 'italic' }}>
                                              "{citacao}"
                                            </Typography>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}

                              {parsed.tarefas && parsed.tarefas.length > 0 && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Tarefas
                                  </Typography>
                                  <List dense sx={{ py: 0 }}>
                                    {parsed.tarefas.map((tarefa, idx) => (
                                      <ListItem key={idx} sx={{ py: 0.25, px: 0 }}>
                                        <ListItemText
                                          primary={
                                            <Typography variant="body2" component="span">
                                              • {tarefa.descricao}
                                              {tarefa.responsavel && (
                                                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                  (Responsável: {tarefa.responsavel})
                                                </Typography>
                                              )}
                                            </Typography>
                                          }
                                        />
                                      </ListItem>
                                    ))}
                                  </List>
                                </Box>
                              )}

                              {parsed.resumo && (
                                <Box>
                                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                                    Resumo
                                  </Typography>
                                  <Typography variant="body2">{parsed.resumo}</Typography>
                                </Box>
                              )}
                            </Stack>
                          );
                        } else {
                          // Fallback: exibe como JSON formatado ou texto
                          const summaryText = typeof summary.summary === 'string' ? summary.summary : JSON.stringify(summary.summary, null, 2);
                          return (
                            <Typography
                              variant="body2"
                              component="pre"
                              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.875rem' }}
                            >
                              {summaryText}
                            </Typography>
                          );
                        }
                      })()}
                      {summary.tokensUsed && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                          Tokens usados: {summary.tokensUsed}
                        </Typography>
                      )}
                    </Paper>
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <Typography variant="body2" color="text.secondary">
              Não foi possível carregar a transcrição
            </Typography>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

