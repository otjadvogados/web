/**
 * Remove acentos e diacríticos de uma string
 * Exemplo: "Salário" -> "Salario", "José" -> "Jose"
 */
export function removeAcentos(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza uma string para busca (remove acentos e converte para minúsculas)
 * Exemplo: "Salário" -> "salario"
 */
export function normalizeForSearch(str: string): string {
  return removeAcentos(str).toLowerCase().trim();
}

/**
 * Verifica se uma string contém o termo de busca (sem acentos)
 * Exemplo: containsNormalized("Salário", "salario") -> true
 */
export function containsNormalized(text: string, searchTerm: string): boolean {
  if (!searchTerm) return true;
  const normalizedText = normalizeForSearch(text);
  const normalizedSearch = normalizeForSearch(searchTerm);
  return normalizedText.includes(normalizedSearch);
}
