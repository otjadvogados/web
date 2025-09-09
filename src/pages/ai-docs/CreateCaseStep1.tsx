// src/pages/ai-docs/CreateCaseStep1.tsx
import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography, TextField, CircularProgress, Button, Chip, Paper, IconButton } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useNavigate } from 'react-router-dom';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { listCategories, type AiCategory } from 'api/aiCategories';
import {
  listTemplatesByCategory,
  getTemplateDocxBlob,
  createCase,
  uploadCaseDocs,
  type TemplatesByCategoryItem
} from 'api/aiDocs';
import { EyeOutlined, ArrowRightOutlined, PaperClipOutlined, DeleteOutlined } from '@ant-design/icons';

type FlatOption = {
  id: string;
  name: string;
  kind: string;
  description?: string | null;
  fileId?: string | null;
  updatedAt?: string;
  categoryId: string | null;
  categoryName: string;
};

const UNCATEGORIZED = 'Sem categoria';

export default function CreateCaseStep1() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [rawGroups, setRawGroups] = useState<TemplatesByCategoryItem[]>([]);
  const [categories, setCategories] = useState<AiCategory[]>([]);

  const [selected, setSelected] = useState<FlatOption | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // --- novo: detalhes e anexos
  const [pedidoText, setPedidoText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);

  // carrega categorias para mapear os nomes
  useEffect(() => {
    (async () => {
      try {
        const r = await listCategories({ page: 1, limit: 300 });
        setCategories(r.data);
      } catch (e: any) {
        openSnackbar({
          open: true, message: e?.response?.data?.message || 'Erro ao carregar categorias',
          variant: 'alert', alert: { color: 'error' }
        } as any);
      }
    })();
  }, []);

  // carrega templates agrupados
  const fetchByCategory = async () => {
    try {
      setLoading(true);
      const r = await listTemplatesByCategory({
        search: search || undefined,
        limitPerCategory: 100,
        onlyWithTemplates: true
      });
      setRawGroups(r.data || []);
    } catch (e: any) {
      openSnackbar({
        open: true, message: e?.response?.data?.message || 'Erro ao carregar templates',
        variant: 'alert', alert: { color: 'error' }
      } as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchByCategory(); /* eslint-disable-next-line */ }, [search]);

  const catNameById = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

  // "achata" as opções para usar no Autocomplete com groupBy
  const options: FlatOption[] = useMemo(() => {
    const out: FlatOption[] = [];
    for (const group of rawGroups) {
      const label = group.categoryId ? (catNameById.get(group.categoryId) || UNCATEGORIZED) : UNCATEGORIZED;
      for (const t of group.templates) {
        out.push({
          id: t.id,
          name: t.name,
          kind: t.kind,
          description: t.description ?? null,
          fileId: t.fileId ?? null,
          updatedAt: t.updatedAt,
          categoryId: group.categoryId,
          categoryName: label
        });
      }
    }
    // ordena: primeiro com categoria, depois nome
    return out.sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.name.localeCompare(b.name));
  }, [rawGroups, catNameById]);

  async function handlePreview() {
    if (!selected?.fileId) return;
    try {
      setPreviewLoading(true);
      const { blob } = await getTemplateDocxBlob(selected.id, selected.fileId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      openSnackbar({
        open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' }
      } as any);
    } finally {
      setPreviewLoading(false);
    }
  }

  // cria o caso + faz upload dos anexos + navega para /ai-docs com caseId/templateId
  async function createAndGo() {
    if (!selected) {
      openSnackbar({ open: true, message: 'Escolha um template para continuar.', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    if (!pedidoText.trim()) {
      openSnackbar({ open: true, message: 'Descreva o pedido do caso.', variant: 'alert', alert: { color: 'warning' } } as any);
      return;
    }
    try {
      setCreating(true);
      const c = await createCase({ type: selected.kind, requestText: pedidoText.trim() });
      // sobe todos os anexos usando o helper
      if (files.length > 0) {
        await uploadCaseDocs(c.id, files);
      }
      const qs = new URLSearchParams();
      qs.set('caseId', c.id);
      qs.set('templateId', selected.id);
      qs.set('kind', selected.kind);
      qs.set('pedido', encodeURIComponent(pedidoText.trim()));
      navigate(`/ai-docs/editor?${qs.toString()}`);
    } catch (e: any) {
      openSnackbar({ open: true, message: e?.response?.data?.message || e.message, variant: 'alert', alert: { color: 'error' } } as any);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <MainCard title="1) Criar Caso (Advogado)">
        <Stack spacing={3} alignItems="center">
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ maxWidth: 680 }}>
            Selecione abaixo a <strong>peça/modelo</strong> para iniciar o caso. Você pode buscar por título ou descrição e visualizar o Modelo antes de prosseguir.
          </Typography>


          {/* seletor centralizado, agrupado por categoria */}
          <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 860 }}>
            <Autocomplete
              options={options}
              loading={loading}
              value={selected}
              onChange={(_, v) => setSelected(v)}
              onInputChange={(_, value) => setSearch(value)}
              groupBy={(o) => o.categoryName}
              getOptionLabel={(o) => o.name}
              noOptionsText={loading ? 'Carregando…' : 'Nenhum template encontrado'}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Buscar e escolher modelo (agrupado por categoria)"
                  placeholder="Digite para buscar por título ou descrição..."
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', py: .5 }}>
                    <Typography variant="body2" sx={{ flex: 1 }} title={option.name} noWrap>{option.name}</Typography>
                    <Chip size="small" label={option.kind} variant="outlined" />
                  </Stack>
                </li>
              )}
            />

            {/* linha ações selecionado */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ md: 'center' }} sx={{ mt: 1 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                title={selected?.description || '—'}
                sx={{
                  maxWidth: { xs: '100%', md: '60%' },
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {selected?.description ? selected.description : '—'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<EyeOutlined />}
                  onClick={handlePreview}
                  disabled={!selected?.fileId || previewLoading}
                >
                  {previewLoading ? <CircularProgress size={16} /> : 'Pré-visualizar'}
                </Button>
              </Stack>
            </Stack>
          </Paper>

          {/* 2) Detalhes do caso (aparece assim que um template é escolhido) */}
          {selected && (
            <Paper variant="outlined" sx={{ p: 2, width: '100%', maxWidth: 860 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Adicione detalhes do caso</Typography>
              <TextField
                placeholder="Descreva o pedido (chat) para a IA. Ex.: Foi proferida sentença com trânsito em julgado..."
                multiline minRows={5} fullWidth
                value={pedidoText}
                onChange={(e) => setPedidoText(e.target.value)}
              />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <Button component="label" variant="outlined" startIcon={<PaperClipOutlined /> as any}>
                  Anexos
                  <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    hidden
                    onChange={(e) => {
                      const list = Array.from(e.target.files || []);
                      if (list.length) setFiles((prev) => [...prev, ...list]);
                    }}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary">PDFs opcionais que a IA pode usar no rascunho</Typography>
              </Stack>
              {/* lista dos anexos selecionados */}
              {!!files.length && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {files.map((f, i) => (
                    <Chip
                      key={i}
                      label={f.name}
                      onDelete={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      deleteIcon={<DeleteOutlined /> as any}
                      variant="outlined"
                      sx={{ maxWidth: '100%' }}
                    />
                  ))}
                </Stack>
              )}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
                <Button
                  variant="contained"
                  endIcon={<ArrowRightOutlined />}
                  onClick={createAndGo}
                  disabled={creating}
                >
                  {creating ? <CircularProgress size={18} /> : 'Criar caso e continuar'}
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </MainCard>
    </Box>
  );
}
