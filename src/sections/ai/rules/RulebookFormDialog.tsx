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
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import * as Yup from 'yup';
import { Formik } from 'formik';

import EditOutlined from '@ant-design/icons/EditOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import AIIcon from 'components/icons/AIIcon';

import { AiRulebook, createRulebook, updateRulebook, UpdateRulebookDTO } from 'api/aiRulebooks';
import UserSelect from 'components/inputs/UserSelect';
import type { UserBasic } from 'api/users';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: AiRulebook;
  onSaved: () => void;
};

const schemaCreate = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(2, 'Mínimo 2 caracteres'),
  description: Yup.string().nullable().optional(),
  isActive: Yup.boolean().optional()
});

const schemaEdit = Yup.object({
  name: Yup.string().min(2, 'Mínimo 2 caracteres').optional(),
  description: Yup.string().nullable().optional(),
  isActive: Yup.boolean().optional()
});

export default function RulebookFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // novo: responsável pela assinatura
  const [resp, setResp] = useState<UserBasic | null>(null);
  const [clearResp, setClearResp] = useState(false);

  useEffect(() => { 
    if (!open) {
      setIsSubmitting(false);
    } else {
      // pré-preenche o responsável quando abrir o dialog
      if (initial?.signatureUser) {
        setResp(initial.signatureUser);
      } else {
        setResp(null);
      }
      setClearResp(false);
    }
  }, [open, initial]);
  
  const handleClose = () => { if (!isSubmitting) onClose(); };

  const titleNode = useMemo(() => (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'white', display: 'grid', placeItems: 'center' }}>
        {isEdit ? <EditOutlined /> : <AIIcon />}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isEdit ? 'Editar Regra' : 'Nova Regra'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Atualize os detalhes da regra e tipografia' : 'Defina o nome e descrição'}
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
          description: initial?.description ?? '',
          isActive: initial?.isActive ?? true
        }}
        validationSchema={isEdit ? schemaEdit : schemaCreate}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            if (isEdit && editingId) {
              const payload: UpdateRulebookDTO = {
                name: values.name?.trim() || initial?.name,
                description: typeof values.description === 'string' ? (values.description?.trim() || null) : values.description ?? undefined,
                isActive: typeof values.isActive === 'boolean' ? values.isActive : initial?.isActive,
                ...(clearResp ? { signatureUserId: null } : (resp ? { signatureUserId: resp.id } : {}))
              };
              await updateRulebook(editingId, payload);
              openSnackbar({ open: true, message: 'Regra e tipografia atualizada!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
              const payload = {
                name: values.name.trim(),
                description: values.description?.trim() || null,
                isActive: !!values.isActive,
                ...(resp ? { signatureUserId: resp.id } : {})
              };
              await createRulebook(payload);
              openSnackbar({ open: true, message: 'Regra e tipografia criada!', variant: 'alert', alert: { color: 'success' } } as any);
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
                  <InputLabel htmlFor="description">Descrição</InputLabel>
                  <TextField
                    id="description"
                    name="description"
                    value={values.description ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    minRows={2}
                    placeholder="Normas de margem, fonte, numeração..."
                  />
                </Stack>

                {/* Responsável pela assinatura */}
                <Stack gap={1}>
                  <InputLabel>Responsável pela assinatura</InputLabel>
                  {isEdit && (initial?.signatureUser || initial?.signatureUserId) && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      Atual: <b>{initial?.signatureUser?.name || initial?.signatureUserId}</b>
                    </Typography>
                  )}
                  <UserSelect
                    value={resp}
                    onChange={(u) => { setResp(u); setClearResp(false); }}
                    placeholder="Digite para buscar usuários…"
                  />
                  {isEdit && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button size="small" color={clearResp ? 'success' : 'inherit'} onClick={() => { setResp(null); setClearResp((v) => !v); }}>
                        {clearResp ? 'Remoção marcada' : 'Limpar responsável'}
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {clearResp ? 'Ao salvar, o responsável será removido.' : 'Opcional: defina um novo responsável ou limpe.'}
                      </Typography>
                    </Stack>
                  )}
                </Stack>

                <FormControlLabel
                  control={
                    <Switch
                      checked={!!values.isActive}
                      onChange={(e) => setFieldValue('isActive', e.target.checked)}
                    />
                  }
                  label="Regra e tipografia ativa"
                />

                {values.name && (
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" color="text.secondary">Preview</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
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
