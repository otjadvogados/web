// material-ui
import { useTheme } from '@mui/material/styles';

// project imports
import logoIcon from 'assets/images/logo/simple-otj.png';

// ==============================|| LOGO ICON SVG ||============================== //

export default function LogoIcon() {
  const theme = useTheme();

  return (
    <img src={logoIcon} alt="OTJ" width="35" height="35" style={{ objectFit: 'contain' }} />
  );
}
