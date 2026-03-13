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
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FileTextOutlined from '@ant-design/icons/FileTextOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';
import {
  generateAudit,
  getAudit,
  type Inconsistency,
  type UncomprehendedContext,
  type SpellingError,
  type PlaceholderIssue,
  type JurisprudenceIssue,
  type MissingTopicInfo,
  type AiModel
} from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';

type Props = {
  caseId: string;
  hasAudit?: boolean;
};

const MODEL_OPTIONS: { value: AiModel; label: string }[] = [
  { value: 'gpt-5.1', label: 'GPT-5.1' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' }
];

export default function AuditTab({ caseId, hasAudit }: Props) {
  const [generatingAudit, setGeneratingAudit] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [model, setModel] = useState<AiModel>('gpt-5.1');
  
  const [inconsistencies, setInconsistencies] = useState<Inconsistency[]>([]);
  const [uncomprehendedContexts, setUncomprehendedContexts] = useState<UncomprehendedContext[]>([]);
  const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);
  const [placeholderIssues, setPlaceholderIssues] = useState<PlaceholderIssue[]>([]);
  const [jurisprudenceIssues, setJurisprudenceIssues] = useState<JurisprudenceIssue[]>([]);
  const [missingTopicInfo, setMissingTopicInfo] = useState<MissingTopicInfo[]>([]);
  const [auditGeneratedAt, setAuditGeneratedAt] = useState<string | null>(null);
  
  const [expandedInconsistencies, setExpandedInconsistencies] = useState<string[]>([]);
  const [expandedContexts, setExpandedContexts] = useState<string[]>([]);

  const handleGenerateAudit = async () => {
    try {
      setGeneratingAudit(true);
      await generateAudit(caseId, model);
      
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
      setAuditGeneratedAt(data.generatedAt || data.analyzedAt || null);
      
      return data;
    } catch (err: any) {
      // Se não houver auditoria (404 ou qualquer erro), apenas limpa os dados sem mostrar erro
      // A ausência de auditoria é um estado válido e não deve ser tratada como erro
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


  // Carrega a auditoria sempre que o componente é montado ou quando o caseId muda
  // Isso garante que a auditoria apareça mesmo quando o componente é remontado após trocar de aba
  useEffect(() => {
    loadAudit();
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
      {/* Modelo e botões de ação */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <TextField
          select
          label="Modelo"
          size="small"
          value={model}
          onChange={(e) => setModel(e.target.value as AiModel)}
          sx={{ minWidth: 220, maxWidth: 260 }}
        >
          {MODEL_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={generatingAudit ? <CircularProgress size={16} /> : <FileTextOutlined />}
          onClick={handleGenerateAudit}
          disabled={generatingAudit}
        >
          {hasAudit ? 'Refazer Auditoria' : 'Fazer Auditoria'}
        </Button>
      </Stack>

      {/* Informações de geração */}
      {auditGeneratedAt && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Auditoria gerada em: {formatDate(auditGeneratedAt)}
          </Typography>
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


      {/* Estado vazio */}
      {!hasAudit && 
       inconsistencies.length === 0 && 
       uncomprehendedContexts.length === 0 && 
       spellingErrors.length === 0 &&
       jurisprudenceIssues.length === 0 &&
       missingTopicInfo.length === 0 && (
        <Alert severity="info">
          <AlertTitle>Nenhuma auditoria gerada</AlertTitle>
          Use o botão acima para gerar auditoria para este caso.
        </Alert>
      )}
    </Stack>
  );
}

