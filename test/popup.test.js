import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWindow, loadScript, readRepoFile } from "./dom.js";

const html = readRepoFile("popup.html");
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
const GMAIL = "https://mail.google.com/mail/u/0/#sub";

let win;
let chrome;
let onMessage;
let tab;
let replies;

// popup.html loads these two scripts in this order.
const openPopup = () => {
  win = createWindow({ body, url: "chrome-extension://test-extension/popup.html" });
  win.chrome = chrome;
  loadScript(win, "unsubscriber.js");
  loadScript(win, "popup.js");
};

beforeEach(() => {
  tab = { id: 7, url: GMAIL };
  replies = { STATUS: null, START: null, STOP: null };
  chrome = {
    tabs: {
      query: vi.fn(async () => [tab]),
      sendMessage: vi.fn(async (_id, message) => {
        const reply = replies[message.action];
        if (!reply) throw new Error("Could not establish connection. Receiving end does not exist.");
        return reply;
      }),
    },
    scripting: { executeScript: vi.fn(async () => []) },
    runtime: { onMessage: { addListener: (listener) => (onMessage = listener) } },
  };
  openPopup();
});

const status = () => win.document.getElementById("status").textContent;
const click = (id) => win.document.getElementById(id).click();
const running = { phase: "running", unsubscribed: 0, skipped: 0, websites: 0, attempted: 0 };

describe("popup.js", () => {
  it("asks for Gmail and injects nothing when Chrome hides the tab URL", async () => {
    tab = { id: 7 };
    click("startBtn");
    await vi.waitFor(() => expect(status()).toBe("Open Gmail first."));
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("asks for Gmail on another site", async () => {
    tab = { id: 7, url: "https://example.com/" };
    click("startBtn");
    await vi.waitFor(() => expect(status()).toBe("Open Gmail first."));
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("on Gmail, injects the loop and the bridge, then sends START", async () => {
    replies.START = { state: running };
    win.document.getElementById("allowWebsites").checked = true;
    click("startBtn");
    await vi.waitFor(() => expect(status()).toBe("Running: 0 unsubscribed, 0 skipped."));
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 7 },
      files: ["unsubscriber.js", "content.js"],
    });
    expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(7, { action: "START", allowWebsites: true });
  });

  it("says so when the tab cannot be scripted", async () => {
    chrome.scripting.executeScript.mockRejectedValueOnce(new Error("Cannot access contents of the page."));
    click("startBtn");
    await vi.waitFor(() => expect(status()).toBe("Could not run on this tab. Reload Gmail and try again."));
  });

  it("shows progress from the Gmail tab only", async () => {
    await vi.waitFor(() => expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { action: "STATUS" }));
    onMessage({ type: "PROGRESS", state: { ...running, phase: "done", unsubscribed: 2 } }, { tab: { id: 8 } });
    expect(status()).toBe("Ready");
    onMessage({ type: "PROGRESS", state: { ...running, phase: "done", unsubscribed: 2 } }, { tab: { id: 7 } });
    expect(status()).toBe("Done: 2 unsubscribed, 0 skipped.");
  });

  it("stops the run on Stop", async () => {
    replies.STOP = { state: { ...running, phase: "stopped", unsubscribed: 4 } };
    click("stopBtn");
    await vi.waitFor(() => expect(status()).toBe("Stopped: 4 unsubscribed, 0 skipped."));
  });
});

describe("popup.js on reopen", () => {
  it("shows the state of a run that kept going while it was closed", async () => {
    replies.STATUS = { state: { ...running, unsubscribed: 6, skipped: 2 } };
    openPopup();
    await vi.waitFor(() => expect(status()).toBe("Running: 6 unsubscribed, 2 skipped."));
  });
});
