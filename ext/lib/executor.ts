import type { UnsubMethods } from "./listUnsubscribe";

export type LogEntry = { sender: string; method: "one-click" | "mailto" | "website" | "none"; at: number; ok: boolean };
export type ExecDeps = {
  post: (url: string) => Promise<void>;
  sendRaw: (raw: string) => Promise<void>;
  openTab: (url: string) => Promise<void>;
  now: () => number;
};
export const MAX_PER_RUN = 250;

const ADDR = /^[^\s,;<>"()]+@[^\s,;<>"()]+$/;

// Returns null when the sender-controlled mailto is unsafe (header injection, multiple recipients).
function buildMailto(mailto: string): string | null {
  try {
    const [rawAddr, query = ""] = mailto.replace(/^mailto:/i, "").split("?");
    const addr = decodeURIComponent(rawAddr ?? "");
    if (!ADDR.test(addr)) return null;
    const q = new URLSearchParams(query.replace(/\+/g, "%2B"));
    const subject = (q.get("subject") ?? "unsubscribe").replace(/[\r\n]+/g, " ");
    // eslint-disable-next-line no-control-regex
    const encSubject = /^[\x20-\x7e]*$/.test(subject) ? subject : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(subject)))}?=`;
    const body = (q.get("body") ?? "unsubscribe").replace(/\r\n|\r|\n/g, "\r\n");
    return [`To: ${addr}`, `Subject: ${encSubject}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "", body].join("\r\n");
  } catch {
    return null;
  }
}

export async function unsubscribeOne(sender: string, m: UnsubMethods, deps: ExecDeps): Promise<LogEntry> {
  const done = (method: LogEntry["method"], ok: boolean): LogEntry => ({ sender, method, at: deps.now(), ok });
  if (m.oneClickUrl) {
    try { await deps.post(m.oneClickUrl); return done("one-click", true); } catch { /* fall through */ }
  }
  const raw = m.mailto ? buildMailto(m.mailto) : null;
  if (raw) {
    try { await deps.sendRaw(raw); return done("mailto", true); } catch { /* fall through */ }
  }
  if (m.url) {
    try { await deps.openTab(m.url); return done("website", true); } catch { /* fall through */ }
  }
  return done("none", false);
}

export async function runBatch(
  items: { sender: string; methods: UnsubMethods }[],
  deps: ExecDeps,
  signal?: AbortSignal,
  onEntry?: (e: LogEntry) => void,
): Promise<LogEntry[]> {
  const out: LogEntry[] = [];
  const seen = new Set<string>();
  for (const { sender, methods } of items) {
    if (out.length >= MAX_PER_RUN || signal?.aborted) break;
    if (seen.has(sender)) continue;
    seen.add(sender);
    const e = await unsubscribeOne(sender, methods, deps);
    out.push(e);
    onEntry?.(e);
  }
  return out;
}
