import * as React from 'react';
import { Box, Tabs, Tab, Stack, Typography } from '@mui/material';
import DeviceTable from 'sections/security/DeviceTable';

export default function DevicesCenter() {
  const [tab, setTab] = React.useState(0);

  return (
    <Box>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Dispositivos confiáveis" />
        <Tab label="Dispositivos bloqueados" />
      </Tabs>

      {tab === 0 && (
        <DeviceTable kind="trusted" title="Dispositivos confiáveis" subtitle="Acessos permitidos — gerencie e consulte histórico." />
      )}
      {tab === 1 && (
        <DeviceTable kind="blocked" title="Dispositivos bloqueados" subtitle="Acessos negados — gerencie e consulte histórico." />
      )}
    </Box>
  );
}
