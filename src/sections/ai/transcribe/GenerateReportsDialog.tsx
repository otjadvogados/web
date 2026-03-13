import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { generateCustomerReports, generateGeneralReports, ReportType, type CustomerReport } from 'api/reports';
import { openSnackbar } from 'api/snackbar';
import { ensureRealtimeConnected, getRealtimeSocket } from 'api/realtime';

type Props = {
  open: boolean;
  onClose: () => void;
  customerId: string | null;
  transcriptionId: string;
  onSuccess?: (reports: CustomerReport[]) => void;
  /** Abre o overlay no pai; pode retornar Promise que resolve quando o overlay chamar onSubscribed */
  onOpenProgress?: () => void | Promise<void>;
  /** Chamado ao fechar a tela de andamento */
  onCloseProgress?: () => void;
  /** Chamado quando a resposta trouxer runId (para filtrar eventos no overlay) */
  onRunId?: (runId: string | null) => void;
  /** Igual ao criar caso: overlay usa open={progressOpen || reportGenerating}; chamado ao iniciar/finalizar */
  onGeneratingChange?: (generating: boolean) => void;
};

type AiModel = 'gpt-5.1' | 'claude-sonnet-4-5-20250929';

const MODEL_OPTIONS: { value: AiModel; label: string }[] = [
  { value: 'gpt-5.1', label: 'GPT-5.1' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' }
];

export default function GenerateReportsDialog({
  open,
  onClose,
  customerId,
  transcriptionId,
  onSuccess,
  onOpenProgress,
  onCloseProgress,
  onRunId,
  onGeneratingChange
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [model, setModel] = useState<AiModel>('gpt-5.1');

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      if (onGeneratingChange) onGeneratingChange(true);
      const openPromise = onOpenProgress?.();
      getRealtimeSocket();
      await Promise.resolve(openPromise);
      await ensureRealtimeConnected(2500);

      const result = customerId
        ? await generateCustomerReports(customerId, {
            transcriptionId,
            reportTypes: [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA],
            model
          })
        : await generateGeneralReports({
            transcriptionId,
            reportTypes: [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA],
            model
          });

      const reports: CustomerReport[] = Array.isArray(result) ? result : result.data;
      const runId = Array.isArray(result) ? null : result.runId;
      if (runId) onRunId?.(runId);

      openSnackbar({
        open: true,
        message: 'Relatório de Audiência Trabalhista gerado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      onSuccess?.(reports);
      onClose();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao gerar relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGenerating(false);
      onGeneratingChange?.(false);
      setTimeout(() => onCloseProgress?.(), 800);
    }
  };

  const handleClose = () => {
    if (!generating) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gerar Relatório</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Será gerado um <strong>Relatório de Audiência Trabalhista</strong> a partir desta transcrição.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Após a geração, você será redirecionado para a edição do relatório.
          </Typography>
          <TextField
            select
            label="Modelo"
            size="small"
            value={model}
            onChange={(e) => setModel(e.target.value as AiModel)}
            sx={{ mt: 1, maxWidth: 260 }}
          >
            {MODEL_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={generating}>
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          variant="contained"
          disabled={generating}
          startIcon={generating ? <CircularProgress size={16} /> : null}
        >
          {generating ? 'Gerando...' : 'Gerar Relatório'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
