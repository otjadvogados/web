import { useEffect, useState } from 'react';
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
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import * as Yup from 'yup';
import { Formik } from 'formik';

import SafetyOutlined from '@ant-design/icons/SafetyOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';

import { createRole, updateRole } from '../../api/roles';
import { openSnackbar } from '../../api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: {
    name?: string;
    description?: string | null;
  };
  onSaved: () => void;
};

const schema = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(3, 'Mínimo 3 caracteres'),
  description: Yup.string().nullable().max(200, 'Máx. 200 caracteres')
  // sem companyId no formulário
});

export default function RoleFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setIsSubmitting(false);
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
            {isEdit ? <EditOutlined /> : <SafetyOutlined />}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEdit ? 'Editar Função' : 'Nova Função'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEdit ? 'Atualize os detalhes da função' : 'Defina um nome e uma descrição (opcional)'}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={handleClose} disabled={isSubmitting}><CloseOutlined /></IconButton>
      </DialogTitle>

      <Formik
        enableReinitialize
        initialValues={{
          name: initial?.name || '',
          description: initial?.description ?? ''
          // sem companyId
        }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            const payload = {
              name: values.name.trim(),
              description: values.description?.trim() || null
            };
            if (isEdit && editingId) {
              await updateRole(editingId, payload);
              openSnackbar({ open: true, message: 'Função atualizada!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
              await createRole(payload);
              openSnackbar({ open: true, message: 'Função criada!', variant: 'alert', alert: { color: 'success' } } as any);
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
                  <OutlinedInput id="name" name="name" value={values.name} onChange={handleChange} onBlur={handleBlur}
                                 error={Boolean(touched.name && errors.name)} />
                  {touched.name && errors.name && <FormHelperText error>{errors.name as string}</FormHelperText>}
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="description">Descrição</InputLabel>
                  <TextField id="description" name="description" value={values.description ?? ''} onChange={handleChange} onBlur={handleBlur}
                             multiline minRows={2} />
                  {touched.description && errors.description && <FormHelperText error>{errors.description as string}</FormHelperText>}
                </Stack>

                {/* companyId removido – backend usa o do usuário autenticado */}

                {values.name && (
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" color="text.secondary">Preview</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={values.name} size="small" />
                      {values.description && <Typography variant="body2" color="text.secondary">— {values.description}</Typography>}
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
