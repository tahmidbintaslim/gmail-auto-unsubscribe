import { useState } from "preact/hooks";
import { AuthError } from "../../lib/gmail";
import type { Scored } from "../../lib/score";
import type { LogEntry } from "../../lib/executor";

export type AppProps = {
  scan: () => Promise<Scored[]>;
  run: (items: Scored[], onEntry: (e: LogEntry) => void) => Promise<void>;
};
type View =
  | { s: "signed-out" }
  | { s: "scanning" }
  | { s: "review"; list: Scored[] }
  | { s: "running" }
  | { s: "done" }
  | { s: "error"; auth: boolean };

const method = (m: Scored["methods"]) => (m.oneClickUrl ? "One-click" : m.mailto ? "Email" : m.url ? "Website" : "None");

export function App({ scan, run }: AppProps) {
  const [view, setView] = useState<View>({ s: "signed-out" });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [swept, setSwept] = useState(0);

  async function doScan() {
    setView({ s: "scanning" });
    try {
      const list = await scan();
      setChecked(new Set(list.filter((x) => x.recommend).map((x) => x.email)));
      setView({ s: "review", list });
    } catch (e) {
      setView({ s: "error", auth: e instanceof AuthError });
    }
  }

  async function doRun(list: Scored[]) {
    const picked = list.filter((x) => checked.has(x.email));
    const n = picked.length;
    if (!confirm(`Unsubscribe from ${n} sender${n === 1 ? "" : "s"}? This can't be undone.`)) return;
    setSwept(0);
    setView({ s: "running" });
    try {
      await run(picked, () => setSwept((c) => c + 1));
      setView({ s: "done" });
    } catch (e) {
      setView({ s: "error", auth: e instanceof AuthError });
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
      return <main><p role="status">Scanning your last 90 days of mail…</p></main>;
    case "review": {
      const n = checked.size;
      return (
        <main>
          <h1>Review senders</h1>
          <ul>
            {view.list.map((x) => (
              <li key={x.email}>
                <label>
                  <input type="checkbox" aria-label={x.name} checked={checked.has(x.email)} onChange={() => toggle(x.email)} />
                  <span class="who"><strong>{x.name}</strong> <span class="muted">{x.domain}</span></span>
                  <span class="badge">{method(x.methods)}</span>
                </label>
                <div class="muted">{x.reasons.join(" · ")}</div>
              </li>
            ))}
          </ul>
          <button class="primary" disabled={n === 0} onClick={() => doRun(view.list)}>
            Unsubscribe from {n} sender{n === 1 ? "" : "s"}
          </button>
        </main>
      );
    }
    case "running":
      return <main><p role="status">Swept: {swept}</p></main>;
    case "done":
      return <main><p role="status">Done. Swept: {swept}</p></main>;
    case "error":
      return (
        <main>
          <p role="alert">{view.auth ? "Gmail sign-in failed or expired." : "Something went wrong."}</p>
          <button class="primary" onClick={doScan}>{view.auth ? "Sign in again" : "Try again"}</button>
        </main>
      );
  }
}
