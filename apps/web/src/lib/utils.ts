export function titleCase(str?: string | null): string {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
