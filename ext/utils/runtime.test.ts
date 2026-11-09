import { describe, it, expect, beforeEach } from "vitest";
import { appendLog } from "./runtime";

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
    expect(log[0].sender).toBe("s1");
    expect(log[4999].sender).toBe("new");
  });
  it("starts a log when empty", async () => {
    await appendLog({ sender: "a", method: "none", at: 1, ok: false });
    expect(store.log).toHaveLength(1);
  });
});
