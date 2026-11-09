export type UnsubMethods = { oneClickUrl?: string; mailto?: string; url?: string };

export function parseListUnsubscribe(
  listUnsubscribe: string | undefined,
  listUnsubscribePost: string | undefined,
): UnsubMethods {
  const out: UnsubMethods = {};
  const entries = [...(listUnsubscribe ?? "").matchAll(/<([^>]*)>/g)].map((m) => m[1].trim());
  const https = entries.find((e) => /^https:/i.test(e));
  const url = https ?? entries.find((e) => /^http:/i.test(e));
  const mailto = entries.find((e) => /^mailto:/i.test(e));
  if (url) out.url = url;
  if (https && /List-Unsubscribe=One-Click/i.test(listUnsubscribePost ?? "")) out.oneClickUrl = https;
  if (mailto) out.mailto = mailto;
  return out;
}
