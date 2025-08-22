// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third-party
import { useTimer } from 'react-timer-hook';

// project imports
import MainCard from 'components/MainCard';

// assets
import coming from 'assets/images/maintenance/coming-soon.png';

// ==============================|| EM BREVE - TIMER ||============================== //

const TimerBox = ({ count, label }: { count: number; label: string }) => {
  const downSM = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <MainCard content={false} sx={{ width: { xs: 60, sm: 80 } }}>
      <Stack sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ py: 1.75 }}>
          <Typography variant={downSM ? 'h4' : 'h2'}>{count}</Typography>
        </Box>
        <Box sx={{ p: 0.5, bgcolor: 'secondary.lighter', width: '100%' }}>
          <Typography align="center" variant="subtitle2">
            {label}
          </Typography>
        </Box>
      </Stack>
    </MainCard>
  );
};

// ==============================|| EM BREVE - PRINCIPAL ||============================== //

export default function ComingSoon() {
  const time = new Date();
  time.setSeconds(time.getSeconds() + 3600 * 24 * 2 - 3600 * 15.5);

  const { seconds, minutes, hours, days } = useTimer({ expiryTimestamp: time });

  return (
    <Grid container spacing={4} direction="column" alignItems="center" justifyContent="center" sx={{ minHeight: '100vh', py: 2 }}>
      <Grid size={12}>
        <Stack sx={{ gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Typography align="center" variant="h1">
            Em Breve
          </Typography>
          <Typography align="center" color="text.secondary">
            Algo novo está a caminho
          </Typography>
        </Stack>
      </Grid>
      <Grid sx={{ width: { xs: '95%', md: '40%' } }} size={12}>
        <Stack direction="row" sx={{ gap: { xs: 1, sm: 2 }, alignItems: 'center', justifyContent: 'center' }}>
          <TimerBox count={days} label="dias" />
          <Typography variant="h1"> : </Typography>
          <TimerBox count={hours} label="horas" />
          <Typography variant="h1"> : </Typography>
          <TimerBox count={minutes} label="min" />
          <Typography variant="h1"> : </Typography>
          <TimerBox count={seconds} label="seg" />
        </Stack>
      </Grid>
      <Grid sx={{ width: { xs: 340, md: '40%', lg: '30%' } }} size={12}>
        <Stack sx={{ gap: 2, mt: 2 }}>
          <Typography align="center" color="text.secondary">
            Seja o primeiro a ser notificado quando a OTJ for lançada.
          </Typography>
          <Stack direction="row" sx={{ gap: 1 }}>
            <TextField fullWidth placeholder="Endereço de e-mail" />
            <Button variant="contained" sx={{ width: '50%' }}>
              Notifique-me
            </Button>
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  );
}
