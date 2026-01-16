import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { generateCustomerReports, generateGeneralReports, ReportType } from 'api/reports';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  customerId: string | null; // null para relatórios gerais
  transcriptionId: string; // Aceita UUID ou tr_xxx
  onSuccess?: (reports: any[]) => void;
};

export default function GenerateReportsDialog({ open, onClose, customerId, transcriptionId, onSuccess }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      // Sempre gera apenas RELATORIO_AUDIENCIA_TRABALHISTA (único tipo disponível)
      const reports = customerId
        ? await generateCustomerReports(customerId, {
            transcriptionId, // Aceita UUID ou tr_xxx
            reportTypes: [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA]
          })
        : await generateGeneralReports({
            transcriptionId, // Aceita UUID ou tr_xxx
            reportTypes: [ReportType.RELATORIO_AUDIENCIA_TRABALHISTA]
          });

      openSnackbar({
        open: true,
        message: 'Relatório de Audiência Trabalhista gerado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      onSuccess?.(reports);
      handleClose();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao gerar relatório',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating) {
      onClose();
    }
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
