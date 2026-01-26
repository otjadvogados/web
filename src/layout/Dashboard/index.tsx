import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

// project imports
import Drawer from './Drawer';
import Header from './Header';
import Footer from './Footer';
import HorizontalBar from './Drawer/HorizontalBar';
import Loader from 'components/Loader';
import Breadcrumbs from 'components/@extended/Breadcrumbs';
import AuthGuard from 'utils/route-guard/AuthGuard';
import WorkspaceManager from 'components/WorkspaceManager';

import { MenuOrientation } from 'config';
import useConfig from 'hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from 'api/menu';

// ==============================|| MAIN LAYOUT ||============================== //

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const { menuMasterLoading } = useGetMenuMaster();
  const downXL = useMediaQuery((theme: Theme) => theme.breakpoints.down('xl'));
  const downLG = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'));

  const { container, miniDrawer, menuOrientation } = useConfig();

  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL && !downLG;

  // set media wise responsive drawer
  useEffect(() => {
    if (!miniDrawer) {
      handlerDrawerOpen(!downXL);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downXL]);

  if (menuMasterLoading) return <Loader />;

  // Verifica se estamos na página A4Playground
  const isA4Playground = pathname.includes('/ai-docs/a4-playground/');
  const isWelcomePage = pathname === '/welcome' || pathname === '/';

  return (
    <AuthGuard>
      <WorkspaceManager />
      <Box sx={{ display: 'flex', width: '100%' }} data-page={isA4Playground ? 'a4-playground' : 'other'}>
        <Header />
        {!isHorizontal ? <Drawer /> : <HorizontalBar />}

        <Box component="main" sx={{ width: 'calc(100% - 260px)', flexGrow: 1, p: isWelcomePage ? 0 : { xs: 2, sm: 3 }, position: 'relative' }}>
          {!isWelcomePage && <Toolbar sx={{ mt: isHorizontal ? 8 : 'inherit' }} />}
          <Container
            maxWidth={container ? 'xl' : false}
            sx={{
              ...(container && { px: { xs: 0, sm: 2 } }),
              position: 'relative',
              minHeight: 'calc(100vh - 110px)',
              display: 'flex',
              flexDirection: 'column',
              ...(isWelcomePage && { maxWidth: '100%', px: 0, py: 0, minHeight: '100%' })
            }}
          >
            {pathname !== '#!' && !isA4Playground && !isWelcomePage && <Breadcrumbs />}
            <Outlet />
            {!isWelcomePage && <Footer />}
          </Container>
        </Box>
      </Box>
    </AuthGuard>
  );
}
