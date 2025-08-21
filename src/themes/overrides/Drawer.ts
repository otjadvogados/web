import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - DRAWER ||============================== //

export default function Drawer(theme: Theme) {
  return {
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: 'none', borderRadius: theme.shape.borderRadius }
      }
    }
  };
}
