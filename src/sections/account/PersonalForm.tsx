import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// mui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';

// third-party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project
import axios from 'utils/axios';
import { openSnackbar } from 'api/snackbar';
import { bindMask, formatCPF, formatPhoneBR, digitsOnly } from 'utils/mask';
import useAuth from 'hooks/useAuth';
import { UserProfile } from 'types/auth';

// helpers
const unwrapUser = (resp: any) => resp?.data?.data ?? resp?.data?.user ?? resp?.data ?? resp;

// Validação de CPF
const validateCPF = (cpf: string) => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
};

const baseSchema = Yup.object({
  name: Yup.string().required('Nome é obrigatório').max(120),
  email: Yup.string().email('E-mail inválido').required('E-mail é obrigatório').max(255),
  cpf: Yup.string()
    .required('CPF é obrigatório')
    .test('cpf-format', 'CPF deve ter 11 dígitos', (value) => {
      if (!value) return false;
      const cleanCPF = value.replace(/\D/g, '');
      return cleanCPF.length === 11;
    })
    .test('cpf-valid', 'CPF inválido', (value) => {
      if (!value) return false;
      return validateCPF(value);
    }),
  birthdate: Yup.string().optional(),
  phone: Yup.string().optional().max(20),
  currentPassword: Yup.string()
});

type MeDTO = {
  name: string;
  email: string;
  cpf: string; // Agora obrigatório
  birthdate?: string; // ISO yyyy-mm-dd
  phone?: string;
  currentPassword?: string; // só quando trocando email
};

export default function PersonalForm() {
  const navigate = useNavigate();
  const { updateProfile } = useAuth();
  const emailOriginal = useRef<string>('');
  const cpfRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);

  const schema = baseSchema.shape({
    currentPassword: Yup.string().when('email', {
      is: (email: string) => email !== emailOriginal.current,
      then: (schema) => schema.required('Senha atual é obrigatória para trocar e-mail')
    })
  });

  return (
    <Formik<MeDTO>
      enableReinitialize
      initialValues={{ name: '', email: '', cpf: '', birthdate: '', phone: '', currentPassword: '' }}
      validationSchema={schema}
                    onSubmit={async (values, { setSubmitting, setErrors }) => {
        try {
          // prepara payload base
          const payload: any = { 
            ...values
          };

          // formata CPF se preenchido
          if (values.cpf) {
            payload.cpf = digitsOnly(values.cpf);
          }

          // formata telefone se preenchido
          if (values.phone) {
            payload.phone = digitsOnly(values.phone);
          }

          // se o email não mudou, não envie o campo 'email' nem 'currentPassword'
          if (values.email === emailOriginal.current) {
            delete payload.email;
            delete payload.currentPassword;
          }

          // não envie currentPassword vazia
          if (!payload.currentPassword) delete payload.currentPassword;
          
          await axios.put('/auth/me', payload);

          // Atualiza o contexto com os novos dados do usuário
          const updatedUser: UserProfile = {
            ...values,
            cpf: values.cpf ? digitsOnly(values.cpf) : undefined,
            phone: values.phone ? digitsOnly(values.phone) : undefined
          };
          
          // Busca os dados atualizados do servidor para garantir consistência
          try {
            const resp = await axios.get('/auth/me');
            const u = unwrapUser(resp);
            updateProfile(u);
          } catch (err) {
            // Se falhar ao buscar dados atualizados, usa os dados locais
            updateProfile(updatedUser);
          }

          // Atualiza o email original para manter a consistência
          emailOriginal.current = values.email;

          openSnackbar({
            open: true,
            message: 'Dados atualizados com sucesso!',
            variant: 'alert',
            alert: { color: 'success' }
          } as any);

          setSubmitting(false);
        } catch (err: any) {
          setSubmitting(false);
          setErrors({ email: err?.response?.data?.message || 'Erro ao atualizar perfil' });
        }
      }}
    >
      {({ values, errors, touched, handleBlur, handleChange, handleSubmit, isSubmitting, setValues, setFieldValue }) => {
                // carrega /auth/me ao montar
        useEffect(() => {
          (async () => {
            try {
              const resp = await axios.get('/auth/me');
              const u = unwrapUser(resp);

              emailOriginal.current = u?.email || '';
              setValues({
                name: u?.name || '',
                email: u?.email || '',
                cpf: formatCPF(u?.cpf || ''),                       // formata CPF pra exibição
                birthdate: u?.birthdate ? String(u.birthdate).slice(0, 10) : '',
                phone: formatPhoneBR(u?.phone || ''),               // formata telefone pra exibição
                currentPassword: ''
              });
            } catch (err: any) {
              // O interceptor do axios já cuida do redirecionamento para 401
              console.error('Erro ao carregar dados do usuário:', err);
            }
          })();
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
          <form noValidate onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="name">Nome</InputLabel>
                  <OutlinedInput
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.name && errors.name)}
                    placeholder="Seu nome completo"
                    fullWidth
                  />
                  {touched.name && errors.name && <FormHelperText error>{errors.name}</FormHelperText>}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="email">E-mail</InputLabel>
                  <OutlinedInput
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.email && errors.email)}
                    placeholder="seu@email.com"
                    fullWidth
                  />
                  {touched.email && errors.email && <FormHelperText error>{errors.email}</FormHelperText>}
                </Stack>
              </Grid>

              {emailOriginal.current !== values.email && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack sx={{ gap: 1 }}>
                    <InputLabel htmlFor="currentPassword">Senha atual (obrigatória para trocar e-mail)</InputLabel>
                    <OutlinedInput
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={values.currentPassword}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={Boolean(touched.currentPassword && errors.currentPassword)}
                    />
                    {touched.currentPassword && errors.currentPassword && (
                      <FormHelperText error>{errors.currentPassword}</FormHelperText>
                    )}
                  </Stack>
                </Grid>
              )}

              <Grid size={{ xs: 12, md: 4 }}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="cpf">CPF *</InputLabel>
                  <OutlinedInput
                    id="cpf"
                    name="cpf"
                    inputRef={cpfRef}
                    value={values.cpf}
                    onChange={bindMask('cpf', setFieldValue, formatCPF, cpfRef)}
                    onBlur={handleBlur}
                    error={Boolean(touched.cpf && errors.cpf)}
                    placeholder="000.000.000-00 (obrigatório)"
                    fullWidth
                  />
                  {touched.cpf && errors.cpf && <FormHelperText error>{errors.cpf}</FormHelperText>}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="birthdate" shrink>
                    Data de Aniversário (opcional)
                  </InputLabel>
                  <OutlinedInput
                    id="birthdate"
                    name="birthdate"
                    type="date"
                    value={values.birthdate || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.birthdate && errors.birthdate)}
                    fullWidth
                  />
                  {touched.birthdate && errors.birthdate && <FormHelperText error>{errors.birthdate}</FormHelperText>}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="phone">Telefone (opcional)</InputLabel>
                  <OutlinedInput
                    id="phone"
                    name="phone"
                    inputRef={phoneRef}
                    type="tel"
                    value={values.phone}
                    onChange={bindMask('phone', setFieldValue, formatPhoneBR, phoneRef)}
                    onBlur={handleBlur}
                    error={Boolean(touched.phone && errors.phone)}
                    placeholder="(11) 99999-9999"
                    fullWidth
                  />
                  {touched.phone && errors.phone && <FormHelperText error>{errors.phone}</FormHelperText>}
                </Stack>
              </Grid>

              <Grid size={12}>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                  Salvar alterações
                </Button>
              </Grid>
            </Grid>
          </form>
        );
      }}
    </Formik>
  );
}
