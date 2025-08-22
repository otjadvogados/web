import { Link, useSearchParams } from 'react-router-dom';

// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import useAuth from 'hooks/useAuth';
import AuthWrapper from 'sections/auth/AuthWrapper';
import AuthLogin from 'sections/auth/jwt/AuthLogin';

// ================================|| JWT - ENTRAR ||================================ //

export default function Login() {
  const { isLoggedIn } = useAuth();

  const [searchParams] = useSearchParams();
  const auth = searchParams.get('auth');

  return (
    <AuthWrapper>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: { xs: -0.5, sm: 0.5 } }}>
            <Typography variant="h3">Entrar</Typography>
          </Stack>
        </Grid>
        <Grid size={12}>
          <AuthLogin isDemo={isLoggedIn} />
        </Grid>
      </Grid>
    </AuthWrapper>
  );
}
