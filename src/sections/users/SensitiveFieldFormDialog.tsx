import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import { Formik } from 'formik';
import * as Yup from 'yup';

// Icons
import CloseOutlined from '@ant-design/icons/CloseOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import LockOutlined from '@ant-design/icons/LockOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';

import { createSensitiveField, updateSensitiveField } from 'api/sensitiveFields';
import { openSnackbar } from 'api/snackbar';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: {
    entity?: string;
    field?: string;
    moduleName?: string | null;
    label?: string | null;
    description: string;
    readRule?: string | null;
    writeRule?: string | null;
    active?: boolean;
    companyId?: string | null;
  };
  onSaved: () => void;
};

const schema = Yup.object({
  entity: Yup.string()
    .required('Entidade é obrigatória')
    .min(2, 'Entidade deve ter pelo menos 2 caracteres')
    .matches(/^[A-Z][a-zA-Z0-9]*$/, 'Entidade deve começar com maiúscula e conter apenas letras e números'),
  field: Yup.string()
    .required('Campo é obrigatório')
    .min(2, 'Campo deve ter pelo menos 2 caracteres')
    .matches(/^[a-z][a-zA-Z0-9]*$/, 'Campo deve começar com minúscula e conter apenas letras e números'),
  moduleName: Yup.string()
    .nullable()
    .optional()
    .max(50, 'Módulo deve ter no máximo 50 caracteres'),
  label: Yup.string()
    .nullable()
    .optional()
    .max(50, 'Rótulo deve ter no máximo 50 caracteres'),
  description: Yup.string()
    .ensure()
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  readRule: Yup.string()
    .nullable()
    .optional()
    .matches(/^[a-z]+\.[a-z]+\.[a-z]+$/, 'Formato: modulo.acao.campo (ex.: users.read.cpf)'),
  writeRule: Yup.string()
    .nullable()
    .optional()
    .matches(/^[a-z]+\.[a-z]+\.[a-z]+$/, 'Formato: modulo.acao.campo (ex.: users.update.cpf)'),
  active: Yup.boolean().default(true)
});

