// material-ui
import { TypographyVariantsOptions } from '@mui/material/styles';

// types
import { FontFamily } from 'types/config';

// ==============================|| DEFAULT THEME - TYPOGRAPHY ||============================== //

export default function Typography(fontFamily: FontFamily): TypographyVariantsOptions {
  return {
    htmlFontSize: 16,
    fontFamily, // Inter para body/controles
    h1: { fontFamily: `'Merriweather', serif`, fontWeight: 700, fontSize: '2.375rem', lineHeight: 1.22, letterSpacing: '0.1px' },
    h2: { fontFamily: `'Merriweather', serif`, fontWeight: 700, fontSize: '1.875rem', lineHeight: 1.28, letterSpacing: '0.1px' },
    h3: { fontFamily: `'Merriweather', serif`, fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.34 },
    h4: { fontFamily: `'Merriweather', serif`, fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.42 },
    h5: { fontFamily: `'Merriweather', serif`, fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
    h6: { fontFamily: `'Merriweather', serif`, fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.57 },
    caption: { fontSize: '0.75rem', fontWeight: 500 },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.57 },
    body2: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.66 },
    subtitle1: { fontSize: '1rem', fontWeight: 600 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 600 },
    overline: { fontSize: '0.75rem', fontWeight: 600 },
    button: { textTransform: 'none', letterSpacing: '0.2px' }
  };
}
