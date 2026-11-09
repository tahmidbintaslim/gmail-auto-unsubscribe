import { render } from "preact";
import { App, BusyError } from "./App";
import { AuthError } from "../../lib/gmail";
import type { Scored } from "../../lib/score";
import type { LogEntry } from "../../lib/executor";
import "./style.css";

async function scan(): Promise<Scored[]> {
  const r = await chrome.runtime.sendMessage({ type: "scan" });
  if (r && !Array.isArray(r) && r.error === "auth") throw new AuthError("auth");
  if (!Array.isArray(r)) throw new Error("scan failed");
  return r;
}

async function run(items: Scored[], onEntry: (e: LogEntry) => void): Promise<void> {
  const listener = (m: { type?: string; entry?: LogEntry }) => {
    if (m?.type === "entry" && m.entry) onEntry(m.entry);
  };
  chrome.runtime.onMessage.addListener(listener);
  try {
    const r = await chrome.runtime.sendMessage({ type: "run", items: items.map((s) => ({ sender: s.email, methods: s.methods })) });
    if (r?.error === "busy") throw new BusyError();
    if (r?.error) throw r.error === "auth" ? new AuthError("auth") : new Error("run failed");
  } finally {
    chrome.runtime.onMessage.removeListener(listener);
  }
}

render(<App scan={scan} run={run} />, document.getElementById("app")!);
