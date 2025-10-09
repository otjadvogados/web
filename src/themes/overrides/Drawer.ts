import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - DRAWER ||============================== //

export default function Drawer(theme: Theme) {
  const glass = {
    backdropFilter: 'blur(10px) saturate(120%)',
    WebkitBackdropFilter: 'blur(10px) saturate(120%)',
    border: '1px solid rgba(255,255,255,.08)'
  };
  return {
    MuiDrawer: {
      styleOverrides: {
        root: {
          '& .MuiBackdrop-root': {
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            backgroundColor: 'rgba(0,0,0,.35)'
          }
        },
        paper: {
          backgroundImage: `${theme.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important',
          borderRadius: theme.shape.borderRadius,
          ...glass
        }
      }
    }
  };
}
