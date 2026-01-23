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
import { bindMask, formatCPF, formatPhoneBR, formatOAB } from 'utils/mask';
import { openSnackbar } from 'api/snackbar';
import { createUser, updateUser, listRoles } from 'api/users';
import useAuth from 'hooks/useAuth';

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: string | null;
  initial?: {
    name?: string;
    email?: string;
    phone?: string | null;
    cpf?: string | null;
    oab?: string | null;
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
  const { user: currentUser, updateProfile } = useAuth();
  const cpfRef = useRef<HTMLInputElement | null>(null);
  const oabRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const isEdit = Boolean(editingId);
  
  // Detecta se o usuário atual está sendo editado
  const isEditingCurrentUser = isEdit && currentUser && editingId && currentUser.id && editingId === currentUser.id;

  // ------ verificação de campos sensíveis disponíveis ------
  // Se o campo não vier do backend (undefined), não deve aparecer no formulário
  // Para criação de usuário, sempre incluir os campos sensíveis
  const hasPhone = isEdit ? (initial?.phone !== undefined) : true;
  const hasCPF = isEdit ? (initial?.cpf !== undefined) : true;
  const hasOAB = isEdit ? (initial?.oab !== undefined) : true;
  const hasBirthdate = isEdit ? (initial?.birthdate !== undefined) : true;

  // ------ estado de cargos (autocomplete) ------
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleQuery, setRoleQuery] = useState('');

  const loadRoles = async (q: string) => {
    setRoleLoading(true);
    try {
      // Aumenta o limite para garantir que todas as funções sejam carregadas
      const res = await listRoles({ page: 1, limit: 100, search: q || undefined });
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
  const findRoleById = (id?: string | null): RoleOption | null => {
    if (!id) return null;
    const found = roles.find((r) => r.id === id);
    if (found) return found;
    // Se não encontrou na lista mas temos o nome inicial, cria um objeto temporário
    if (initial?.roleName) {
      return { id, name: initial.roleName, description: null };
    }
    return null;
  };

  const schema = Yup.object({
    name: Yup.string().required('Nome é obrigatório'),
    email: Yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
    // Campos sensíveis: só validam se estiverem disponíveis no backend
    phone: (isEdit && !hasPhone) ? Yup.string().optional() : Yup.string().nullable(),
    cpf: (isEdit && !hasCPF) ? Yup.string().optional() : (isEdit ? Yup.string().nullable() : Yup.string().required('CPF é obrigatório')),
    oab: (isEdit && !hasOAB) ? Yup.string().optional() : (isEdit ? Yup.string().nullable() : Yup.string().required('OAB é obrigatória').test('oab-format', 'Formato: 000000/UF', (value) =>
      value ? /^\d{6}\/[A-Z]{2}$/.test(value.toUpperCase()) : false
    )),
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
    roleId: Yup.string().required('Função é obrigatória')
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
      <Formik
        enableReinitialize
                         initialValues={{
          name: initial?.name || '',
          email: initial?.email || '',
          // Campos sensíveis: inicializam baseado na disponibilidade
          phone: hasPhone ? (initial?.phone ? formatPhoneBR(String(initial.phone)) : '') : '',
          cpf: hasCPF ? (initial?.cpf ? formatCPF(String(initial.cpf)) : '') : '',
          oab: hasOAB ? (initial?.oab ? formatOAB(String(initial.oab)) : '') : '',
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
                ...(hasOAB ? { oab: values.oab || null } : {}),
                ...(hasBirthdate ? { birthdate: values.birthdate || null } : {}),
                ...(values.password ? { password: values.password } : {}),
                // 👇 roleId é obrigatório
                roleId: values.roleId!
              });
              
              // Se estiver editando o usuário atual, atualiza o contexto
              if (isEditingCurrentUser && currentUser) {
                const updatedUser = {
                  ...currentUser,
                  name: values.name,
                  email: values.email,
                  ...(hasPhone ? { phone: values.phone || undefined } : {}),
                  ...(hasCPF ? { cpf: values.cpf || undefined } : {}),
                  ...(hasOAB ? { oab: values.oab || undefined } : {}),
                  ...(hasBirthdate ? { birthdate: values.birthdate || undefined } : {})
                };
                updateProfile(updatedUser);
              }
              
              openSnackbar({ open: true, message: response.message || 'Colaborador atualizado!', variant: 'alert', alert: { color: 'success' } } as any);
            } else {
                                           const response = await createUser({
                name: values.name,
                email: values.email,
                // Campos sensíveis: sempre envia na criação
                phone: values.phone || null,
                cpf: values.cpf || null,
                oab: values.oab || null,
                birthdate: values.birthdate || null,
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
        {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, setTouched }) => (
          <form id="user-form" onSubmit={(e) => {
            e.preventDefault();
            // Marca o campo roleId como touched se houver erro de validação
            if (!values.roleId) {
              setTouched({ ...touched, roleId: true });
            }
            handleSubmit(e);
          }} noValidate>
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
                     <InputLabel htmlFor="user-email">E-mail *</InputLabel>
                     <OutlinedInput 
                       id="user-email" 
                       name="email" 
                       type="email" 
                       value={values.email} 
                       onChange={handleChange} 
                       onBlur={handleBlur} 
                       error={Boolean(touched.email && errors.email)}
                       autoComplete="email"
                       inputProps={{
                         'form': 'user-form',
                         'data-form-type': 'user-registration',
                         'autocomplete': 'email',
                         'data-lpignore': 'false'
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

                                 {/* OAB - só mostra se o campo estiver disponível no backend */}
                 {(isEdit ? hasOAB : true) && (
                   <Grid size={{ xs: 12, md: 4 }}>
                     <Stack sx={{ gap: 1 }}>
                       <InputLabel htmlFor="oab">OAB {!isEdit && '*'}</InputLabel>
                       <OutlinedInput
                         id="oab"
                         name="oab"
                         inputRef={oabRef}
                         value={values.oab}
                         onChange={bindMask('oab', setFieldValue, formatOAB, oabRef, { stickToEnd: true })}
                         onBlur={handleBlur}
                         error={Boolean(touched.oab && errors.oab)}
                         placeholder={isEdit ? "000000/SP" : "000000/SP (obrigatório)"}
                       />
                       {touched.oab && errors.oab && <FormHelperText error>{errors.oab}</FormHelperText>}
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
                     <InputLabel>Função *</InputLabel>
                     <Autocomplete<RoleOption>
                       options={roles}
                       loading={roleLoading}
                       value={findRoleById(values.roleId) || null}
                       onChange={(_, opt) => {
                         setFieldValue('roleId', opt ? opt.id : null, false);
                       }}
                       onInputChange={(_, v, reason) => {
                         // Se o campo foi limpo (reason === 'clear'), limpa a busca e recarrega todas
                         if (reason === 'clear') {
                           setRoleQuery('');
                           loadRoles('');
                         } else {
                           setRoleQuery(v);
                           if (v) {
                             loadRoles(v);
                           } else {
                             // Se o campo ficou vazio (mas não foi clear), recarrega todas
                             loadRoles('');
                           }
                         }
                       }}
                       onClose={() => {
                         // Quando fecha, se não há busca, garante que todas as funções estão carregadas
                         if (!roleQuery) {
                           loadRoles('');
                         }
                       }}
                       onBlur={() => {
                         // Marca o campo como touched quando perde o foco
                         setTouched({ ...touched, roleId: true });
                       }}
                       getOptionLabel={(opt) => opt?.name ?? ''}
                       renderInput={(params) => (
                         <TextField
                           {...params}
                           placeholder="Selecione uma função (obrigatório)"
                           error={Boolean(touched.roleId && errors.roleId)}
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
                       isOptionEqualToValue={(a, b) => {
                         if (!a || !b) return a === b;
                         return a.id === b.id;
                       }}
                       filterOptions={(options) => options}
                     />
                     {touched.roleId && errors.roleId && <FormHelperText error>{errors.roleId as string}</FormHelperText>}
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
               <Button onClick={onClose} color="secondary" type="button">Cancelar</Button>
               <Button
                 type="submit"
                 variant="contained"
                 disabled={
                   isSubmitting ||
                   (!!values.password && values.password !== values.confirmPassword)
                 }
               >
                 {isEdit ? 'Salvar' : 'Criar'}
               </Button>
             </DialogActions>
          </form>
        )}
      </Formik>
    </Dialog>
  );
}
