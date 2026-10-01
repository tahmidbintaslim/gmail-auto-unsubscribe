let isRunning = false;
let activeRunId = 0;
let navGuardUsers = 0;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const isVisible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && window.getComputedStyle(el).visibility !== "hidden";
};

const triggerClick = (el) => {
  if (!el) return;
  el.focus();
  const opts = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.click();
};

const isOnSubscriptionsPage = () => {
  const hash = window.location.hash.toLowerCase();
  return hash.startsWith("#sub");
};

const isUnsubscribeControl = (el) => {
  if (!el || !isVisible(el)) return false;
  const txt = el.textContent?.trim().toLowerCase() || "";
  const aria = el.getAttribute("aria-label")?.trim().toLowerCase() || "";
  return txt === "unsubscribe" || aria === "unsubscribe" || aria.startsWith("unsubscribe ");
};

const isWebsiteControl = (el) => {
  if (!el || !isVisible(el)) return false;
  const txt = el.textContent?.trim().toLowerCase() || "";
  const aria = el.getAttribute("aria-label")?.trim().toLowerCase() || "";
  return txt === "go to website" || aria === "go to website" || aria.startsWith("go to website ");
};

const isModalActionControl = (el, allowWebsites) => {
  return isUnsubscribeControl(el) || (allowWebsites && isWebsiteControl(el));
};

const getModalConfirmBtn = (allowWebsites) => {
  const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
  const cancelBtn = allButtons.find(
    (b) => b.textContent?.trim().toLowerCase() === "cancel" && isVisible(b)
  );

  if (!cancelBtn) return null;

  const dialog =
    cancelBtn.closest('[role="dialog"], [role="alertdialog"], .Kj-JD, [aria-modal="true"]') ||
    cancelBtn.parentElement?.parentElement?.parentElement ||
    cancelBtn.parentElement?.parentElement;

  if (!dialog) return null;

  const actionBtn = Array.from(
    dialog.querySelectorAll('button, [role="button"], a')
  ).find((b) => b !== cancelBtn && isModalActionControl(b, allowWebsites));

  return actionBtn || null;
};

const getListButtons = () => {
  return Array.from(document.querySelectorAll('button, [role="button"]')).filter((b) => {
    if (!isUnsubscribeControl(b)) return false;
    if (b.closest('[role="dialog"], [role="alertdialog"], .Kj-JD, [aria-modal="true"]')) return false;
    if (b.parentElement?.textContent?.toLowerCase().includes("cancel")) return false;
    return true;
  });
};

const blockRowNav = (e) => {
  const link = e.target.closest("a");
  if (link && (link.href.includes("sub_m") || link.href.includes("search/from"))) {
    e.preventDefault();
    e.stopPropagation();
  }
};

const canRun = (runId) => isRunning && runId === activeRunId;

const acquireNavGuard = () => {
  if (navGuardUsers === 0) {
    document.addEventListener("click", blockRowNav, { capture: true });
  }
  navGuardUsers += 1;
};

const releaseNavGuard = () => {
  navGuardUsers = Math.max(0, navGuardUsers - 1);
  if (navGuardUsers === 0) {
    document.removeEventListener("click", blockRowNav, { capture: true });
  }
};

const runUnsubscriber = async (runId, allowWebsites) => {
  acquireNavGuard();
  console.log("Bulk Unsubscribe started.");

  try {
    while (canRun(runId)) {
      const confirmBtn = getModalConfirmBtn(allowWebsites);

      if (confirmBtn) {
        if (!canRun(runId)) break;
        triggerClick(confirmBtn);
        for (let i = 0; i < 30; i++) {
          await sleep(100);
          if (!canRun(runId) || !getModalConfirmBtn(allowWebsites)) break;
        }
        await sleep(900);
        continue;
      }

      const listButtons = getListButtons();
      if (listButtons.length === 0) {
        console.log("All subscriptions processed.");
        break;
      }

      const targetBtn = listButtons[listButtons.length - 1];
      targetBtn.scrollIntoView({ block: "center", behavior: "smooth" });
      await sleep(350);
      if (!canRun(runId)) break;

      triggerClick(targetBtn);

      for (let i = 0; i < 30; i++) {
        await sleep(100);
        if (!canRun(runId) || getModalConfirmBtn(allowWebsites)) break;
      }
    }
  } finally {
    releaseNavGuard();
    if (runId === activeRunId) {
      isRunning = false;
    }
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "START") {
    if (!isOnSubscriptionsPage()) {
      sendResponse({ status: "Open Gmail subscriptions page (#sub)." });
      return;
    }
    if (!isRunning) {
      const runId = activeRunId + 1;
      const allowWebsites = Boolean(req.allowWebsites);
      activeRunId = runId;
      isRunning = true;
      runUnsubscriber(runId, allowWebsites);
      sendResponse({ status: "Processing..." });
    } else {
      sendResponse({ status: "Already running." });
    }
  } else if (req.action === "STOP") {
    isRunning = false;
    activeRunId += 1;
    sendResponse({ status: "Stopped." });
  }
});
