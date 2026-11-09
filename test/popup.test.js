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
    expect(status()).toBe("Swept: 2 unsubscribed, 0 skipped.");
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

describe("brand", () => {
  it("popup is branded", () => {
    const doc = win.document;
    expect(doc.querySelector("h1").textContent.trim()).toBe("UnsubSweep");
    expect(doc.getElementById("startBtn").textContent.trim()).toBe("Start sweep");
  });

  // WCAG 2.x relative luminance and contrast ratio.
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const tokens = (css) => Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

  it.each(["light", "dark"])("%s tokens meet 4.5:1 contrast", (theme) => {
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    const darkAt = css.indexOf("prefers-color-scheme: dark");
    expect(darkAt).toBeGreaterThan(-1);
    const t = tokens(theme === "light" ? css.slice(0, darkAt) : css.slice(darkAt));
    for (const [fg, bg] of [["fg", "bg"], ["muted", "bg"], ["accent-fg", "accent"], ["fg", "surface"]]) {
      expect(t[fg] && t[bg], `${theme} ${fg}/${bg} defined`).toBeTruthy();
      expect(contrast(t[fg], t[bg]), `${theme} ${fg}/${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