export default function SensitiveFieldFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const isEdit = Boolean(editingId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullWidth 
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 8
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            {isEdit ? <EditOutlined /> : <LockOutlined />}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEdit ? 'Editar Dado Sensível' : 'Novo Dado Sensível'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEdit ? 'Atualize as informações do campo sensível' : 'Configure um novo campo de dados sensíveis'}
            </Typography>
          </Box>
        </Stack>
        <IconButton 
          onClick={handleClose} 
          disabled={isSubmitting}
          sx={{ 
            '&:hover': { 
              backgroundColor: 'error.light',
              color: 'error.contrastText'
            }
          }}
        >
          <CloseOutlined />
        </IconButton>
      </DialogTitle>

      <Formik
        enableReinitialize
        initialValues={{
          entity: initial?.entity || '',
          field: initial?.field || '',
          moduleName: initial?.moduleName || '',
          label: initial?.label || '',
          description: initial?.description ?? '',
          readRule: initial?.readRule || '',
          writeRule: initial?.writeRule || '',
          active: typeof initial?.active === 'boolean' ? initial!.active : true
        }}
        validationSchema={schema}
        validateOnChange={true}
        validateOnBlur={true}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            setIsSubmitting(true);
            const payload = {
              entity: values.entity.trim(),
              field: values.field.trim(),
              moduleName: values.moduleName?.trim() || undefined,
              label: values.label?.trim() || undefined,
              description: (values.description ?? '').trim(),
              readRule: values.readRule?.trim() || null,
              writeRule: values.writeRule?.trim() || null,
              companyId: null, // Sempre global
              active: values.active
            };

            if (isEdit && editingId) {
              await updateSensitiveField(editingId, payload);
              openSnackbar({ 
                open: true, 
                message: 'Campo sensível atualizado com sucesso!', 
                variant: 'alert', 
                alert: { color: 'success' } 
              } as any);
            } else {
              await createSensitiveField(payload);
              openSnackbar({ 
                open: true, 
                message: 'Campo sensível criado com sucesso!', 
                variant: 'alert', 
                alert: { color: 'success' } 
              } as any);
            }

            onSaved();
            onClose();
          } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || 'Falha ao salvar o campo sensível';
            setErrors({ entity: msg });
            openSnackbar({ 
              open: true, 
              message: msg, 
              variant: 'alert', 
              alert: { color: 'error' } 
            } as any);
          } finally {
            setSubmitting(false);
            setIsSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, isValid }) => (
          <>
            <DialogContent dividers sx={{ p: 3 }}>
              <Stack spacing={3}>
                {/* Seção: Identificação */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    Identificação
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                    <Stack gap={1} sx={{ flex: 1, minWidth: 250 }}>
                      <InputLabel htmlFor="entity" sx={{ fontWeight: 600 }}>
                        Entidade *
                      </InputLabel>
                      <OutlinedInput 
                        id="entity" 
                        name="entity" 
                        value={values.entity} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        placeholder="Ex.: User, Company, Product" 
                        error={Boolean(touched.entity && errors.entity)}
                        startAdornment={
                          <InputAdornment position="start">
                            <UserOutlined />
                          </InputAdornment>
                        }
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5
                          }
                        }}
                      />
                      {touched.entity && errors.entity && (
                        <FormHelperText error>
                          {errors.entity as string}
                        </FormHelperText>
                      )}
                      {touched.entity && !errors.entity && values.entity && (
                        <FormHelperText sx={{ color: 'success.main' }}>
                          ✓ Entidade válida
                        </FormHelperText>
                      )}
                    </Stack>
                    <Stack gap={1} sx={{ flex: 1, minWidth: 250 }}>
                      <InputLabel htmlFor="field" sx={{ fontWeight: 600 }}>
                        Campo *
                      </InputLabel>
                      <OutlinedInput 
                        id="field" 
                        name="field" 
                        value={values.field} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        placeholder="Ex.: cpf, email, phone" 
                        error={Boolean(touched.field && errors.field)}
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5
                          }
                        }}
                      />
                      {touched.field && errors.field && (
                        <FormHelperText error>
                          {errors.field as string}
                        </FormHelperText>
                      )}
                      {touched.field && !errors.field && values.field && (
                        <FormHelperText sx={{ color: 'success.main' }}>
                          ✓ Campo válido
                        </FormHelperText>
                      )}
                    </Stack>
                  </Stack>
                </Box>

                <Divider />

                                 {/* Seção: Apresentação */}
                 <Box>
                   <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                     Apresentação
                   </Typography>
                   <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                     <Stack gap={1} sx={{ flex: 1, minWidth: 250 }}>
                       <InputLabel htmlFor="moduleName" sx={{ fontWeight: 600 }}>
                         Módulo
                       </InputLabel>
                       <OutlinedInput 
                         id="moduleName" 
                         name="moduleName" 
                         value={values.moduleName} 
                         onChange={handleChange} 
                         onBlur={handleBlur}
                         placeholder="Ex.: Usuários, Empresas, Produtos"
                         sx={{ 
                           '& .MuiOutlinedInput-root': {
                             borderRadius: 1.5
                           }
                         }}
                       />
                       {touched.moduleName && errors.moduleName && (
                         <FormHelperText error>{errors.moduleName as string}</FormHelperText>
                       )}
                       <FormHelperText>
                         Nome do módulo ao qual este campo pertence
                       </FormHelperText>
                     </Stack>
                     <Stack gap={1} sx={{ flex: 1, minWidth: 250 }}>
                       <InputLabel htmlFor="label" sx={{ fontWeight: 600 }}>
                         Rótulo
                       </InputLabel>
                       <OutlinedInput 
                         id="label" 
                         name="label" 
                         value={values.label} 
                         onChange={handleChange} 
                         onBlur={handleBlur}
                         placeholder="Ex.: CPF, E-mail, Telefone"
                         sx={{ 
                           '& .MuiOutlinedInput-root': {
                             borderRadius: 1.5
                           }
                         }}
                       />
                       {touched.label && errors.label && (
                         <FormHelperText error>{errors.label as string}</FormHelperText>
                       )}
                       <FormHelperText>
                         Nome amigável que será exibido na interface
                       </FormHelperText>
                     </Stack>
                   </Stack>
                   <Stack gap={1} sx={{ mt: 2 }}>
                     <InputLabel htmlFor="description" sx={{ fontWeight: 600 }}>
                       Descrição
                     </InputLabel>
                     <OutlinedInput 
                       id="description" 
                       name="description" 
                                               value={values.description ?? ''} 
                       onChange={handleChange} 
                       onBlur={handleBlur}
                       multiline 
                       minRows={2}
                       placeholder="Descreva o propósito deste campo sensível"
                       sx={{ 
                         '& .MuiOutlinedInput-root': {
                           borderRadius: 1.5
                         }
                       }}
                     />
                     {touched.description && errors.description && (
                       <FormHelperText error>{errors.description as string}</FormHelperText>
                     )}
                     <FormHelperText>
                       Descrição opcional para documentação
                     </FormHelperText>
                   </Stack>
                 </Box>

                <Divider />

                {/* Seção: Permissões */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    Permissões de Acesso
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                    <Stack gap={1} sx={{ flex: 1, minWidth: 250 }}>
                      <InputLabel htmlFor="readRule" sx={{ fontWeight: 600 }}>
                        Regra de Leitura
                      </InputLabel>
                      <OutlinedInput 
                        id="readRule" 
                        name="readRule" 
                        value={values.readRule} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        placeholder="Ex.: users.read.cpf"
                        startAdornment={
                          <InputAdornment position="start">
                            <LockOutlined />
                          </InputAdornment>
                        }
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5
                          }
                        }}
                      />
                      {touched.readRule && errors.readRule && (
                        <FormHelperText error>
                          {errors.readRule as string}
                        </FormHelperText>
                      )}
                      {touched.readRule && !errors.readRule && values.readRule && (
                        <FormHelperText sx={{ color: 'success.main' }}>
                          ✓ Formato válido
                        </FormHelperText>
                      )}
                      <FormHelperText>
                        Permissão necessária para visualizar este campo
                      </FormHelperText>
                    </Stack>
                    <Stack gap={1} sx={{ flex: 1, minWidth: 250 }}>
                      <InputLabel htmlFor="writeRule" sx={{ fontWeight: 600 }}>
                        Regra de Escrita
                      </InputLabel>
                      <OutlinedInput 
                        id="writeRule" 
                        name="writeRule" 
                        value={values.writeRule} 
                        onChange={handleChange} 
                        onBlur={handleBlur}
                        placeholder="Ex.: users.update.cpf"
                        startAdornment={
                          <InputAdornment position="start">
                            <LockOutlined />
                          </InputAdornment>
                        }
                        sx={{ 
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 1.5
                          }
                        }}
                      />
                      {touched.writeRule && errors.writeRule && (
                        <FormHelperText error>
                          {errors.writeRule as string}
                        </FormHelperText>
                      )}
                      {touched.writeRule && !errors.writeRule && values.writeRule && (
                        <FormHelperText sx={{ color: 'success.main' }}>
                          ✓ Formato válido
                        </FormHelperText>
                      )}
                      <FormHelperText>
                        Permissão necessária para modificar este campo
                      </FormHelperText>
                    </Stack>
                  </Stack>
                </Box>

                <Divider />

                {/* Seção: Status */}
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    Status
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={values.active} 
                          onChange={(_, v) => setFieldValue('active', v)}
                          color="primary"
                        />
                      }
                      label={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            Campo Ativo
                          </Typography>
                          <Chip 
                            size="small" 
                            label={values.active ? 'Ativo' : 'Inativo'} 
                            color={values.active ? 'success' : 'default'}
                            variant={values.active ? 'filled' : 'outlined'}
                          />
                        </Stack>
                      }
                    />
                    <Typography variant="body2" color="text.secondary">
                      {values.active 
                        ? 'Este campo estará disponível para uso no sistema'
                        : 'Este campo ficará desabilitado temporariamente'
                      }
                    </Typography>
                  </Stack>
                </Box>

                {/* Preview */}
                {values.entity && values.field && (
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 2, 
                    border: '1px solid',
                    borderColor: 'grey.200'
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.secondary' }}>
                      Preview do Campo:
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip 
                        label={`${values.entity}.${values.field}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                      {values.label && (
                        <Typography variant="body2" color="text.secondary">
                          → {values.label}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button 
                onClick={handleClose} 
                color="secondary"
                disabled={isSubmitting}
                sx={{ borderRadius: 1.5 }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => handleSubmit()} 
                disabled={isSubmitting || !isValid}
                variant="contained"
                startIcon={isSubmitting ? <CircularProgress size={16} /> : undefined}
                sx={{ 
                  borderRadius: 1.5,
                  minWidth: 100,
                  '&:hover': { boxShadow: 2 }
                }}
              >
                {isSubmitting ? 'Salvando...' : (isEdit ? 'Atualizar' : 'Criar')}
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
}
