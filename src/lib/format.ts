export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatMinutes(min: number): string {
  if (min >= 1440) {
    const days = round(min / 1440, 1);
    return `${days}d`;
  }
  return `${min} min`;
}
