// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { App, BusyError, type AppProps } from "./App";
import { AuthError } from "../../lib/gmail";
import type { Scored } from "../../lib/score";
import type { LogEntry } from "../../lib/executor";

const sender = (name: string, recommend: boolean): Scored => ({
  email: `${name}@x.co`, name, domain: "x.co", messages90d: 5, unread: 4, lastOpenedAt: null, lastSeenAt: 1,
  replied: false, methods: { oneClickUrl: "https://x.co/u" }, score: recommend ? 80 : 10, recommend, reasons: ["Never opened"],
});
const three = [sender("Alpha", true), sender("Beta", true), sender("Gamma", false)];

let root: HTMLElement;
async function mount(props: Parameters<typeof App>[0]) {
  root = document.createElement("div");
  document.body.append(root);
  await act(() => render(<App {...props} />, root));
}
const click = (el: Element) => act(async () => { (el as HTMLElement).click(); await Promise.resolve(); });
const btn = (text: RegExp) => [...root.querySelectorAll("button")].find((b) => text.test(b.textContent ?? ""))!;
const boxes = () => [...root.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
async function toReview(run: AppProps["run"] = vi.fn(async () => {})) {
  await mount({ scan: async () => three, run });
  await click(btn(/Connect Gmail/));
  return run;
}
afterEach(() => { root?.remove(); vi.unstubAllGlobals(); });

describe("App", () => {
  it("signed-out shows connect button and privacy line", async () => {
    await mount({ scan: async () => three, run: async () => {} });
    expect(btn(/Connect Gmail/)).toBeTruthy();
    expect(root.textContent).toContain("Your email stays in this browser.");
  });
  it("pre-checks recommended senders and counts them", async () => {
    await toReview();
    expect(boxes().filter((b) => b.checked)).toHaveLength(2);
    expect(btn(/Unsubscribe from/).textContent).toBe("Unsubscribe from 2 senders");
    expect(root.textContent).toContain("Never opened");
    expect(root.textContent).toContain("One-click");
  });
  it("disables the button when nothing is checked", async () => {
    await toReview();
    for (const b of boxes().filter((b) => b.checked)) await click(b);
    expect((btn(/Unsubscribe from/) as HTMLButtonElement).disabled).toBe(true);
  });
  it("Cancel in the confirm view does not run", async () => {
    const run = vi.fn(async () => {});
    await toReview(run);
    await click(btn(/Unsubscribe from/));
    expect(root.textContent).toContain("Unsubscribe from 2 senders? This can't be undone.");
    expect(document.activeElement?.closest("[data-confirm]")).toBeTruthy();
    await click(btn(/^Cancel$/));
    expect(run).not.toHaveBeenCalled();
    expect(btn(/Unsubscribe from 2 senders/)).toBeTruthy();
  });
  it("caps at 250 and says so", async () => {
    const many = Array.from({ length: 260 }, (_, i) => sender(`S${i}`, true));
    const run = vi.fn(async (_i: Scored[], _o: (e: LogEntry) => void) => {});
    await mount({ scan: async () => many, run });
    await click(btn(/Connect Gmail/));
    expect(btn(/Unsubscribe from/).textContent).toBe("Unsubscribe from 250 senders");
    await click(btn(/Unsubscribe from/));
    expect(root.textContent).toContain("Unsubscribe from the first 250 of 260 senders? This can't be undone.");
    await click(btn(/^Unsubscribe$/));
    expect(run.mock.calls[0]![0]).toHaveLength(250);
  });
  it("shows busy message when another window is sweeping", async () => {
    const run = vi.fn(async () => { throw new BusyError(); });
    await toReview(run);
    await click(btn(/Unsubscribe from/));
    await click(btn(/^Unsubscribe$/));
    expect(root.textContent).toContain("A sweep is already running in another window.");
  });
  it("runs checked senders, shows Swept counter, then done", async () => {
    let emit!: (e: LogEntry) => void;
    let finish!: () => void;
    const run = vi.fn((items: Scored[], onEntry: (e: LogEntry) => void) => {
      emit = onEntry;
      return new Promise<void>((r) => (finish = r));
    });
    await toReview(run);
    await click(btn(/Unsubscribe from/));
    await click(btn(/^Unsubscribe$/));
    expect(run.mock.calls[0]![0].map((s) => s.name)).toEqual(["Alpha", "Beta"]);
    const e = (sender: string): LogEntry => ({ sender, method: "one-click", at: 1, ok: true });
    await act(() => { emit(e("a")); emit(e("b")); });
    expect(root.textContent).toContain("Swept: 2");
    await act(async () => { finish(); await Promise.resolve(); });
    expect(root.textContent).toContain("Done");
  });
  it("shows Sign in again on AuthError", async () => {
    await mount({ scan: async () => { throw new AuthError("x"); }, run: async () => {} });
    await click(btn(/Connect Gmail/));
    expect(btn(/Sign in again/)).toBeTruthy();
  });
  it("gives every checkbox the sender name as accessible name", async () => {
    await toReview();
    expect(boxes().map((b) => b.getAttribute("aria-label"))).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});
