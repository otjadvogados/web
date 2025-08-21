// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { ThemeDirection } from 'config';
import { getBrandColors } from 'config';

export default function AuthBackground() {
  const theme = useTheme();
  const colors = getBrandColors(theme.palette.mode === 'dark');

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        transform: theme.direction === ThemeDirection.RTL ? 'rotate(180deg)' : 'inherit',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg, ${colors.ivory} 0%, ${theme.palette.background.paper} 45%, ${colors.ivory} 100%)`,
        overflow: 'hidden'
      }}
    >

      {/* faixa diagonal navy translúcida para dar profundidade */}
      <Box sx={{
        position: 'absolute',
        right: '-20vw',
        top: 0,
        width: '70vw',
        height: '100%',
        transform: 'skewX(-15deg)',
        background: `${colors.navy}10`,
        display: { xs: 'none', md: 'block' }
      }} />
    </Box>
  );
}