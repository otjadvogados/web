// src/utils/mask.ts
export const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** CPF progressivo (000.000.000-00) com digitação parcial */
export const formatCPF = (raw: string) => {
  const d = digitsOnly(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/**
 * Telefone BR progressivo:
 * (11) 99999-9999 (11 dígitos)  |  (11) 9999-9999 (10 dígitos)
 * Também funciona enquanto digita.
 */
export const formatPhoneBR = (raw: string) => {
  const d = digitsOnly(raw).slice(0, 11);

  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    // fixo (10 dígitos): 4 + 4 depois do DDD
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  // móvel (11 dígitos): 5 + 4 depois do DDD
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/**
 * CNPJ progressivo (00.000.000/0000-00) com digitação parcial
 */
export const formatCNPJ = (raw: string) => {
  const d = digitsOnly(raw).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/**
 * OAB progressivo (000000/SP), tolera digitação parcial,
 * sempre uppercase para UF e insere "/" quando letras existem.
 */
export const formatOAB = (raw: string) => {
  const clean = raw.replace(/[^0-9A-Za-z]/g, '');
  const numbers = clean.replace(/\D/g, '').slice(0, 6);
  const letters = clean.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  if (!numbers && !letters) return '';
  return letters ? `${numbers}/${letters}` : numbers;
};

type Formatter = (raw: string) => string;

/**
 * bindMask com opção de colar o caret no fim (útil para OAB).
 */
export const bindMask = (
  field: string,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
  formatter: Formatter,
  ref?: React.RefObject<HTMLInputElement | null>,
  opts?: { stickToEnd?: boolean }
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatter(e.target.value);
    setFieldValue(field, formatted, false);
    if (!ref?.current) return;
    requestAnimationFrame(() => {
      const el = ref.current!;
      // Para OAB passaremos { stickToEnd: true } -> evita inversão "pr" -> "rp"
      const pos = opts?.stickToEnd ? el.value.length : el.selectionStart ?? el.value.length;
      el.setSelectionRange(pos, pos);
    });
  };
};
