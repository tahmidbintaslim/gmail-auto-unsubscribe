const statusEl = document.getElementById("status");
const allowWebsitesEl = document.getElementById("allowWebsites");

// Injected in this order on Start. activeTab grants access to the tab the
// popup was opened on, so the extension needs no install-time host access.
const SCRIPT_FILES = ["content.js"];

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

const sendToTab = async (tabId, message) => {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
};

document.getElementById("startBtn").addEventListener("click", async () => {
  const tab = await getGmailTab();
  if (!tab) {
    statusEl.textContent = "Open Gmail first.";
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: SCRIPT_FILES });
  } catch {
    statusEl.textContent = "Could not run on this tab. Reload Gmail and try again.";
    return;
  }
  statusEl.textContent = "Running...";
  const res = await sendToTab(tab.id, { action: "START", allowWebsites: allowWebsitesEl.checked });
  if (res?.status) statusEl.textContent = res.status;
});

document.getElementById("stopBtn").addEventListener("click", async () => {
  const tab = await getGmailTab();
  if (!tab) {
    statusEl.textContent = "Open Gmail first.";
    return;
  }
  const res = await sendToTab(tab.id, { action: "STOP" });
  statusEl.textContent = res?.status || "Not running.";
});
