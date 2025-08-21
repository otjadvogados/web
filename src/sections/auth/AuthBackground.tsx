// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// project imports
import { ThemeDirection, ThemeMode } from 'config';
import logoImage from 'assets/images/logo/otj.webp';

// ==============================|| FUNDO DE AUTENTICAÇÃO COM IMAGEM DESFOCADA ||============================== //

export default function AuthBackground() {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'absolute',
        filter: 'blur(18px)',
        zIndex: -1,
        bottom: 0,
        transform: theme.direction === ThemeDirection.RTL ? 'rotate(180deg)' : 'inherit',
        height: 'calc(100vh - 175px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <img 
        src={logoImage} 
        alt="Otj Background" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.3
        }}
      />
    </Box>
  );
}