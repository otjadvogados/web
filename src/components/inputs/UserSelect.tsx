import { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { searchUsers, type UserBasic } from '../../api/users';
import useDebounced from '../../utils/useDebounced';

type Props = {
  label?: string;
  placeholder?: string;
  value: UserBasic | null;
  onChange: (user: UserBasic | null) => void;
  disabled?: boolean;
  helperText?: React.ReactNode;
  error?: boolean;
};

/**
 * Autocomplete de usuários (empresa atual).
 * Controlado por objeto UserBasic (id, name, email).
 */
export default function UserSelect({
  label = '',
  placeholder = 'Buscar por nome ou e-mail…',
  value,
  onChange,
  disabled,
  helperText,
  error
}: Props) {
  const [input, setInput] = useState('');
  const deb = useDebounced(input, 300);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<UserBasic[]>([]);

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      try {
        const res = await searchUsers({ search: deb, page: 1, limit: 20 });
        if (!alive) return;
        setOptions(res.data);
      } catch {
        if (!alive) return;
        setOptions([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [deb]);

  const getOptionLabel = (u: UserBasic) => `${u.name} (${u.email})`;
  const isOptionEqualToValue = (opt: UserBasic, val: UserBasic) => opt.id === val.id;

  const endAdornment = useMemo(
    () => (loading ? <CircularProgress color="inherit" size={18} /> : null),
    [loading]
  );

  return (
    <Autocomplete<UserBasic, false, false, false>
      options={options}
      value={value}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      onChange={(_, v) => onChange(v ?? null)}
      onInputChange={(_, v) => setInput(v)}
      loading={loading}
      disabled={disabled}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Stack spacing={0} sx={{ py: 0.25 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {option.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {option.email}
            </Typography>
          </Stack>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {endAdornment}
                {params.InputProps.endAdornment}
              </>
            )
          }}
          helperText={helperText}
          error={error}
        />
      )}
    />
  );
}
