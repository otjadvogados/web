// material-ui
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: '24px 16px 0px', mt: 'auto' }}>
      <Typography variant="caption">
        &copy; Todos os direitos reservados{' '}
        <Link href="https://codedthemes.com/" target="_blank" underline="hover">
          CodedThemes
        </Link>
      </Typography>
      <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="https://codedthemes.com/about-us/" target="_blank" variant="caption" color="text.primary">
          Sobre nós
        </Link>
        <Link href="https://mui.com/legal/privacy/" target="_blank" variant="caption" color="text.primary">
          Privacidade
        </Link>
        <Link href="https://mui.com/store/terms/" target="_blank" variant="caption" color="text.primary">
          Termos
        </Link>
      </Stack>
    </Stack>
  );
}