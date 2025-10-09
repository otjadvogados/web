// material-ui
// eslint-disable-next-line
import * as Theme from '@mui/material/styles';

// project imports
import { CustomShadowProps, CustomGradientProps } from 'types/theme';

declare module '@mui/material/styles' {
  interface Theme {
    customShadows: CustomShadowProps;
    customGradients: CustomGradientProps;
  }
  interface ThemeOptions {
    customGradients?: CustomGradientProps;
  }
}
