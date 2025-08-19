import { ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';

// material-ui
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

// project imports
import AuthFooter from 'components/cards/AuthFooter';
import Logo from 'components/logo';
import AuthCard from './AuthCard';

import useAuth from 'hooks/useAuth';

// assets
import AuthBackground from './AuthBackground';
import ExclamationCircleOutlined from '@ant-design/icons/ExclamationCircleOutlined';

interface Props {
  children: ReactElement;
}

// ==============================|| AUTHENTICATION - WRAPPER ||============================== //

export default function AuthWrapper({ children }: Props) {
  const { isLoggedIn } = useAuth();

  const [searchParams] = useSearchParams();
  const authParam = searchParams.get('auth') || '';

  let documentationLink: string = 'https://codedthemes.gitbook.io/mantis/authentication';

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AuthBackground />
      <Grid container direction="column" justifyContent="flex-end" sx={{ minHeight: '100vh' }}>
        <Grid sx={{ px: 3, mt: 3 }} size={12}>
          <Logo to="/" />
        </Grid>
        <Grid size={12}>
          <Grid
            container
            justifyContent="center"
            alignItems="center"
            sx={{ minHeight: { xs: 'calc(100vh - 210px)', sm: 'calc(100vh - 134px)', md: 'calc(100vh - 132px)' } }}
          >
            <Grid>
              {!isLoggedIn && authParam && (
                <Box sx={{ maxWidth: { xs: 400, lg: 475 }, margin: { xs: 2.5, md: 3 }, '& > *': { flexGrow: 1, flexBasis: '50%' } }}>
                  <Alert variant="border" color="primary" icon={<ExclamationCircleOutlined />}>
                    <Typography variant="h5">View Only</Typography>
                    <Typography variant="h6">
                      This page is view-only. To make it fully functional, please read the documentation provided{' '}
                      <Link href={documentationLink} target="_blank">
                        here
                      </Link>{' '}
                      after purchasing the theme.
                    </Typography>
                  </Alert>
                </Box>
              )}
              <AuthCard>{children}</AuthCard>

            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ p: 3 }} size={12}>
          <AuthFooter />
        </Grid>
      </Grid>
    </Box>
  );
}
