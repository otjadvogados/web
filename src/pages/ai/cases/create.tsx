import { useMemo, useState } from 'react';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import MainCard from 'components/MainCard';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
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
import StepCustomer from 'sections/ai/cases/steps/StepCustomer';
import StepPiece from 'sections/ai/cases/steps/StepPiece';
import StepTopic from 'sections/ai/cases/steps/StepTopic';
import StepSpecs from 'sections/ai/cases/steps/StepSpecs';
import StepAttachments from 'sections/ai/cases/steps/StepAttachments';

const steps = [
  { key: 'dept', label: 'Departamento' },
  { key: 'customer', label: 'Cliente (opcional)' },
  { key: 'piece', label: 'Peça' },
  { key: 'topic', label: 'Tópico' },
  { key: 'specs', label: 'Tópicos específicos' },
  { key: 'attachments', label: 'Instruções & anexos' }
];

export default function CreateCaseWizardPage() {
  return (
    <CaseWizardProvider>
      <CreateCaseWizardInner />
    </CaseWizardProvider>
  );
}

function CreateCaseWizardInner() {
  const {
    step, setStep, maxStep, canNext,
    dept, customer, piece, topic, specs,
    pieceDetail, topicDetail, payloadPreview,
    downloadPieceDocx
  } = useCaseWizard();

  const [openPreview, setOpenPreview] = useState(false);

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
                    <Tooltip title="Ainda não implementado no backend">
                      <span>
                        <Button variant="contained" disabled>
                          Criar Caso
                        </Button>
                      </span>
                    </Tooltip>
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
                  <StepRow active={step===1} label="Cliente" value={labelCustomer(customer)} secondary="opcional" />
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
                  <StepRow active={step===3} label="Tópico" value={topic?.name} />
                  {topicDetail?.description && (
                    <Minor label="Descrição do tópico" value={topicDetail.description} />
                  )}
                  <Divider />
                  <Typography variant="subtitle2">Tópicos específicos - {specs.length}</Typography>
                  {!specs.length && <Typography variant="body2" color="text.secondary">—</Typography>}
                  {!!specs.length && (
                    <Stack spacing={0.5}>
                      {specs.map((s) => (
                        <Chip key={s.id} size="small" variant="outlined" label={s.name} />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </Paper>

              <Typography fontWeight={700}>Payload (preview)</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(payloadPreview, null, 2)}
              </Paper>
            </Stack>
          </Drawer>
        </MainCard>
      </Grid>
    </Grid>
  );
}

function labelCustomer(c?: { displayName?: string; name?: string } | null) {
  return c?.displayName ?? c?.name ?? '—';
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