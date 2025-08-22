import { lazy } from 'react';

// project imports
import AuthLayout from 'layout/Auth';
import Loadable from 'components/Loadable';
import { APP_AUTH, AuthProvider } from 'config';

// jwt auth
const JwtAuthLogin = Loadable(lazy(() => import('pages/auth/jwt/login')));
const JwtAuthForgotPassword = Loadable(lazy(() => import('pages/auth/jwt/forgot-password')));
const JwtAuthResetPassword = Loadable(lazy(() => import('pages/auth/jwt/reset-password')));
const JwtAuthCodeVerification = Loadable(lazy(() => import('pages/auth/jwt/code-verification')));
const JwtAuthCheckMail = Loadable(lazy(() => import('pages/auth/jwt/check-mail')));

// approve device
const ApproveDevice = Loadable(lazy(() => import('pages/auth/approve-device')));

// ==============================|| AUTH ROUTING ||============================== //

const LoginRoutes = {
  path: '/',
  children: [
    {
      path: '/',
      element: <AuthLayout />,
      children: [
        {
          path: '/',
          children: [
            { path: '/', element: <JwtAuthLogin /> },
            { path: 'login', element: <JwtAuthLogin /> },
            { path: 'forgot-password', element: <JwtAuthForgotPassword /> },
            { path: 'check-mail', element: <JwtAuthCheckMail /> },
            { path: 'reset-password', element: <JwtAuthResetPassword /> },
            { path: 'code-verification', element: <JwtAuthCodeVerification /> },
            { path: 'approve-device', element: <ApproveDevice /> }
          ]
        }
      ]
    }
  ]
};

export default LoginRoutes;
