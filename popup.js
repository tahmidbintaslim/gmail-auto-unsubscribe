const statusEl = document.getElementById("status");
const allowWebsitesEl = document.getElementById("allowWebsites");

const sendTabMessage = async (message) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab?.url || tab?.pendingUrl || "";
  let isGmail = false;
  try {
    isGmail = new URL(tabUrl).hostname === "mail.google.com";
  } catch {}

  if (!tab || !isGmail) {
    statusEl.textContent = "Open Gmail first.";
    return;
  }
  chrome.tabs.sendMessage(tab.id, message, (res) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = "Refresh your Gmail tab.";
    } else if (res?.status) {
      statusEl.textContent = res.status;
    }
  });
};

document.getElementById("startBtn").addEventListener("click", () => {
  statusEl.textContent = "Running...";
  sendTabMessage({ action: "START", allowWebsites: allowWebsitesEl.checked });
});

document.getElementById("stopBtn").addEventListener("click", () => {
  statusEl.textContent = "Stopped.";
  sendTabMessage({ action: "STOP" });
});
