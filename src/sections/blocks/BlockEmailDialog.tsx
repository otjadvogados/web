import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import MailOutlined from '@ant-design/icons/MailOutlined';
import Typography from '@mui/material/Typography';
import { blockByEmail } from '../../api/blocks';
import { openSnackbar } from '../../api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function BlockEmailDialog({ open, onClose, onSaved }: Props) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [untilLocal, setUntilLocal] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setReason('');
      setUntilLocal('');
      setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    try {
      if (!email.trim()) return;
      setSaving(true);
      const until = untilLocal ? new Date(untilLocal).toISOString() : null;
      await blockByEmail({ email: email.trim(), reason: reason.trim() || undefined, until });
      openSnackbar({ open: true, message: 'E-mail bloqueado', variant: 'alert', alert: { color: 'success' } } as any);
      onSaved();
      onClose();
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message || 'Falha ao bloquear', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <MailOutlined />
          <Typography variant="h6">Bloquear por e-mail</Typography>
        </Stack>
        <IconButton onClick={onClose} disabled={saving}><CloseOutlined /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Stack gap={1}>
            <InputLabel>Motivo</InputLabel>
            <TextField value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opcional" multiline minRows={2} />
          </Stack>
          <Stack gap={1}>
            <InputLabel>Expira em</InputLabel>
            <TextField
              type="datetime-local"
              value={untilLocal}
              onChange={(e) => setUntilLocal(e.target.value)}
              helperText="Opcional — deixa vazio para bloqueio sem prazo"
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={saving}>Cancelar</Button>
        <Button onClick={submit} variant="contained" disabled={saving || !email.trim()}>Bloquear</Button>
      </DialogActions>
    </Dialog>
  );
}
