// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - TOOLTIP ||============================== //

export default function Tooltip(theme: Theme) {
  const glass = {
    backdropFilter: 'blur(8px) saturate(120%)',
    WebkitBackdropFilter: 'blur(8px) saturate(120%)',
    border: '1px solid rgba(255,255,255,.08)'
  };
  return {
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          // usa um gradiente sutil no balão também
          backgroundImage: `${theme.customGradients.toolbarBg} !important`,
          backgroundColor: 'transparent !important',
          color: theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.common.white,
          borderRadius: 4,
          fontSize: '0.75rem',
          padding: '8px 12px',
          boxShadow: theme.shadows[8],
          ...glass
        },
        arrow: { color: 'transparent' }
      }
    }
  };
}
