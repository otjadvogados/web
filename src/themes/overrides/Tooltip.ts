// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - TOOLTIP ||============================== //

export default function Tooltip(theme: Theme) {
  return {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: theme.palette.grey[900],
          color: theme.palette.common.white,
          borderRadius: 0,
          fontSize: '0.75rem'
        }
      }
    }
  };
}
