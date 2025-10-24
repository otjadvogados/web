import { ReactNode, useMemo } from 'react';

// material-ui
import { createTheme, StyledEngineProvider, ThemeOptions, ThemeProvider, Theme, TypographyVariantsOptions } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// project imports
import useConfig from 'hooks/useConfig';
import Palette from './palette';
import Typography from './typography';
import CustomShadows from './shadows';
import componentsOverride from './overrides';
import CustomGradients from './gradients';

// types
import { CustomShadowProps, CustomGradientProps } from 'types/theme';

// types
type ThemeCustomizationProps = {
  children: ReactNode;
};

// ==============================|| DEFAULT THEME - MAIN ||============================== //

export default function ThemeCustomization({ children }: ThemeCustomizationProps) {
  const { themeDirection, mode, presetColor, fontFamily } = useConfig();

  const theme: Theme = useMemo<Theme>(() => Palette(mode, presetColor), [mode, presetColor]);

  const themeTypography: TypographyVariantsOptions = useMemo<TypographyVariantsOptions>(() => Typography(fontFamily), [fontFamily]);

  const themeCustomShadows: CustomShadowProps = useMemo<CustomShadowProps>(() => CustomShadows(theme), [theme]);
  const themeCustomGradients: CustomGradientProps = useMemo<CustomGradientProps>(() => CustomGradients(theme), [theme]);

  const themeOptions: ThemeOptions = useMemo(
    () => ({
      breakpoints: {
        values: {
          xs: 0,
          sm: 768,
          md: 1024,
          lg: 1266,
          xl: 1440
        }
      },
      direction: themeDirection,
      shape: { borderRadius: 0 },
      mixins: {
        toolbar: {
          minHeight: 60,
          paddingTop: 8,
          paddingBottom: 8
        }
      },
      palette: theme.palette,
      customShadows: themeCustomShadows,
      customGradients: themeCustomGradients,
      typography: themeTypography
    }),
    [themeDirection, theme, themeTypography, themeCustomShadows, themeCustomGradients]
  );

  const themes: Theme = createTheme(themeOptions);
  themes.components = componentsOverride(themes);

  // Aplica o gradiente globalmente no body via CssBaseline
  themes.components = {
    ...themes.components,
    MuiCssBaseline: {
      styleOverrides: {
        'html, body, #root': {
          minHeight: '100%',
          // força ganhar do assets/style.css (você usa injectFirst)
          backgroundImage: `${themes.customGradients.appBg} !important`,
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          // evita que algum "background" sólido cubra o gradiente
        }
      }
    },
    // SUPERFÍCIES: garantimos gradiente/transparência em todos os principais contêineres
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: `${themes.customGradients.toolbarBg} !important`,
          backgroundColor: 'transparent !important',
          backdropFilter: 'saturate(120%) blur(6px)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          // default: transparente para deixar ver o gradiente do body quando não queremos gradiente próprio
          backgroundColor: 'transparent !important'
        },
        // para elevações comuns aplicamos um gradiente sutil
        elevation1: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: `transparent !important`,
          backdropFilter: 'blur(10px) saturate(120%)',
          WebkitBackdropFilter: 'blur(10px) saturate(120%)',
        },
        elevation2: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        },
        elevation3: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        },
        outlined: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: `${themes.palette.background.paper} !important`,
          backdropFilter: 'blur(10px) saturate(120%)',
          WebkitBackdropFilter: 'blur(10px) saturate(120%)',
          border: '1px solid rgba(255,255,255,.08)'
        }
      }
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: `${themes.customGradients.paperBg} !important`,
          backgroundColor: 'transparent !important'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundImage: `${themes.customGradients.toolbarBg} !important`,
          backgroundColor: 'transparent !important'
        }
      }
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          backgroundColor: 'rgba(0,0,0,.35)'
        }
      }
    }
  };

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themes}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
