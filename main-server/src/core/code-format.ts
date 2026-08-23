export function formatCode(value: string, suffix: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
  if (!normalized) return '';

  const normalizedSuffix = suffix.replace(/^-+/, '').toUpperCase();
  return normalized.endsWith(`-${normalizedSuffix}`) ? normalized : `${normalized}-${normalizedSuffix}`;
}
