import { Link, useSearchParams } from 'react-router-dom';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import useAuth from 'hooks/useAuth';
import AuthWrapper from 'sections/auth/AuthWrapper';
import AuthForgotPassword from 'sections/auth/jwt/AuthForgotPassword';

// ================================|| JWT - ESQUECI MINHA SENHA ||================================ //

export default function ForgotPassword() {
  const { isLoggedIn } = useAuth();

  const [searchParams] = useSearchParams();
  const auth = searchParams.get('auth'); // pega auth e define a rota baseada nisso

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: { xs: -0.5, sm: 0.5 } }}>
            <Typography variant="h3">Esqueci Minha Senha</Typography>
            <Typography
              component={Link}
              to={isLoggedIn ? '/auth/login' : auth ? `/${auth}/login?auth=jwt` : '/login'}
              variant="body1"
              sx={{ textDecoration: 'none' }}
              color="primary"
            >
              Voltar para o Login
            </Typography>
          </Stack>
        </Grid>
        <Grid size={12}>
          <AuthForgotPassword />
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}
