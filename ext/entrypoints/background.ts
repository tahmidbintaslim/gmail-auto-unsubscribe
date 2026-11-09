import { createGmail, AuthError } from "../lib/gmail";
import { rankSenders } from "../lib/score";
import { runBatch, type LogEntry } from "../lib/executor";
import type { UnsubMethods } from "../lib/listUnsubscribe";
import { post, appendLog } from "../utils/runtime";

async function getToken({ refresh }: { refresh: boolean }): Promise<string> {
  if (refresh) {
    const old = await chrome.identity.getAuthToken({ interactive: false }).catch(() => undefined);
    if (old?.token) await chrome.identity.removeCachedAuthToken({ token: old.token });
  }
  const r = await chrome.identity.getAuthToken({ interactive: true });
  if (!r?.token) throw new Error("no token");
  return r.token;
}

export default defineBackground(() => {
  const gmail = createGmail(getToken);
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  let running = false; // one sweep at a time, across windows

  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    if (sender.id !== chrome.runtime.id) return;
    if (msg?.type === "scan") {
      gmail.listSubscribedSenders(Date.now())
        .then((l) => reply(rankSenders(l, Date.now())))
        .catch((e) => reply({ error: e instanceof AuthError ? "auth" : "other" }));
      return true;
    }
    if (msg?.type === "run" && Array.isArray(msg.items)) {
      if (running) { reply({ error: "busy" }); return; }
      running = true;
      let logErrors = 0;
      const items = msg.items as { sender: string; methods: UnsubMethods }[];
      let chain: Promise<void> = Promise.resolve(); // appendLog is read-modify-write: serialize
      const onEntry = (entry: LogEntry) => {
        chain = chain.then(() => appendLog(entry)).catch((e) => { logErrors++; console.error("appendLog failed", e); });
        chrome.runtime.sendMessage({ type: "entry", entry }).catch(() => {});
      };
      const deps = {
        post, now: Date.now, sendRaw: gmail.sendRaw,
        openTab: async (url: string) => { await chrome.tabs.create({ url }); },
      };
      runBatch(items, deps, undefined, onEntry)
        .then(() => chain)
        .then(() => reply({ ok: true, logErrors }))
        .catch((e) => reply({ error: e instanceof AuthError ? "auth" : "other", logErrors }))
        .finally(() => { running = false; });
      return true;
    }
  });
});
