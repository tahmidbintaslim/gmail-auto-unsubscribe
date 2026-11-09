const statusEl = document.getElementById("status");
const allowWebsitesEl = document.getElementById("allowWebsites");
const startBtn = document.getElementById("startBtn");
const { describeState } = globalThis.GmailUnsubscriber;

// Injected in this order on Start. Opening the popup grants activeTab for
// the tab it was opened on, so the extension needs no install-time host
// access and never runs on a tab the user did not pick.
const SCRIPT_FILES = ["unsubscriber.js", "content.js"];

const isGmailUrl = (url) => {
  try {
    return new URL(url).hostname === "mail.google.com";
  } catch {
    return false;
  }
};

// tab.url is only visible because opening the popup grants activeTab.
const getGmailTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab && isGmailUrl(tab.url) ? tab : null;
};

// Resolves to null when nothing in the tab answers (not injected yet).
const sendToTab = async (tabId, message) => {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
};

let gmailTabId = null;

const show = (state) => {
  statusEl.textContent = describeState(state);
  // A second Start during a run would do nothing useful; make that visible.
  startBtn.disabled = state?.phase === "running";
};

// A run keeps going after the popup closes. Reopening it shows the counts.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "PROGRESS" && sender.tab?.id === gmailTabId) show(msg.state);
});

const init = async () => {
  const tab = await getGmailTab();
  if (!tab) return;
  gmailTabId = tab.id;
  const res = await sendToTab(tab.id, { action: "STATUS" });
  if (res?.state && res.state.phase !== "idle") show(res.state);
};

startBtn.addEventListener("click", async () => {
  const tab = await getGmailTab();
  if (!tab) {
    statusEl.textContent = "Open Gmail first.";
    return;
  }
  gmailTabId = tab.id;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: SCRIPT_FILES });
  } catch {
    statusEl.textContent = "Could not run on this tab. Reload Gmail and try again.";
    return;
  }
  statusEl.textContent = "Starting...";
  const res = await sendToTab(tab.id, { action: "START", allowWebsites: allowWebsitesEl.checked });
  if (res?.state) show(res.state);
  else statusEl.textContent = "Reload Gmail and try again.";
});

document.getElementById("stopBtn").addEventListener("click", async () => {
  const tab = await getGmailTab();
  if (!tab) {
    statusEl.textContent = "Open Gmail first.";
    return;
  }
  const res = await sendToTab(tab.id, { action: "STOP" });
  if (res?.state) show(res.state);
  else statusEl.textContent = "Not running.";
});

init();
