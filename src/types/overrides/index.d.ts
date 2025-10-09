// material-ui
// eslint-disable-next-line
import Color from '@mui/material/Color';

declare module '@mui/material/styles' {
  interface Color {
    0?: string;
    A50?: string;
    A800?: string;
  }
  // Permite acesso tipado aos gradientes customizados em theme
  interface Theme {
    customGradients: import('../../types/theme').CustomGradientProps;
  }
}
