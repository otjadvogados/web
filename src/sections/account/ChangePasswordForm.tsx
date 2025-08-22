import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from 'components/@extended/IconButton';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';

import * as Yup from 'yup';
import { Formik } from 'formik';
import { useState, SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import EyeOutlined from '@ant-design/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/EyeInvisibleOutlined';

import axios, { clearToken } from 'utils/axios';
import { openSnackbar } from 'api/snackbar';
import useAuth from 'hooks/useAuth';

const schema = Yup.object({
  currentPassword: Yup.string().required('Senha atual é obrigatória'),
  newPassword: Yup.string()
    .required('Nova senha é obrigatória')
    .min(8, 'Mínimo 8 caracteres')
    .matches(/[A-Z]/, 'Inclua uma letra maiúscula')
    .matches(/[a-z]/, 'Inclua uma letra minúscula')
    .matches(/[0-9]/, 'Inclua um número')
    .matches(/[^A-Za-z0-9]/, 'Inclua um símbolo'),
  confirmPassword: Yup.string()
    .required('Confirmação obrigatória')
    .oneOf([Yup.ref('newPassword')], 'As senhas devem ser iguais')
});

export default function ChangePasswordForm() {
  const [show, setShow] = useState(false);
  const toggle = () => setShow((s) => !s);
  const hold = (e: SyntheticEvent) => e.preventDefault();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <Formik
      initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
      validationSchema={schema}
      onSubmit={async (values, { setSubmitting, setErrors, resetForm }) => {
        try {
          // ajuste a rota conforme sua API (ex.: POST /auth/change-password)
          await axios.post('/auth/change-password', {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword
          });

          openSnackbar({
            open: true,
            message: 'Senha atualizada com sucesso! Faça login novamente com sua nova senha.',
            variant: 'alert',
            alert: { color: 'success' }
          } as any);

          // Limpa o token e o contexto de autenticação
          clearToken();
          await logout();

          // Limpa o estado de submissão
          setSubmitting(false);
          
          // Redireciona para login com delay para garantir que o contexto seja limpo
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 100);
        } catch (err: any) {
          setSubmitting(false);
          const errorMessage = err.response?.data?.message || err.message || 'Não foi possível alterar a senha';
          setErrors({ currentPassword: errorMessage });
        }
      }}
    >
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
        <form noValidate onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Campos à esquerda */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="currentPassword">Senha atual</InputLabel>
                  <OutlinedInput
                    id="currentPassword"
                    name="currentPassword"
                    type={show ? 'text' : 'password'}
                    value={values.currentPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.currentPassword && errors.currentPassword)}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton aria-label="mostrar senha" onClick={toggle} onMouseDown={hold} edge="end" color="secondary">
                          {show ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                  {touched.currentPassword && errors.currentPassword && (
                    <FormHelperText error>{errors.currentPassword}</FormHelperText>
                  )}
                </Stack>

                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="newPassword">Nova senha</InputLabel>
                  <OutlinedInput
                    id="newPassword"
                    name="newPassword"
                    type={show ? 'text' : 'password'}
                    value={values.newPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.newPassword && errors.newPassword)}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton aria-label="mostrar senha" onClick={toggle} onMouseDown={hold} edge="end" color="secondary">
                          {show ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                  {touched.newPassword && errors.newPassword && <FormHelperText error>{errors.newPassword}</FormHelperText>}
                </Stack>

                <Stack sx={{ gap: 1 }}>
                  <InputLabel htmlFor="confirmPassword">Confirmar nova senha</InputLabel>
                  <OutlinedInput
                    id="confirmPassword"
                    name="confirmPassword"
                    type={show ? 'text' : 'password'}
                    value={values.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <FormHelperText error>{errors.confirmPassword}</FormHelperText>
                  )}
                </Stack>

                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
                  Atualizar Senha
                </Button>
              </Stack>
            </Grid>

            {/* Lista de validação à direita */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <Typography variant="h6" color="primary">
                  A nova senha deve conter:
                </Typography>
                
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color={values.newPassword.length >= 8 ? 'success.main' : 'text.secondary'}>
                      {values.newPassword.length >= 8 ? '✓' : '○'} Pelo menos 8 caracteres
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color={/[a-z]/.test(values.newPassword) ? 'success.main' : 'text.secondary'}>
                      {/[a-z]/.test(values.newPassword) ? '✓' : '○'} Pelo menos 1 letra minúscula (a-z)
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color={/[A-Z]/.test(values.newPassword) ? 'success.main' : 'text.secondary'}>
                      {/[A-Z]/.test(values.newPassword) ? '✓' : '○'} Pelo menos 1 letra maiúscula (A-Z)
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color={/[0-9]/.test(values.newPassword) ? 'success.main' : 'text.secondary'}>
                      {/[0-9]/.test(values.newPassword) ? '✓' : '○'} Pelo menos 1 número (0-9)
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color={/[^A-Za-z0-9]/.test(values.newPassword) ? 'success.main' : 'text.secondary'}>
                      {/[^A-Za-z0-9]/.test(values.newPassword) ? '✓' : '○'} Pelo menos 1 caractere especial
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
}
