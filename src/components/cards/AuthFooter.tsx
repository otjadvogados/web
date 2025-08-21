// material-ui
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';

// ==============================|| FOOTER - AUTENTICAÇÃO ||============================== //

export default function AuthFooter() {
  return (
    <Container maxWidth="xl">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ gap: 2, justifyContent: { xs: 'center', sm: 'space-between', textAlign: { xs: 'center', sm: 'inherit' } } }}
      >
        <Typography variant="subtitle2" color="secondary">
          © Feito pela equipe{' '}
          <Link href="https://swiftsoft.com.br/" target="_blank" underline="hover">
            Swift Soft
          </Link>
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, textAlign: { xs: 'center', sm: 'inherit' } }}>
          <Typography
            variant="subtitle2"
            color="secondary"
            component={Link}
            href="https://mui.com/store/terms/"
            target="_blank"
            underline="hover"
          >
            Termos e Condições
          </Typography>
          <Typography
            variant="subtitle2"
            color="secondary"
            component={Link}
            href="https://mui.com/legal/privacy/"
            target="_blank"
            underline="hover"
          >
            Política de Privacidade
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
}