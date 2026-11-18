export function generatePublicId(): string {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

export function formatPublicId(id: string): string {
  const s = String(id).padStart(9, "0");
  return `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)}`;
}