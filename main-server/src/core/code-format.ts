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

export function formatFormulationCode(name: string): string {
  return formatNamedCode(name, 'f');
}

export function formatProductionRunCode(formulationCode: string): string {
  const normalized = slugify(formulationCode);
  if (!normalized) return '';
  return normalized.endsWith('-f') ? `${normalized.slice(0, -2)}-pr` : `${normalized}-pr`;
}

function formatNamedCode(value: string, suffix: string): string {
  const normalized = slugify(value);
  return normalized ? `${normalized}-${suffix}` : '';
}

function slugify(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
