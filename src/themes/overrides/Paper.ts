// src/themes/overrides/Paper.ts
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - PAPER ||============================== //

export default function Paper(theme: Theme) {
  const glass = {
    backdropFilter: 'blur(10px) saturate(120%)',
    WebkitBackdropFilter: 'blur(10px) saturate(120%)',
  };

  return {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: `${theme.customGradients?.paperBg || 'none'} !important`,
          backgroundColor: `${theme.palette.background.paper} !important`,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.customShadows?.z1 || theme.shadows[1],
          ...glass,

          // Remover transparência quando sidebar estiver fechado
          '&.solid-menu': {
            backgroundColor: 'theme.palette.background.paper',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
          },
        },
      },
    },
  };
}