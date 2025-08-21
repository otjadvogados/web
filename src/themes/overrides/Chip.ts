// material-ui
import { Theme } from '@mui/material/styles';

// project imports
import getColors from 'utils/getColors';

// types
import { ExtendedStyleProps } from 'types/extended';

// ==============================|| CHIP - COLORS ||============================== //

function getColor({ color, theme }: ExtendedStyleProps) {
  const colors = getColors(theme, color);
  const { dark } = colors;

  return {
    '&.Mui-focusVisible': {
      outline: `2px solid ${dark}`,
      outlineOffset: 2
    }
  };
}

function getColorStyle({ color, theme }: ExtendedStyleProps) {
  const colors = getColors(theme, color);
  const { light, lighter, main, darker } = colors;

  return {
    color: main,
    backgroundColor: lighter,
    borderColor: light,
    ...theme.applyStyles('dark', { color: darker }),
    '& .MuiChip-deleteIcon': {
      color: main,
      '&:hover': {
        color: light
      }
    }
  };
}

// ==============================|| OVERRIDES - CHIP ||============================== //

export default function Chip(theme: Theme) {
  const defaultLightChip = getColorStyle({ color: 'secondary', theme });
  return {
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: theme.shape.borderRadius, fontWeight: 500 },
        sizeLarge: { fontSize: '1rem', height: 40 },
        light: { border: 0, ...defaultLightChip },
        combined: {
          border: 0,
          ...defaultLightChip,
          '&.MuiChip-combinedPrimary': getColorStyle({ color: 'primary', theme }),
          '&.MuiChip-combinedSecondary': getColorStyle({ color: 'secondary', theme }),
          '&.MuiChip-combinedError': getColorStyle({ color: 'error', theme }),
          '&.MuiChip-combinedInfo': getColorStyle({ color: 'info', theme }),
          '&.MuiChip-combinedSuccess': getColorStyle({ color: 'success', theme }),
          '&.MuiChip-combinedWarning': getColorStyle({ color: 'warning', theme })
        }
      }
    }
  };
}
