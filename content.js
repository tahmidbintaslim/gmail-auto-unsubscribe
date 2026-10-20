// Message bridge between the popup and the loop in unsubscriber.js.
//
// popup.js injects unsubscriber.js and then this file on every Start. The
// flag keeps a second injection from adding a second message listener.
(() => {
  if (globalThis.__gmailAutoUnsubscribeLoaded) return;
  globalThis.__gmailAutoUnsubscribeLoaded = true;

  const { createRun, idleState, isOnSubscriptionsPage } = globalThis.GmailUnsubscriber;

  let run = null;
  let lastState = idleState();
  let orphaned = false;

  // Sends progress to the popup while it is open. With the popup closed
  // nothing listens and the message is dropped. After the extension is
  // reloaded or removed this script is orphaned, so the run stops.
  const publish = (state) => {
    lastState = state;
    if (orphaned) return;
    try {
      if (chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: "PROGRESS", state }).catch(() => {});
        return;
      }
    } catch {
      // Extension context invalidated.
    }
    orphaned = true;
    run?.stop();
  };

  const start = (allowWebsites) => {
    if (lastState.phase === "running") return lastState;
    if (!isOnSubscriptionsPage(location)) return { ...idleState(), phase: "wrong-page" };
    // A run that hit the row limit is continued, so Start moves on to the
    // senders it has not opened yet. Any other end starts a fresh pass.
    const seen = lastState.phase === "limit" && run ? run.seen : undefined;
    run = createRun({ allowWebsites, onProgress: publish, seen });
    return lastState;
  };

  chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req?.action === "START") {
      sendResponse({ state: start(Boolean(req.allowWebsites)) });
    } else if (req?.action === "STOP") {
      run?.stop();
      sendResponse({ state: lastState });
    } else if (req?.action === "STATUS") {
      sendResponse({ state: lastState });
    }
  });
})();
