// types
import { DefaultConfigProps } from 'types/config';

// ==============================|| THEME CONSTANT ||============================== //

export const twitterColor = '#1DA1F2';
export const facebookColor = '#3b5998';
export const linkedInColor = '#0e76a8';

// === PALETA OTJ (jurídico) ===
export const BRAND_NAVY = '#0B2748';
export const BRAND_GOLD = '#C6A05E';
export const BRAND_IVORY = '#F7F5F1';

// Função para obter cores adaptativas ao tema
export const getBrandColors = (isDark: boolean) => ({
  navy: isDark ? '#515151' : BRAND_NAVY,
  gold: isDark ? '#D4B87A' : BRAND_GOLD,
  ivory: isDark ? '#2A2A2A' : BRAND_IVORY
});

export const APP_DEFAULT_PATH = '/devices';
export const HORIZONTAL_MAX_ITEM = 7;
export const DRAWER_WIDTH = 260;
export const MINI_DRAWER_WIDTH = 60;

export enum SimpleLayoutType {
  SIMPLE = 'simple',
  LANDING = 'landing'
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum MenuOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal'
}

export enum ThemeDirection {
  LTR = 'ltr',
  RTL = 'rtl'
}

export enum NavActionType {
  FUNCTION = 'function',
  LINK = 'link'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female'
}

export enum DropzoneType {
  DEFAULT = 'default',
  STANDARD = 'standard'
}

export enum AuthProvider {
  JWT = 'jwt'
}

export const APP_AUTH: AuthProvider = AuthProvider.JWT;

// ==============================|| THEME CONFIG ||============================== //

const config: DefaultConfigProps = {
  fontFamily: `'Merriweather', 'Public Sans', sans-serif`,
  i18n: 'pt-BR',
  menuOrientation: MenuOrientation.VERTICAL,
  miniDrawer: false,
  container: true,
  mode: ThemeMode.DARK,
  presetColor: 'theme1',
  themeDirection: ThemeDirection.LTR
};

export default config;
