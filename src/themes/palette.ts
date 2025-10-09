// material-ui
import { alpha, createTheme } from '@mui/material/styles';

// third-party
import { presetDarkPalettes, presetPalettes, PalettesProps } from '@ant-design/colors';

// project imports
import ThemeOption from './theme';
import { ThemeMode } from 'config';

// types
import { PaletteThemeProps } from 'types/theme';
import { PresetColor } from 'types/config';

// ==============================|| DEFAULT THEME - PALETTE ||============================== //

export default function Palette(mode: ThemeMode, presetColor: PresetColor) {
  const colors: PalettesProps = mode === ThemeMode.DARK ? presetDarkPalettes : presetPalettes;

  let greyPrimary = [
    '#ffffff',
    '#fafafa',
    '#f5f5f5',
    '#f0f0f0',
    '#d9d9d9',
    '#bfbfbf',
    '#8c8c8c',
    '#595959',
    '#262626',
    '#141414',
    '#000000'
  ];
  let greyAscent = ['#fafafa', '#bfbfbf', '#434343', '#1f1f1f'];
  let greyConstant = ['#fafafb', '#e6ebf1'];

  if (mode === ThemeMode.DARK) {
    // Escala "grey" azulada para o modo DARK (fundo/paper/divider/text)
    // índices 0..10 + A-series seguem o contrato usado em ThemeOption
    greyPrimary = [
      '#060016  ', // 0  (quase preto azulado)
      '#0D082F', // 1
      '#0F0B37', // 2  -> background.paper
      '#1E1C49', '#0F0B37', '#bfbfbf', '#d9d9d9', '#f0f0f0', '#f5f5f5', '#fafafa', '#ffffff'  // 10 (mantém branco para text.primary via grey[900])
    ];
    // acentos frios coerentes com o navy
    greyAscent = ['#fafafa', '#bfbfbf', '#434343', '#1f1f1f'];
    // constantes: base de página + contornos claros
    greyConstant = ['#0b0927', '#d3d8db'];
  }
  colors.grey = [...greyPrimary, ...greyAscent, ...greyConstant];

  const paletteColor: PaletteThemeProps = ThemeOption(colors, presetColor, mode);

  return createTheme({
    palette: {
      mode,
      common: {
        black: '#000',
        white: '#fff'
      },
      ...paletteColor,
      text: {
        // Em dark, grey[900] => último da escala (branco), mantendo boa legibilidade
        primary: mode === ThemeMode.DARK ? alpha(paletteColor.grey[900]!, 0.92) : paletteColor.grey[800],
        secondary: mode === ThemeMode.DARK ? alpha(paletteColor.grey[900]!, 0.60) : paletteColor.grey[600],
        disabled: mode === ThemeMode.DARK ? alpha(paletteColor.grey[900]!, 0.30) : paletteColor.grey[400]
      },
      action: {
        // usa a cor primária como realce global (hover/selected/focus)
        hover: alpha(paletteColor.primary.main as string, 0.08),
        selected: alpha(paletteColor.primary.main as string, 0.16),
        focus: alpha(paletteColor.primary.main as string, 0.24),
        active: alpha(paletteColor.primary.main as string, 0.90),
        disabled: paletteColor.grey[300],
        hoverOpacity: 0.08,
        selectedOpacity: 0.16,
        focusOpacity: 0.24,
        activatedOpacity: 0.12,
        disabledOpacity: 0.38
      },
      divider: mode === ThemeMode.DARK ? alpha(paletteColor.grey[900]!, 0.06) : paletteColor.grey[200],
      background: {
        // deixar o gradiente do body aparecer
        paper: mode === ThemeMode.DARK ? 'transparent' : paletteColor.grey[0],
        default: 'transparent'
      }
    }
  });
}
