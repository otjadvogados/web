import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import { getCaseResult, updateCaseResultHtml, CaseResult } from 'api/aiCases';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  caseId: string | null;
  onSaved?: () => void;
};

export default function CaseEditDialog({ open, onClose, caseId, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [caseData, setCaseData] = useState<CaseResult | null>(null);
  const [html, setHtml] = useState('');
  const [tags, setTags] = useState<Record<string, any>>({});
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');

  useEffect(() => {
    if (!open || !caseId) {
      setCaseData(null);
      setHtml('');
      setTags({});
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const data = await getCaseResult(caseId);
        setCaseData(data);
        setHtml(data.infos?.phase06?.html || data.htmlMain || '');
        setTags(data.tags || {});
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

  const handleAddTag = () => {
    if (!newTagKey.trim()) {
      openSnackbar({
        open: true,
        message: 'Informe a chave da tag',
        variant: 'alert',
        alert: { color: 'warning' }
      } as any);
      return;
    }

    setTags((prev) => ({
      ...prev,
      [newTagKey.trim()]: newTagValue.trim() || true
    }));
    setNewTagKey('');
    setNewTagValue('');
  };

  const handleRemoveTag = (key: string) => {
    setTags((prev) => {
      const newTags = { ...prev };
      delete newTags[key];
      return newTags;
    });
  };

  const handleSave = async () => {
    if (!caseId) return;

    try {
      setSaving(true);
      await updateCaseResultHtml(caseId, {
        html,
        tags,
        replaceTags: false // Merge com tags existentes
      });

      openSnackbar({
        open: true,
        message: 'HTML atualizado com sucesso!',
        variant: 'alert',
        alert: { color: 'success' }
      } as any);

      onSaved?.();
      onClose();
    } catch (err: any) {
      openSnackbar({
        open: true,
        message: err?.response?.data?.message || 'Falha ao atualizar HTML',
        variant: 'alert',
        alert: { color: 'error' }
      } as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Editar HTML do Caso</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : caseData ? (
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Informações do caso */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Informações do Caso
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip size="small" label={`Peça: ${caseData.piece?.name || '—'}`} variant="outlined" />
                <Chip size="small" label={`Depto: ${caseData.department?.name || '—'}`} variant="outlined" />
                {caseData.customers && Array.isArray(caseData.customers) && caseData.customers.length > 0 && typeof caseData.customers[0] === 'object' && (
                  <Chip
                    size="small"
                    label={`Cliente: ${(caseData.customers[0] as any).displayName || (caseData.customers[0] as any).name}`}
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>

            {/* Placeholders */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Placeholders
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {caseData.replacedKeys && caseData.replacedKeys.length > 0 && (
                  <Chip size="small" label={`${caseData.replacedKeys.length} preenchidos`} color="success" variant="outlined" />
                )}
                {caseData.missingKeys && caseData.missingKeys.length > 0 && (
                  <Chip size="small" label={`${caseData.missingKeys.length} faltando`} color="warning" variant="outlined" />
                )}
              </Stack>
            </Box>

            <Divider />

            {/* HTML Editor */}
            <TextField
              label="HTML"
              multiline
              rows={12}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              fullWidth
              variant="outlined"
            />

            <Divider />

            {/* Tags */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Tags personalizadas
              </Typography>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.entries(tags).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${String(value)}`}
                      onDelete={() => handleRemoveTag(key)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                  {Object.keys(tags).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma tag adicionada
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Chave"
                    value={newTagKey}
                    onChange={(e) => setNewTagKey(e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <TextField
                    label="Valor (opcional)"
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button variant="outlined" onClick={handleAddTag}>
                    Adicionar Tag
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

