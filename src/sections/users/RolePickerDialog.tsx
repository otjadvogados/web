import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { listRoles, setUserRole } from 'api/users';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  currentRoleId?: string | null;
  onChanged: () => void;
};

export default function RolePickerDialog({ open, onClose, userId, currentRoleId, onChanged }: Props) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);

  async function load() {
    try {
      setLoading(true);
      const res = await listRoles({ page: 1, limit: 20, search });
      setRoles(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Selecionar Função</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          {loading ? (
            <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress /></Stack>
          ) : (
            <List dense sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {roles.map((r) => (
                <ListItemButton
                  key={r.id}
                  selected={r.id === currentRoleId}
                  onClick={async () => {
                    if (!userId) return;
                    const response = await setUserRole(userId, r.id);
                    openSnackbar({ open: true, message: response.message || 'Função definida!', variant: 'alert', alert: { color: 'success' } } as any);
                    onChanged();
                    onClose();
                  }}
                >
                  <ListItemText
                    primary={<Typography fontWeight={600}>{r.name}</Typography>}
                    secondary={r.description || ''}
                  />
                </ListItemButton>
              ))}
              {!roles.length && <Typography variant="body2" color="text.secondary">Nenhum role encontrado.</Typography>}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Fechar</Button>
        <Button onClick={load}>Recarregar</Button>
      </DialogActions>
    </Dialog>
  );
}
