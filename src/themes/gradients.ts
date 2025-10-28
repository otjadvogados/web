// material-ui
import { Theme, alpha } from '@mui/material/styles';
// types
import { CustomGradientProps } from 'types/theme';
import { ThemeMode } from 'config';
import { BRAND_NAVY, BRAND_GOLD } from 'config';

// ==============================|| CUSTOM GRADIENTS (BRAND) ||============================== //
export default function CustomGradients(theme: Theme): CustomGradientProps {
  const isDark = theme.palette.mode === ThemeMode.DARK;

  // Fundo da aplicação
  const diagonal = `
    linear-gradient(
      160deg,
      ${alpha("#060016", 0.96)} 0%,
      ${alpha("#08031E", 0.94)} 45%,
      ${alpha("#0A0526", isDark ? 0.18 : 0.22)} 100%
    )`;

  // Superfícies (Sidebar/Paper/Card): navy translúcido, sem pesar
  const paperDiag = `
    linear-gradient(
      165deg,
      ${alpha("#110D3F", isDark ? 0.48 : 0.22)} 0%,
      ${alpha("#131047", isDark ? 0.26 : 0.12)} 100%
    )`;

  // AppBar/Toolbars: mais contraste e um toque de dourado
  const toolbarDiag = `
    linear-gradient(
      165deg,
      ${alpha("#0F0B37", 0.85)} 0%,
      ${alpha("#110D3F", 0.70)} 55%,
      ${alpha("#131047", 0.28)} 100%
    )`;

  return {
    appBg: diagonal,
    paperBg: paperDiag,
    toolbarBg: toolbarDiag
  };
}

