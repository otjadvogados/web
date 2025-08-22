// material-ui
import { alpha, Theme } from '@mui/material/styles';

// project imports
import getColors from 'utils/getColors';
import getShadow from 'utils/getShadow';

// types
import { ButtonVariantProps, ExtendedStyleProps } from 'types/extended';

// ==============================|| BUTTON - COLORS ||============================== //

interface ButtonStyleProps extends ExtendedStyleProps {
  variant: ButtonVariantProps;
}

function getColorStyle({ variant, color, theme }: ButtonStyleProps) {
  const colors = getColors(theme, color);
  const { lighter, main, dark, darker, contrastText } = colors;

  const buttonShadow = `${color}Button`;
  const shadows = getShadow(theme, buttonShadow);

  const commonShadow = {
    '&::after': {
      boxShadow: `0 0 5px 5px ${alpha(main, 0.9)}`
    },
    '&:active::after': {
      boxShadow: `0 0 0 0 ${alpha(main, 0.9)}`
    },
    '&:focus-visible': {
      outline: `2px solid ${dark}`,
      outlineOffset: 2
    }
  };

  switch (variant) {
    case 'contained':
      return {
        '&:hover': {
          backgroundColor: dark
        },
        ...commonShadow
      };
    case 'shadow':
      return {
        color: contrastText,
        backgroundColor: main,
        boxShadow: shadows,
        '&:hover': {
          boxShadow: 'none',
          backgroundColor: dark
        },
        ...commonShadow
      };
    case 'outlined':
      return {
        borderColor: main,
        '&:hover': {
          color: dark,
          backgroundColor: 'transparent',
          borderColor: dark
        },
        ...commonShadow
      };
    case 'dashed':
      return {
        color: main,
        borderColor: main,
        backgroundColor: lighter,
        '&:hover': {
          color: dark,
          borderColor: dark
        },
        ...commonShadow
      };
    case 'text':
    default:
      return {
        color: dark,
        '&:hover': {
          color: darker,
          backgroundColor: lighter
        },
        ...commonShadow
      };
  }
}

// ==============================|| OVERRIDES - BUTTON ||============================== //

export default function Button(theme: Theme) {
  const primaryDashed = getColorStyle({ variant: 'dashed', color: 'primary', theme });
  const primaryShadow = getColorStyle({ variant: 'shadow', color: 'primary', theme });

  const disabledStyle = {
    backgroundColor: theme.palette.grey[200],
    '&:hover': {
      backgroundColor: theme.palette.grey[200]
    }
  };
  const iconStyle = {
    '&>*:nth-of-type(1)': {
      fontSize: 'inherit'
    }
  };

  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: theme.shape.borderRadius,
          boxShadow: 'none'
        },
        contained: {
          '&.Mui-disabled': {
            ...disabledStyle
          }
        },
        outlined: {
          '&.Mui-disabled': {
            ...disabledStyle,
            '&:hover': {
              backgroundColor: theme.palette.grey[200],
              color: `${theme.palette.grey[300]} !important`,
              borderColor: 'inherit'
            }
          }
        },
        text: { boxShadow: 'none', '&:hover': { boxShadow: 'none', backgroundColor: theme.palette.action.hover } },
        outlinedInherit: {
          border: `1px solid ${alpha(theme.palette.grey[500], 0.32)}`,
          '&:hover': { backgroundColor: theme.palette.action.hover }
        },
        containedInherit: { color: theme.palette.grey[800], boxShadow: theme.shadows[2], '&:hover': { boxShadow: theme.shadows[4] } },
        light: {
          color: theme.palette.grey[800],
          backgroundColor: alpha(theme.palette.grey[500], 0.08),
          '&:hover': { backgroundColor: alpha(theme.palette.grey[500], 0.12) }
        },
        containedPrimary: { borderRadius: theme.shape.borderRadius },
        containedSecondary: getColorStyle({ variant: 'contained', color: 'secondary', theme }),
        containedError: getColorStyle({ variant: 'contained', color: 'error', theme }),
        containedSuccess: getColorStyle({ variant: 'contained', color: 'success', theme }),
        containedInfo: getColorStyle({ variant: 'contained', color: 'info', theme }),
        containedWarning: getColorStyle({ variant: 'contained', color: 'warning', theme }),
        outlinedPrimary: { borderRadius: theme.shape.borderRadius, borderWidth: 1.2 },
        outlinedSecondary: getColorStyle({ variant: 'outlined', color: 'secondary', theme }),
        outlinedError: getColorStyle({ variant: 'outlined', color: 'error', theme }),
        outlinedSuccess: getColorStyle({ variant: 'outlined', color: 'success', theme }),
        outlinedInfo: getColorStyle({ variant: 'outlined', color: 'info', theme }),
        outlinedWarning: getColorStyle({ variant: 'outlined', color: 'warning', theme }),
        textPrimary: getColorStyle({ variant: 'text', color: 'primary', theme }),
        textSecondary: getColorStyle({ variant: 'text', color: 'secondary', theme }),
        textError: getColorStyle({ variant: 'text', color: 'error', theme }),
        textSuccess: getColorStyle({ variant: 'text', color: 'success', theme }),
        textInfo: getColorStyle({ variant: 'text', color: 'info', theme }),
        textWarning: getColorStyle({ variant: 'text', color: 'warning', theme }),
        endIcon: {
          ...iconStyle
        },
        startIcon: {
          ...iconStyle
        },
        dashed: {
          border: `1px dashed ${theme.palette.divider}`,
          '&.Mui-disabled': {
            color: `${theme.palette.grey[300]} !important`,
            borderColor: `${theme.palette.grey[400]} !important`,
            backgroundColor: `${theme.palette.grey[200]} !important`
          }
        },
        shadow: {
          boxShadow: 'none',
          '&.Mui-disabled': {
            color: `${theme.palette.grey[300]} !important`,
            borderColor: `${theme.palette.grey[400]} !important`,
            backgroundColor: `${theme.palette.grey[200]} !important`
          }
        },
        sizeExtraSmall: {
          minWidth: 56,
          fontSize: '0.625rem',
          padding: '2px 8px'
        },
        loading: {
          pointerEvents: 'none !important',
          '& svg': {
            width: 'inherit',
            height: 'inherit'
          },
          '&.MuiButton-loadingPositionCenter': {
            color: 'transparent !important'
          }
        }
      }
    }
  };
}
