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
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];
const MAX_WAIT_MS = 32_000;
const ADDR = /[^\s<>"(),;]+@[^\s<>"(),;]+/;

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Extract the addr-spec and a display name; null when there is no parseable address.
function parseFrom(from: string): { email: string; name: string } | null {
  const angle = from.match(/<([^<>]*)>/);
  const email = (angle ? angle[1]!.match(ADDR) : from.match(ADDR))?.[0]?.toLowerCase();
  if (!email) return null;
  const display = angle ? from.slice(0, angle.index).trim().replace(/^"|"$/g, "").trim() : "";
  return { email, name: display || from.match(/\(([^)]*)\)/)?.[1]?.trim() || "" };
}

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
  let refreshing: Promise<string> | undefined;
  const tok = async (refresh: boolean) => {
    try {
      return await getToken({ refresh });
    } catch (e) {
      throw new AuthError("Could not obtain a Gmail token", { cause: e });
    }
  };
  // All workers that 401 on the same stale token await one shared refresh.
  const refresh = (stale: string | undefined): Promise<string> => {
    if (token !== stale) return Promise.resolve(token!);
    return (refreshing ??= tok(true)
      .then((t) => (token = t))
      .finally(() => { refreshing = undefined; }));
  };

  async function api(path: string, init: RequestInit = {}): Promise<any> {
    let refreshed = false;
    let backoff = 0;
    for (;;) {
      token ??= await tok(false);
      const used = token;
      const res = await fetchFn(BASE + path, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${used}` },
      });
      if (res.ok) return res.json();
      if (res.status === 401) {
        if (refreshed) throw new AuthError("Gmail rejected the refreshed token");
        refreshed = true;
        await refresh(used);
        continue;
      }
      const body = await res.text();
      const transient =
        res.status === 429 || res.status >= 500 || (res.status === 403 && body.includes("rateLimitExceeded"));
      if (transient && backoff < BACKOFF_MS.length) {
        const ra = Number(res.headers.get("retry-after"));
        const wait = res.headers.get("retry-after") && Number.isFinite(ra) && ra >= 0 ? ra * 1000 : BACKOFF_MS[backoff]!;
        backoff++;
        await sleep(Math.min(wait, MAX_WAIT_MS));
        continue;
      }
      throw Object.assign(new Error(`Gmail ${res.status}: ${body.slice(0, 200)}`), { status: res.status });
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
    _now: number,
    onProgress?: (done: number, total: number) => void,
  ): Promise<SenderStats[]> {
    const ids = await listIds();
    const metas: any[] = [];
    let done = 0;
    let total = ids.length;
    // CONCURRENCY-limited pool; the first failure stops sibling workers.
    const pool = async <T>(items: T[], fn: (x: T) => Promise<void>) => {
      let next = 0;
      const worker = async () => {
        try {
          while (next < items.length) await fn(items[next++]!);
        } catch (e) {
          next = items.length;
          throw e;
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
    };
    await pool(ids, async (id) => {
      const p = new URLSearchParams({ format: "metadata" });
      for (const h of ["From", "List-Unsubscribe", "List-Unsubscribe-Post"]) p.append("metadataHeaders", h);
      try {
        metas.push(await api(`/messages/${id}?${p}`));
      } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e; // deleted since the list call: skip it
      }
      onProgress?.(++done, total);
    });

    const groups = new Map<string, { name: string; msgs: any[] }>();
    for (const m of metas) {
      if (!header(m, "List-Unsubscribe")) continue;
      const from = parseFrom(header(m, "From") ?? "");
      if (!from) continue;
      const g = groups.get(from.email) ?? { name: "", msgs: [] };
      g.name ||= from.name;
      g.msgs.push(m);
      groups.set(from.email, g);
    }

    total = ids.length + groups.size;
    const out: SenderStats[] = [];
    await pool([...groups], async ([email, g]) => {
      const sorted = g.msgs.sort((a, b) => Number(b.internalDate) - Number(a.internalDate));
      const newest = sorted[0];
      const read = sorted.find((m) => !m.labelIds?.includes("UNREAD"));
      const p = new URLSearchParams({ q: `in:sent newer_than:365d to:"${email}"`, maxResults: "1" });
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
      onProgress?.(++done, total);
    });
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
