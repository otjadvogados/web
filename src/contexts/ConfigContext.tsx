import { createContext, ReactElement, useCallback } from 'react';

// project imports
import config, { MenuOrientation, ThemeDirection, ThemeMode } from 'config';
import useLocalStorage from 'hooks/useLocalStorage';

// types
import { DefaultConfigProps, CustomizationProps, FontFamily, I18n, PresetColor } from 'types/config';

// initial state
const initialState: CustomizationProps = {
  ...config,
  onChangeContainer: () => {},
  onChangeLocalization: () => {},
  onChangeMode: () => {},
  onChangePresetColor: () => {},
  onChangeDirection: () => {},
  onChangeMiniDrawer: () => {},
  onChangeMenuOrientation: () => {},
  onChangeFontFamily: () => {}
};

// ==============================|| CONFIG CONTEXT & PROVIDER ||============================== //

const ConfigContext = createContext(initialState);

type ConfigProviderProps = {
  children: ReactElement;
};

function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useLocalStorage('mantis-react-ts-config', initialState);

  const onChangeContainer = useCallback(
    (container: boolean) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, container }));
    },
    [setConfig]
  );

  const onChangeLocalization = useCallback(
    (lang: I18n) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, i18n: lang }));
    },
    [setConfig]
  );

  const onChangeMode = useCallback(
    (mode: ThemeMode) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, mode }));
    },
    [setConfig]
  );

  const onChangePresetColor = useCallback(
    (theme: PresetColor) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, presetColor: theme }));
    },
    [setConfig]
  );

  const onChangeDirection = useCallback(
    (direction: ThemeDirection) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, themeDirection: direction }));
    },
    [setConfig]
  );

  const onChangeMiniDrawer = useCallback(
    (miniDrawer: boolean) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, menuOrientation: MenuOrientation.VERTICAL, miniDrawer }));
    },
    [setConfig]
  );

  const onChangeMenuOrientation = useCallback(
    (layout: MenuOrientation) => {
      setConfig((prev: DefaultConfigProps) => ({
        ...prev,
        menuOrientation: layout,
        ...(layout === MenuOrientation.VERTICAL && { miniDrawer: false })
      }));
    },
    [setConfig]
  );

  const onChangeFontFamily = useCallback(
    (fontFamily: FontFamily) => {
      setConfig((prev: DefaultConfigProps) => ({ ...prev, fontFamily }));
    },
    [setConfig]
  );

  return (
    <ConfigContext
      value={{
        ...config,
        onChangeContainer,
        onChangeLocalization,
        onChangeMode,
        onChangePresetColor,
        onChangeDirection,
        onChangeMiniDrawer,
        onChangeMenuOrientation,
        onChangeFontFamily
      }}
    >
      {children}
    </ConfigContext>
  );
}

export { ConfigProvider, ConfigContext };
