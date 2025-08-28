// src/utils/mask.ts
export const digitsOnly = (s: string) => s.replace(/\D/g, '');

const indexOfNthDigit = (s: string, n: number) => {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (/\d/.test(s[i])) {
      count++;
      if (count === n) return i + 1; // pos após o dígito n
    }
  }
  return s.length;
};

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

type Formatter = (raw: string) => string;

/**
 * Cria um onChange que:
 *  - formata em tempo real
 *  - mantém o caret correto (conta quantos dígitos havia antes do cursor)
 * Use com Formik: passe setFieldValue e o nome do campo.
 */
export const bindMask = (
  name: string,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
  formatter: Formatter,
  inputRef?: React.RefObject<HTMLInputElement | null>
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const before = el.value;
    const selStart = el.selectionStart ?? before.length;

    const digitsBeforeCaret = digitsOnly(before.slice(0, selStart)).length;
    const formatted = formatter(before);

    // atualiza o campo do Formik (controlado)
    setFieldValue(name, formatted, false);

    // reposiciona o caret depois que o React aplicar o valor
    const target = inputRef?.current ?? el;
    requestAnimationFrame(() => {
      const caret = indexOfNthDigit(formatted, digitsBeforeCaret);
      try {
        target.setSelectionRange(caret, caret);
      } catch {
        // alguns browsers/inputs podem falhar; tudo bem ignorar
      }
    });
  };
};
