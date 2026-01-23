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
import Collapse from '@mui/material/Collapse';

import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import RightOutlined from '@ant-design/icons/RightOutlined';

import { RoleRow } from '../../types/roles';
import { RuleItem, RuleTreeNode } from '../../types/rules';
import { listRoleRules, addRuleToRole, removeRuleFromRole } from '../../api/roleRules';
import { listRules } from '../../api/rules';
import { openSnackbar } from '../../api/snackbar';

/** debounce simples */
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id); }, [value, delay]);
  return v;
}

function flattenRuleTree(nodes: RuleTreeNode[]): RuleItem[] {
  const items: RuleItem[] = [];
  const walk = (list: RuleTreeNode[]) => {
    list.forEach((node) => {
      if (node.data?.length) items.push(...node.data);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return items;
}

function filterRuleTree(nodes: RuleTreeNode[], query: string): RuleTreeNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  const walk = (list: RuleTreeNode[]): RuleTreeNode[] => {
    return list
      .map((node): RuleTreeNode | null => {
        const filteredChildren = node.children ? walk(node.children) : [];
        const filteredData =
          node.data?.filter((r) => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(q)) ?? [];
        const hasChildren = filteredChildren.length > 0;
        const hasData = filteredData.length > 0;
        if (!hasChildren && !hasData) return null;
        const result: RuleTreeNode = {
          name: node.name
        };
        if (hasChildren) {
          result.children = filteredChildren;
        }
        if (hasData) {
          result.data = filteredData;
        }
        return result;
      })
      .filter((n): n is RuleTreeNode => n !== null);
  };
  return walk(nodes);
}

function countNodeSelections(node: RuleTreeNode, selectedIds: Set<string>): { total: number; checked: number } {
  let total = 0;
  let checked = 0;
  if (node.data?.length) {
    total += node.data.length;
    checked += node.data.filter((r) => selectedIds.has(r.id)).length;
  }
  if (node.children?.length) {
    node.children.forEach((child) => {
      const res = countNodeSelections(child, selectedIds);
      total += res.total;
      checked += res.checked;
    });
  }
  return { total, checked };
}

function makeGroupKey(path: string[], name: string, index: number) {
  return [...path, `${name}-${index}`].join(' / ');
}

function collectGroupKeys(nodes: RuleTreeNode[], path: string[] = []): string[] {
  const keys: string[] = [];
  nodes.forEach((node, idx) => {
    const key = makeGroupKey(path, node.name, idx);
    keys.push(key);
    if (node.children?.length) keys.push(...collectGroupKeys(node.children, [...path, `${node.name}-${idx}`]));
  });
  return keys;
}

type Props = { open: boolean; role: RoleRow | null; onClose: () => void; onChanged?: () => void };

export default function RoleRulesDrawer({ open, role, onClose, onChanged }: Props) {
  const roleId = role?.id || '';

  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [currentIds, setCurrentIds] = useState<Set<string>>(new Set());
  const [currentList, setCurrentList] = useState<RuleItem[]>([]);
  const [catalogTree, setCatalogTree] = useState<RuleTreeNode[]>([]);
  const [catalogEnabled, setCatalogEnabled] = useState(true); // desliga se /rules for 404
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const debSearch = useDebounced(search);

  const [manualId, setManualId] = useState(''); // fallback
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const busy = loadingCurrent || (catalogEnabled && loadingCatalog);

  const hasCatalog = catalogEnabled && catalogTree.length > 0;
  const catalogMap = useMemo(() => {
    const map = new Map<string, RuleItem>();
    flattenRuleTree(catalogTree).forEach((r) => map.set(r.id, r));
    return map;
  }, [catalogTree]);

  const filteredTree = useMemo(() => filterRuleTree(catalogTree, debSearch), [catalogTree, debSearch]);
  const treeLeaves = useMemo(() => flattenRuleTree(filteredTree), [filteredTree]);
  const fallbackFiltered = useMemo(() => {
    const q = debSearch.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter((r) => `${r.name} ${r.description ?? ''} ${r.moduleName ?? ''}`.toLowerCase().includes(q));
  }, [currentList, debSearch]);

  const visibleLeaves = hasCatalog ? treeLeaves : fallbackFiltered;

  const isLinked = (id: string) => currentIds.has(id);

  // estado do master checkbox
  const totalFiltered = visibleLeaves.length;
  const checkedCount = visibleLeaves.filter((r) => isLinked(r.id)).length;
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
        const flattened = flattenRuleTree(rules);
        setCurrentList(flattened);
        setCurrentIds(new Set(flattened.map((r) => r.id)));
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
        setCatalogTree(rules);
        setCatalogEnabled(true);
        const rootKeys = rules.map((node, idx) => makeGroupKey([], node.name, idx));
        setExpanded(new Set(rootKeys));
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

  // expande tudo quando há busca para facilitar visualizar os matches
  useEffect(() => {
    if (!debSearch.trim() || !hasCatalog) return;
    setExpanded(new Set(collectGroupKeys(filteredTree)));
  }, [debSearch, filteredTree, hasCatalog]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // toggle unitário (liga = adiciona; desliga = remove)
  async function toggleRule(id: string) {
    if (!roleId || busyIds.has(id)) return;
    const linked = isLinked(id);
    setBusyIds((s) => new Set(s).add(id));
    try {
      if (linked) {
        await removeRuleFromRole(roleId, id);
        setCurrentIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setCurrentList((prev) => prev.filter((r) => r.id !== id));
        openSnackbar({ open: true, message: 'Permissão removida de um cargo', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        await addRuleToRole(roleId, id);
        const found = catalogMap.get(id);
        setCurrentIds((prev) => new Set(prev).add(id));
        setCurrentList((prev) => [...prev, found || ({ id, name: id } as RuleItem)]);
        
        // Se selecionou "ai.cases.create", adiciona automaticamente as permissões relacionadas
        // Verifica pelo name ou description da regra
        if (found) {
          const ruleName = found.name || '';
          const ruleDescription = found.description || '';
          const ruleNameLower = ruleName.toLowerCase();
          const ruleDescLower = ruleDescription.toLowerCase();
          
          // Verifica se é a regra de criar caso (pode estar no name ou description)
          const isCreateCaseRule = 
            ruleName === 'ai.cases.create' || 
            ruleDescription === 'ai.cases.create' ||
            ruleNameLower.includes('criar caso') ||
            ruleDescLower.includes('criar caso') ||
            ruleNameLower.includes('ai.cases.create') ||
            ruleDescLower.includes('ai.cases.create');
          
          if (isCreateCaseRule) {
            const requiredPermissionNames = [
              'departments.read',
              'customers.read',
              'ai.pieces.read',
              'ai.topics.read',
              'ai.topic-specifics.read'
            ];
            
            // Encontra as regras no catálogo que correspondem às permissões necessárias
            const permissionsToAdd: string[] = [];
            requiredPermissionNames.forEach(permName => {
              // Procura no catálogo por name ou description que corresponda à permissão
              const matchingRule = Array.from(catalogMap.values()).find(r => {
                const rName = (r.name || '').toLowerCase();
                const rDesc = (r.description || '').toLowerCase();
                const permLower = permName.toLowerCase();
                
                return r.name === permName || 
                       r.description === permName ||
                       rName === permLower ||
                       rDesc === permLower ||
                       rName.includes(permLower) ||
                       rDesc.includes(permLower);
              });
              
              if (matchingRule && !currentIds.has(matchingRule.id)) {
                permissionsToAdd.push(matchingRule.id);
              }
            });
            
            if (permissionsToAdd.length > 0) {
              try {
                // Adiciona todas as permissões relacionadas
                await Promise.all(permissionsToAdd.map(permId => addRuleToRole(roleId, permId)));
                
                // Atualiza o estado com as novas permissões
                permissionsToAdd.forEach(permId => {
                  const permFound = catalogMap.get(permId);
                  setCurrentIds((prev) => new Set(prev).add(permId));
                  setCurrentList((prev) => [...prev, permFound || ({ id: permId, name: permId } as RuleItem)]);
                });
                
                openSnackbar({ 
                  open: true, 
                  message: `Permissão adicionada. ${permissionsToAdd.length} permissão(ões) relacionada(s) também foram selecionadas automaticamente.`, 
                  variant: 'alert', 
                  alert: { color: 'success' } 
                } as any);
              } catch (err: any) {
                // Se falhar ao adicionar as permissões relacionadas, mostra mensagem genérica
                openSnackbar({ open: true, message: 'Permissão adicionada a um cargo', variant: 'alert', alert: { color: 'success' } } as any);
              }
            } else {
              openSnackbar({ open: true, message: 'Permissão adicionada a um cargo', variant: 'alert', alert: { color: 'success' } } as any);
            }
          } else {
            openSnackbar({ open: true, message: 'Permissão adicionada a um cargo', variant: 'alert', alert: { color: 'success' } } as any);
          }
        } else {
          openSnackbar({ open: true, message: 'Permissão adicionada a um cargo', variant: 'alert', alert: { color: 'success' } } as any);
        }
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
        const toRemove = visibleLeaves.filter((r) => isLinked(r.id)).map((r) => r.id);
        await Promise.all(toRemove.map((id) => removeRuleFromRole(roleId, id)));
        setCurrentIds((prev) => {
          const next = new Set(prev);
          toRemove.forEach((id) => next.delete(id));
          return next;
        });
        setCurrentList((prev) => prev.filter((r) => !toRemove.includes(r.id)));
        openSnackbar({ open: true, message: `Removidas ${toRemove.length} rule(s)`, variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        const toAdd = visibleLeaves.filter((r) => !isLinked(r.id)).map((r) => r.id);
        await Promise.all(toAdd.map((id) => addRuleToRole(roleId, id)));
        setCurrentIds((prev) => {
          const next = new Set(prev);
          toAdd.forEach((id) => next.add(id));
          return next;
        });
        setCurrentList((prev) => {
          const map = new Map(prev.map((r) => [r.id, r]));
          toAdd.forEach((id) => map.set(id, catalogMap.get(id) || ({ id, name: id } as RuleItem)));
          return Array.from(map.values());
        });
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
      const found = catalogMap.get(id);
      setCurrentIds((prev) => new Set(prev).add(id));
      setCurrentList((prev) => [...prev, found || ({ id, name: id } as RuleItem)]);
      setManualId('');
      openSnackbar({ open: true, message: 'Rule adicionada', variant: 'alert', alert: { color: 'success' } } as any);
      onChanged?.();
    } catch (err: any) {
      openSnackbar({ open: true, message: err?.response?.data?.message || 'Não foi possível adicionar', variant: 'alert', alert: { color: 'error' } } as any);
    }
  }

  const renderRuleItem = (r: RuleItem) => {
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
  };

  // Renderiza item de data usando descrição como texto principal
  const renderDataItem = (r: RuleItem) => {
    const linked = isLinked(r.id);
    const disabled = busyIds.has(r.id) || bulkBusy;
    // Usa a descrição completa
    let displayText = r.description || r.name;
    // Substitui "Super" por "Geral" apenas se a descrição completa for "Super"
    if (displayText.toLowerCase().trim() === 'super') {
      displayText = 'Geral';
    }
    return (
      <ListItem key={r.id} disablePadding secondaryAction={linked ? <Chip size="small" color="success" label="vinculada" /> : undefined}>
        <ListItemButton onClick={() => !disabled && toggleRule(r.id)} dense disabled={disabled}>
          <ListItemIcon>
            <Checkbox edge="start" checked={linked} tabIndex={-1} disableRipple disabled={disabled} />
          </ListItemIcon>
          <ListItemText
            primary={displayText}
            primaryTypographyProps={{ noWrap: true }}
          />
        </ListItemButton>
      </ListItem>
    );
  };

  const renderTree = (nodes: RuleTreeNode[], path: string[] = []) =>
    nodes.map((node, idx) => {
      const key = makeGroupKey(path, node.name, idx);
      const open = expanded.has(key);
      const counts = countNodeSelections(node, currentIds);
      const hasChildren = node.children?.length;
      const hasData = node.data?.length;
      if (!hasChildren && !hasData) return null;
      
      // Se tem apenas data (sem children), renderiza os itens diretamente sem o grupo
      if (hasData && !hasChildren) {
        return (
          <Box key={key} sx={{ borderLeft: path.length ? '1px dashed' : 'none', borderColor: 'divider' }}>
            <List dense disablePadding sx={{ pl: path.length * 2 }}>
              {node.data?.map((r) => renderDataItem(r))}
            </List>
          </Box>
        );
      }
      
      // Se tem children (com ou sem data), renderiza como grupo
      return (
        <Box key={key} sx={{ borderLeft: path.length ? '1px dashed' : 'none', borderColor: 'divider' }}>
          <ListItem disableGutters>
            <ListItemButton onClick={() => toggleExpand(key)} dense>
              <ListItemIcon sx={{ minWidth: 34 }}>
                {open ? <DownOutlined /> : <RightOutlined />}
              </ListItemIcon>
              <ListItemText
                primary={node.name}
                secondary={counts.total > 0 ? `${counts.checked}/${counts.total} selecionadas` : undefined}
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </ListItemButton>
          </ListItem>
          {/* Renderiza data sempre visível (sem Collapse) usando descrição */}
          {hasData && (
            <List dense disablePadding sx={{ pl: 4 }}>
              {node.data?.map((r) => renderDataItem(r))}
            </List>
          )}
          {/* Renderiza children dentro do Collapse */}
          <Collapse in={open} timeout="auto" unmountOnExit>
            <List dense disablePadding sx={{ pl: 4 }}>
              {node.children && renderTree(node.children, [...path, `${node.name}-${idx}`])}
            </List>
          </Collapse>
        </Box>
      );
    });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
            <SafetyOutlined />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700}>Gerenciar Permissões da função</Typography>
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
              {totalFiltered === 0 && (
                <ListItem><ListItemText primary="Nenhuma rule encontrada." /></ListItem>
              )}
              {hasCatalog ? renderTree(filteredTree) : fallbackFiltered.map((r) => renderRuleItem(r))}
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
