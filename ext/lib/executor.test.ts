import { describe, it, expect, vi } from "vitest";
import { unsubscribeOne, runBatch, MAX_PER_RUN, type ExecDeps } from "./executor";

const mk = (o: Partial<ExecDeps> = {}): ExecDeps => ({
  post: vi.fn(async () => {}),
  sendRaw: vi.fn(async () => {}),
  openTab: vi.fn(async () => {}),
  now: () => 1,
  ...o,
});

describe("unsubscribeOne", () => {
  it("one-click success", async () => {
    const d = mk();
    const e = await unsubscribeOne("a", { oneClickUrl: "https://x/u", mailto: "mailto:u@a.co", url: "https://x" }, d);
    expect(e).toMatchObject({ method: "one-click", ok: true });
    expect(d.sendRaw).not.toHaveBeenCalled();
    expect(d.openTab).not.toHaveBeenCalled();
  });
  it("falls back to mailto", async () => {
    const d = mk({ post: vi.fn(async () => { throw new Error("net"); }) });
    const e = await unsubscribeOne("a", { oneClickUrl: "https://x/u", mailto: "mailto:u@a.co?subject=unsub&body=hi%20there" }, d);
    expect(e).toMatchObject({ method: "mailto", ok: true });
    const raw = (d.sendRaw as any).mock.calls[0][0] as string;
    expect(raw).toContain("To: u@a.co\r\n");
    expect(raw).toContain("Subject: unsub\r\n");
    expect(raw.endsWith("\r\n\r\nhi there")).toBe(true);
  });
  it("falls back to website when mailto fails", async () => {
    const d = mk({ sendRaw: vi.fn(async () => { throw new Error("x"); }) });
    const e = await unsubscribeOne("a", { mailto: "mailto:u@a.co", url: "https://x" }, d);
    expect(e).toMatchObject({ method: "website", ok: true });
    expect(d.openTab).toHaveBeenCalledTimes(1);
  });
  it("none", async () => {
    expect(await unsubscribeOne("a", {}, mk())).toMatchObject({ method: "none", ok: false });
  });
});

describe("runBatch", () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => ({ sender: `s${i}`, methods: { url: "https://x" } }));
  it("caps at MAX_PER_RUN", async () => {
    expect(await runBatch(items(300), mk())).toHaveLength(MAX_PER_RUN);
  });
  it("stops on abort", async () => {
    let n = 0;
    const c = new AbortController();
    const out = await runBatch(items(5), mk(), c.signal, () => { if (++n === 2) c.abort(); });
    expect(out).toHaveLength(2);
  });
  it("dedupes senders", async () => {
    const d = mk();
    const out = await runBatch([...items(2), ...items(2)], d);
    expect(out).toHaveLength(2);
    expect(d.openTab).toHaveBeenCalledTimes(2);
  });
});
