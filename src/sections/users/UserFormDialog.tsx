import { useEffect, useRef, useState } from 'react';
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
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import { useTheme } from '@mui/material/styles';

import * as Yup from 'yup';
import { Formik } from 'formik';
import { bindMask, formatCPF, formatPhoneBR } from 'utils/mask';
import { openSnackbar } from 'api/snackbar';
import { createUser, updateUser, listRoles } from 'api/users';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: {
    name?: string;
    email?: string;
    phone?: string | null;
    cpf?: string | null;
    birthdate?: string | null;
    emailVerifiedAt?: string | null; // para controlar se mostra campo de senha
    // 👇 NOVO (para edição)
    roleId?: string | null;
    roleName?: string | null;
  };
  onSaved: () => void;
};

const passwordRules = Yup.string()
  .min(8, 'Mínimo 8 caracteres')
  .matches(/[A-Z]/, 'Pelo menos 1 letra maiúscula (A-Z)')
  .matches(/[a-z]/, 'Pelo menos 1 letra minúscula (a-z)')
  .matches(/[0-9]/, 'Pelo menos 1 número (0-9)')
  .matches(/[^A-Za-z0-9]/, 'Pelo menos 1 caractere especial');

type RoleOption = { id: string; name: string; description?: string | null };

export default function UserFormDialog({ open, onClose, editingId, initial, onSaved }: Props) {
  const theme = useTheme();
  const cpfRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const isEdit = Boolean(editingId);

  // ------ verificação de campos sensíveis disponíveis ------
  // Se o campo não vier do backend (undefined), não deve aparecer no formulário
  const hasPhone = initial?.phone !== undefined;
  const hasCPF = initial?.cpf !== undefined;
  const hasBirthdate = initial?.birthdate !== undefined;

  // ------ estado de cargos (autocomplete) ------
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleQuery, setRoleQuery] = useState('');

  const loadRoles = async (q: string) => {
    setRoleLoading(true);
    try {
      const res = await listRoles({ page: 1, limit: 20, search: q || undefined });
      setRoles(res.data.map((r) => ({ id: r.id, name: r.name, description: r.description ?? null })));
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadRoles('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // helper para achar a option pelo id (quando abrimos edição com role atual)
  const findRoleById = (id?: string | null) => roles.find((r) => r.id === id) || (id && initial?.roleName ? { id, name: initial.roleName, description: null } : null);

  const schema = Yup.object({
    name: Yup.string().required('Nome é obrigatório'),
    email: Yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
    // Campos sensíveis: só validam se estiverem disponíveis no backend
    phone: (isEdit && !hasPhone) ? Yup.string().optional() : Yup.string().nullable(),
    cpf: (isEdit && !hasCPF) ? Yup.string().optional() : (isEdit ? Yup.string().nullable() : Yup.string().required('CPF é obrigatório')),
    birthdate: (isEdit && !hasBirthdate) ? Yup.string().optional() : Yup.string().nullable(),
    password: isEdit 
      ? Yup.string().optional().nullable().test('pw', 'Senha fraca', (v) => !v || passwordRules.isValidSync(v))
      : passwordRules.required('Senha é obrigatória'),
         confirmPassword: isEdit 
       ? Yup.string().optional().nullable().when('password', {
           is: (password: string) => password && password.length > 0,
           then: (schema) => schema.required('Confirme a nova senha').oneOf([Yup.ref('password')], 'As senhas devem ser iguais'),
           otherwise: (schema) => schema.optional().nullable()
         })
       : Yup.string().required('Confirme a senha').oneOf([Yup.ref('password')], 'As senhas devem ser iguais'),
    roleId: isEdit ? Yup.string().nullable() : Yup.string().required('Função é obrigatória')
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
      <Formik
        enableReinitialize
                 initialValues={{
           name: initial?.name || '',
           email: initial?.email || '',
           // Campos sensíveis: só inicializam se estiverem disponíveis no backend
           phone: hasPhone ? (initial?.phone ? formatPhoneBR(String(initial.phone)) : '') : '',
           cpf: hasCPF ? (initial?.cpf ? formatCPF(String(initial.cpf)) : '') : '',
           birthdate: hasBirthdate ? (initial?.birthdate ? String(initial.birthdate).slice(0, 10) : '') : '',
           password: '',
           confirmPassword: '',
           // 👇 NOVO (controlamos o id no form)
           roleId: initial?.roleId ?? null
         }}
        validationSchema={schema}
        onSubmit={async (values, { setSubmitting, setErrors }) => {
          try {
            if (isEdit && editingId) {
                             const response = await updateUser(editingId, {
                 name: values.name,
                 email: values.email,
                 // Campos sensíveis: só envia se estiverem disponíveis no backend
                 ...(hasPhone ? { phone: values.phone || null } : {}),
                 ...(hasCPF ? { cpf: values.cpf || null } : {}),
                 ...(hasBirthdate ? { birthdate: values.birthdate || null } : {}),
                 ...(values.password ? { password: values.password } : {}),
                 // 👇 envia o roleId (string para definir/trocar, null para limpar)
                 ...(values.roleId !== undefined ? { roleId: values.roleId } : {})
               });
              openSnackbar({ open: true, message: response.message || 'Colaborador atualizado!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
                             const response = await createUser({
                 name: values.name,
                 email: values.email,
                 // Campos sensíveis: só envia se estiverem disponíveis no backend
                 ...(hasPhone ? { phone: values.phone || null } : {}),
                 ...(hasCPF ? { cpf: values.cpf || null } : {}),
                 ...(hasBirthdate ? { birthdate: values.birthdate || null } : {}),
                 password: values.password,
                 // 👇 roleId é obrigatório no create
                 roleId: values.roleId!
               });
              openSnackbar({ open: true, message: response.message || 'Colaborador criado!', variant: 'alert', alert: { color: 'success' } } as any);
            }
            onSaved();
            onClose();
          } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || 'Erro ao salvar';
            setErrors({ email: msg });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue }) => (
          <>
            <DialogContent dividers>
              <Grid container spacing={2}>
                                 <Grid size={{ xs: 12, md: 6 }}>
                   <Stack sx={{ gap: 1 }}>
                     <InputLabel htmlFor="name">Nome *</InputLabel>
                     <OutlinedInput id="name" name="name" value={values.name} onChange={handleChange} onBlur={handleBlur} error={Boolean(touched.name && errors.name)} />
                     {touched.name && errors.name && <FormHelperText error>{errors.name}</FormHelperText>}
                   </Stack>
                 </Grid>

                                 <Grid size={{ xs: 12, md: 6 }}>
                   <Stack sx={{ gap: 1 }}>
                     <InputLabel htmlFor="email">E-mail *</InputLabel>
                     <OutlinedInput 
                       id="email" 
                       name="email" 
                       type="email" 
                       value={values.email} 
                       onChange={handleChange} 
                       onBlur={handleBlur} 
                       error={Boolean(touched.email && errors.email)}
                       autoComplete="email"
                       inputProps={{
                         'data-form-type': 'user-registration',
                         'autocomplete': 'email'
                       }}
                     />
                     {touched.email && errors.email && <FormHelperText error>{errors.email}</FormHelperText>}
                   </Stack>
                 </Grid>

                                 {/* Telefone - só mostra se o campo estiver disponível no backend */}
                 {(isEdit ? hasPhone : true) && (
                   <Grid size={{ xs: 12, md: 4 }}>
                     <Stack sx={{ gap: 1 }}>
                       <InputLabel htmlFor="phone">Telefone</InputLabel>
                       <OutlinedInput
                         id="phone"
                         name="phone"
                         inputRef={phoneRef}
                         value={values.phone}
                         onChange={bindMask('phone', setFieldValue, formatPhoneBR, phoneRef)}
                         onBlur={handleBlur}
                         error={Boolean(touched.phone && errors.phone)}
                         placeholder="(11) 99999-9999"
                       />
                       {touched.phone && errors.phone && <FormHelperText error>{errors.phone}</FormHelperText>}
                     </Stack>
                   </Grid>
                 )}

                                 {/* CPF - só mostra se o campo estiver disponível no backend */}
                 {(isEdit ? hasCPF : true) && (
                   <Grid size={{ xs: 12, md: 4 }}>
                     <Stack sx={{ gap: 1 }}>
                       <InputLabel htmlFor="cpf">CPF {!isEdit && '*'}</InputLabel>
                       <OutlinedInput
                         id="cpf"
                         name="cpf"
                         inputRef={cpfRef}
                         value={values.cpf}
                         onChange={bindMask('cpf', setFieldValue, formatCPF, cpfRef)}
                         onBlur={handleBlur}
                         error={Boolean(touched.cpf && errors.cpf)}
                         placeholder={isEdit ? "000.000.000-00" : "000.000.000-00 (obrigatório)"}
                       />
                       {touched.cpf && errors.cpf && <FormHelperText error>{errors.cpf}</FormHelperText>}
                     </Stack>
                   </Grid>
                 )}

                                 {/* Data de nascimento - só mostra se o campo estiver disponível no backend */}
                 {(isEdit ? hasBirthdate : true) && (
                   <Grid size={{ xs: 12, md: 4 }}>
                     <Stack sx={{ gap: 1 }}>
                       <InputLabel htmlFor="birthdate" shrink>Data de nascimento</InputLabel>
                       <OutlinedInput id="birthdate" name="birthdate" type="date" value={values.birthdate || ''} onChange={handleChange} onBlur={handleBlur} error={Boolean(touched.birthdate && errors.birthdate)} />
                       {touched.birthdate && errors.birthdate && <FormHelperText error>{errors.birthdate}</FormHelperText>}
                     </Stack>
                   </Grid>
                 )}

                                 {/* 👇 NOVO: Seletor de Função (Role) */}
                 <Grid size={{ xs: 12 }}>
                   <Stack sx={{ gap: 1 }}>
                     <InputLabel>Função {!isEdit && '*'}</InputLabel>
                     <Autocomplete<RoleOption>
                       options={roles}
                       loading={roleLoading}
                       value={findRoleById(values.roleId) || null}
                       onChange={(_, opt) => setFieldValue('roleId', opt ? opt.id : null)}
                       onInputChange={(_, v) => {
                         setRoleQuery(v);
                       }}
                       onClose={() => roleQuery && loadRoles(roleQuery)}
                       getOptionLabel={(opt) => opt?.name ?? ''}
                       renderInput={(params) => (
                         <TextField
                           {...params}
                           placeholder={isEdit ? "Buscar e selecionar a função" : "Selecione uma função (obrigatório)"}
                           InputProps={{
                             ...params.InputProps,
                             endAdornment: (
                               <>
                                 {roleLoading ? <CircularProgress size={18} /> : null}
                                 {params.InputProps.endAdornment}
                               </>
                             )
                           }}
                         />
                       )}
                       noOptionsText="Nenhuma função encontrada"
                       isOptionEqualToValue={(a, b) => a.id === b.id}
                     />
                   </Stack>
                 </Grid>

                                 {/* Senha obrigatória só no create; no edit é opcional apenas se email não verificado */}
                 {(isEdit ? !initial?.emailVerifiedAt : true) && (
                   <Grid size={{ xs: 12, md: 6 }}>
                     <Stack sx={{ gap: 1 }}>
                       <Stack direction="row" spacing={1} alignItems="center">
                         <InputLabel htmlFor="password">{isEdit ? 'Nova senha (opcional)' : 'Senha *'}</InputLabel>
                                                   {isEdit && (
                            <Tooltip title="A senha só pode ser alterada se o usuário ainda não fez o primeiro login">
                              <InfoCircleOutlined style={{ fontSize: 16, color: theme.palette.text.secondary }} />
                            </Tooltip>
                          )}
                       </Stack>
                      <OutlinedInput 
                        id="password" 
                        name="password" 
                        type="password" 
                        value={values.password} 
                        onChange={handleChange} 
                        onBlur={handleBlur} 
                        error={Boolean(touched.password && errors.password)}
                        placeholder={isEdit ? "Deixe em branco para manter a atual" : "Digite a senha"}
                        autoComplete={isEdit ? "new-password" : "new-password"}
                        inputProps={{
                          'data-form-type': 'user-registration',
                          'autocomplete': isEdit ? 'new-password' : 'new-password'
                        }}
                      />
                      {touched.password && errors.password && <FormHelperText error>{errors.password}</FormHelperText>}
                    </Stack>
                  </Grid>
                )}

                                 {/* Confirmação de senha - obrigatória no create, opcional no edit se senha for preenchida */}
                 {(!isEdit || values.password) && (
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Stack sx={{ gap: 1 }}>
                                             <InputLabel htmlFor="confirmPassword">Confirmar senha {!isEdit && '*'}</InputLabel>
                                             <OutlinedInput 
                         id="confirmPassword" 
                         name="confirmPassword" 
                         type="password" 
                         value={values.confirmPassword} 
                         onChange={handleChange} 
                         onBlur={handleBlur} 
                         error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                         placeholder={isEdit ? "Digite a nova senha novamente" : "Digite a senha novamente"}
                         autoComplete="new-password"
                         inputProps={{
                           'data-form-type': 'user-registration',
                           'autocomplete': 'new-password'
                         }}
                       />
                      {touched.confirmPassword && errors.confirmPassword && <FormHelperText error>{errors.confirmPassword}</FormHelperText>}
                    </Stack>
                  </Grid>
                )}

                {/* Informações sobre requisitos da senha */}
                {!isEdit && (
                  <Grid size={{ xs: 12 }}>
                    <Stack sx={{ gap: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.200' }}>
                      <Typography variant="subtitle2" color="text.secondary">Requisitos da senha:</Typography>
                      <Stack direction="row" flexWrap="wrap" gap={2}>
                        <Typography variant="caption" color="text.secondary">• Pelo menos 8 caracteres</Typography>
                        <Typography variant="caption" color="text.secondary">• Pelo menos 1 letra minúscula (a-z)</Typography>
                        <Typography variant="caption" color="text.secondary">• Pelo menos 1 letra maiúscula (A-Z)</Typography>
                        <Typography variant="caption" color="text.secondary">• Pelo menos 1 número (0-9)</Typography>
                        <Typography variant="caption" color="text.secondary">• Pelo menos 1 caractere especial</Typography>
                      </Stack>
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
                         <DialogActions>
               <Button onClick={onClose} color="secondary">Cancelar</Button>
               <Button
                 onClick={() => handleSubmit()}
                 variant="contained"
                 disabled={
                   isSubmitting ||
                   (!!values.password && values.password !== values.confirmPassword)
                 }
               >
                 {isEdit ? 'Salvar' : 'Criar'}
               </Button>
             </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
}
