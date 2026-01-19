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
import * as Yup from 'yup';
import { Formik } from 'formik';

import EditOutlined from '@ant-design/icons/EditOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import AIIcon from 'components/icons/AIIcon';

import { Prompt, createPrompt, updatePrompt, UpdatePromptInput } from 'api/prompts';
import { listDepartments } from 'api/departments';
import { listCustomers } from 'api/customers';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: Prompt;
  onSaved: () => void;
};

const schemaCreate = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(1, 'Mínimo 1 caractere'),
  description: Yup.string().required('Descrição é obrigatória').min(1, 'Mínimo 1 caractere'),
  customerId: Yup.mixed().nullable().optional(),
  departmentId: Yup.mixed().nullable().optional()
});

const schemaEdit = Yup.object({
  name: Yup.string().min(1, 'Mínimo 1 caractere').optional(),
  description: Yup.string().min(1, 'Mínimo 1 caractere').optional(),
  customerId: Yup.mixed().nullable().optional(),
  departmentId: Yup.mixed().nullable().optional()
});

export default function PromptFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deptCatalog, setDeptCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [custCatalog, setCustCatalog] = useState<Array<{ id: string; displayName?: string; name?: string }>>([]);

  useEffect(() => { 
    if (!open) setIsSubmitting(false); 
  }, [open]);
  
  const handleClose = () => { 
    if (!isSubmitting) onClose(); 
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [dres, cres] = await Promise.all([
          listDepartments({ page: 1, limit: 100 }),
          listCustomers({ page: 1, limit: 100 })
        ]);
        // @ts-ignore
        setDeptCatalog(dres.data?.map((d: any) => ({ id: d.id, name: d.name })) || []);
        // @ts-ignore
        setCustCatalog(cres.data || []);
      } catch (err) {
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
          {isEdit ? 'Editar Prompt' : 'Novo Prompt'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Atualize os detalhes do prompt' : 'Defina nome e conteúdo do prompt'}
        </Typography>
      </Box>
    </Stack>
  ), [isEdit]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {titleNode}
        <IconButton onClick={handleClose} disabled={isSubmitting}><CloseOutlined /></IconButton>
      </DialogTitle>

      <Formik
        enableReinitialize
        initialValues={{
          name: initial?.name || '',
          description: initial?.description || '',
          customerId: initial?.customerId ?? null,
          departmentId: initial?.departmentId ?? null
        }}
        validationSchema={isEdit ? schemaEdit : schemaCreate}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            if (isEdit && editingId) {
              const payload: UpdatePromptInput = {
                name: values.name?.trim() || initial?.name,
                description: values.description?.trim() || initial?.description,
                customerId: values.customerId === '' ? undefined : (values.customerId ?? null),
                departmentId: values.departmentId === '' ? undefined : (values.departmentId ?? null)
              };
              await updatePrompt(editingId, payload);
              openSnackbar({ open: true, message: 'Prompt atualizado!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
              await createPrompt({
                name: values.name.trim(),
                description: values.description.trim(),
                customerId: values.customerId ?? null,
                departmentId: values.departmentId ?? null
              });
              openSnackbar({ open: true, message: 'Prompt criado!', variant: 'alert', alert: { color: 'success' } } as any);
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
                  <InputLabel htmlFor="description">Conteúdo do Prompt *</InputLabel>
                  <TextField
                    id="description"
                    name="description"
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.description && errors.description)}
                    multiline
                    minRows={8}
                    helperText="Este é o conteúdo do prompt que será usado na geração de relatórios e casos"
                  />
                  {touched.description && errors.description && <FormHelperText error>{errors.description as string}</FormHelperText>}
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="customerId">Cliente (opcional)</InputLabel>
                  <TextField
                    id="customerId"
                    name="customerId"
                    select
                    value={values.customerId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFieldValue('customerId', val === '' ? null : val);
                    }}
                    helperText="Deixe em branco para tornar geral (disponível para todos os clientes)"
                  >
                    <MenuItem value="">Geral (todos os clientes)</MenuItem>
                    {custCatalog.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.displayName ?? c.name ?? c.id}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="departmentId">Departamento (opcional)</InputLabel>
                  <TextField
                    id="departmentId"
                    name="departmentId"
                    select
                    value={values.departmentId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFieldValue('departmentId', val === '' ? null : val);
                    }}
                    helperText="Deixe em branco para tornar geral (disponível para todos os departamentos)"
                  >
                    <MenuItem value="">Geral (todos os departamentos)</MenuItem>
                    {deptCatalog.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
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
