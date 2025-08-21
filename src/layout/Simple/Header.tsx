import * as React from 'react';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import useMediaQuery from '@mui/material/useMediaQuery';
import useScrollTrigger from '@mui/material/useScrollTrigger';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Logo from 'components/logo';
import IconButton from 'components/@extended/IconButton';
import AnimateButton from 'components/@extended/AnimateButton';

import useAuth from 'hooks/useAuth';
import { APP_DEFAULT_PATH, ThemeMode } from 'config';

// assets
import MenuOutlined from '@ant-design/icons/MenuOutlined';
import LineOutlined from '@ant-design/icons/LineOutlined';

// ==============================|| COMPONENTS - APP BAR ||============================== //

// elevation scroll
function ElevationScroll({ children, window }: any) {
  const theme = useTheme();

  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
    target: window ? window() : undefined
  });

  const backColorScroll = theme.palette.mode === ThemeMode.DARK ? theme.palette.grey[50] : theme.palette.grey[800];

  return React.cloneElement(children, {
    style: {
      background: trigger ? backColorScroll : 'transparent'
    }
  });
}

export default function Header() {
  const { isLoggedIn } = useAuth();

  const downMD = useMediaQuery((theme) => theme.breakpoints.down('md'));

  const [drawerToggle, setDrawerToggle] = useState<boolean>(false);

  /** Method called on multiple components with different event types */
  const drawerToggler = (open: boolean) => (event: any) => {
    if (event.type! === 'keydown' && (event.key! === 'Tab' || event.key! === 'Shift')) {
      return;
    }
    setDrawerToggle(open);
  };

  return (
    <ElevationScroll>
      <AppBar sx={{ bgcolor: 'transparent', color: 'text.primary', boxShadow: 'none' }}>
        <Container disableGutters={downMD}>
          <Toolbar sx={{ px: { xs: 1.5, md: 0, lg: 0 }, py: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'center', flexGrow: 1, display: { xs: 'none', md: 'block' } }}>
              <Typography sx={{ textAlign: 'left', display: 'inline-block' }}>
                <Logo reverse to="/" />
              </Typography>
              <Chip
                label={import.meta.env.VITE_APP_VERSION}
                variant="outlined"
                size="small"
                color="secondary"
                slotProps={{ label: { sx: { px: 0.5 } } }}
                sx={{ mt: 0.5, ml: 1, fontSize: '0.725rem', height: 20 }}
              />
            </Stack>
            <Box sx={{ '& .header-link': { px: 2, '&:hover': { color: 'primary.main' } }, display: { xs: 'none', md: 'block' } }}>
              <Link
                className="header-link"
                color="white"
                component={RouterLink}
                to={isLoggedIn ? APP_DEFAULT_PATH : '/login'}
                target="_blank"
                underline="none"
              >
                {isLoggedIn ? 'Painel' : 'Entrar'}
              </Link>
              <Link className="header-link" color="white" component={RouterLink} to="#!" underline="none">
                Componentes
              </Link>
              <Link className="header-link" color="white" href="https://codedthemes.gitbook.io/mantis/" target="_blank" underline="none">
                Documentação
              </Link>
              <Box sx={{ display: 'inline-block', ml: 1 }}>
                <AnimateButton>
                  <Button
                    component={Link}
                    href="https://mui.com/store/items/mantis-react-admin-dashboard-template/"
                    target="_blank"
                    disableElevation
                    color="primary"
                    variant="contained"
                  >
                    Comprar Agora
                  </Button>
                </AnimateButton>
              </Box>
            </Box>
            <Box sx={{ width: '100%', alignItems: 'center', justifyContent: 'space-between', display: { xs: 'flex', md: 'none' } }}>
              <Typography sx={{ textAlign: 'left', display: 'inline-block' }}>
                <Logo reverse to="/" />
              </Typography>
              <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
                <Button variant="outlined" size="small" color="warning" component={RouterLink} to="#!" sx={{ height: 28 }}>
                  Todos os Componentes
                </Button>

                <IconButton
                  color="secondary"
                  onClick={drawerToggler(true)}
                  sx={(theme) => ({
                    color: 'grey.100',
                    '&:hover': { bgcolor: 'secondary.dark', color: 'grey.100' },
                    ...theme.applyStyles('dark', { color: 'inherit', '&:hover': { bgcolor: 'secondary.lighter' } })
                  })}
                >
                  <MenuOutlined />
                </IconButton>
              </Stack>
              <Drawer anchor="top" open={drawerToggle} onClose={drawerToggler(false)}>
                <Box
                  sx={{ width: 'auto', '& .MuiListItemIcon-root': { fontSize: '1rem', minWidth: 28 } }}
                  role="presentation"
                  onClick={drawerToggler(false)}
                  onKeyDown={drawerToggler(false)}
                >
                  <List>
                    <Link underline="none" href={isLoggedIn ? APP_DEFAULT_PATH : '/login'} target="_blank">
                      <ListItemButton>
                        <ListItemIcon>
                          <LineOutlined />
                        </ListItemIcon>
                        <ListItemText
                          primary={isLoggedIn ? 'Painel' : 'Entrar'}
                          slotProps={{ primary: { variant: 'h6', color: 'text.primary' } }}
                        />
                      </ListItemButton>
                    </Link>
                    <Link underline="none" href="#!" target="_blank">
                      <ListItemButton>
                        <ListItemIcon>
                          <LineOutlined />
                        </ListItemIcon>
                        <ListItemText primary="Todos os Componentes" slotProps={{ primary: { variant: 'h6', color: 'text.primary' } }} />
                      </ListItemButton>
                    </Link>
                    <Link underline="none" href="https://github.com/codedthemes/mantis-free-react-admin-template" target="_blank">
                      <ListItemButton>
                        <ListItemIcon>
                          <LineOutlined />
                        </ListItemIcon>
                        <ListItemText primary="Versão Gratuita" slotProps={{ primary: { variant: 'h6', color: 'text.primary' } }} />
                      </ListItemButton>
                    </Link>
                    <Link underline="none" href="https://codedthemes.gitbook.io/mantis/" target="_blank">
                      <ListItemButton>
                        <ListItemIcon>
                          <LineOutlined />
                        </ListItemIcon>
                        <ListItemText primary="Documentação" slotProps={{ primary: { variant: 'h6', color: 'text.primary' } }} />
                      </ListItemButton>
                    </Link>
                    <Link underline="none" href="https://codedthemes.support-hub.io/" target="_blank">
                      <ListItemButton>
                        <ListItemIcon>
                          <LineOutlined />
                        </ListItemIcon>
                        <ListItemText primary="Suporte" slotProps={{ primary: { variant: 'h6', color: 'text.primary' } }} />
                      </ListItemButton>
                    </Link>
                    <Link underline="none" href="https://mui.com/store/items/mantis-react-admin-dashboard-template/" target="_blank">
                      <ListItemButton>
                        <ListItemIcon>
                          <LineOutlined />
                        </ListItemIcon>
                        <ListItemText primary="Comprar Agora" slotProps={{ primary: { variant: 'h6', color: 'text.primary' } }} />
                        <Chip color="primary" label={import.meta.env.VITE_APP_VERSION} size="small" />
                      </ListItemButton>
                    </Link>
                  </List>
                </Box>
              </Drawer>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </ElevationScroll>
  );
}
