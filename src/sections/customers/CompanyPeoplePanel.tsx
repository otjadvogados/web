import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Link as MLink,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { ReloadOutlined as RefreshIcon, LinkOutlined as OpenInNewIcon } from '@ant-design/icons';
import { getCompanyPeople, LinkedPerson } from '../../api/customers';
import { useNavigate } from 'react-router-dom';

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

function maskCPF(cpf: string) {
  const d = (cpf || '').replace(/\D+/g, '');
  if (d.length !== 11) return cpf || '';
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export default function CompanyPeoplePanel({ customerId }: { customerId: string }) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkedPerson[]>([]);

  const fetchData = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCompanyPeople(customerId);
      // backend já ordena por isPrimary DESC, createdAt DESC
      setLinks(res || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Erro ao carregar pessoas vinculadas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const primary = useMemo(() => links.find((l) => l.isPrimary), [links]);
  const others = useMemo(() => links.filter((l) => !l.isPrimary), [links]);

  if (loading) {
    return (
      <Stack direction="row" gap={1} alignItems="center">
        <CircularProgress size={20} />
        <Typography variant="body2">Carregando pessoas vinculadas…</Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap={1}>
        <Typography variant="body2" color="error">{error}</Typography>
        <Button size="small" variant="outlined" onClick={fetchData} startIcon={<RefreshIcon />}>
          Tentar novamente
        </Button>
      </Stack>
    );
  }

  if (!links.length) {
    return (
      <Stack direction="row" gap={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Nenhuma pessoa vinculada a esta empresa.
        </Typography>
        <Tooltip title="Recarregar">
          <IconButton size="small" onClick={fetchData}>
            <RefreshIcon  />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }

  const CardRow = ({ link }: { link: LinkedPerson }) => {
    const p = link.person;
    const canOpen = !!p?.customerId;
    const go = () => canOpen && nav(`/customers/${p.customerId}`);

    return (
      <Stack
        direction="row"
        gap={2}
        alignItems="center"
        sx={{
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          '&:hover': { backgroundColor: 'action.hover' },
        }}
      >
        <Avatar sx={{ width: 36, height: 36 }}>{initials(p.fullName || '?')}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" noWrap title={p.fullName}>
              {p.fullName}
            </Typography>
            <Stack direction="row" gap={0.5} flexWrap="wrap">
              {link.isPrimary && <Chip size="small" label="Principal" />}
              {link.isLegalRepresentative && <Chip size="small" label="Rep. Legal" variant="outlined" />}
              {link.role && <Chip size="small" label={link.role} variant="outlined" />}
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {p.cpf ? `CPF ${maskCPF(p.cpf)}` : ''}
            {p.email ? ` • ${p.email}` : ''}
            {p.phone ? ` • ${p.phone}` : ''}
          </Typography>
        </Box>
        {canOpen ? (
          <Tooltip title="Abrir cadastro da pessoa">
            <IconButton size="small" onClick={go}>
              <OpenInNewIcon  />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Cadastro da pessoa indisponível">
            <span>
              <IconButton size="small" disabled>
                <OpenInNewIcon  />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    );
  };

  return (
    <Stack gap={1.25}>
      {primary && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Contato principal
          </Typography>
          <CardRow link={primary} />
          {!!others.length && <Divider light sx={{ my: 1 }} />}
        </>
      )}
      {!!others.length && (
        <>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Outros contatos
          </Typography>
          <Stack gap={1}>
            {others.map((l) => (
              <CardRow key={l.personId} link={l} />
            ))}
          </Stack>
        </>
      )}
      <Stack direction="row" justifyContent="flex-end">
        <Tooltip title="Recarregar">
          <IconButton size="small" onClick={fetchData}>
            <RefreshIcon  />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
