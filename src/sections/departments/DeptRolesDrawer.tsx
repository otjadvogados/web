import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

import TeamOutlined from '@ant-design/icons/TeamOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';

import { RoleRow } from '../../types/roles';
import { DepartmentRow } from '../../types/departments';
import { listRoles } from '../../api/roles';
import { listDepartmentRoles, addRoleToDepartment, removeRoleFromDepartment } from '../../api/departmentRoles';
import { openSnackbar } from '../../api/snackbar';
import useDebounced from '../../utils/useDebounced';

type Props = {
  open: boolean;
  department: DepartmentRow | null;
  onClose: () => void;
  onChanged?: () => void;
};

export default function DeptRolesDrawer({ open, department, onClose, onChanged }: Props) {
  const deptId = department?.id || '';
  const [search, setSearch] = useState('');
  const debSearch = useDebounced(search);

  const [loadingCurr, setLoadingCurr] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [current, setCurrent] = useState<RoleRow[]>([]);
  const [catalog, setCatalog] = useState<RoleRow[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const busy = loadingCurr || loadingCatalog;

  const currentIds = useMemo(() => new Set(current.map(r => r.id)), [current]);
  const isLinked = (id: string) => currentIds.has(id);

  // Unifica catálogo + atuais (sem duplicar) e aplica ordenação
  const allRoles = useMemo(() => {
    const map = new Map<string, RoleRow>();
    current.forEach(r => map.set(r.id, r));
    catalog.forEach(r => { if (!map.has(r.id)) map.set(r.id, r); });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [current, catalog]);

  const filtered = useMemo(() => {
    const q = debSearch.trim().toLowerCase();
    if (!q) return allRoles;
    return allRoles.filter(r =>
      `${r.name} ${r.description ?? ''}`.toLowerCase().includes(q)
    );
  }, [allRoles, debSearch]);

  const totalFiltered = filtered.length;
  const checkedCount = filtered.filter(r => isLinked(r.id)).length;
  const allChecked = totalFiltered > 0 && checkedCount === totalFiltered;
  const someChecked = checkedCount > 0 && checkedCount < totalFiltered;

  useEffect(() => {
    if (!open || !deptId) return;
    let alive = true;

    async function loadCurrent() {
      setLoadingCurr(true);
      try {
        const rows = await listDepartmentRoles(deptId);
        if (!alive) return;
        setCurrent(rows);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar cargos do departamento', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setLoadingCurr(false);
      }
    }

    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        // busca catálogo com filtro server-side
        const res = await listRoles({ page: 1, limit: 100, search: debSearch || undefined, sortBy: 'name' as const, sortOrder: 'asc' as const });
        if (!alive) return;
        setCatalog(res.data);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar catálogo de cargos', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setLoadingCatalog(false);
      }
    }

    loadCurrent();
    loadCatalog();
    return () => { alive = false; };
  }, [open, deptId, debSearch]);

  async function toggleRole(roleId: string) {
    if (!deptId || busyIds.has(roleId)) return;
    const linked = isLinked(roleId);
    setBusyIds(s => new Set(s).add(roleId));
    try {
      if (linked) {
        await removeRoleFromDepartment(deptId, roleId);
        setCurrent(prev => prev.filter(r => r.id !== roleId));
        openSnackbar({ open: true, message: 'Cargo removido do departamento', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        await addRoleToDepartment(deptId, roleId);
        const found = catalog.find(r => r.id === roleId);
        setCurrent(prev => [...prev, found || ({ id: roleId, name: roleId } as RoleRow)]);
        openSnackbar({ open: true, message: 'Cargo adicionado ao departamento', variant: 'alert', alert: { color: 'success' } } as any);
      }
      onChanged?.();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Ação não concluída', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setBusyIds(s => { const n = new Set(s); n.delete(roleId); return n; });
    }
  }

  async function handleToggleAll() {
    if (!deptId || totalFiltered === 0) return;
    setBulkBusy(true);
    try {
      if (allChecked) {
        const toRemove = filtered.filter(r => isLinked(r.id)).map(r => r.id);
        await Promise.all(toRemove.map(id => removeRoleFromDepartment(deptId, id)));
        setCurrent(prev => prev.filter(r => !toRemove.includes(r.id)));
        openSnackbar({ open: true, message: `Removidos ${toRemove.length} cargo(s)`, variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        const toAdd = filtered.filter(r => !isLinked(r.id)).map(r => r.id);
        await Promise.all(toAdd.map(id => addRoleToDepartment(deptId, id)));
        const addedObjs = catalog.filter(r => toAdd.includes(r.id));
        setCurrent(prev => [...prev, ...addedObjs.filter(r => !prev.find(p => p.id === r.id))]);
        openSnackbar({ open: true, message: `Adicionados ${toAdd.length} cargo(s)`, variant: 'alert', alert: { color: 'success' } } as any);
      }
      onChanged?.();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Ação em lote falhou', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
            <TeamOutlined />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Gerenciar cargos do departamento</Typography>
            <Typography variant="body2" color="text.secondary">{department?.name || '—'}</Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose}><CloseOutlined /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {(busy) ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
        ) : (
          <>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                placeholder="Buscar cargo por nome/descrição…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
                fullWidth
              />
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 260 }}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={someChecked}
                  onChange={handleToggleAll}
                  disabled={bulkBusy || totalFiltered === 0}
                />
                <Typography variant="body2">Selecionar todos (filtrados)</Typography>
                <Chip size="small" label={`${checkedCount}/${totalFiltered} marcados`} sx={{ ml: 'auto' }} />
              </Stack>
            </Stack>

            <List dense sx={{ maxHeight: 420, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {filtered.length === 0 && <ListItem><ListItemText primary="Nenhum cargo encontrado." /></ListItem>}
              {filtered.map((r) => {
                const linked = isLinked(r.id);
                const disabled = busyIds.has(r.id) || bulkBusy;
                return (
                  <ListItem key={r.id} disablePadding secondaryAction={linked ? <Chip size="small" color="success" label="vinculado" /> : undefined}>
                    <ListItemButton onClick={() => !disabled && toggleRole(r.id)} dense disabled={disabled}>
                      <ListItemIcon><Checkbox edge="start" checked={linked} tabIndex={-1} disableRipple disabled={disabled} /></ListItemIcon>
                      <ListItemText
                        primary={r.name}
                        secondary={r.description}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
