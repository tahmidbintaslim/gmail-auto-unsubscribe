import { beforeEach, describe, expect, it } from "vitest";
import { createWindow, loadScript } from "./dom.js";
import { mountGmail as mount } from "./fake-gmail.js";

let win;
let api;
beforeEach(() => {
  win = createWindow();
  loadScript(win, "unsubscriber.js");
  api = win.GmailUnsubscriber;
});

const mountGmail = (options) => mount(win, options);

// One macrotask per wait keeps the tests fast while still letting the
// page's own events (hashchange) fire between steps.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const run = (options = {}) => api.createRun({ sleep: tick, ...options });

const SHOP = "news@shop.example";
const APP = "updates@app.example";
const CLUB = "hello@club.example";
const TRAVEL = "offers@travel.example";
const BLOG = "letters@blog.example";
const ALL = [SHOP, APP, CLUB, TRAVEL, BLOG];

let gmail;

const emailsOf = (entries) => entries.map((entry) => entry.email);

describe("one-click senders", () => {
  it("unsubscribes every sender, bottom row first", async () => {
    gmail = mountGmail();
    const state = await run().done;

    expect(state).toEqual({ phase: "done", unsubscribed: 5, skipped: 0, websites: 0, attempted: 5 });
    expect(gmail.rows()).toEqual([]);
    expect(emailsOf(gmail.clicks("row"))).toEqual([...ALL].reverse());
    expect(gmail.clicks("Unsubscribe")).toHaveLength(5);
    expect(gmail.clicks("Cancel")).toHaveLength(0);
  });

  it("never clicks the Unsubscribe button of a view Gmail keeps hidden", async () => {
    gmail = mountGmail();
    await run().done;
    expect(gmail.clicks("message-view")).toEqual([]);
  });

  it("finds a dialog that has no ARIA role from its Cancel button", async () => {
    gmail = mountGmail({ kinds: { [BLOG]: "no-role" } });
    const state = await run().done;

    expect(state.unsubscribed).toBe(5);
    expect(gmail.clicks("Unsubscribe")[0].email).toBe(BLOG);
  });

  it("finds a sender whose name contains the word cancel", async () => {
    gmail = mountGmail();
    const row = gmail.doc.querySelector('[aria-label="Unsubscribe from Example Shop"]').parentElement;
    row.querySelector(".sender-name").textContent = "Cancel Culture Weekly";
    const state = await run().done;

    expect(state).toEqual({ phase: "done", unsubscribed: 5, skipped: 0, websites: 0, attempted: 5 });
    expect(gmail.rows()).toEqual([]);
  });

  it("reports progress after each sender", async () => {
    gmail = mountGmail();
    const seen = [];
    await run({ onProgress: (state) => seen.push(state) }).done;

    expect(seen[0]).toMatchObject({ phase: "running", unsubscribed: 0 });
    expect(seen.map((state) => state.unsubscribed)).toEqual([0, 1, 2, 3, 4, 5, 5]);
    expect(seen.at(-1).phase).toBe("done");
  });
});

describe("website-only senders", () => {
  it("clicks Cancel, skips the sender and opens each row once", async () => {
    gmail = mountGmail({ kinds: { [CLUB]: "website-only", [TRAVEL]: "website-only" } });
    const state = await run().done;

    expect(state).toEqual({ phase: "done", unsubscribed: 3, skipped: 2, websites: 0, attempted: 5 });
    expect(gmail.rows()).toEqual([CLUB, TRAVEL]);
    expect(emailsOf(gmail.clicks("row")).sort()).toEqual([...ALL].sort());
    expect(emailsOf(gmail.clicks("Cancel"))).toEqual([TRAVEL, CLUB]);
    expect(gmail.clicks("Go to website")).toEqual([]);
    expect(gmail.dialogOpen()).toBe(false);
  });

  it("opens Go to website only when allowed, and no more than the tab cap", async () => {
    gmail = mountGmail({
      kinds: { [APP]: "website-only", [CLUB]: "website-only", [TRAVEL]: "website-only" },
    });
    const state = await run({ allowWebsites: true, limits: { maxWebsiteTabs: 2 } }).done;

    expect(state).toEqual({ phase: "done", unsubscribed: 2, skipped: 1, websites: 2, attempted: 5 });
    expect(emailsOf(gmail.clicks("Go to website"))).toEqual([TRAVEL, CLUB]);
    // The dialog stays open after Go to website, so the run closes it.
    expect(emailsOf(gmail.clicks("Cancel"))).toEqual([TRAVEL, CLUB, APP]);
    expect(gmail.dialogOpen()).toBe(false);
  });

  it("does not reopen senders when Gmail re-renders the list", async () => {
    gmail = mountGmail({ kinds: Object.fromEntries(ALL.map((email) => [email, "website-only"])), rerender: true });
    const state = await run().done;

    expect(state).toEqual({ phase: "done", unsubscribed: 0, skipped: 5, websites: 0, attempted: 5 });
    expect(emailsOf(gmail.clicks("row")).sort()).toEqual([...ALL].sort());
  });

  it("skips a sender whose button opens no dialog", async () => {
    gmail = mountGmail({ kinds: { [BLOG]: "none" } });
    const state = await run().done;

    expect(state).toMatchObject({ phase: "done", unsubscribed: 4, skipped: 1 });
    expect(gmail.rows()).toEqual([BLOG]);
  });
});

