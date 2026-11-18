export function stripContacts(text: string): string {
  return text
    .replace(/(\+?254|0)\d{9}/g, "[contact hidden]")
    .replace(/https?:\/\/\S+/g, "[link hidden]")
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email hidden]")
    .replace(/@[a-z0-9_]{3,}/gi, "[handle hidden]");
}
