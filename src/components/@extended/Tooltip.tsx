// material-ui
import { styled, Theme } from '@mui/material/styles';
import MuiTooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import Box from '@mui/material/Box';

// project imports
import getColors from 'utils/getColors';

// type
import { ColorProps } from 'types/extended';

// ==============================|| TOOLTIP - VARIANT ||============================== //

interface TooltipStyleProps {
  color?: ColorProps | string;
  labelColor?: ColorProps | string;
  theme: Theme;
}

function getVariantStyle({ color, theme, labelColor }: TooltipStyleProps) {
  const colors = getColors(theme, color as ColorProps);
  const { main, contrastText } = colors;
  const colorValue = color ? color : '';

  if (['primary', 'secondary', 'info', 'success', 'warning', 'error'].includes(colorValue)) {
    return {
      [`& .${tooltipClasses.tooltip}`]: {
        background: main,
        color: labelColor ? labelColor : contrastText
      },
      [`& .${tooltipClasses.arrow}`]: {
        color: main
      }
    };
  } else {
    return {
      [`& .${tooltipClasses.tooltip}`]: {
        background: colorValue,
        color: labelColor ? labelColor : contrastText,
        boxShadow: theme.shadows[1]
      },
      [`& .${tooltipClasses.arrow}`]: {
        color: colorValue
      }
    };
  }
}

// ==============================|| STYLED - TOOLTIP COLOR ||============================== //

interface StyleProps {
  arrow: TooltipProps['arrow'];
  labelColor?: ColorProps | string;
  color?: ColorProps | string;
}

const TooltipStyle = styled(({ className, ...props }: TooltipProps) => <MuiTooltip {...props} classes={{ popper: className }} />, {
  shouldForwardProp: (prop) => prop !== 'color' && prop !== 'labelColor'
})<StyleProps>(({ theme, color, labelColor }) => ({
  variants: [
    {
      props: { color },
      style: getVariantStyle({ color, theme, labelColor })
    }
  ]
}));

// ==============================|| EXTENDED - TOOLTIP ||============================== //

interface Props extends TooltipProps {
  color?: ColorProps | string;
  labelColor?: ColorProps | string;
  arrow?: boolean;
  children: TooltipProps['children'];
}

export default function CustomTooltip({ children, arrow = true, labelColor = '', ...rest }: Props) {
  return (
    <Box display="flex">
      <TooltipStyle arrow={arrow} labelColor={labelColor} {...rest}>
        {children}
      </TooltipStyle>
    </Box>
  );
}
