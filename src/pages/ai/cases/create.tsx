import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import MainCard from 'components/MainCard';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Slide from '@mui/material/Slide';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import AIIcon from 'components/icons/AIIcon';
import { CaseWizardProvider, useCaseWizard } from 'sections/ai/cases/CaseWizardContext';
import StepDepartment from 'sections/ai/cases/steps/StepDepartment';
import { openSnackbar } from 'api/snackbar';
import { postCaseContext, type CaseContextResponse } from 'api/aiCases';
import StepCustomer from 'sections/ai/cases/steps/StepCustomer';
import StepPiece from 'sections/ai/cases/steps/StepPiece';
import StepTopic from 'sections/ai/cases/steps/StepTopic';
import StepSpecs from 'sections/ai/cases/steps/StepSpecs';
import StepAttachments from 'sections/ai/cases/steps/StepAttachments';
import RealtimeProgressOverlay from 'components/loaders/RealtimeProgressOverlay';
import { ensureRealtimeConnected } from 'api/realtime';
import Permission from 'components/Permission';

const steps = [
  { key: 'dept', label: 'Departamento' },
  { key: 'customer', label: 'Clientes (opcional)' },
  { key: 'piece', label: 'Peça' },
  { key: 'topic', label: 'Tópicos' },
  { key: 'specs', label: 'Tópicos específicos' },
  { key: 'attachments', label: 'Instruções & anexos' }
];

export default function CreateCaseWizardPage() {
  return (
    <Permission resources={['ai.cases.create']}>
      <CaseWizardProvider>
        <CreateCaseWizardInner />
      </CaseWizardProvider>
    </Permission>
  );
}

