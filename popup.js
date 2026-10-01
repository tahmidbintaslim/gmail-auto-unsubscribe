const statusEl = document.getElementById("status");

const sendTabMessage = async (message) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes("mail.google.com")) {
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
  const allowWebsites = document.getElementById("allowWebsites").checked;
  statusEl.textContent = "Running...";
  sendTabMessage({ action: "START", allowWebsites });
});

document.getElementById("stopBtn").addEventListener("click", () => {
  statusEl.textContent = "Stopped.";
  sendTabMessage({ action: "STOP" });
});
