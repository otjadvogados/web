// material-ui
import useMediaQuery from '@mui/material/useMediaQuery';

// project imports
import DrawerHeaderStyled from './DrawerHeaderStyled';
import Logo from 'components/logo';

import useConfig from 'hooks/useConfig';
import { MenuOrientation } from 'config';

interface Props {
  open: boolean;
}

// ==============================|| DRAWER HEADER ||============================== //

export default function DrawerHeader({ open }: Props) {
  const downLG = useMediaQuery((theme) => theme.breakpoints.down('lg'));

  const { menuOrientation } = useConfig();
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downLG;

  return (
    <DrawerHeaderStyled
      open={open}
      sx={{
        minHeight: isHorizontal ? 'unset' : '60px',
        width: isHorizontal ? { xs: '100%', lg: '424px' } : '100%',
        paddingTop: isHorizontal ? { xs: '10px', lg: '0' } : '10px',
        paddingBottom: isHorizontal ? { xs: '10px', lg: '0' } : '10px',
        paddingLeft: 0,
        paddingRight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Logo 
        isIcon={!open} 
        sx={{ 
          width: open ? 50 : 35, 
          height: open ? 50 : 35,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto'
        }} 
      />
    </DrawerHeaderStyled>
  );
}
