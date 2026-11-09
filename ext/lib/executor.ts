import type { UnsubMethods } from "./listUnsubscribe";

export type LogEntry = { sender: string; method: "one-click" | "mailto" | "website" | "none"; at: number; ok: boolean };
export type ExecDeps = {
  post: (url: string) => Promise<void>;
  sendRaw: (raw: string) => Promise<void>;
  openTab: (url: string) => Promise<void>;
  now: () => number;
};
export const MAX_PER_RUN = 250;

function buildMailto(mailto: string): string {
  const [addr, query = ""] = mailto.replace(/^mailto:/i, "").split("?");
  const q = new URLSearchParams(query.replace(/\+/g, "%2B"));
  return [`To: ${decodeURIComponent(addr)}`, `Subject: ${q.get("subject") ?? "unsubscribe"}`, "", q.get("body") ?? "unsubscribe"].join("\r\n");
}

export async function unsubscribeOne(sender: string, m: UnsubMethods, deps: ExecDeps): Promise<LogEntry> {
  const done = (method: LogEntry["method"], ok: boolean): LogEntry => ({ sender, method, at: deps.now(), ok });
  if (m.oneClickUrl) {
    try { await deps.post(m.oneClickUrl); return done("one-click", true); } catch { /* fall through */ }
  }
  if (m.mailto) {
    try { await deps.sendRaw(buildMailto(m.mailto)); return done("mailto", true); } catch { /* fall through */ }
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
