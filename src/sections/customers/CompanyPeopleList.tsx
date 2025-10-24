import { useEffect, useState } from 'react';
import { Chip, CircularProgress, IconButton, List, ListItem, ListItemText, Stack, Tooltip, Typography } from '@mui/material';
import { getCompanyPeople, linkPersonToCompany, LinkedPerson } from '../../api/customers';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

type Props = {
  companyId: string;
  // opcional: permitir que um vínculo recém-criado seja "empurrado" pelo pai sem refetch
  newlyLinked?: LinkedPerson | null;
};

export default function CompanyPeopleList({ companyId, newlyLinked }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LinkedPerson[]>([]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    getCompanyPeople(companyId)
      .then((res) => { if (!ignore) setItems(res); })
      .catch((e) => { if (!ignore) setError(e?.message || 'Erro ao carregar vínculos'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [companyId]);

  // quando o pai cria um vínculo e passa via prop, acrescenta sem refetch
  useEffect(() => {
    if (newlyLinked && !items.find(i => i.personId === newlyLinked.personId)) {
      setItems((prev) => [newlyLinked, ...prev]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newlyLinked]);

  if (loading) return <Stack direction="row" alignItems="center" gap={1}><CircularProgress size={18} /><Typography variant="body2">Carregando pessoas vinculadas…</Typography></Stack>;
  if (error) return <Typography color="error">{error}</Typography>;

  if (!items.length) {
    return <Typography variant="body2" color="text.secondary">Nenhuma pessoa vinculada a esta empresa.</Typography>;
  }

  return (
    <List dense>
      {items.map((link) => (
        <ListItem key={link.personId} disableGutters
          secondaryAction={
            <Stack direction="row" gap={1}>
              {link.isPrimary && <Chip size="small" label="Principal" />}
              {link.isLegalRepresentative && <Chip size="small" label="Representante Legal" />}
            </Stack>
          }>
          <ListItemText
            primary={link.person.fullName || link.person.customer.displayName}
            secondary={
              <Stack direction="row" gap={1} flexWrap="wrap">
                {link.role && <Chip size="small" variant="outlined" label={`Cargo: ${link.role}`} />}
                {link.person.email && <Chip size="small" variant="outlined" label={link.person.email} />}
                {link.person.phone && <Chip size="small" variant="outlined" label={link.person.phone} />}
              </Stack>
            }
          />
        </ListItem>
      ))}
    </List>
  );
}



