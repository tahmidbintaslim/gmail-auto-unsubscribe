import { parseListUnsubscribe, type UnsubMethods } from "./listUnsubscribe";

export type GetToken = (opts: { refresh: boolean }) => Promise<string>;
export type SenderStats = {
  email: string; name: string; domain: string; messages90d: number; unread: number;
  lastOpenedAt: number | null; lastSeenAt: number; replied: boolean; methods: UnsubMethods;
};
export class AuthError extends Error {}

const BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
export const SUBSCRIPTION_QUERY =
  "newer_than:90d (category:promotions OR category:updates OR category:forums OR category:social)";
const CONCURRENCY = 10;
const BACKOFF_MS = [1000, 2000, 4000];

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function base64url(s: string): string {
  let bin = "";
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createGmail(
  getToken: GetToken,
  fetchFn: typeof fetch = globalThis.fetch.bind(globalThis),
  sleep: (ms: number) => Promise<void> = realSleep,
) {
  let token: string | undefined;

  async function api(path: string, init: RequestInit = {}): Promise<any> {
    let refreshed = false;
    let backoff = 0;
    for (;;) {
      token ??= await getToken({ refresh: false });
      const res = await fetchFn(BASE + path, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
      });
      if (res.ok) return res.json();
      if (res.status === 401) {
        if (refreshed) throw new AuthError("Gmail rejected the refreshed token");
        refreshed = true;
        token = await getToken({ refresh: true });
        continue;
      }
      const body = await res.text();
      const limited = res.status === 429 || (res.status === 403 && body.includes("rateLimitExceeded"));
      if (limited && backoff < BACKOFF_MS.length) {
        await sleep(BACKOFF_MS[backoff++]);
        continue;
      }
      throw new Error(`Gmail ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  const header = (m: any, name: string): string | undefined =>
    m.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

  async function listIds(): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const p = new URLSearchParams({ q: SUBSCRIPTION_QUERY, maxResults: "500" });
      if (pageToken) p.set("pageToken", pageToken);
      const r = await api(`/messages?${p}`);
      for (const m of r.messages ?? []) ids.push(m.id);
      pageToken = r.nextPageToken;
    } while (pageToken);
    return ids;
  }

  async function listSubscribedSenders(
    now: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<SenderStats[]> {
    const ids = await listIds();
    const metas: any[] = [];
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        const p = new URLSearchParams({ format: "metadata" });
        for (const h of ["From", "List-Unsubscribe", "List-Unsubscribe-Post"]) p.append("metadataHeaders", h);
        metas.push(await api(`/messages/${id}?${p}`));
        onProgress?.(++done, ids.length);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

    const groups = new Map<string, { name: string; msgs: any[] }>();
    for (const m of metas) {
      if (!header(m, "List-Unsubscribe")) continue;
      const from = header(m, "From") ?? "";
      const email = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
      if (!email) continue;
      const name = from.replace(/<[^>]*>/, "").trim().replace(/^"|"$/g, "");
      const g = groups.get(email) ?? { name, msgs: [] };
      g.msgs.push(m);
      groups.set(email, g);
    }

    const out: SenderStats[] = [];
    for (const [email, g] of groups) {
      const sorted = g.msgs.sort((a, b) => Number(b.internalDate) - Number(a.internalDate));
      const newest = sorted[0];
      const read = sorted.find((m) => !m.labelIds?.includes("UNREAD"));
      // shortcut: one sequential sent-lookup per sender; batch/parallelise if sender counts get large
      const p = new URLSearchParams({ q: `in:sent newer_than:365d to:${email}`, maxResults: "1" });
      const sent = await api(`/messages?${p}`);
      out.push({
        email,
        name: g.name || email,
        domain: email.split("@")[1] ?? "",
        messages90d: sorted.length,
        unread: sorted.filter((m) => m.labelIds?.includes("UNREAD")).length,
        lastOpenedAt: read ? Number(read.internalDate) : null,
        lastSeenAt: Number(newest.internalDate),
        replied: (sent.messages?.length ?? 0) > 0,
        methods: parseListUnsubscribe(header(newest, "List-Unsubscribe"), header(newest, "List-Unsubscribe-Post")),
      });
    }
    void now;
    return out;
  }

  async function sendRaw(rfc822: string): Promise<void> {
    await api("/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: base64url(rfc822) }),
    });
  }

  return { listSubscribedSenders, sendRaw };
}
