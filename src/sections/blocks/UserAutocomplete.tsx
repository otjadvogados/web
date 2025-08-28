import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import { listUsers } from '../../api/users';
import { UserRow } from '../../types/users';

type Props = {
  value: UserRow | null;
  onChange: (user: UserRow | null) => void;
  label?: string;
  placeholder?: string;
};

export default function UserAutocomplete({ value, onChange, label = 'Usuário', placeholder = 'Buscar por nome ou e-mail' }: Props) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const debounced = useMemo(() => {
    let t: any;
    return (s: string, fn: () => void) => {
      clearTimeout(t);
      t = setTimeout(fn, 350);
    };
  }, []);

  useEffect(() => {
    debounced(input, async () => {
      try {
        setLoading(true);
        const res = await listUsers({ page: 1, limit: 10, search: input.trim() || undefined, sortBy: 'createdAt', sortOrder: 'desc' });
        setOptions(res.data);
      } finally {
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  return (
    <Autocomplete
      options={options}
      value={value}
      loading={loading}
      getOptionLabel={(o) => o?.name ? `${o.name} <${o.email}>` : o?.email || ''}
      onChange={(_, v) => onChange(v)}
      onInputChange={(_, v) => setInput(v)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            )
          }}
        />
      )}
    />
  );
}
