import { createBrowserRouter } from 'react-router-dom';

// project imports
import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';
import Loadable from 'components/Loadable';
import { lazy } from 'react';

// 404 page
const MaintenanceError = Loadable(lazy(() => import('pages/maintenance/404')));

// auth action pages
const ApproveDevice = Loadable(lazy(() => import('pages/auth/approve-device')));
const Verify = Loadable(lazy(() => import('pages/auth/verify')));
const Unlock = Loadable(lazy(() => import('pages/auth/unlock')));
const RejectDevice = Loadable(lazy(() => import('pages/auth/reject-device')));
const ReportLogin = Loadable(lazy(() => import('pages/auth/report-login')));
const Reset = Loadable(lazy(() => import('pages/auth/reset')));

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([
  {
    path: '/approve-device',
    element: <ApproveDevice />
  },
  {
    path: '/verify',
    element: <Verify />
  },
  {
    path: '/unlock',
    element: <Unlock />
  },
  {
    path: '/reject-device',
    element: <RejectDevice />
  },
  {
    path: '/report-login',
    element: <ReportLogin />
  },
  {
    path: '/reset',
    element: <Reset />
  },
  LoginRoutes, 
  MainRoutes,
  {
    path: '*',
    element: <MaintenanceError />
  }
], { basename: import.meta.env.VITE_APP_BASE_NAME });

export default router;
