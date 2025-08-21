// material-ui

// project imports
import logo from 'assets/images/logo/otj.webp';

// ==============================|| LOGO SVG ||============================== //

export default function LogoMain({ reverse }: { reverse?: boolean }) {
  return (
    <img src={logo} alt="OTJ" style={{ objectFit: 'contain', height: '100%' }} />
  );
}
