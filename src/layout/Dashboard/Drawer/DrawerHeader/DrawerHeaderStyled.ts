// material-ui
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';

// ==============================|| DRAWER HEADER - STYLED ||============================== //

const DrawerHeaderStyled = styled(Box, { shouldForwardProp: (prop) => prop !== 'open' })<{ open: boolean }>(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingLeft: theme.spacing(0),
  paddingRight: theme.spacing(0),
  paddingTop: theme.spacing(0),
  paddingBottom: theme.spacing(0),
  minHeight: theme.mixins.toolbar.minHeight,
  variants: [
    {
      props: ({ open }) => open,
      style: { 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingLeft: theme.spacing(0),
        paddingRight: theme.spacing(0)
      }
    }
  ]
}));

export default DrawerHeaderStyled;
