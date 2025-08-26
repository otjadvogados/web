import { forwardRef } from 'react';
import { useTheme } from '@mui/material/styles';
import MuiTooltip, { TooltipProps } from '@mui/material/Tooltip';

// ==============================|| EXTENDED TOOLTIP ||============================== //

const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(({ children, ...props }, ref) => {
  const theme = useTheme();

  return (
    <MuiTooltip
      ref={ref}
      {...props}
      arrow
      placement="top"
      sx={{
        '& .MuiTooltip-tooltip': {
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[900],
          color: theme.palette.mode === 'dark' ? theme.palette.grey[100] : theme.palette.common.white,
          borderRadius: 4,
          fontSize: '0.75rem',
          padding: '8px 12px',
          boxShadow: theme.shadows[8]
        },
        '& .MuiTooltip-arrow': {
          color: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[900]
        }
      }}
    >
      {children}
    </MuiTooltip>
  );
});

Tooltip.displayName = 'Tooltip';

export default Tooltip;
