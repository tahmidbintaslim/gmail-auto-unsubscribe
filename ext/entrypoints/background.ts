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
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg?.type === "scan") {
      gmail.listSubscribedSenders(Date.now())
        .then((l) => reply(rankSenders(l, Date.now())))
        .catch((e) => reply({ error: e instanceof AuthError ? "auth" : "other" }));
      return true;
    }
    if (msg?.type === "run") {
      const items = msg.items as { sender: string; methods: UnsubMethods }[];
      let chain: Promise<void> = Promise.resolve(); // appendLog is read-modify-write: serialize
      const onEntry = (entry: LogEntry) => {
        chain = chain.then(() => appendLog(entry)).catch(() => {});
        chrome.runtime.sendMessage({ type: "entry", entry }).catch(() => {});
      };
      const deps = {
        post, now: Date.now, sendRaw: gmail.sendRaw,
        openTab: async (url: string) => { await chrome.tabs.create({ url }); },
      };
      runBatch(items, deps, undefined, onEntry)
        .then(() => chain)
        .then(() => reply({ ok: true }))
        .catch((e) => reply({ error: e instanceof AuthError ? "auth" : "other" }));
      return true;
    }
  });
});
