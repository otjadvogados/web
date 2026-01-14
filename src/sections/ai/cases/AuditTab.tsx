import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import {
  generateAudit,
  generateQuestions,
  getAudit,
  getQuestions,
  deleteQuestion,
  type Inconsistency,
  type UncomprehendedContext,
  type SuggestedQuestion,
  type QuestionPriority,
  type SpellingError,
  type PlaceholderIssue,
  type JurisprudenceIssue,
  type MissingTopicInfo
} from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';

type Props = {
  caseId: string;
  hasAudit?: boolean;
  hasQuestions?: boolean;
  onQuestionsGenerated?: (count: number) => void;
};

export default function AuditTab({ caseId, hasAudit, hasQuestions, onQuestionsGenerated }: Props) {
  const [generatingAudit, setGeneratingAudit] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [uncomprehendedContexts, setUncomprehendedContexts] = useState<UncomprehendedContext[]>([]);
  const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);
  const [placeholderIssues, setPlaceholderIssues] = useState<PlaceholderIssue[]>([]);
  const [jurisprudenceIssues, setJurisprudenceIssues] = useState<JurisprudenceIssue[]>([]);
  const [missingTopicInfo, setMissingTopicInfo] = useState<MissingTopicInfo[]>([]);
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [auditGeneratedAt, setAuditGeneratedAt] = useState<string | null>(null);
  const [questionsGeneratedAt, setQuestionsGeneratedAt] = useState<string | null>(null);
  
  const [questionFilter, setQuestionFilter] = useState<{ priority?: QuestionPriority }>({});
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<string[]>([]);
  const [expandedContexts, setExpandedContexts] = useState<string[]>([]);
  const [deleteQuestionDialog, setDeleteQuestionDialog] = useState<{ open: boolean; questionId: string | null; questionText: string }>({
    open: false,
    questionId: null,
    questionText: ''
  });
  const [deletingQuestion, setDeletingQuestion] = useState(false);

  const handleGenerateAudit = async () => {
    try {
      setGeneratingAudit(true);
      await generateAudit(caseId);
      
      // Aguarda um pouco para garantir que o backend salvou a auditoria
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarrega a auditoria do backend para garantir que estamos mostrando os dados atualizados
      const auditData = await loadAudit();
      
      const inconsistenciesCount = auditData.inconsistencies?.length || 0;
      const contextsCount = auditData.uncomprehendedContexts?.length || 0;
      const spellingCount = auditData.spellingErrors?.length || 0;
      const jurisprudenceCount = auditData.jurisprudenceIssues?.length || 0;
      const missingTopicCount = auditData.missingTopicInfo?.length || 0;
      const totalIssues = inconsistenciesCount + contextsCount + spellingCount + jurisprudenceCount + missingTopicCount;
      
      openSnackbar({
        open: true,
        message: `Auditoria concluída: ${totalIssues} problema(s) identificado(s)`,
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao gerar auditoria',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGeneratingAudit(false);
    }
  };

  const handleGenerateQuestions = async () => {
    try {
      setGeneratingQuestions(true);
      await generateQuestions(caseId);
      
      // Aguarda um pouco para garantir que o backend salvou as perguntas
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarrega as perguntas do backend para garantir que estamos mostrando os dados atualizados
      const questionsCount = await loadQuestions();
      
      // Notifica a página pai para atualizar o caseData
      if (onQuestionsGenerated && questionsCount > 0) {
        onQuestionsGenerated(questionsCount);
      }
      
      openSnackbar({
        open: true,
        message: `${questionsCount} pergunta(s) gerada(s) e salva(s)`,
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao gerar perguntas',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      const data = await getAudit(caseId);
      
      setInconsistencies(data.inconsistencies || []);
      setUncomprehendedContexts(data.uncomprehendedContexts || []);
      setSpellingErrors(data.spellingErrors || []);
      setPlaceholderIssues(data.placeholderIssues || []);
      setJurisprudenceIssues(data.jurisprudenceIssues || []);
      setMissingTopicInfo(data.missingTopicInfo || []);
      if (data.questions) {
        setQuestions(data.questions);
      }
      setAuditGeneratedAt(data.generatedAt || data.analyzedAt || null);
      
      return data;
    } catch (err: any) {
      // Se não houver auditoria, apenas limpa os dados
      if (err?.response?.status !== 404) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao carregar auditoria',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      }
      setInconsistencies([]);
      setUncomprehendedContexts([]);
      setSpellingErrors([]);
      setPlaceholderIssues([]);
      setJurisprudenceIssues([]);
      setMissingTopicInfo([]);
      return { 
        inconsistencies: [], 
        uncomprehendedContexts: [],
        spellingErrors: [],
        placeholderIssues: [],
        jurisprudenceIssues: [],
        missingTopicInfo: []
      };
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadQuestions = async (): Promise<number> => {
    try {
      setLoadingQuestions(true);
      const data = await getQuestions(caseId);
      console.log('Resposta completa do getQuestions:', data);
      const questionsData = data.questions || [];
      // Debug: verificar se as perguntas têm ID
      console.log('Perguntas carregadas (primeira pergunta completa):', questionsData[0]);
      console.log('Todas as chaves da primeira pergunta:', questionsData[0] ? Object.keys(questionsData[0]) : []);
      console.log('Perguntas carregadas:', questionsData.map((q, i) => ({ 
        index: i,
        id: q.id,
        questionId: (q as any).questionId,
        _id: (q as any)._id,
        hasId: !!q.id,
        idType: typeof q.id,
        question: q.question?.substring(0, 50),
        allKeys: Object.keys(q)
      })));
      setQuestions(questionsData);
      setQuestionsGeneratedAt(data.generatedAt || null);
      return questionsData.length;
    } catch (err: any) {
      // Se não houver perguntas, apenas limpa os dados
      if (err?.response?.status !== 404) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao carregar perguntas',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
      }
      setQuestions([]);
      return 0;
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Carrega a auditoria sempre que o componente é montado ou quando o caseId muda
  // Isso garante que a auditoria apareça mesmo quando o componente é remontado após trocar de aba
  useEffect(() => {
    loadAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Carrega as perguntas sempre que o componente é montado ou quando o caseId muda
  // Isso garante que as perguntas apareçam mesmo se hasQuestions não estiver atualizado
  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return labels[severity] || severity;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };


  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return labels[priority] || priority;
  };

  const filteredQuestions = questions.filter((q) => {
    if (questionFilter.priority !== undefined && questionFilter.priority !== '' && q.priority !== questionFilter.priority) return false;
    return true;
  });

  const sortedQuestions = filteredQuestions.sort((a, b) => {
    const priorityOrder: Record<QuestionPriority, number> = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const handleCopyQuestion = (question: string) => {
    navigator.clipboard.writeText(question);
    openSnackbar({
      open: true,
      message: 'Pergunta copiada para a área de transferência',
      variant: 'alert',
      alert: { color: 'success' }
    } as any);
  };

  const handleDeleteQuestion = (questionId: string | undefined, questionText: string, questionIndex: number) => {
    console.log('handleDeleteQuestion chamado:', { questionId, questionText, questionIndex, hasId: !!questionId, idType: typeof questionId });
    
    if (!questionId) {
      openSnackbar({
        open: true,
        message: 'Pergunta não possui ID para remoção',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }
    
    setDeleteQuestionDialog({
      open: true,
      questionId,
      questionText
    });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteQuestionDialog.questionId) return;

    try {
      setDeletingQuestion(true);
      await deleteQuestion(caseId, deleteQuestionDialog.questionId);
      
      // Remove a pergunta da lista local
      setQuestions((prev) => prev.filter((q) => q.id !== deleteQuestionDialog.questionId));
      
      openSnackbar({
        open: true,
        message: 'Pergunta removida com sucesso',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);
      
      setDeleteQuestionDialog({ open: false, questionId: null, questionText: '' });
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao remover pergunta',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setDeletingQuestion(false);
    }
  };

  const cancelDeleteQuestion = () => {
    setDeleteQuestionDialog({ open: false, questionId: null, questionText: '' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  return (
    <Stack spacing={3} sx={{ p: 2 }}>
      {/* Botões de ação */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          variant="contained"
          startIcon={generatingAudit ? <CircularProgress size={16} /> : <FileTextOutlined />}
          onClick={handleGenerateAudit}
          disabled={generatingAudit || generatingQuestions}
        >
          {hasAudit ? 'Refazer Auditoria' : 'Fazer Auditoria'}
        </Button>
        <Button
          variant="contained"
          startIcon={generatingQuestions ? <CircularProgress size={16} /> : <QuestionCircleOutlined />}
          onClick={handleGenerateQuestions}
          disabled={generatingAudit || generatingQuestions}
        >
          {hasQuestions ? 'Refazer Perguntas' : 'Gerar Perguntas'}
        </Button>
      </Stack>

      {/* Informações de geração */}
      {(auditGeneratedAt || questionsGeneratedAt) && (
        <Stack spacing={1}>
          {auditGeneratedAt && (
            <Typography variant="caption" color="text.secondary">
              Auditoria gerada em: {formatDate(auditGeneratedAt)}
            </Typography>
          )}
          {questionsGeneratedAt && (
            <Typography variant="caption" color="text.secondary">
              Perguntas geradas em: {formatDate(questionsGeneratedAt)}
            </Typography>
          )}
        </Stack>
      )}

      {/* Inconsistências */}
      {inconsistencies.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={700}>
                Inconsistências ({inconsistencies.length})
              </Typography>
              <Chip
                label={`${inconsistencies.filter((i) => i.severity === 'high').length} alta`}
                color="error"
                size="small"
              />
              <Chip
                label={`${inconsistencies.filter((i) => i.severity === 'medium').length} média`}
                color="warning"
                size="small"
              />
              <Chip
                label={`${inconsistencies.filter((i) => i.severity === 'low').length} baixa`}
                color="info"
                size="small"
              />
            </Stack>
            <Divider />
            <Stack spacing={1}>
              {inconsistencies.map((inc, idx) => (
                <Accordion
                  key={inc.id || idx}
                  expanded={expandedInconsistencies.includes(inc.id || `inc-${idx}`)}
                  onChange={() => {
                    const id = inc.id || `inc-${idx}`;
                    setExpandedInconsistencies((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    );
                  }}
                >
                  <AccordionSummary expandIcon={<RightOutlined />}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', mr: 2 }}>
                      <Chip
                        label={getSeverityLabel(inc.severity)}
                        color={getSeverityColor(inc.severity)}
                        size="small"
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {inc.type}
                      </Typography>
                      {inc.location && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {inc.location}
                        </Typography>
                      )}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <Typography variant="body2">{inc.description}</Typography>
                      {inc.suggestion && (
                        <Alert severity="info">
                          <AlertTitle>Sugestão</AlertTitle>
                          {inc.suggestion}
                        </Alert>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Contextos não compreendidos */}
      {uncomprehendedContexts.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography variant="h6" fontWeight={700}>
              Contextos Não Compreendidos ({uncomprehendedContexts.length})
            </Typography>
            <Divider />
            <Stack spacing={1}>
              {uncomprehendedContexts.map((ctx, idx) => (
                <Accordion
                  key={ctx.id || idx}
                  expanded={expandedContexts.includes(ctx.id || `ctx-${idx}`)}
                  onChange={() => {
                    const id = ctx.id || `ctx-${idx}`;
                    setExpandedContexts((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    );
                  }}
                >
                  <AccordionSummary expandIcon={<RightOutlined />}>
                    <Typography variant="body2" sx={{ maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ctx.context}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {ctx.reason && (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Motivo:</strong> {ctx.reason}
                        </Typography>
                      )}
                      {ctx.suggestion && (
                        <Alert severity="info">
                          <AlertTitle>Sugestão</AlertTitle>
                          {ctx.suggestion}
                        </Alert>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Erros Ortográficos */}
      {spellingErrors.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={700}>
                Erros Ortográficos ({spellingErrors.length})
              </Typography>
              <Chip
                label={`${spellingErrors.filter((e) => e.severity === 'high').length} alta`}
                color="error"
                size="small"
              />
              <Chip
                label={`${spellingErrors.filter((e) => e.severity === 'medium').length} média`}
                color="warning"
                size="small"
              />
              <Chip
                label={`${spellingErrors.filter((e) => e.severity === 'low').length} baixa`}
                color="info"
                size="small"
              />
            </Stack>
            <Divider />
            <Stack spacing={1}>
              {spellingErrors.map((error, idx) => (
                <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={getSeverityLabel(error.severity)}
                        color={getSeverityColor(error.severity)}
                        size="small"
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {error.word}
                      </Typography>
                      {error.location && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {error.location}
                        </Typography>
                      )}
                    </Stack>
                    {error.suggestion && (
                      <Alert severity="info">
                        <AlertTitle>Sugestão</AlertTitle>
                        Substituir por: <strong>{error.suggestion}</strong>
                      </Alert>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Problemas de Jurisprudência */}
      {jurisprudenceIssues.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={700}>
                Problemas de Jurisprudência ({jurisprudenceIssues.length})
              </Typography>
              <Chip
                label={`${jurisprudenceIssues.filter((i) => i.severity === 'high').length} alta`}
                color="error"
                size="small"
              />
              <Chip
                label={`${jurisprudenceIssues.filter((i) => i.severity === 'medium').length} média`}
                color="warning"
                size="small"
              />
              <Chip
                label={`${jurisprudenceIssues.filter((i) => i.severity === 'low').length} baixa`}
                color="info"
                size="small"
              />
            </Stack>
            <Divider />
            <Stack spacing={1}>
              {jurisprudenceIssues.map((issue, idx) => (
                <Accordion key={issue.id || idx}>
                  <AccordionSummary expandIcon={<RightOutlined />}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', mr: 2 }}>
                      <Chip
                        label={getSeverityLabel(issue.severity)}
                        color={getSeverityColor(issue.severity)}
                        size="small"
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {issue.type}
                      </Typography>
                      {issue.location && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {issue.location}
                        </Typography>
                      )}
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <Typography variant="body2">{issue.description}</Typography>
                      {issue.suggestion && (
                        <Alert severity="info">
                          <AlertTitle>Sugestão</AlertTitle>
                          {issue.suggestion}
                        </Alert>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Tópicos Faltantes */}
      {missingTopicInfo.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" fontWeight={700}>
                Tópicos Faltantes ({missingTopicInfo.length})
              </Typography>
              <Chip
                label={`${missingTopicInfo.filter((i) => i.severity === 'high').length} alta`}
                color="error"
                size="small"
              />
              <Chip
                label={`${missingTopicInfo.filter((i) => i.severity === 'medium').length} média`}
                color="warning"
                size="small"
              />
              <Chip
                label={`${missingTopicInfo.filter((i) => i.severity === 'low').length} baixa`}
                color="info"
                size="small"
              />
            </Stack>
            <Divider />
            <Stack spacing={1}>
              {missingTopicInfo.map((info, idx) => (
                <Accordion key={info.id || idx}>
                  <AccordionSummary expandIcon={<RightOutlined />}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', mr: 2 }}>
                      <Chip
                        label={getSeverityLabel(info.severity)}
                        color={getSeverityColor(info.severity)}
                        size="small"
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {info.topic}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      <Typography variant="body2">{info.description}</Typography>
                      {info.suggestion && (
                        <Alert severity="info">
                          <AlertTitle>Sugestão</AlertTitle>
                          {info.suggestion}
                        </Alert>
                      )}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Perguntas sugeridas */}
      {questions.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Typography variant="h6" fontWeight={700}>
                Perguntas Sugeridas ({questions.length})
              </Typography>
              <TextField
                select
                size="small"
                label="Prioridade"
                value={questionFilter.priority || ''}
                onChange={(e) =>
                  setQuestionFilter((prev) => ({
                    ...prev,
                    priority: e.target.value === '' ? undefined : (e.target.value as QuestionPriority)
                  }))
                }
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="high">Alta</MenuItem>
                <MenuItem value="medium">Média</MenuItem>
                <MenuItem value="low">Baixa</MenuItem>
              </TextField>
            </Stack>
            <Divider />

            {/* Perguntas ordenadas por prioridade */}
            <Stack spacing={1}>
              {sortedQuestions.map((q, idx) => (
                <Paper key={q.id || idx} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: '100%' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                        <Chip
                          label={getPriorityLabel(q.priority)}
                          color={getPriorityColor(q.priority)}
                          size="small"
                          sx={{ flexShrink: 0 }}
                        />
                        <Typography variant="body2" fontWeight={600} sx={{ flex: 1, wordBreak: 'break-word' }}>
                          {q.question}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, ml: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopyQuestion(q.question)}
                          title="Copiar pergunta"
                          sx={{ flexShrink: 0 }}
                        >
                          <CopyOutlined />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            console.log('Botão deletar clicado:', { q, id: q.id, hasId: !!q.id, idType: typeof q.id, allKeys: Object.keys(q) });
                            if (!q.id) {
                              openSnackbar({
                                open: true,
                                message: 'Esta pergunta não possui ID. O backend precisa retornar o ID das perguntas para permitir a remoção.',
                                variant: 'alert',
                                alert: { color: 'warning' }
                              } as any);
                              return;
                            }
                            handleDeleteQuestion(q.id, q.question, idx);
                          }}
                          title={q.id ? "Remover pergunta" : "Pergunta sem ID - o backend precisa retornar o ID"}
                          color="error"
                          sx={{ 
                            flexShrink: 0,
                            opacity: q.id ? 1 : 0.3,
                            visibility: 'visible',
                            display: 'inline-flex',
                            cursor: q.id ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <DeleteOutlined />
                        </IconButton>
                      </Stack>
                    </Stack>
                    {q.reasoning && (
                      <Typography variant="caption" color="text.secondary">
                        {q.reasoning}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Estado vazio */}
      {!hasAudit && !hasQuestions && 
       inconsistencies.length === 0 && 
       uncomprehendedContexts.length === 0 && 
       spellingErrors.length === 0 &&
       jurisprudenceIssues.length === 0 &&
       missingTopicInfo.length === 0 &&
       questions.length === 0 && (
        <Alert severity="info">
          <AlertTitle>Nenhuma auditoria ou pergunta gerada</AlertTitle>
          Use os botões acima para gerar auditoria e perguntas para este caso.
        </Alert>
      )}

      {/* Diálogo de confirmação para deletar pergunta */}
      <Dialog open={deleteQuestionDialog.open} onClose={cancelDeleteQuestion} maxWidth="sm" fullWidth>
        <DialogTitle>Remover Pergunta</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Deseja realmente remover esta pergunta?
          </Typography>
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
            <Typography variant="body2" fontWeight={600}>
              {deleteQuestionDialog.questionText}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteQuestion} disabled={deletingQuestion}>
            Cancelar
          </Button>
          <Button
            onClick={confirmDeleteQuestion}
            variant="contained"
            color="error"
            disabled={deletingQuestion}
            startIcon={deletingQuestion ? <CircularProgress size={16} /> : <DeleteOutlined />}
          >
            {deletingQuestion ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

