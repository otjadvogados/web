// material-ui
import { Theme } from '@mui/material/styles';

// ==============================|| OVERRIDES - DIALOG CONTENT TEXT ||============================== //

export default function Popover(theme: Theme) {
  const glass = {
    backdropFilter: 'blur(10px) saturate(120%)',
    WebkitBackdropFilter: 'blur(10px) saturate(120%)',
    border: '1px solid rgba(255,255,255,.08)'
  };
  return {
    MuiPopover: {
      styleOverrides: {
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
