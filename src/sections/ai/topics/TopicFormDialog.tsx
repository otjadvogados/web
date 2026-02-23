import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import * as Yup from 'yup';
import { Formik } from 'formik';

import EditOutlined from '@ant-design/icons/EditOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import AIIcon from 'components/icons/AIIcon';

import { AiTopic, createTopic, updateTopic, UpdateTopicDTO } from 'api/aiTopics';
import { listPieces } from 'api/aiPieces';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: AiTopic;
  onSaved: () => void;
};

const schemaCreate = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(2, 'Mínimo 2 caracteres'),
  pieceId: Yup.string().required('Peça é obrigatória'),
  description: Yup.string().nullable().optional(),
  redigirResumoLigado: Yup.boolean().optional()
});

const schemaEdit = Yup.object({
  name: Yup.string().min(2, 'Mínimo 2 caracteres').optional(),
  pieceId: Yup.string().required('Peça é obrigatória'),
  description: Yup.string().nullable().optional(),
  redigirResumoLigado: Yup.boolean().optional()
});

export default function TopicFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pieceCatalog, setPieceCatalog] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => { if (!open) setIsSubmitting(false); }, [open]);
  const handleClose = () => { if (!isSubmitting) onClose(); };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await listPieces({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
        // @ts-ignore compat
        setPieceCatalog((res.data || []).map((p: any) => ({ id: p.id, name: p.name })));
      } catch {
        // silencioso
      }
    })();
  }, [open]);

  const titleNode = useMemo(() => (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
        {isEdit ? <EditOutlined /> : <AIIcon />}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isEdit ? 'Editar Tópico' : 'Novo Tópico'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Atualize os detalhes do tópico' : 'Defina nome, peça e (opcional) descrição'}
        </Typography>
      </Box>
    </Stack>
  ), [isEdit]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {titleNode}
        <IconButton onClick={handleClose} disabled={isSubmitting}><CloseOutlined /></IconButton>
      </DialogTitle>

      <Formik
        enableReinitialize
        initialValues={{
          name: initial?.name || '',
          pieceId: initial?.pieceId || '',
          description: initial?.description ?? '',
          // API: true = com resumo (botão ligado), false = sem resumo (botão desligado). Form armazena esse estado; ao salvar enviamos writeWithoutSummary: !estado.
          redigirResumoLigado: (() => {
            if (initial == null) return true;
            const raw = (initial as any)?.writeWithoutSummary ?? (initial as any)?.write_without_summary;
            if (raw === undefined || raw === null) return false;
            return raw === true;
          })()
        }}
        validationSchema={isEdit ? schemaEdit : schemaCreate}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            if (isEdit && editingId) {
              const payload: UpdateTopicDTO = {
                name: values.name?.trim() || initial?.name,
                pieceId: values.pieceId,
                description: typeof values.description === 'string' ? (values.description?.trim() || null) : values.description ?? undefined,
                writeWithoutSummary: typeof values.redigirResumoLigado === 'boolean' ? values.redigirResumoLigado : (() => {
                const raw = (initial as any)?.writeWithoutSummary ?? (initial as any)?.write_without_summary;
                return raw === true;
              })()
              };
              await updateTopic(editingId, payload);
              openSnackbar({ open: true, message: 'Tópico atualizado!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
              await createTopic({
                name: values.name.trim(),
                pieceId: values.pieceId,
                description: values.description?.trim() || null,
                writeWithoutSummary: values.redigirResumoLigado ?? true
              });
              openSnackbar({ open: true, message: 'Tópico criado!', variant: 'alert', alert: { color: 'success' } } as any);
            }
            onSaved();
            onClose();
          } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || 'Falha ao salvar';
            setErrors({ name: msg });
            openSnackbar({ open: true, message: msg, variant: 'alert', alert: { color: 'error' } } as any);
          } finally {
            setSubmitting(false);
            setIsSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue }) => (
          <>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Stack gap={1}>
                  <InputLabel htmlFor="name">Nome *</InputLabel>
                  <OutlinedInput
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.name && errors.name)}
                  />
                  {touched.name && errors.name && <FormHelperText error>{errors.name as string}</FormHelperText>}
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="pieceId">Peça *</InputLabel>
                  <TextField
                    id="pieceId"
                    name="pieceId"
                    select
                    value={values.pieceId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.pieceId && errors.pieceId)}
                  >
                    <MenuItem value="">Selecione…</MenuItem>
                    {pieceCatalog.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {touched.pieceId && errors.pieceId && <FormHelperText error>{errors.pieceId as string}</FormHelperText>}
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="description">Descrição (opcional)</InputLabel>
                  <TextField
                    id="description"
                    name="description"
                    value={values.description ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    minRows={2}
                  />
                </Stack>

                {/* true = com resumo (ligado). Na API enviamos writeWithoutSummary com o mesmo valor (true = ligado, false = desligado). */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(values.redigirResumoLigado)}
                      onChange={() => setFieldValue('redigirResumoLigado', !values.redigirResumoLigado)}
                    />
                  }
                  label="Redigir Resumo"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="secondary">Cancelar</Button>
              <Button onClick={() => handleSubmit()} variant="contained" disabled={isSubmitting}>
                {isEdit ? 'Salvar' : 'Criar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
}
