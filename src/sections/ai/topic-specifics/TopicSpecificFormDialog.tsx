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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import * as Yup from 'yup';
import { Formik } from 'formik';

import EditOutlined from '@ant-design/icons/EditOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import AIIcon from 'components/icons/AIIcon';

import { AiTopicSpecific, createTopicSpecific, updateTopicSpecific, UpdateTopicSpecificDTO } from 'api/aiTopicSpecifics';
import { listTopics } from 'api/aiTopics';
import { openSnackbar } from 'api/snackbar';
import Textarea from '@mui/material/TextareaAutosize';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: AiTopicSpecific;
  onSaved: () => void;
};

const schemaCreate = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(2, 'Mínimo 2 caracteres'),
  topicId: Yup.string().required('Tópico é obrigatório'),
  instruction: Yup.string().nullable().optional(),
  allowAiEdit: Yup.boolean().optional()
});

const schemaEdit = Yup.object({
  name: Yup.string().min(2, 'Mínimo 2 caracteres').optional(),
  topicId: Yup.string().optional(),
  instruction: Yup.string().nullable().optional(),
  allowAiEdit: Yup.boolean().optional()
});

export default function TopicSpecificFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [topicCatalog, setTopicCatalog] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => { if (!open) setIsSubmitting(false); }, [open]);
  const handleClose = () => { if (!isSubmitting) onClose(); };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await listTopics({ page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
        // @ts-ignore
        setTopicCatalog((res.data || []).map((t: any) => ({ id: t.id, name: t.name })));
      } catch {}
    })();
  }, [open]);

  const titleNode = useMemo(() => (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
        {isEdit ? <EditOutlined /> : <AIIcon />}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isEdit ? 'Editar Tópico Específico' : 'Novo Tópico Específico'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Atualize os detalhes do tópico específico' : 'Defina nome, tópico e (opcional) instrução'}
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
          topicId: initial?.topicId || '',
          instruction: initial?.instruction ?? '',
          allowAiEdit: initial?.allowAiEdit ?? true
        }}
        validationSchema={isEdit ? schemaEdit : schemaCreate}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            if (isEdit && editingId) {
              const payload: UpdateTopicSpecificDTO = {
                name: values.name?.trim() || initial?.name,
                topicId: values.topicId || initial?.topicId,
                instruction: typeof values.instruction === 'string' ? (values.instruction?.trim() || null) : values.instruction ?? undefined,
                allowAiEdit: typeof values.allowAiEdit === 'boolean' ? values.allowAiEdit : initial?.allowAiEdit
              };
              await updateTopicSpecific(editingId, payload);
              openSnackbar({ open: true, message: 'Tópico específico atualizado!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
              await createTopicSpecific({
                name: values.name.trim(),
                topicId: values.topicId,
                instruction: values.instruction?.trim() || null,
                allowAiEdit: !!values.allowAiEdit
              });
              openSnackbar({ open: true, message: 'Tópico específico criado!', variant: 'alert', alert: { color: 'success' } } as any);
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
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
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
                  <InputLabel htmlFor="topicId">Tópico {isEdit ? '(opcional para mover)' : '*'}</InputLabel>
                  <TextField
                    id="topicId"
                    name="topicId"
                    select
                    value={values.topicId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.topicId && errors.topicId)}
                  >
                    <MenuItem value="">{isEdit ? '(não alterar)' : 'Selecione…'}</MenuItem>
                    {topicCatalog.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {touched.topicId && errors.topicId && <FormHelperText error>{errors.topicId as string}</FormHelperText>}
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="instruction">Instrução (opcional)</InputLabel>
                  <TextField
                    id="instruction"
                    name="instruction"
                    value={values.instruction ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    minRows={2}
                  />
                </Stack>

                <FormControlLabel
                  control={<Switch checked={!!values.allowAiEdit} onChange={(e) => setFieldValue('allowAiEdit', e.target.checked)} />}
                  label="Permitir IA editar o texto"
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
