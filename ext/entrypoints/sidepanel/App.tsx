import { useEffect, useRef, useState } from "preact/hooks";
import { AuthError } from "../../lib/gmail";
import type { Scored } from "../../lib/score";
import { MAX_PER_RUN, type LogEntry } from "../../lib/executor";

export class BusyError extends Error {}

// swept: the background found an ok:true log entry for this sender from an earlier run
export type Row = Scored & { swept?: boolean };
export type AppProps = {
  scan: (onProgress?: (done: number, total: number) => void) => Promise<Row[]>;
  run: (items: Row[], onEntry: (e: LogEntry) => void) => Promise<{ logErrors: number; stopped?: boolean } | void>;
  stop: () => void;
};
type View =
  | { s: "signed-out" }
  | { s: "scanning"; done?: number; total?: number }
  | { s: "review"; list: Row[] }
  | { s: "confirm"; list: Row[] }
  | { s: "running" }
  | { s: "done"; logErrors: number; stopped: boolean }
  | { s: "error"; auth: boolean; busy?: boolean };

const websiteOnly = (m: Scored["methods"]) => !m.oneClickUrl && !m.mailto && !!m.url;
const method = (m: Scored["methods"]) => (m.oneClickUrl ? "One-click" : m.mailto ? "Email" : m.url ? "Website" : "None");

export function App({ scan, run, stop }: AppProps) {
  const [view, setView] = useState<View>({ s: "signed-out" });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [swept, setSwept] = useState(0);
  const [website, setWebsite] = useState(0); // ok website entries: the user still has to finish on the site

  async function doScan() {
    setView({ s: "scanning" });
    try {
      const list = await scan((done, total) =>
        setView((v) => (v.s === "scanning" ? { s: "scanning", done, total } : v)));
      setChecked(new Set(list.filter((x) => x.recommend && !x.swept).map((x) => x.email)));
      setView({ s: "review", list });
    } catch (e) {
      setView({ s: "error", auth: e instanceof AuthError });
    }
  }

  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (view.s === "confirm") confirmRef.current?.focus(); }, [view.s]);

  const pick = (list: Row[]) => list.filter((x) => checked.has(x.email)).slice(0, MAX_PER_RUN);

  async function doRun(list: Row[]) {
    setSwept(0);
    setWebsite(0);
    setView({ s: "running" });
    try {
      const r = await run(pick(list), (e) => {
        if (!e.ok) return;
        if (e.method === "website") setWebsite((c) => c + 1);
        else if (e.method === "one-click" || e.method === "mailto") setSwept((c) => c + 1);
      });
      setView({ s: "done", logErrors: r?.logErrors ?? 0, stopped: !!r?.stopped });
    } catch (e) {
      setView({ s: "error", auth: e instanceof AuthError, busy: e instanceof BusyError });
    }
  }

  const toggle = (email: string) =>
    setChecked((c) => {
      const n = new Set(c);
      n.has(email) ? n.delete(email) : n.add(email);
      return n;
    });

  switch (view.s) {
    case "signed-out":
      return (
        <main>
          <h1>UnsubSweep</h1>
          <button class="primary" onClick={doScan}>Connect Gmail</button>
          <p class="muted">Your email stays in this browser.</p>
        </main>
      );
    case "scanning":
      return (
        <main>
          <p role="status">
            {view.total == null ? "Scanning your last 90 days of mail…" : `Scanning… ${view.done} of ${view.total} messages`}
          </p>
        </main>
      );
    case "review": {
      const n = Math.min(checked.size, MAX_PER_RUN);
      return (
        <main>
          <h1>Review senders</h1>
          <ul>
            {view.list.map((x) => (
              <li key={x.email}>
                <label>
                  <input type="checkbox" aria-label={x.name} checked={checked.has(x.email)} onChange={() => toggle(x.email)} />
                  <span class="who"><strong>{x.name}</strong> <span class="muted">{x.domain}</span></span>
                  {x.swept && <span class="badge">Swept before</span>}
                  <span class="badge">{method(x.methods)}</span>
                </label>
                <div class="muted">{x.reasons.join(" · ")}</div>
              </li>
            ))}
          </ul>
          <button class="primary" disabled={n === 0} onClick={() => setView({ s: "confirm", list: view.list })}>
            Unsubscribe from {n} sender{n === 1 ? "" : "s"}
          </button>
        </main>
      );
    }
    case "confirm": {
      const total = checked.size;
      const n = Math.min(total, MAX_PER_RUN);
      const s = n === 1 ? "" : "s";
      const text = total > n
        ? `Unsubscribe from the first ${n} of ${total} senders? This can't be undone.`
        : `Unsubscribe from ${n} sender${s}? This can't be undone.`;
      const withUrl = pick(view.list).filter((x) => x.methods.url);
      const k = withUrl.length;
      const tabs = k === 1 ? "1 tab" : `${k} tabs`;
      const tabText = withUrl.every((x) => websiteOnly(x.methods))
        ? `${k} of them only offer a website link, so ${k === 1 ? "1 tab will" : `${k} tabs will`} open for you to finish.`
        : `Up to ${tabs} may open if a sender's other methods fail.`;
      return (
        <div data-confirm ref={confirmRef} tabIndex={-1} role="alertdialog" aria-label="Confirm unsubscribe" style="padding:14px">
          <p>{text}</p>
          {k > 0 && <p>{tabText}</p>}
          <button class="primary" onClick={() => doRun(view.list)}>Unsubscribe</button>
          <button onClick={() => setView({ s: "review", list: view.list })}>Cancel</button>
        </div>
      );
    }
    case "running":
      return (
        <main>
          <p role="status">Swept: {swept}</p>
          <button onClick={stop}>Stop</button>
        </main>
      );
    case "done":
      return (
        <main>
          <p role="status">{view.stopped ? "Stopped" : "Done"}. Swept: {swept}</p>
          {website > 0 && <p>{website} still need you to finish on their website.</p>}
          {view.logErrors > 0 && <p role="alert">{view.logErrors} log entries could not be saved.</p>}
        </main>
      );
    case "error":
      return (
        <main>
          <p role="alert">{view.busy ? "A sweep is already running in another window." : view.auth ? "Gmail sign-in failed or expired." : "Something went wrong."}</p>
          <button class="primary" onClick={doScan}>{view.auth ? "Sign in again" : "Try again"}</button>
        </main>
      );
  }
}
