import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getCaseResult, CaseResult } from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  caseId: string | null;
};

export default function CaseViewDialog({ open, onClose, caseId }: Props) {
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<CaseResult | null>(null);

  useEffect(() => {
    if (!open || !caseId) {
      setCaseData(null);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const data = await getCaseResult(caseId);
        setCaseData(data);
      } catch (err: any) {
        openSnackbar({
          open: true,
          message: err?.response?.data?.message || 'Falha ao carregar caso',
          variant: 'alert',
          alert: { color: 'error' }
        } as any);
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [open, caseId, onClose]);

  // Prioriza htmlMain (campo salvo pelo backend no AiCaseResult)
  // Depois tenta outros fallbacks para compatibilidade
  const html = 
    caseData?.htmlMain || 
    caseData?.html || 
    (caseData?._infos as any)?.phase06?.html || 
    caseData?.infos?.phase06?.html || 
    '';

  const handleOpenInNewTab = () => {
    if (!html) return;
    const src = `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Preview - Caso</title>
<style>
  html,body{margin:0;padding:0}
  body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; line-height:1.5; padding:24px;}
  h1,h2,h3{margin:1em 0 .5em}
  p{margin:.5em 0}
  ul,ol{padding-left:1.25em}
</style>
</head><body>${html}</body></html>`;
    const blob = new Blob([src], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <span>Visualizar Caso</span>
          <Button
            size="small"
            variant="outlined"
            onClick={handleOpenInNewTab}
            disabled={!html}
          >
            Abrir em nova aba
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : caseData ? (
          html ? (
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <iframe
                title="HTML Preview - Caso"
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
</head><body>${html}</body></html>`}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, px: 2, color: 'text.secondary' }}>
              <Typography variant="body2">Sem HTML para visualizar.</Typography>
              <Typography variant="caption" sx={{ mt: 1 }}>
                Verifique o console para mais detalhes sobre os dados do caso.
              </Typography>
            </Box>
          )
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

