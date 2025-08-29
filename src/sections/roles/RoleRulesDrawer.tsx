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
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Checkbox from '@mui/material/Checkbox';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';

import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';

import { RoleRow } from '../../types/roles';
import { RuleItem } from '../../types/rules';
import { listRoleRules, addRuleToRole, removeRuleFromRole } from '../../api/roleRules';
import { listRules } from '../../api/rules';
import { openSnackbar } from '../../api/snackbar';

/** debounce simples */
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id); }, [value, delay]);
  return v;
}

type Props = { open: boolean; role: RoleRow | null; onClose: () => void; onChanged?: () => void };

export default function RoleRulesDrawer({ open, role, onClose, onChanged }: Props) {
  const roleId = role?.id || '';

  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [current, setCurrent] = useState<RuleItem[]>([]);
  const [catalog, setCatalog] = useState<RuleItem[]>([]);
  const [catalogEnabled, setCatalogEnabled] = useState(true); // desliga se /rules for 404

  const [search, setSearch] = useState('');
  const debSearch = useDebounced(search);

  const [manualId, setManualId] = useState(''); // fallback
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const busy = loadingCurrent || (catalogEnabled && loadingCatalog);

  // ids já vinculados
  const currentIds = useMemo(() => new Set(current.map((r) => r.id)), [current]);
  const isLinked = (id: string) => currentIds.has(id);

  // junta catálogo + atuais (sem duplicar)
  const allRules: RuleItem[] = useMemo(() => {
    if (!catalogEnabled) return [...current].sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, RuleItem>();
    current.forEach((r) => map.set(r.id, r));
    catalog.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r);
      else {
        // mescla dando preferência a dados do catálogo para nome/descrição, mantendo id
        const c = map.get(r.id)!;
        map.set(r.id, { ...c, ...r, id: r.id });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogEnabled, current, catalog]);

  // filtro
  const filtered = useMemo(() => {
    const q = debSearch.trim().toLowerCase();
    if (!q) return allRules;
    return allRules.filter((r) =>
      `${r.name} ${r.description ?? ''} ${r.moduleName ?? ''}`.toLowerCase().includes(q)
    );
  }, [allRules, debSearch]);

  // estado do master checkbox
  const totalFiltered = filtered.length;
  const checkedCount = filtered.filter((r) => isLinked(r.id)).length;
  const allChecked = totalFiltered > 0 && checkedCount === totalFiltered;
  const someChecked = checkedCount > 0 && checkedCount < totalFiltered;

  // carregar dados
  useEffect(() => {
    if (!open || !roleId) return;
    let alive = true;

    async function loadCurrent() {
      setLoadingCurrent(true);
      try {
        const rules = await listRoleRules(roleId);
        if (!alive) return;
        setCurrent(rules);
      } catch (err: any) {
        openSnackbar({ open: true, message: err?.response?.data?.message || 'Falha ao carregar rules do cargo', variant: 'alert', alert: { color: 'error' } } as any);
      } finally {
        setLoadingCurrent(false);
      }
    }

    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const rules = await listRules();
        if (!alive) return;
        setCatalog(rules);
        setCatalogEnabled(true);
      } catch {
        setCatalogEnabled(false);
      } finally {
        setLoadingCatalog(false);
      }
    }

    loadCurrent();
    loadCatalog();
    return () => { alive = false; };
  }, [open, roleId]);

  // toggle unitário (liga = adiciona; desliga = remove)
  async function toggleRule(id: string) {
    if (!roleId || busyIds.has(id)) return;
    const linked = isLinked(id);
    setBusyIds((s) => new Set(s).add(id));
    try {
      if (linked) {
        await removeRuleFromRole(roleId, id);
        setCurrent((prev) => prev.filter((r) => r.id !== id));
        openSnackbar({ open: true, message: 'Rule removida do cargo', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        await addRuleToRole(roleId, id);
        // pega metadados do catálogo se existir
        const found = catalog.find((r) => r.id === id);
        setCurrent((prev) => [...prev, found || ({ id, name: id } as RuleItem)]);
        openSnackbar({ open: true, message: 'Rule adicionada ao cargo', variant: 'alert', alert: { color: 'success' } } as any);
      }
      onChanged?.();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Ação não concluída', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  }

  // master: se tudo está marcado, desmarca (remove todos do filtro); senão marca (adiciona os faltantes)
  async function handleToggleAll() {
    if (!roleId || totalFiltered === 0) return;
    setBulkBusy(true);
    try {
      if (allChecked) {
        const toRemove = filtered.filter((r) => isLinked(r.id)).map((r) => r.id);
        await Promise.all(toRemove.map((id) => removeRuleFromRole(roleId, id)));
        setCurrent((prev) => prev.filter((r) => !toRemove.includes(r.id)));
        openSnackbar({ open: true, message: `Removidas ${toRemove.length} rule(s)`, variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        const toAdd = filtered.filter((r) => !isLinked(r.id)).map((r) => r.id);
        await Promise.all(toAdd.map((id) => addRuleToRole(roleId, id)));
        const addedObjs = catalog.filter((r) => toAdd.includes(r.id));
        setCurrent((prev) => [...prev, ...addedObjs.filter((r) => !prev.find((p) => p.id === r.id))]);
        openSnackbar({ open: true, message: `Adicionadas ${toAdd.length} rule(s)`, variant: 'alert', alert: { color: 'success' } } as any);
      }
      onChanged?.();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Ação em lote falhou', variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setBulkBusy(false);
    }
  }

  // fallback: adicionar por ID quando não há catálogo
  async function handleAddManual() {
    const id = manualId.trim();
    if (!id || !roleId) return;
    try {
      await addRuleToRole(roleId, id);
      const found = catalog.find((r) => r.id === id);
      setCurrent((prev) => [...prev, found || ({ id, name: id } as RuleItem)]);
      setManualId('');
      openSnackbar({ open: true, message: 'Rule adicionada', variant: 'alert', alert: { color: 'success' } } as any);
      onChanged?.();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Não foi possível adicionar', variant: 'alert', alert: { color: 'error' } } as any);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
            <SafetyOutlined />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Gerenciar Rules do cargo</Typography>
            <Typography variant="body2" color="text.secondary">{role?.name || '—'}</Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose}><CloseOutlined /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {busy ? (
          <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
        ) : (
          <>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                placeholder="Buscar por nome, módulo, descrição…"
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
                <Typography variant="body2">
                  Selecionar todos (filtrados)
                </Typography>
                <Chip size="small" label={`${checkedCount}/${totalFiltered} marcadas`} sx={{ ml: 'auto' }} />
              </Stack>
            </Stack>

            <List dense sx={{ maxHeight: 420, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {filtered.length === 0 && (
                <ListItem><ListItemText primary="Nenhuma rule encontrada." /></ListItem>
              )}
              {filtered.map((r) => {
                const linked = isLinked(r.id);
                const disabled = busyIds.has(r.id) || bulkBusy;
                return (
                  <ListItem key={r.id} disablePadding secondaryAction={linked ? <Chip size="small" color="success" label="vinculada" /> : undefined}>
                    <ListItemButton onClick={() => !disabled && toggleRule(r.id)} dense disabled={disabled}>
                      <ListItemIcon>
                        <Checkbox edge="start" checked={linked} tabIndex={-1} disableRipple disabled={disabled} />
                      </ListItemIcon>
                      <ListItemText
                        primary={r.name}
                        secondary={r.description || r.moduleName}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>

            {!catalogEnabled && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
                <TextField
                  label="Adicionar por Rule ID (catálogo indisponível)"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  fullWidth
                />
                <Button startIcon={<PlusOutlined />} variant="contained" onClick={handleAddManual} disabled={!manualId.trim()}>
                  Adicionar
                </Button>
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}
