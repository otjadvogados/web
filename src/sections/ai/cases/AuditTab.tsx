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
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';
import CopyOutlined from '@ant-design/icons/CopyOutlined';
import {
  generateAudit,
  generateQuestions,
  getAudit,
  getQuestions,
  type Inconsistency,
  type UncomprehendedContext,
  type SuggestedQuestion,
  type QuestionCategory,
  type QuestionPriority
} from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';

type Props = {
  caseId: string;
  hasAudit?: boolean;
  hasQuestions?: boolean;
};

export default function AuditTab({ caseId, hasAudit, hasQuestions }: Props) {
  const [generatingAudit, setGeneratingAudit] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [uncomprehendedContexts, setUncomprehendedContexts] = useState<UncomprehendedContext[]>([]);
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [auditGeneratedAt, setAuditGeneratedAt] = useState<string | null>(null);
  const [questionsGeneratedAt, setQuestionsGeneratedAt] = useState<string | null>(null);
  
  const [questionFilter, setQuestionFilter] = useState<{ category?: QuestionCategory; priority?: QuestionPriority }>({});
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<string[]>([]);
  const [expandedContexts, setExpandedContexts] = useState<string[]>([]);

  const handleGenerateAudit = async () => {
    try {
      setGeneratingAudit(true);
      const data = await generateAudit(caseId);
      setInconsistencies(data.inconsistencies || []);
      setUncomprehendedContexts(data.uncomprehendedContexts || []);
      setAuditGeneratedAt(data.generatedAt || new Date().toISOString());
      
      const inconsistenciesCount = data.inconsistencies?.length || 0;
      const contextsCount = data.uncomprehendedContexts?.length || 0;
      
      openSnackbar({
        open: true,
        message: `Auditoria concluída: ${inconsistenciesCount} inconsistência(s), ${contextsCount} contexto(s) identificado(s)`,
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
      const data = await generateQuestions(caseId);
      setQuestions(data.questions || []);
      setQuestionsGeneratedAt(data.generatedAt || new Date().toISOString());
      
      const questionsCount = data.questions?.length || 0;
      
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
      if (data.questions) {
        setQuestions(data.questions);
      }
      setAuditGeneratedAt(data.generatedAt || null);
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
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const data = await getQuestions(caseId);
      setQuestions(data.questions || []);
      setQuestionsGeneratedAt(data.generatedAt || null);
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
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (hasAudit) {
      loadAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, hasAudit]);

  useEffect(() => {
    if (hasQuestions) {
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, hasQuestions]);

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

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      facts: 'Fatos',
      evidence: 'Provas',
      witnesses: 'Testemunhas',
      legal: 'Jurídico',
      other: 'Outros'
    };
    return labels[category] || category;
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
    if (questionFilter.category && q.category !== questionFilter.category) return false;
    if (questionFilter.priority && q.priority !== questionFilter.priority) return false;
    return true;
  });

  const questionsByCategory = filteredQuestions.reduce((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {} as Record<QuestionCategory, SuggestedQuestion[]>);

  const sortedQuestionsByCategory = Object.entries(questionsByCategory).sort((a, b) => {
    const priorityOrder: Record<QuestionPriority, number> = { high: 3, medium: 2, low: 1 };
    const aMaxPriority = Math.max(...a[1].map((q) => priorityOrder[q.priority]));
    const bMaxPriority = Math.max(...b[1].map((q) => priorityOrder[q.priority]));
    return bMaxPriority - aMaxPriority;
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
          {hasAudit ? 'Regenerar Auditoria' : 'Fazer Auditoria'}
        </Button>
        <Button
          variant="contained"
          startIcon={generatingQuestions ? <CircularProgress size={16} /> : <QuestionCircleOutlined />}
          onClick={handleGenerateQuestions}
          disabled={generatingAudit || generatingQuestions}
        >
          {hasQuestions ? 'Regenerar Perguntas' : 'Gerar Perguntas'}
        </Button>
        {hasAudit && (
          <Button
            variant="outlined"
            startIcon={<ReloadOutlined />}
            onClick={loadAudit}
            disabled={loadingAudit}
          >
            Recarregar Auditoria
          </Button>
        )}
        {hasQuestions && (
          <Button
            variant="outlined"
            startIcon={<ReloadOutlined />}
            onClick={loadQuestions}
            disabled={loadingQuestions}
          >
            Recarregar Perguntas
          </Button>
        )}
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
                        label={inc.severity}
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

      {/* Perguntas sugeridas */}
      {questions.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Typography variant="h6" fontWeight={700}>
                Perguntas Sugeridas ({questions.length})
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <TextField
                  select
                  size="small"
                  label="Categoria"
                  value={questionFilter.category || ''}
                  onChange={(e) =>
                    setQuestionFilter((prev) => ({
                      ...prev,
                      category: e.target.value as QuestionCategory | undefined
                    }))
                  }
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="facts">Fatos</MenuItem>
                  <MenuItem value="evidence">Provas</MenuItem>
                  <MenuItem value="witnesses">Testemunhas</MenuItem>
                  <MenuItem value="legal">Jurídico</MenuItem>
                  <MenuItem value="other">Outros</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Prioridade"
                  value={questionFilter.priority || ''}
                  onChange={(e) =>
                    setQuestionFilter((prev) => ({
                      ...prev,
                      priority: e.target.value as QuestionPriority | undefined
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
            </Stack>
            <Divider />
            
            {/* Contadores por categoria */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {Object.entries(questionsByCategory).map(([category, qs]) => (
                <Chip
                  key={category}
                  label={`${getCategoryLabel(category)}: ${qs.length}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>

            {/* Perguntas agrupadas por categoria */}
            <Stack spacing={2}>
              {sortedQuestionsByCategory.map(([category, qs]) => (
                <Box key={category}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    {getCategoryLabel(category)} ({qs.length})
                  </Typography>
                  <Stack spacing={1}>
                    {qs
                      .sort((a, b) => {
                        const priorityOrder: Record<QuestionPriority, number> = { high: 3, medium: 2, low: 1 };
                        return priorityOrder[b.priority] - priorityOrder[a.priority];
                      })
                      .map((q, idx) => (
                        <Paper key={q.id || idx} variant="outlined" sx={{ p: 1.5 }}>
                          <Stack spacing={1}>
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Chip
                                  label={getPriorityLabel(q.priority)}
                                  color={getPriorityColor(q.priority)}
                                  size="small"
                                />
                                <Typography variant="body2" fontWeight={600}>
                                  {q.question}
                                </Typography>
                              </Stack>
                              <IconButton
                                size="small"
                                onClick={() => handleCopyQuestion(q.question)}
                                title="Copiar pergunta"
                              >
                                <CopyOutlined />
                              </IconButton>
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
                </Box>
              ))}
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Estado vazio */}
      {!hasAudit && !hasQuestions && inconsistencies.length === 0 && uncomprehendedContexts.length === 0 && questions.length === 0 && (
        <Alert severity="info">
          <AlertTitle>Nenhuma auditoria ou pergunta gerada</AlertTitle>
          Use os botões acima para gerar auditoria e perguntas para este caso.
        </Alert>
      )}
    </Stack>
  );
}

