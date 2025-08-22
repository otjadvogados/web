// material-ui
import { alpha, Theme } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';

// types
import { CustomShadowProps } from 'types/theme';

// ==============================|| DEFAULT THEME - CUSTOM SHADOWS ||============================== //

export default function CustomShadows(theme: Theme): CustomShadowProps {
  return {
    button: theme.palette.mode === ThemeMode.DARK ? `0 2px 0 rgb(0 0 0 / 5%)` : `0 2px #0000000b`,
    text: `0 -1px 0 rgb(0 0 0 / 12%)`,

    // único nível "z" previsto no tipo
    z1: theme.palette.mode === ThemeMode.DARK ? `0px 1px 2px rgb(0 0 0 / 30%)` : `0px 1px 2px ${alpha(theme.palette.grey[900], 0.1)}`,

    // anéis de foco/realce por cor (mantidos)
    primary: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
    secondary: `0 0 0 2px ${alpha(theme.palette.secondary.main, 0.2)}`,
    error: `0 0 0 2px ${alpha(theme.palette.error.main, 0.2)}`,
    warning: `0 0 0 2px ${alpha(theme.palette.warning.main, 0.2)}`,
    info: `0 0 0 2px ${alpha(theme.palette.info.main, 0.2)}`,
    success: `0 0 0 2px ${alpha(theme.palette.success.main, 0.2)}`,
    grey: `0 0 0 2px ${alpha(theme.palette.grey[500], 0.2)}`,

    // sombras de botão por cor (mantidas)
    primaryButton: `0 6px 8px ${alpha(theme.palette.primary.main, 0.12)}`,
    secondaryButton: `0 6px 8px ${alpha(theme.palette.secondary.main, 0.12)}`,
    errorButton: `0 6px 8px ${alpha(theme.palette.error.main, 0.12)}`,
    warningButton: `0 6px 8px ${alpha(theme.palette.warning.main, 0.12)}`,
    infoButton: `0 6px 8px ${alpha(theme.palette.info.main, 0.12)}`,
    successButton: `0 6px 8px ${alpha(theme.palette.success.main, 0.12)}`,
    greyButton: `0 14px 12px ${alpha(theme.palette.grey[500], 0.2)}`
  };
}
