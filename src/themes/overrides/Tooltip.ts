// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - TOOLTIP ||============================== //

export default function Tooltip(theme: Theme) {
  return {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[900],
          color: theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.common.white,
          borderRadius: 4,
          fontSize: '0.75rem',
          padding: '8px 12px',
          boxShadow: theme.shadows[8]
        },
        arrow: {
          color: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[900]
        }
      }
    }
  };
}