describe("empty list", () => {
  it("finishes at once without clicking anything", async () => {
    gmail = mountGmail();
    gmail.emptyList();
    const state = await run().done;

    expect(state).toEqual({ phase: "done", unsubscribed: 0, skipped: 0, websites: 0, attempted: 0 });
    expect(gmail.log).toEqual([]);
  });
});

describe("iteration cap", () => {
  it("stops after maxRows senders and a second run continues from there", async () => {
    gmail = mountGmail();
    const first = run({ limits: { maxRows: 2 } });
    expect(await first.done).toEqual({ phase: "limit", unsubscribed: 2, skipped: 0, websites: 0, attempted: 2 });
    expect(gmail.rows()).toEqual([SHOP, APP, CLUB]);

    const second = await run({ limits: { maxRows: 2 }, seen: first.seen }).done;
    expect(second).toMatchObject({ phase: "limit", unsubscribed: 2 });
    const third = await run({ seen: first.seen }).done;
    expect(third).toMatchObject({ phase: "done", unsubscribed: 1 });
    expect(gmail.rows()).toEqual([]);
  });

  it("ends a run that can never tell rows apart", async () => {
    gmail = mountGmail({
      kinds: Object.fromEntries(ALL.map((email) => [email, "website-only"])),
      churn: true,
    });
    const state = await run({ allowWebsites: true, limits: { maxRows: 12, maxWebsiteTabs: 3 } }).done;

    expect(state).toEqual({ phase: "limit", unsubscribed: 0, skipped: 9, websites: 3, attempted: 12 });
    expect(gmail.clicks("row")).toHaveLength(12);
    expect(gmail.clicks("Go to website")).toHaveLength(3);
  });
});

describe("page scope and stopping", () => {
  it("stops when Gmail leaves the subscriptions view", async () => {
    gmail = mountGmail({
      onConfirm: ({ confirmed, win }) => {
        if (confirmed !== 2) return;
        win.location.hash = "#inbox/FMfcgzExample";
        gmail.showMessageView();
      },
    });
    const state = await run().done;

    expect(state).toMatchObject({ phase: "left-page", unsubscribed: 2 });
    expect(gmail.rows()).toEqual([SHOP, APP, CLUB]);
    expect(gmail.clicks("message-view")).toEqual([]);
  });

  it("stops when Gmail opens a sender's messages under #sub_m", async () => {
    gmail = mountGmail({
      onConfirm: ({ confirmed, win }) => {
        if (confirmed === 1) win.location.hash = "#sub_m/sender-example";
      },
    });
    const state = await run().done;

    expect(state).toMatchObject({ phase: "left-page", unsubscribed: 1, attempted: 1 });
    expect(gmail.rows()).toHaveLength(4);
  });

  it("does not start a pass off the subscriptions view", async () => {
    gmail = mountGmail();
    gmail.win.location.hash = "#inbox";
    const state = await run().done;

    expect(state.phase).toBe("left-page");
    expect(gmail.log).toEqual([]);
  });

  it("stop() ends the run after the current sender", async () => {
    let handle;
    gmail = mountGmail({ onConfirm: () => handle.stop() });
    handle = run();
    const state = await handle.done;

    expect(state).toMatchObject({ phase: "stopped", unsubscribed: 1, attempted: 1 });
    expect(gmail.rows()).toHaveLength(4);
  });

  it("stops when a dialog will not close after Unsubscribe", async () => {
    gmail = mountGmail({ kinds: { [BLOG]: "stuck" } });
    const state = await run({ timing: { waitSteps: 3 } }).done;

    expect(state).toMatchObject({ phase: "dialog-stuck", unsubscribed: 1, attempted: 1 });
    expect(gmail.clicks("Cancel")).toEqual([]);
  });

  it("cancels a dialog it did not open instead of confirming it", async () => {
    gmail = mountGmail();
    gmail.doc.querySelector('[aria-label="Unsubscribe from Example Shop"]').click();
    expect(gmail.dialogOpen()).toBe(true);
    gmail.log.length = 0;

    const state = await run().done;
    expect(gmail.log[0]).toEqual({ click: "Cancel", email: SHOP });
    expect(state).toMatchObject({ phase: "done", unsubscribed: 5 });
  });

  it("cancels a dialog that opens after the run stopped waiting for it", async () => {
    gmail = mountGmail({ kinds: { [BLOG]: "late" } });
    // Gmail shows the dialog only once the run has given up on it and moved on.
    const sleep = async (ms) => {
      await tick();
      if (ms === api.TIMING.settleMs) gmail.openLate();
    };
    const state = await run({ sleep, timing: { waitSteps: 3 } }).done;

    expect(state).toEqual({ phase: "done", unsubscribed: 4, skipped: 1, websites: 0, attempted: 5 });
    expect(gmail.rows()).toEqual([BLOG]);
    expect(emailsOf(gmail.clicks("Cancel"))).toEqual([BLOG]);
    expect(emailsOf(gmail.clicks("Unsubscribe"))).toEqual([TRAVEL, CLUB, APP, SHOP]);
    expect(gmail.dialogOpen()).toBe(false);
  });

  it("never clicks a Cancel button that is not part of a dialog", async () => {
    gmail = mountGmail();
    const stray = gmail.doc.createElement("button");
    stray.textContent = "Cancel";
    let strayClicks = 0;
    stray.addEventListener("click", () => (strayClicks += 1));
    gmail.doc.querySelector('nav[aria-label="Mail"]').append(stray);

    const state = await run({ timing: { waitSteps: 3 } }).done;
    expect(state).toEqual({ phase: "done", unsubscribed: 5, skipped: 0, websites: 0, attempted: 5 });
    expect(strayClicks).toBe(0);
    expect(gmail.rows()).toEqual([]);
  });

  it("keeps its own clicks from following a sender link during the run", async () => {
    let prevented = null;
    gmail = mountGmail({
      onConfirm: ({ confirmed, doc, win }) => {
        if (confirmed !== 1) return;
        const event = new win.MouseEvent("click", { bubbles: true, cancelable: true });
        doc.querySelector('a[href^="#search/from"]').dispatchEvent(event);
        prevented = event.defaultPrevented;
      },
    });
    await run().done;
    expect(prevented).toBe(true);
  });

  it("keeps a new run's link guard when a stopped run winds down", async () => {
    let prevented = null;
    gmail = mountGmail({
      onConfirm: ({ confirmed, doc, win }) => {
        if (confirmed !== 1) return;
        const event = new win.MouseEvent("click", { bubbles: true, cancelable: true });
        doc.querySelector('a[href^="#search/from"]').dispatchEvent(event);
        prevented = event.defaultPrevented;
      },
    });
    const first = run();
    first.stop();
    const second = run();
    expect(await first.done).toMatchObject({ phase: "stopped", unsubscribed: 0 });
    expect(await second.done).toMatchObject({ phase: "done", unsubscribed: 5 });
    expect(prevented).toBe(true);
  });
});

