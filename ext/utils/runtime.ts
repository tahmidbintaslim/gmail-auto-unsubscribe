import type { LogEntry } from "../lib/executor";

const LOG_CAP = 5000;

// no-cors POST: resolves (opaque) on any HTTP response, rejects only on network error.
export async function post(url: string): Promise<void> {
  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "List-Unsubscribe=One-Click",
  });
}

export async function appendLog(entry: LogEntry): Promise<void> {
  const { log } = await chrome.storage.local.get("log");
  const next = [...((log as LogEntry[] | undefined) ?? []), entry].slice(-LOG_CAP);
  await chrome.storage.local.set({ log: next });
}
