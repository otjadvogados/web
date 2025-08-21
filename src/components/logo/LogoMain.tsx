// material-ui
import { useTheme } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';
import logo from 'assets/images/logo/otj.webp';

// ==============================|| LOGO SVG ||============================== //

export default function LogoMain({ reverse }: { reverse?: boolean }) {
  const theme = useTheme();
  return (
    <img src={logo} alt="Otj" width="100" />
  );
}
