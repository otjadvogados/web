  import { ReactElement } from 'react';
  import Box from '@mui/material/Box';
  import { useTheme } from '@mui/material/styles';

  import AuthFooter from 'components/cards/AuthFooter';
  import AuthCard from './AuthCard';
  import AuthBackground from './AuthBackground';
  import logoImage from 'assets/images/logo/otj.webp';

  interface Props { children: ReactElement; }

  export default function AuthWrapper({ children }: Props) {
    const theme = useTheme();

    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gridTemplateRows: '1fr auto',           // <- linha do conteúdo + linha do footer
          alignContent: 'start'                   // <- (opcional) evita stretch das linhas
        }}
      >
        <AuthBackground />

        {/* coluna esquerda (logo) */}
        <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 4, md: 6 } }}>
          <Box component="img" src={logoImage} alt="Logo OTJ" sx={{ width: '70%', maxWidth: 600 }} />
        </Box>

        {/* coluna direita (card) */}
        <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 3, md: 6 } }}>
          <AuthCard>{children}</AuthCard>
        </Box>

        {/* footer ocupa a 2ª linha inteira */}
        <Box sx={{
          gridColumn: '1 / -1', p: 3
        }}>
          <AuthFooter />
        </Box>
      </Box>
    );
  }