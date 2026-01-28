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
import Chip from '@mui/material/Chip';
import * as Yup from 'yup';
import { Formik } from 'formik';

import EditOutlined from '@ant-design/icons/EditOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import AIIcon from 'components/icons/AIIcon';

import { AiOfficeDocument, createOfficeDocument, updateOfficeDocument, UpdateOfficeDocumentDTO } from 'api/aiOfficeDocuments';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: AiOfficeDocument;
  onSaved: () => void;
};

const schemaCreate = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(1, 'Mínimo 1 caractere'),
  description: Yup.string().nullable().optional()
});

const schemaEdit = Yup.object({
  name: Yup.string().min(1, 'Mínimo 1 caractere').optional(),
  description: Yup.string().nullable().optional()
});

export default function OfficeDocumentFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { 
    if (!open) {
      setIsSubmitting(false);
    }
  }, [open]);
  
  const handleClose = () => { if (!isSubmitting) onClose(); };

  const titleNode = useMemo(() => (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
        {isEdit ? <EditOutlined /> : <AIIcon />}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isEdit ? 'Editar Documento' : 'Novo Documento'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Atualize os detalhes do documento' : 'Defina o nome e descrição do documento'}
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
          description: initial?.description ?? ''
        }}
        validationSchema={isEdit ? schemaEdit : schemaCreate}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            if (isEdit && editingId) {
              const payload: UpdateOfficeDocumentDTO = {
                name: values.name?.trim() || initial?.name,
                description: typeof values.description === 'string' ? (values.description?.trim() || null) : values.description ?? undefined
              };
              await updateOfficeDocument(editingId, payload);
              openSnackbar({ open: true, message: 'Documento atualizado!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
              const payload = {
                name: values.name.trim(),
                description: values.description?.trim() || null
              };
              await createOfficeDocument(payload);
              openSnackbar({ open: true, message: 'Documento criado!', variant: 'alert', alert: { color: 'success' } } as any);
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
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
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
                  <InputLabel htmlFor="description">Descrição</InputLabel>
                  <TextField
                    id="description"
                    name="description"
                    value={values.description ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    minRows={3}
                    placeholder="Descreva o conteúdo e propósito deste documento..."
                  />
                </Stack>

                {values.name && (
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" color="text.secondary">Preview</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                      <Chip label={values.name} size="small" />
                    </Stack>
                  </Box>
                )}
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