function CreateCaseWizardInner() {
  const {
    step, setStep, maxStep, canNext,
    dept, customers, piece, topic, topics, specs,
    pieceDetail, topicDetail, payloadPreview,
    downloadPieceDocx, buildFormData, buildCaseContextFormData, formPreview,
    validateAttachments, hasOcrErrors, restoreWizardState
  } = useCaseWizard();

  const navigate = useNavigate();

  const [openPreview, setOpenPreview] = useState(false);
  const [openResult, setOpenResult] = useState(false);
  const [openHtml, setOpenHtml] = useState(false);
  const [openTopicSpecificHtml, setOpenTopicSpecificHtml] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CaseContextResponse | null>(null);
  const [rtRunId, setRtRunId] = useState<string | null>(null);
  const [rtOpen, setRtOpen] = useState(false);

  // Restaura o estado completo do wizard se houver estado salvo
  useEffect(() => {
    (async () => {
      try {
        const saved = sessionStorage.getItem('wizard_return_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Verifica se o estado não é muito antigo (mais de 2 horas)
          const twoHours = 2 * 60 * 60 * 1000;
          if (Date.now() - parsed.timestamp < twoHours && parsed.step !== undefined) {
            await restoreWizardState();
            openSnackbar({
              open: true,
              message: `Estado restaurado! Você retornou para a etapa de ${steps[parsed.step]?.label || 'Criação de Caso'}`,
              variant: 'alert',
              alert: { color: 'success' }
            } as any);
          } else {
            sessionStorage.removeItem('wizard_return_state');
          }
        }
      } catch (err) {
        console.error('Erro ao restaurar estado do wizard:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreWizardState]);

  const doSubmit = async () => {
    try {
      setSubmitting(true);
      setRtRunId(null);
      setRtOpen(true);
      // tenta conectar ANTES do POST para não perder eventos iniciais
      await ensureRealtimeConnected(2500);
      const fd = buildCaseContextFormData();
      const res = await postCaseContext(fd);
      setResult(res);
      if (res?.data?.runId) setRtRunId(res.data.runId || null);
      setOpenResult(true);
      // Se o backend retornou o id do resultado, já navega para a página de edição
      if (res?.data?.caseResultId) {
        navigate(`/ai/cases/${res.data.caseResultId}/edit`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao criar caso';
      openSnackbar({ open: true, message: msg, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setSubmitting(false);
      // fecha overlay com um pequeno atraso para o usuário ver o "final"
      setTimeout(() => setRtOpen(false), 800);
    }
  };

  const formNode = useMemo(() => {
    switch (step) {
      case 0: return <StepDepartment />;
      case 1: return <StepCustomer />;
      case 2: return <StepPiece />;
      case 3: return <StepTopic />;
      case 4: return <StepSpecs />;
      case 5: return <StepAttachments />;
      default: return null;
    }
  }, [step]);

  const onNext = () => { if (step < maxStep && canNext(step)) setStep(step + 1); };
  const onBack = () => { if (step > 0) setStep(step - 1); };

  // Encontra o tópico específico atual para visualização
  const currentTopicSpecific = useMemo(() => {
    if (!openTopicSpecificHtml || !result?.data?._infos?.phase07?.topicSpecifics) return null;
    const topicSpecifics = result.data._infos.phase07.topicSpecifics as any[];
    return topicSpecifics.find((ts: any) => (ts.id || ts.name) === openTopicSpecificHtml) || null;
  }, [openTopicSpecificHtml, result?.data?._infos?.phase07?.topicSpecifics]);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <MainCard
          title={
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <AIIcon />
                <Typography variant="h6" fontWeight={700}>Criar Caso</Typography>
              </Stack>
              <Button
                variant="outlined"
                startIcon={<EyeOutlined />}
                onClick={() => setOpenPreview(true)}
              >
                Preview
              </Button>
            </Stack>
          }
          contentSX={{ p: 0 }}
        >
          <Grid container spacing={0}>
            {/* Formulário com transição */}
            <Grid size={{ xs: 12 }} sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stepper activeStep={step} alternativeLabel sx={{ mb: 1 }}>
                  {steps.map((s) => (
                    <Step key={s.key}>
                      <StepLabel>{s.label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Divider />

                <Slide in appear direction="left" timeout={220} mountOnEnter unmountOnExit>
                  <div>{formNode}</div>
                </Slide>

                <Divider />

                <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
                  <Button variant="outlined" onClick={onBack} disabled={step === 0}>Voltar</Button>
                  {step < maxStep ? (
                    <Button variant="contained" onClick={onNext} disabled={!canNext(step)}>
                      Próximo
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={doSubmit}
                      disabled={submitting || !dept?.id || !piece?.id || !validateAttachments().valid || hasOcrErrors().hasErrors}
                      startIcon={submitting ? <CircularProgress size={16} /> : undefined}
                    >
                      {submitting ? 'Enviando…' : 'Criar Caso'}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Grid>
          </Grid>

          {/* Drawer de linha do tempo / preview */}
          <Drawer
            anchor="right"
            open={openPreview}
            onClose={() => setOpenPreview(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 420, md: 480 } } }}
          >
            <Stack spacing={1.25} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight={700}>Preview</Typography>
                <IconButton onClick={() => setOpenPreview(false)}>
                  <CloseOutlined />
                </IconButton>
              </Stack>

                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                  <StepRow active={step===0} label="Departamento" value={dept?.name} />
                  <StepRow active={step===1} label="Clientes" value={labelCustomers(customers)} secondary="opcional" />
                  <StepRow active={step===2} label="Peça" value={piece?.name} />
                    {pieceDetail?.instruction && (
                      <Minor label="Instrução da peça" value={pieceDetail.instruction} />
                    )}
                    {!!pieceDetail?.docxFileId && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip size="small" label="DOCX da peça" />
                      <Button size="small" variant="text" startIcon={<DownloadOutlined />} onClick={downloadPieceDocx}>
                        Baixar
                      </Button>
                      </Stack>
                    )}
                    <Divider />
                  <StepRow active={step===3} label="Tópicos" value={labelTopics(topics)} />
                    {topicDetail?.description && (
                      <Minor label="Descrição do tópico" value={topicDetail.description} />
                    )}
                    <Divider />
                  <Typography variant="subtitle2">Tópicos específicos - {specs.length}</Typography>
                    {!specs.length && <Typography variant="body2" color="text.secondary">—</Typography>}
                    {!!specs.length && (
                    <Stack spacing={0.5}>
                      {specs.map((s, idx) => (
                        <Chip key={s.id} size="small" variant="outlined" label={`${idx + 1}. ${s.name}`} />
                      ))}
                      </Stack>
                    )}
                  </Stack>
                </Paper>

              <Typography fontWeight={700}>FormData (preview)</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(formPreview, null, 2)}
              </Paper>
              </Stack>
          </Drawer>

          {/* Drawer de resultado (JSON retornado do backend) */}
          <Drawer
            anchor="right"
            open={openResult}
            onClose={() => setOpenResult(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 520, md: 640 } } }}
          >
            <Stack spacing={1.5} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight={700}>Resposta (JSON)</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EyeOutlined />}
                    onClick={() => setOpenHtml(true)}
                    disabled={!result?.data?.html}
                    title={result?.data?.html ? 'Visualizar HTML' : 'Sem HTML'}
                  >
                    Ver HTML
                  </Button>
                  <IconButton onClick={() => setOpenResult(false)}>
                    <CloseOutlined />
                  </IconButton>
                </Stack>
              </Stack>
              
              {/* Botões para HTMLs dos tópicos específicos da phase07 */}
              {result?.data?._infos?.phase07?.topicSpecifics && Array.isArray(result.data._infos.phase07.topicSpecifics) && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    HTMLs dos Tópicos Específicos:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {result.data._infos.phase07.topicSpecifics.map((ts: any) => {
                      if (!ts?.html || !ts?.name) return null;
                      return (
                        <Button
                          key={ts.id || ts.name}
                          size="small"
                          variant="outlined"
                          startIcon={<EyeOutlined />}
                          onClick={() => setOpenTopicSpecificHtml(ts.id || ts.name)}
                          title={`Visualizar HTML: ${ts.name}`}
                        >
                          {ts.name}
                        </Button>
                      );
                    })}
                  </Stack>
                </Stack>
              )}
              {!result ? (
                <Paper variant="outlined" sx={{ p: 2, color: 'text.secondary' }}>
                  Nenhum resultado para exibir.
                </Paper>
              ) : (
                <Paper
                  variant="outlined"
                  sx={{ p: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}
                >
                  {JSON.stringify(result, null, 2)}
                </Paper>
              )}
            </Stack>
          </Drawer>

          {/* Drawer de visualização do HTML retornado */}
          <Drawer
            anchor="right"
            open={openHtml}
            onClose={() => setOpenHtml(false)}
            PaperProps={{ sx: { width: { xs: '100%', sm: 720, md: 900 } } }}
          >
            <Stack spacing={1} sx={{ p: 2, height: '100%' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h6" fontWeight={700}>
                  Visualizar HTML da Peça
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (!result?.data?.html) return;
                      const src = `<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview</title>
  <style>
    html,body{margin:0;padding:0}
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; line-height:1.5; padding:24px;}
    h1,h2,h3{margin:1em 0 .5em}
    p{margin:.5em 0}
    ul,ol{padding-left:1.25em}
  </style>
</head><body>${result.data.html}</body></html>`;
                      const blob = new Blob([src], { type: 'text/html;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank', 'noopener,noreferrer');
                      // não revoga imediatamente para não quebrar a aba; navegador cuidará depois
                    }}
                    disabled={!result?.data?.html}
                  >
                    Abrir em nova aba
                  </Button>
                  <IconButton onClick={() => setOpenHtml(false)}>
                    <CloseOutlined />
                  </IconButton>
                </Stack>
              </Stack>
              <Box sx={{ flex: 1, minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                {result?.data?.html ? (
                  <iframe
                    title="HTML Preview"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    // sandbox vazio = sem JS/mesmo-origem; srcDoc = conteúdo isolado
                    sandbox=""
                    srcDoc={`<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html,body{margin:0;padding:0}
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; line-height:1.5; padding:24px;}
    h1,h2,h3{margin:1em 0 .5em}
    p{margin:.5em 0}
    ul,ol{padding-left:1.25em}
  </style>
</head><body>${result.data.html}</body></html>`}
                  />
                ) : (
                  <Stack sx={{ p: 2, color: 'text.secondary' }}>Sem HTML para visualizar.</Stack>
                )}
              </Box>
            </Stack>
          </Drawer>

          {/* Drawer de visualização do HTML de tópico específico */}
          {openTopicSpecificHtml && currentTopicSpecific?.html && (
            <Drawer
              key={openTopicSpecificHtml}
              anchor="right"
              open={!!openTopicSpecificHtml}
              onClose={() => setOpenTopicSpecificHtml(null)}
              PaperProps={{ sx: { width: { xs: '100%', sm: 720, md: 900 } } }}
            >
              <Stack spacing={1} sx={{ p: 2, height: '100%' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h6" fontWeight={700}>
                    Visualizar HTML: {currentTopicSpecific.name || 'Tópico Específico'}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const src = `<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview - ${currentTopicSpecific.name || 'Tópico Específico'}</title>
  <style>
    html,body{margin:0;padding:0}
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; line-height:1.5; padding:24px;}
    h1,h2,h3{margin:1em 0 .5em}
    p{margin:.5em 0}
    ul,ol{padding-left:1.25em}
  </style>
</head><body>${currentTopicSpecific.html}</body></html>`;
                        const blob = new Blob([src], { type: 'text/html;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Abrir em nova aba
                    </Button>
                    <IconButton onClick={() => setOpenTopicSpecificHtml(null)}>
                      <CloseOutlined />
                    </IconButton>
                  </Stack>
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                  <iframe
                    title={`HTML Preview - ${currentTopicSpecific.name || 'Tópico Específico'}`}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    sandbox=""
                    srcDoc={`<!doctype html><html><head><meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html,body{margin:0;padding:0}
    body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; line-height:1.5; padding:24px;}
    h1,h2,h3{margin:1em 0 .5em}
    p{margin:.5em 0}
    ul,ol{padding-left:1.25em}
  </style>
</head><body>${currentTopicSpecific.html}</body></html>`}
                  />
                </Box>
              </Stack>
            </Drawer>
          )}
        </MainCard>

        {/* Overlay de progresso em tempo real */}
        <RealtimeProgressOverlay
          open={rtOpen || submitting}
          knownRunId={rtRunId ?? undefined}
          onDetectRunId={(rid) => setRtRunId(rid)}
          onRequestClose={() => setRtOpen(false)}
        />
      </Grid>
    </Grid>
  );
}

function labelCustomers(arr: Array<{ displayName?: string; name?: string }> = []) {
  if (!arr?.length) return '—';
  const names = arr.map((c) => c.displayName ?? c.name).filter(Boolean) as string[];
  if (!names.length) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function labelTopics(arr: Array<{ name?: string }> = []) {
  if (!arr?.length) return '—';
  const names = arr.map((t) => t.name).filter(Boolean) as string[];
  if (!names.length) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function StepRow({ active, label, value, secondary }: { active?: boolean; label: string; value?: string | null; secondary?: string }) {
  const v = value || '—';
  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Typography variant="body2" color={active ? 'text.primary' : 'text.secondary'} fontWeight={active ? 700 : 400}>
        {label}{secondary ? ` (${secondary})` : ''}
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: '60%', textAlign: 'right' }} noWrap title={v}>{v}</Typography>
    </Stack>
  );
}

function Minor({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <Stack>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ display: 'block' }}>{value}</Typography>
    </Stack>
  );
}