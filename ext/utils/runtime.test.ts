import { describe, it, expect, beforeEach } from "vitest";
import { appendLog, sweptSenders } from "./runtime";

let store: Record<string, unknown>;
beforeEach(() => {
  store = {};
  (globalThis as any).chrome = {
    storage: { local: {
      get: async (k: string) => ({ [k]: store[k] }),
      set: async (o: Record<string, unknown>) => { Object.assign(store, o); },
    } },
  };
});

describe("appendLog", () => {
  it("keeps only the newest 5000", async () => {
    store.log = Array.from({ length: 5000 }, (_, i) => ({ sender: `s${i}`, method: "none", at: i, ok: false }));
    await appendLog({ sender: "new", method: "website", at: 9999, ok: true });
    const log = store.log as { sender: string }[];
    expect(log).toHaveLength(5000);
    expect(log[0]!.sender).toBe("s1");
    expect(log[4999]!.sender).toBe("new");
  });
  it("starts a log when empty", async () => {
    await appendLog({ sender: "a", method: "none", at: 1, ok: false });
    expect(store.log).toHaveLength(1);
  });
});

describe("sweptSenders", () => {
  it("returns lower-cased senders with any ok:true entry", async () => {
    store.log = [
      { sender: "A@x.co", method: "one-click", at: 1, ok: true },
      { sender: "b@x.co", method: "none", at: 2, ok: false },
      { sender: "c@x.co", method: "none", at: 3, ok: false },
      { sender: "c@x.co", method: "website", at: 4, ok: true },
    ];
    expect([...(await sweptSenders())].sort()).toEqual(["a@x.co", "c@x.co"]);
  });
  it("is empty without a log", async () => {
    expect((await sweptSenders()).size).toBe(0);
  });
});
