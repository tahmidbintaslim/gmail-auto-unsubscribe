let isRunning = false;

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

const getModalConfirmBtn = () => {
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
  ).find((b) => b !== cancelBtn && isUnsubscribeControl(b));

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

const runUnsubscriber = async () => {
  document.addEventListener("click", blockRowNav, { capture: true });
  console.log("Bulk Unsubscribe started.");

  try {
    while (isRunning) {
      const confirmBtn = getModalConfirmBtn();

      if (confirmBtn) {
        triggerClick(confirmBtn);
        for (let i = 0; i < 30; i++) {
          await sleep(100);
          if (!getModalConfirmBtn()) break;
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

      triggerClick(targetBtn);

      for (let i = 0; i < 30; i++) {
        await sleep(100);
        if (getModalConfirmBtn()) break;
      }
    }
  } finally {
    document.removeEventListener("click", blockRowNav, { capture: true });
    isRunning = false;
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "START") {
    if (!isOnSubscriptionsPage()) {
      sendResponse({ status: "Open Gmail subscriptions page (#sub)." });
      return;
    }
    if (!isRunning) {
      isRunning = true;
      runUnsubscriber();
      sendResponse({ status: "Processing..." });
    } else {
      sendResponse({ status: "Already running." });
    }
  } else if (req.action === "STOP") {
    isRunning = false;
    sendResponse({ status: "Stopped." });
  }
});
