const CENTIMETERS_PER_UNIT: Record<string, number> = { cm: 1, mm: 0.1, in: 2.54 };

export function convertDropTestHeight(value: number, fromUnit: string, toUnit: string): number {
  const from = CENTIMETERS_PER_UNIT[fromUnit];
  const to = CENTIMETERS_PER_UNIT[toUnit];
  if (!from || !to) throw new Error(`Unsupported Drop Test unit: ${fromUnit} → ${toUnit}`);
  return value * from / to;
}
