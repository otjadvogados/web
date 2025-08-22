import { useEffect, useState, SyntheticEvent } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third-party
import * as Yup from 'yup';
import { Formik } from 'formik';

// project imports
import useAuth from 'hooks/useAuth';
import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';
import axios from 'utils/axios';

import { strengthColor, strengthIndicator } from 'utils/password-strength';
import { openSnackbar } from 'api/snackbar';

// types
import { SnackbarProps } from 'types/snackbar';
import { StringColorProps } from 'types/password';

// assets
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import EyeInvisibleOutlined from '@ant-design/icons/EyeInvisibleOutlined';

// ============================|| JWT - REDEFINIR SENHA ||============================ //

export default function AuthResetPassword() {
  const navigate = useNavigate();

  const { isLoggedIn } = useAuth();

  const [level, setLevel] = useState<StringColorProps>();
  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const changePassword = (value: string) => {
    const temp = strengthIndicator(value);
    setLevel(strengthColor(temp));
  };

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const auth = searchParams.get('auth'); // pega auth e define rota baseado nisso

  // Função para obter token do hash da URL
  const getTokenFromHash = () => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    return params.get('token');
  };

  // Função para validar senha forte
  const validatePassword = (password: string) => {
    return (
      password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)
    );
  };

  useEffect(() => {
    changePassword('');
    // Limpa o hash da URL se existir
    if (location.hash) {
      window.history.replaceState(null, '', location.pathname);
    }
  }, [location.hash]);

  return (
    <Formik
      initialValues={{
        password: '',
        confirmPassword: '',
        submit: null
      }}
      validationSchema={Yup.object().shape({
        password: Yup.string()
          .max(255)
          .required('A senha é obrigatória')
          .test('password-strength', 'A senha não atende aos requisitos', function (value) {
            if (!value) return true; // Deixa o required cuidar disso
            return validatePassword(value);
          }),
        confirmPassword: Yup.string()
          .required('A confirmação de senha é obrigatória')
          .test('confirmPassword', 'As senhas devem ser iguais!', (confirmPassword, yup) => yup.parent.password === confirmPassword)
      })}
      onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
        try {
          const token = getTokenFromHash();

          if (!token) {
            setErrors({ submit: 'Link inválido.' });
            setSubmitting(false);
            return;
          }

          // Faz a requisição para o backend
          const response = await axios.post('/auth/reset-password', {
            token,
            password: values.password
          });

          setStatus({ success: true });
          setSubmitting(false);

          openSnackbar({
            open: true,
            message: response.data?.message || 'Senha atualizada com sucesso!',
            variant: 'alert',
            alert: {
              color: 'success'
            }
          } as SnackbarProps);

          setTimeout(() => {
            navigate(isLoggedIn ? '/auth/login' : auth ? `/${auth}/login?auth=jwt` : '/login', { replace: true });
          }, 1500);
        } catch (err: any) {
          console.error(err);
          setStatus({ success: false });
          setErrors({ submit: err.message || 'Link inválido ou expirado.' });
          setSubmitting(false);
        }
      }}
    >
      {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values }) => (
        <form noValidate onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={12}>
              <Stack sx={{ gap: 1 }}>
                <InputLabel htmlFor="password-reset">Nova senha</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.password && errors.password)}
                  id="password-reset"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  name="password"
                  onBlur={handleBlur}
                  onChange={(e) => {
                    handleChange(e);
                    changePassword(e.target.value);
                  }}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="alternar visibilidade da senha"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                        color="secondary"
                      >
                        {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                      </IconButton>
                    </InputAdornment>
                  }
                  placeholder="Sua nova senha"
                />
              </Stack>
              {touched.password && errors.password && (
                <FormHelperText error id="helper-text-password-reset">
                  {errors.password}
                </FormHelperText>
              )}
              <FormHelperText sx={{ mt: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.
              </FormHelperText>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid>
                    <Box sx={{ bgcolor: level?.color, width: 85, height: 8, borderRadius: '7px' }} />
                  </Grid>
                  <Grid>
                    <Typography variant="subtitle1" fontSize="0.75rem">
                      {level?.label}
                    </Typography>
                  </Grid>
                </Grid>
              </FormControl>
            </Grid>
            <Grid size={12}>
              <Stack sx={{ gap: 1 }}>
                <InputLabel htmlFor="confirm-password-reset">Confirmar senha</InputLabel>
                <OutlinedInput
                  fullWidth
                  error={Boolean(touched.confirmPassword && errors.confirmPassword)}
                  id="confirm-password-reset"
                  type="password"
                  value={values.confirmPassword}
                  name="confirmPassword"
                  onBlur={handleBlur}
                  onChange={handleChange}
                  placeholder="Confirme a senha"
                />
              </Stack>
              {touched.confirmPassword && errors.confirmPassword && (
                <FormHelperText error id="helper-text-confirm-password-reset">
                  {errors.confirmPassword}
                </FormHelperText>
              )}
            </Grid>

            {errors.submit && (
              <Grid size={12}>
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Grid>
            )}
            <Grid size={12}>
              <AnimateButton>
                <Button disableElevation disabled={isSubmitting} fullWidth size="large" type="submit" variant="contained" color="primary">
                  Atualizar senha
                </Button>
              </AnimateButton>
            </Grid>
          </Grid>
        </form>
      )}
    </Formik>
  );
}
