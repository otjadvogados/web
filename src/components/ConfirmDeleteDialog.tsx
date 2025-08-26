import { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import WarningOutlined from '@ant-design/icons/WarningOutlined';

type Props = {
  open: boolean;
  title?: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Dialog padrão de confirmação de deleção.
 * Reutilizável para qualquer recurso (usuários, departamentos, etc).
 */
export default function ConfirmDeleteDialog({
  open,
  title = 'Remover registro',
  description,
  confirmText = 'Remover',
  cancelText = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel
}: Props) {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningOutlined style={{ color: theme.palette.error.main }} />
          <Typography variant="h6">{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {description ? (
            <Typography variant="body2">{description}</Typography>
          ) : (
            <Typography variant="body2">
              Esta ação não pode ser desfeita. Tem certeza que deseja remover este registro?
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            Dica: verifique se realmente não precisará mais deste dado antes de confirmar.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary" disabled={loading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="error"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
