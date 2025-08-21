// material-ui
import { alpha, Theme } from '@mui/material/styles';

// project imports
import getColors from 'utils/getColors';
import getShadow from 'utils/getShadow';

// types
import { ExtendedStyleProps } from 'types/extended';

// ==============================|| BUTTON - COLORS ||============================== //

function getColorStyle({ color, theme }: ExtendedStyleProps) {
  const colors = getColors(theme, color);
  const { main, dark, contrastText } = colors;

  const buttonShadow = `${color}Button`;
  const shadows = getShadow(theme, buttonShadow);

  return {
    color: contrastText,
    backgroundColor: main,
    boxShadow: shadows,
    '&:hover': {
      boxShadow: 'none',
      backgroundColor: dark
    },
    '&:focus-visible': {
      outline: `2px solid ${dark}`,
      outlineOffset: 2
    },
    '&::after': {
      borderRadius: '50px',
      boxShadow: `0 0 5px 5px ${alpha(main, 0.9)}`
    },
    '&:active::after': {
      borderRadius: '50px',
      boxShadow: `0 0 0 0 ${alpha(main, 0.9)}`
    }
  };
}

// ==============================|| OVERRIDES - BUTTON ||============================== //

export default function Fab(theme: Theme) {
  return {
    MuiFab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: theme.shape.borderRadius,
          boxShadow: 'none',
          '&.Mui-disabled': { backgroundColor: theme.palette.grey[200] },
          '&::after': {
            content: '""',
            display: 'block',
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            borderRadius: theme.shape.borderRadius,
            opacity: 0,
            transition: 'all 0.5s'
          },
          '&:active::after': {
            position: 'absolute',
            borderRadius: theme.shape.borderRadius,
            left: 0,
            top: 0,
            opacity: 1,
            transition: '0s'
          }
        },
        sizeSmall: {
          width: 40,
          height: 40
        },
        sizeMedium: {
          width: 48,
          height: 48
        },
        sizeLarge: {
          width: 56,
          height: 56
        }
      }
    }
  };
}
