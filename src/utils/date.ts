// Extrai somente a parte YYYY-MM-DD de uma string ISO ou já date-only
export function toDateOnly(input?: string | null): string | null {
  if (!input) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

// Formata para pt-BR (DD/MM/YYYY) sem aplicar fuso
export function formatDateOnlyBR(input?: string | null, fallback: string = '—'): string {
  const d = toDateOnly(input);
  if (!d) return fallback;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
