import { Link, useSearchParams } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import useAuth from 'hooks/useAuth';
import AnimateButton from 'components/@extended/AnimateButton';
import AuthWrapper from 'sections/auth/AuthWrapper';

// ================================|| JWT - VERIFICAR E-MAIL ||================================ //

export default function CheckMail() {
  const { isLoggedIn } = useAuth();

  const [searchParams] = useSearchParams();
  const auth = searchParams.get('auth'); // pega auth e define a rota baseada nisso

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Box sx={{ mb: { xs: -0.5, sm: 0.5 } }}>
            <Typography variant="h3">Olá, verifique seu e-mail</Typography>
            <Typography color="secondary" sx={{ mb: 0.5, mt: 1.25 }}>
              Enviamos as instruções de recuperação de senha para o seu e-mail.
            </Typography>
          </Box>
        </Grid>
        <Grid size={12}>
          <AnimateButton>
            <Button
              component={Link}
              to={isLoggedIn ? '/auth/login' : auth ? `/${auth}/login?auth=jwt` : '/login'}
              disableElevation
              fullWidth
              size="large"
              type="submit"
              variant="contained"
              color="primary"
            >
              Entrar
            </Button>
          </AnimateButton>
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}