describe("errors", () => {
  it("ends the run with an error state instead of an unhandled rejection", async () => {
    gmail = mountGmail();
    const errors = [];
    win.console.error = (...args) => errors.push(args);
    const state = await run({
      sleep: async () => {
        throw new Error("boom");
      },
    }).done;

    expect(state).toMatchObject({ phase: "error", attempted: 1 });
    expect(errors).toHaveLength(1);
  });
});

describe("isOnSubscriptionsPage", () => {
  it.each([
    ["#sub", true],
    ["#SUB", true],
    ["#sub/", true],
    ["#sub?compose=new", true],
    ["#subscriptions", true],
    ["#sub_m/sender-example", false],
    ["#sub/FMfcgzExample", false],
    ["#subfoo", false],
    ["#inbox", false],
    ["#search/from%3Anews%40shop.example", false],
    ["", false],
  ])("%s -> %s", (hash, expected) => {
    expect(api.isOnSubscriptionsPage({ hash })).toBe(expected);
  });
});

describe("describeState", () => {
  const counts = { unsubscribed: 3, skipped: 1, websites: 0, attempted: 4 };

  it.each([
    [undefined, "Ready"],
    [{ phase: "idle" }, "Ready"],
    [{ phase: "wrong-page" }, "Open Gmail's Manage subscriptions page first."],
    [{ phase: "running", ...counts }, "Running: 3 unsubscribed, 1 skipped."],
    [{ phase: "done", ...counts, websites: 1 }, "Done: 3 unsubscribed, 1 skipped, 1 website opened."],
    [{ phase: "stopped", ...counts }, "Stopped: 3 unsubscribed, 1 skipped."],
    [{ phase: "limit", ...counts }, "Paused after 250 senders: 3 unsubscribed, 1 skipped. Press Start to continue."],
    [{ phase: "left-page", ...counts }, "Stopped because you left the subscriptions page: 3 unsubscribed, 1 skipped."],
    [{ phase: "dialog-stuck", ...counts }, "Stopped because a Gmail dialog did not close: 3 unsubscribed, 1 skipped."],
    [{ phase: "error", ...counts }, "Stopped after an unexpected error: 3 unsubscribed, 1 skipped."],
  ])("%j", (state, text) => {
    expect(api.describeState(state)).toBe(text);
  });
});
