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
import Checkbox from '@mui/material/Checkbox';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import * as Yup from 'yup';
import { Formik } from 'formik';

import EditOutlined from '@ant-design/icons/EditOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import AIIcon from 'components/icons/AIIcon';

import { AiPiece, createPiece, updatePiece, UpdatePieceDTO } from 'api/aiPieces';
import { listDepartments } from 'api/departments';
import { listCustomers } from 'api/customers';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: AiPiece;
  onSaved: () => void;
};

const schemaCreate = Yup.object({
  name: Yup.string().required('Nome é obrigatório').min(2, 'Mínimo 2 caracteres'),
  departmentId: Yup.string().required('Departamento é obrigatório'),
  instruction: Yup.string().nullable().optional(),
  customerId: Yup.mixed().nullable(),
  isActive: Yup.boolean().optional()
});

const schemaEdit = Yup.object({
  name: Yup.string().min(2, 'Mínimo 2 caracteres').optional(),
  departmentId: Yup.string().optional(),
  instruction: Yup.string().nullable().optional(),
  // null = desvincular cliente - permitir null explicitamente
  customerId: Yup.mixed().nullable().optional(),
  isActive: Yup.boolean().optional()
});

export default function PieceFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deptCatalog, setDeptCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [custCatalog, setCustCatalog] = useState<Array<{ id: string; displayName?: string; name?: string }>>([]);

  useEffect(() => { if (!open) setIsSubmitting(false); }, [open]);
  const handleClose = () => { if (!isSubmitting) onClose(); };

  const doSave = async (values: any, setSubmitting: any, setErrors: any) => {
    try {
      setIsSubmitting(true);
      if (isEdit && editingId) {
        const payload: UpdatePieceDTO = {
          name: values.name?.trim() || initial?.name,
          departmentId: values.departmentId || initial?.departmentId,
          // customerId: '' -> não alterar; null -> limpar; string -> trocar
          customerId: (values.customerId === '' ? undefined : values.customerId),
          instruction: typeof values.instruction === 'string' ? (values.instruction?.trim() || null) : values.instruction ?? undefined,
          isActive: typeof values.isActive === 'boolean' ? values.isActive : initial?.isActive,
          allowAiEdit: typeof (values as any).allowAiEdit === 'boolean' ? (values as any).allowAiEdit : (initial as any)?.allowAiEdit
        };
        await updatePiece(editingId, payload);
        openSnackbar({ open: true, message: 'Peça atualizada!', variant: 'alert', alert: { color: 'success' } } as any);
      } else {
        const payload = {
          name: values.name.trim(),
          departmentId: values.departmentId,
          customerId: (values.customerId === '' ? undefined : values.customerId),
          instruction: values.instruction?.trim() || null,
          isActive: !!values.isActive,
          allowAiEdit: typeof (values as any).allowAiEdit === 'boolean' ? !!(values as any).allowAiEdit : true
        };
        await createPiece(payload);
        openSnackbar({ open: true, message: 'Peça criada!', variant: 'alert', alert: { color: 'success' } } as any);
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
          {isEdit ? 'Editar Peça' : 'Nova Peça'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Atualize os detalhes da peça' : 'Defina nome, departamento e (opcional) cliente'}
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
          departmentId: initial?.departmentId || '',
          // null significa desvincular, '' significa não alterar (quando editar)
          customerId: typeof initial?.customerId === 'undefined' ? '' : (initial?.customerId ?? null),
          instruction: initial?.instruction ?? '',
          isActive: initial?.isActive ?? true,
          allowAiEdit: (initial as any)?.allowAiEdit ?? true
        }}
        validationSchema={isEdit ? schemaEdit : schemaCreate}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          
          // Se for edição, salva diretamente
          await doSave(values, setSubmitting, setErrors);
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
                  <InputLabel htmlFor="departmentId">Departamento *</InputLabel>
                  <TextField
                    id="departmentId"
                    name="departmentId"
                    select
                    value={values.departmentId}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.departmentId && errors.departmentId)}
                  >
                    <MenuItem value="">Selecione…</MenuItem>
                    {deptCatalog.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {touched.departmentId && errors.departmentId && <FormHelperText error>{errors.departmentId as string}</FormHelperText>}
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="customerId">Cliente (opcional)</InputLabel>
                  <TextField
                    id="customerId"
                    name="customerId"
                    select
                    value={values.customerId as any}
                    onChange={handleChange}
                    helperText="Deixe em branco para não alterar (edição). Escolha '(sem cliente)' para desvincular."
                  >
                    {/* '' = não alterar em edição / undefined em criação */}
                    <MenuItem value="">{'(não definir)'}</MenuItem>
                    <MenuItem value={null as any}>{'(sem cliente)'}</MenuItem>
                    {custCatalog.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.displayName ?? c.name ?? c.id}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Stack gap={1}>
                  <InputLabel htmlFor="instruction">Instrução</InputLabel>
                  <TextField
                    id="instruction"
                    name="instruction"
                    value={values.instruction ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    multiline
                    minRows={2}
                    helperText="Instruções específicas para esta peça de IA"
                  />
                </Stack>

                <FormControlLabel
                  control={<Checkbox checked={!!values.isActive} onChange={(e) => setFieldValue('isActive', e.target.checked)} />}
                  label="Peça ativa"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={!!(values as any).allowAiEdit}
                      onChange={(e) => setFieldValue('allowAiEdit', e.target.checked)}
                    />
                  }
                  label="Permitir IA editar o texto (DOCX como capa)"
                />

                {values.name && (
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" color="text.secondary">Preview</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip label={values.name} size="small" />
                      {values.departmentId && <Chip label={`Depto: ${deptCatalog.find(d=>d.id===values.departmentId)?.name ?? values.departmentId}`} size="small" />}
                      {values.customerId !== '' && (
                        <Chip
                          label={`Cliente: ${
                            values.customerId === null
                              ? '(sem cliente)'
                              : (custCatalog.find(c=>c.id===values.customerId)?.displayName ?? custCatalog.find(c=>c.id===values.customerId)?.name ?? values.customerId)
                          }`}
                          size="small"
                        />
                      )}
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
