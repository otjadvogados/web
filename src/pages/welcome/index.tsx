import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { useTheme } from '@mui/material/styles';

// third-party
import { motion } from 'framer-motion';

// project imports
import Avatar from 'components/@extended/Avatar';
import useAuth from 'hooks/useAuth';
import useAvatarUrl from 'hooks/useAvatarUrl';

// assets
import welcomeBg from 'assets/images/welcome/welcome.png';
import logoImage from 'assets/images/logo/otj.webp';

// ==============================|| WELCOME PAGE ||============================== //

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Bom dia';
  } else if (hour >= 12 && hour < 18) {
    return 'Boa tarde';
  } else {
    return 'Boa noite';
  }
}

export default function WelcomePage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const avatarUrl = useAvatarUrl(user?.id, user?.avatarFileId);

  const greeting = useMemo(() => getGreeting(), []);
  const userName = user?.name || 'Usuário';
  const companyName = user?.company?.tradeName || user?.company?.name || '';
  const userRole = user?.role?.name || '';

  const handleCardClick = () => {
    navigate('/account');
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 64px)',
        minHeight: 'calc(100vh - 64px)',
        overflow: 'hidden',
        margin: 0,
        padding: 0
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${welcomeBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            zIndex: 1
          }
        }}
      >
        {/* Logo no canto superior direito */}
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 100, md: 120 },
            right: { xs: 60, md: 80 },
            zIndex: 3,
            maxWidth: { xs: 320, md: 380 }
          }}
        >
          <img 
            src={logoImage} 
            alt="OTJ Logo" 
            style={{ 
              width: '100%', 
              height: 'auto', 
              objectFit: 'contain',
              filter: 'brightness(1.1)'
            }} 
          />
        </Box>

        {/* Conteúdo principal */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: { xs: 5, md: 8 },
            pt: { xs: 10, md: 12 }
          }}
        >
          {/* Seção superior - Título e descrição */}
          <Box
            sx={{
              maxWidth: '650px',
              mt: 4
            }}
          >
            <Typography
              variant="h1"
              sx={{
                color: theme.palette.primary.main,
                fontWeight: 700,
                mb: 2.5,
                fontSize: { xs: '3rem', md: '4rem' },
                lineHeight: 1.1,
                letterSpacing: '-0.02em'
              }}
            >
              Bem-vindo!
            </Typography>
            <Typography
              variant="h4"
              component="div"
              sx={{
                fontWeight: 400,
                mb: 2.5,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                lineHeight: 1.4
              }}
            >
              <Box component="span" sx={{ color: theme.palette.text.primary }}>
                Você está no sistema{' '}
              </Box>
              <Box component="span" sx={{ color: theme.palette.primary.main }}>
                Ordakovski & Tavares Junior
              </Box>
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.7,
                maxWidth: '580px'
              }}
            >
              Gerencie processos, clientes e documentos com segurança, organização e excelência jurídica.
            </Typography>
          </Box>

          {/* Card do usuário na parte inferior esquerda */}
          <Box
            sx={{
              maxWidth: '480px',
              mb: { xs: 4, md: 6 }
            }}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ 
              opacity: { duration: 0.5, delay: 0.3, ease: 'easeOut' },
              y: { duration: 0.3, ease: 'easeOut' },
              scale: { duration: 0.3, ease: 'easeOut' }
            }}
          >
            <Card
              onClick={handleCardClick}
              sx={{
                bgcolor: 'rgba(15, 11, 55, 0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'rgba(225, 181, 96, 0.2)',
                boxShadow: `
                  0 8px 32px rgba(0, 0, 0, 0.3),
                  0 0 0 1px rgba(225, 181, 96, 0.1),
                  inset 0 0 20px rgba(225, 181, 96, 0.05)
                `,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'rgba(225, 181, 96, 0.5)',
                  boxShadow: `
                    0 12px 48px rgba(0, 0, 0, 0.4),
                    0 0 20px rgba(225, 181, 96, 0.4),
                    0 0 40px rgba(225, 181, 96, 0.2),
                    inset 0 0 30px rgba(225, 181, 96, 0.1)
                  `
                }
              }}
            >
              <CardContent sx={{ p: 3.5 }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar
                    src={avatarUrl ?? undefined}
                    alt={userName}
                    size="lg"
                    color="warning"
                  >
                    {userName.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        mb: 0.75,
                        fontSize: { xs: '1.15rem', md: '1.3rem' }
                      }}
                    >
                      {greeting}, {userName.split(' ')[0]}!
                    </Typography>
                    {userRole && (
                      <Typography
                        variant="body1"
                        sx={{
                          color: theme.palette.primary.main,
                          mb: 0.5,
                          fontSize: { xs: '0.95rem', md: '1rem' },
                          fontWeight: 400
                        }}
                      >
                        {userRole}
                      </Typography>
                    )}
                    {companyName && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: { xs: '0.9rem', md: '0.95rem' }
                        }}
                      >
                        {companyName}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
