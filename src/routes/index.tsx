import { createBrowserRouter } from 'react-router-dom';

// project imports
import MainRoutes from './MainRoutes';
import LoginRoutes from './LoginRoutes';
import Loadable from 'components/Loadable';
import { lazy } from 'react';

// 404 page
const MaintenanceError = Loadable(lazy(() => import('pages/maintenance/404')));

// ==============================|| ROUTING RENDER ||============================== //

const router = createBrowserRouter([
  LoginRoutes, 
  MainRoutes,
  {
    path: '*',
    element: <MaintenanceError />
  }
], { basename: import.meta.env.VITE_APP_BASE_NAME });

export default router;
