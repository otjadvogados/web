// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// project imports
import MainCard, { MainCardProps } from 'components/MainCard';

// ==============================|| AUTENTICAÇÃO - ENVOLTÓRIO DO CARD ||============================== //

export default function AuthCard({ children, ...other }: MainCardProps) {
  const theme = useTheme();

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <MainCard
        sx={{
          maxWidth: { xs: 420, sm: 520 },
          margin: { xs: 2.5, md: 3 },
          '& > *': { flexGrow: 1, flexBasis: '50%' },
          borderRadius: 3,
          backdropFilter: 'blur(6px)',
          overflow: 'hidden',
        }}
        content={false}
        {...other}
        border={false}
        boxShadow
        shadow={theme.customShadows.z1}
      >
        <Box sx={{ p: { xs: 3, sm: 4, md: 5 } }}>{children}</Box>
      </MainCard>
    </Box>
  );
}