import { stripContacts } from "./contact-stripper";
export function validatePost(body: string) {
  const cleaned = stripContacts(body);
  const banned = ["kill","die","threat","tribal slur list here"];
  const lower = cleaned.toLowerCase();
  for (const b of banned) if (lower.includes(b)) return { ok: false, reason: "Flagged language" };
  return { ok: true, cleaned };
}
