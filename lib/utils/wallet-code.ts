const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateWalletCode(): string {
  let out = "";
  for (let i = 0; i < 5; i++) out += CHARS[Math.floor(Math.random() * CHARS.length)];
  return out;
}