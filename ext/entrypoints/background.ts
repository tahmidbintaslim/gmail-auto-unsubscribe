import { createGmail, AuthError } from "../lib/gmail";
import { rankSenders } from "../lib/score";
import { runBatch, type LogEntry } from "../lib/executor";
import type { UnsubMethods } from "../lib/listUnsubscribe";
import { post, appendLog, sweptSenders } from "../utils/runtime";

async function getToken({ refresh }: { refresh: boolean }): Promise<string> {
  if (refresh) {
    const old = await chrome.identity.getAuthToken({ interactive: false }).catch(() => undefined);
    if (old?.token) await chrome.identity.removeCachedAuthToken({ token: old.token });
  }
  const r = await chrome.identity.getAuthToken({ interactive: true });
  if (!r?.token) throw new Error("no token");
  return r.token;
}

const PROGRESS_MS = 250;
const HEARTBEAT_MS = 20_000; // port messages keep the MV3 worker alive (Chrome 114+); stay well under its 30 s idle timeout

export default defineBackground(() => {
  const gmail = createGmail(getToken);
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  let running = false; // one sweep at a time, across windows

  // One long-lived port per scan/run, so work is not bound to a single onMessage event's lifetime.
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== "sweep" || port.sender?.id !== chrome.runtime.id) return port.disconnect();
    let open = true;
    let last = { type: "progress", done: 0, total: 0 };
    const send = (m: object) => { if (open) try { port.postMessage(m); } catch { open = false; } };
    const progress = (done: number, total: number) => { last = { type: "progress", done, total }; send(last); };
    const heartbeat = setInterval(() => send(last), HEARTBEAT_MS);
    port.onDisconnect.addListener(() => { open = false; clearInterval(heartbeat); });
    const fail = (e: unknown, busy = false) =>
      send({ type: "error", error: busy ? "busy" : e instanceof AuthError ? "auth" : "other" });

    port.onMessage.addListener((msg) => {
      if (msg?.type === "scan") {
        let sentAt = 0;
        const onProgress = (done: number, total: number) => {
          if (done === total || Date.now() - sentAt >= PROGRESS_MS) { sentAt = Date.now(); progress(done, total); }
          else last = { type: "progress", done, total };
        };
        Promise.all([gmail.listSubscribedSenders(Date.now(), onProgress), sweptSenders()])
          .then(([l, swept]) => send({
            type: "scanned",
            senders: rankSenders(l, Date.now()).map((s) => (swept.has(s.email.toLowerCase()) ? { ...s, swept: true } : s)),
          }))
          .catch((e) => fail(e))
          .finally(() => clearInterval(heartbeat));
        return;
      }
      if (msg?.type === "run") {
        if (!Array.isArray(msg.items)) return fail(null);
        if (running) return fail(null, true);
        running = true;
        let logErrors = 0;
        const items = msg.items as { sender: string; methods: UnsubMethods }[];
        let done = 0;
        let chain: Promise<void> = Promise.resolve(); // appendLog is read-modify-write: serialize
        const onEntry = (entry: LogEntry) => {
          chain = chain.then(() => appendLog(entry)).catch((e) => { logErrors++; console.error("appendLog failed", e); });
          last = { type: "progress", done: ++done, total: items.length };
          send({ type: "entry", entry });
        };
        const deps = {
          post, now: Date.now, sendRaw: gmail.sendRaw,
          openTab: async (url: string) => { await chrome.tabs.create({ url }); },
        };
        runBatch(items, deps, undefined, onEntry)
          .then(() => chain)
          .then(() => send({ type: "ran", logErrors }))
          .catch((e) => fail(e))
          .finally(() => { running = false; clearInterval(heartbeat); });
      }
    });
  });
});
