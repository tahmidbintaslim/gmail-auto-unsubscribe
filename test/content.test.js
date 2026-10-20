import { beforeAll, describe, expect, it, vi } from "vitest";
import { createWindow, loadScript } from "./dom.js";
import { mountGmail } from "./fake-gmail.js";

const listeners = [];
const progress = [];
let win;

beforeAll(() => {
  win = createWindow();
  win.chrome = {
    runtime: {
      id: "test-extension",
      sendMessage: vi.fn(async (message) => {
        progress.push(message);
      }),
      onMessage: { addListener: (listener) => listeners.push(listener) },
    },
  };
  // popup.js injects both files on every Start.
  for (let i = 0; i < 2; i += 1) {
    loadScript(win, "unsubscriber.js");
    loadScript(win, "content.js");
  }
});

const ask = (request) => new Promise((resolve) => listeners[0](request, {}, resolve));

describe("content.js", () => {
  it("adds one message listener however often it is injected", () => {
    expect(listeners).toHaveLength(1);
  });

  it("refuses to start off the subscriptions view", async () => {
    const gmail = mountGmail(win);
    gmail.win.location.hash = "#inbox";
    const { state } = await ask({ action: "START" });
    expect(state.phase).toBe("wrong-page");
    expect(gmail.log).toEqual([]);
    gmail.unmount();
  });

  it("answers START, STATUS and STOP with the run state", async () => {
    const gmail = mountGmail(win);
    const started = await ask({ action: "START", allowWebsites: false });
    expect(started.state).toMatchObject({ phase: "running", unsubscribed: 0 });

    const again = await ask({ action: "START" });
    expect(again.state.phase).toBe("running");

    const stopped = await ask({ action: "STOP" });
    expect(stopped.state.phase).toBe("stopped");
    expect((await ask({ action: "STATUS" })).state.phase).toBe("stopped");
    expect(progress.at(-1)).toEqual({ type: "PROGRESS", state: stopped.state });
    gmail.unmount();
  });

  it("reports done on an empty list", async () => {
    const gmail = mountGmail(win);
    gmail.emptyList();
    const { state } = await ask({ action: "START" });
    expect(state).toMatchObject({ phase: "done", attempted: 0 });
    gmail.unmount();
  });

  it("stops the run when the extension is reloaded or removed", async () => {
    const gmail = mountGmail(win);
    await ask({ action: "START" });
    delete win.chrome.runtime.id;
    await vi.waitFor(async () => expect((await ask({ action: "STATUS" })).state.phase).toBe("stopped"), {
      timeout: 5000,
    });
    expect(gmail.rows().length).toBeGreaterThanOrEqual(4);
    gmail.unmount();
  });
});
