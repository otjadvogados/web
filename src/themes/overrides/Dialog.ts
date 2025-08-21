// material-ui
import { alpha, Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - DIALOG ||============================== //

export default function Dialog(theme: Theme) {
  return {
    MuiDialog: {
      styleOverrides: {
        root: {
          '& .MuiBackdrop-root': {
            backgroundColor: alpha('#000', 0.7)
          }
        },
        paper: { backgroundImage: 'none', borderRadius: theme.shape.borderRadius }
      }
    }
  };
}
