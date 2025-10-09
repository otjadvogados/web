// material-ui
import { alpha, Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - DIALOG ||============================== //

export default function Dialog(theme: Theme) {
  const glass = {
    backdropFilter: 'blur(10px) saturate(120%)',
    WebkitBackdropFilter: 'blur(10px) saturate(120%)',
    border: '1px solid rgba(255,255,255,.08)'
  };
  return {
    MuiDialog: {
      styleOverrides: {
        root: {
          '& .MuiBackdrop-root': {
            backgroundColor: '#000',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)'
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
