export function hoursSince(date: Date | string) {
  return (Date.now() - new Date(date).getTime()) / 36e5;
}
export function addDays(date: Date, days: number) {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
