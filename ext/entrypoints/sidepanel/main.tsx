import { render } from "preact";
import { App, BusyError, type Row } from "./App";
import { AuthError } from "../../lib/gmail";
import type { LogEntry } from "../../lib/executor";
import "./style.css";

type BgMsg =
  | { type: "progress"; done: number; total: number }
  | { type: "entry"; entry: LogEntry }
  | { type: "scanned"; senders: Row[] }
  | { type: "ran"; logErrors: number; stopped: boolean }
  | { type: "error"; error: "auth" | "busy" | "other" };

// One port per operation; resolves on the final message, rejects on error or a dropped worker.
let runPort: chrome.runtime.Port | undefined;

function call<T extends BgMsg["type"]>(msg: object, final: T, onMsg: (m: BgMsg) => void, onPort?: (p: chrome.runtime.Port) => void) {
  return new Promise<Extract<BgMsg, { type: T }>>((resolve, reject) => {
    const port = chrome.runtime.connect({ name: "sweep" });
    onPort?.(port);
    port.onMessage.addListener((m: BgMsg) => {
      if (m.type === final) { resolve(m as Extract<BgMsg, { type: T }>); port.disconnect(); }
      else if (m.type === "error") {
        reject(m.error === "auth" ? new AuthError("auth") : m.error === "busy" ? new BusyError() : new Error("failed"));
        port.disconnect();
      } else onMsg(m);
    });
    port.onDisconnect.addListener(() => reject(new Error("background disconnected")));
    port.postMessage(msg);
  });
}

async function scan(onProgress?: (done: number, total: number) => void): Promise<Row[]> {
  const r = await call({ type: "scan" }, "scanned", (m) => { if (m.type === "progress") onProgress?.(m.done, m.total); });
  return r.senders;
}

async function run(items: Row[], onEntry: (e: LogEntry) => void) {
  const r = await call({ type: "run", items: items.map((s) => ({ sender: s.email, methods: s.methods })) }, "ran",
    (m) => { if (m.type === "entry") onEntry(m.entry); }, (p) => { runPort = p; });
  return { logErrors: r.logErrors, stopped: r.stopped };
}

const stop = () => runPort?.postMessage({ type: "stop" });

render(<App scan={scan} run={run} stop={stop} />, document.getElementById("app")!);
