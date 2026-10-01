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
  ).find((b) => {
    if (b === cancelBtn || !isVisible(b)) return false;
    const txt = b.textContent?.trim().toLowerCase() || "";
    if (txt === "unsubscribe") return true;
    if (allowWebsites && txt.includes("website")) return true;
    return false;
  });

  return actionBtn || cancelBtn;
};

const getListButtons = () => {
  return Array.from(document.querySelectorAll('button, [role="button"]')).filter((b) => {
    if (!isVisible(b)) return false;
    if (b.closest('[role="dialog"], [role="alertdialog"], .Kj-JD, [aria-modal="true"]')) return false;
    if (b.parentElement?.textContent?.toLowerCase().includes("cancel")) return false;

    const txt = b.textContent?.trim().toLowerCase();
    const aria = b.getAttribute("aria-label")?.toLowerCase() || "";
    return txt === "unsubscribe" || aria.startsWith("unsubscribe");
  });
};

const blockRowNav = (e) => {
  const link = e.target.closest("a");
  if (link && (link.href.includes("sub_m") || link.href.includes("search/from"))) {
    e.preventDefault();
    e.stopPropagation();
  }
};

const runUnsubscriber = async (allowWebsites) => {
  document.addEventListener("click", blockRowNav, { capture: true });
  console.log("Bulk Unsubscribe started.");

  try {
    while (isRunning) {
      let confirmBtn = getModalConfirmBtn(allowWebsites);

      if (confirmBtn) {
        triggerClick(confirmBtn);
        for (let i = 0; i < 30; i++) {
          await sleep(100);
          if (!getModalConfirmBtn(allowWebsites)) break;
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
        if (getModalConfirmBtn(allowWebsites)) break;
      }
    }
  } finally {
    document.removeEventListener("click", blockRowNav, { capture: true });
    isRunning = false;
  }
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "START") {
    if (!isRunning) {
      isRunning = true;
      runUnsubscriber(req.allowWebsites);
      sendResponse({ status: "Processing..." });
    } else {
      sendResponse({ status: "Already running." });
    }
  } else if (req.action === "STOP") {
    isRunning = false;
    sendResponse({ status: "Stopped." });
  }
});
