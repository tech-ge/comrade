const blockedEmailDomains = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
];

export function getSchoolEmailDomain(email: unknown): string | null {
  if (typeof email !== "string") return null;

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(normalizedEmail)) return null;

  const domain = normalizedEmail.split("@")[1];
  if (blockedEmailDomains.some((blockedDomain) =>
    domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
  )) {
    return null;
  }

  return domain;
}
