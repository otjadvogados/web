// material-ui
import { useTheme } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';
import logoIcon from 'assets/images/logo/otj.webp';

// ==============================|| LOGO ICON SVG ||============================== //

export default function LogoIcon() {
  const theme = useTheme();

  return (
    <img src={logoIcon} alt="Otj" width="100" />
  );
}
