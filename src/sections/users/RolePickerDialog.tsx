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
import { listRoles, updateUser } from 'api/users';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  currentRoleId?: string | null;
  onChanged: () => void | Promise<void>;
};

export default function RolePickerDialog({ open, onClose, userId, currentRoleId, onChanged }: Props) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string; description?: string | null }>>([]);
  // Estado local para rastrear a função selecionada (atualizado imediatamente)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null | undefined>(currentRoleId);

  async function load(searchQuery?: string) {
    try {
      setLoading(true);
      const query = searchQuery !== undefined ? searchQuery : search;
      const res = await listRoles({ page: 1, limit: 20, search: query || undefined });
      setRoles(res.data);
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Erro ao carregar funções', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setLoading(false);
    }
  }

  // Sincroniza o selectedRoleId quando o diálogo abre ou quando currentRoleId muda
  useEffect(() => {
    if (open) {
      setSelectedRoleId(currentRoleId);
      setSearch('');
      load('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentRoleId]);

  const handleRoleSelect = async (roleId: string) => {
    if (!userId || saving) return;
    
    // Atualiza imediatamente o estado local para feedback visual
    setSelectedRoleId(roleId);
    
    try {
      setSaving(true);
      const response = await updateUser(userId, { roleId });
      openSnackbar({ open: true, message: response.message || 'Função definida!', variant: 'alert', alert: { color: 'success' } } as any);
      // Chama onChanged antes de fechar para garantir que os dados sejam atualizados
      await onChanged();
      onClose();
    } catch (err: any) {
      // Em caso de erro, reverte para o valor anterior
      setSelectedRoleId(currentRoleId);
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Erro ao definir função', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Selecionar Função</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField 
            label="Buscar" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && load(search)} 
            disabled={loading || saving}
          />
          {loading ? (
            <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress /></Stack>
          ) : (
            <List dense sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {roles.map((r) => (
                <ListItemButton
                  key={r.id}
                  selected={r.id === selectedRoleId}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleRoleSelect(r.id);
                  }}
                  disabled={saving}
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
        <Button onClick={onClose} color="secondary" disabled={saving}>Fechar</Button>
        <Button onClick={() => load(search)} disabled={loading || saving}>Recarregar</Button>
      </DialogActions>
    </Dialog>
  );
}
