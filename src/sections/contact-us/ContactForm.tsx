import { useState } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// select project-budget
const currencies = [
  {
    value: '1',
    label: 'Abaixo de R$1000'
  },
  {
    value: '2',
    label: 'R$1000 - R$5000'
  },
  {
    value: '3',
    label: 'Não especificado'
  }
];

// select company-size
const sizes = [
  {
    value: '1',
    label: '1 - 5'
  },
  {
    value: '2',
    label: '5 - 10'
  },
  {
    value: '3',
    label: '10+'
  }
];

// ==============================|| CONTATO - FORMULÁRIO ||============================== //

export default function ContactForm() {
  const [budget, setBudget] = useState(1);
  const handleProjectBudget = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setBudget(Number(event.target?.value));
  };

  const [size, setSize] = useState(1);
  const handleCompanySize = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSize(Number(event.target?.value));
  };

  return (
    <Box sx={{ p: { xs: 2.5, sm: 0 } }}>
      <Grid container spacing={5} justifyContent="center">
        <Grid size={{ xs: 12, sm: 10, lg: 9 }}>
          <Stack sx={{ gap: 2, alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="primary">Entre em Contato</Typography>
            <Typography align="center" variant="h2">
              Lorem ipsum dolor sit amet.
            </Typography>
            <Typography variant="caption" align="center" color="text.secondary" sx={{ maxWidth: '355px' }}>
              O ponto de partida para o seu próximo projeto com Material-UI © personalizável, ajudando você a criar apps mais rápido e melhor.
            </Typography>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, sm: 10, lg: 9 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="text" placeholder="Nome" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="text" placeholder="Nome da Empresa" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="email" placeholder="Endereço de E-mail" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="number" placeholder="Número de Telefone" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth placeholder="Tamanho da Empresa" value={size} onChange={handleCompanySize}>
                {sizes.map((option, index) => (
                  <MenuItem key={index} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth placeholder="Orçamento do Projeto" value={budget} onChange={handleProjectBudget}>
                {currencies.map((option, index) => (
                  <MenuItem key={index} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField fullWidth multiline rows={4} placeholder="Mensagem" />
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, sm: 10, lg: 9 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ gap: 1, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', ml: -1 }}>
              <Checkbox sx={{ '& .css-1vjb4cj': { borderRadius: '2px' } }} defaultChecked />
              <Typography>
                Ao enviar este formulário, você concorda com a{' '}
                <Typography
                  component={Link}
                  href="https://mui.com/legal/privacy/"
                  target="_blank"
                  sx={{ cursor: 'pointer' }}
                  color="primary.main"
                >
                  Política de Privacidade
                </Typography>{' '}
                e com os{' '}
                <Typography
                  component={Link}
                  href="https://mui.com/store/terms/"
                  target="_blank"
                  sx={{ cursor: 'pointer' }}
                  color="primary.main"
                >
                  Termos e Condições.
                </Typography>
              </Typography>
            </Stack>
            <Button variant="contained" sx={{ ml: { xs: 0 } }}>
              Enviar Agora
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}