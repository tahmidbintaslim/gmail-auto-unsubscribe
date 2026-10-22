// The unsubscribe loop for Gmail's Manage subscriptions page.
//
// popup.js injects this file into the Gmail tab, then content.js, and
// popup.html loads it for describeState(). The tests load it into jsdom.
// It must stay a classic script (no import/export): chrome.scripting
// cannot inject modules.
(() => {
  if (globalThis.GmailUnsubscriber) return;

  const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], .Kj-JD';
  const CONTROL_SELECTOR = 'button, [role="button"], a';
  const ROW_SELECTOR = '[role="listitem"], [role="row"], li, tr';

  // Hard ceilings for one press of Start. Each loop pass handles one sender
  // row, so maxRows also caps the number of passes.
  const LIMITS = Object.freeze({ maxRows: 250, maxWebsiteTabs: 5 });

  // Waits between steps, in ms. Gmail animates its dialogs, and a pace close
  // to a person's keeps the page from dropping clicks.
  const TIMING = Object.freeze({ stepMs: 100, waitSteps: 30, scrollMs: 350, settleMs: 900 });

  const PHASES = ["idle", "wrong-page", "running", "done", "stopped", "limit", "left-page", "dialog-stuck", "error"];

  const idleState = () => ({ phase: "idle", unsubscribed: 0, skipped: 0, websites: 0, attempted: 0 });

  const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isOnSubscriptionsPage = (loc = globalThis.location) =>
    String(loc?.hash || "").toLowerCase().startsWith("#sub");

  const isVisible = (el) => {
    if (!el || !el.isConnected) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    return el.ownerDocument.defaultView.getComputedStyle(el).visibility !== "hidden";
  };

  // Gmail's English UI. A control matches on its text or its aria-label.
  const hasLabel = (el, word) => {
    const text = (el.textContent || "").trim().toLowerCase();
    const aria = (el.getAttribute("aria-label") || "").trim().toLowerCase();
    return text === word || aria === word || aria.startsWith(`${word} `);
  };

  const triggerClick = (el) => {
    const win = el.ownerDocument.defaultView;
    const Pointer = win.PointerEvent || win.MouseEvent;
    const opts = { bubbles: true, cancelable: true, view: win };
    el.focus?.();
    el.dispatchEvent(new Pointer("pointerdown", opts));
    el.dispatchEvent(new win.MouseEvent("mousedown", opts));
    el.dispatchEvent(new Pointer("pointerup", opts));
    el.dispatchEvent(new win.MouseEvent("mouseup", opts));
    el.click();
  };

  const visibleControls = (root) =>
    Array.from(root.querySelectorAll(CONTROL_SELECTOR)).filter(isVisible);

  // Visible "Unsubscribe" buttons in the sender list (not in a dialog).
  const findRowButtons = (doc) =>
    Array.from(doc.querySelectorAll('button, [role="button"]')).filter(
      (el) =>
        isVisible(el) &&
        hasLabel(el, "unsubscribe") &&
        !el.closest(DIALOG_SELECTOR) &&
        !(el.parentElement?.textContent || "").toLowerCase().includes("cancel")
    );

  // The open Gmail dialog, if any, with its Cancel button and the actions it
  // offers. A dialog without an ARIA role is the smallest ancestor (up to
  // three levels) of a visible Cancel button that also holds an action and
  // no sender-row button. A Cancel button with no action next to it is not
  // a dialog, so the run never clicks it.
  const findOpenDialog = (doc) => {
    const describe = (box, cancel) => {
      const controls = visibleControls(box).filter((el) => el !== cancel);
      return {
        cancel,
        unsubscribe: controls.find((el) => hasLabel(el, "unsubscribe")) || null,
        website: controls.find((el) => hasLabel(el, "go to website")) || null,
      };
    };

    for (const box of doc.querySelectorAll(DIALOG_SELECTOR)) {
      if (!isVisible(box)) continue;
      const cancel = visibleControls(box).find((el) => hasLabel(el, "cancel"));
      if (cancel) return describe(box, cancel);
    }

    const cancels = visibleControls(doc).filter((el) => hasLabel(el, "cancel"));
    if (cancels.length === 0) return null;
    const rowButtons = findRowButtons(doc);
    for (const cancel of cancels) {
      let box = cancel.parentElement;
      for (let depth = 0; box && depth < 3; depth += 1, box = box.parentElement) {
        if (rowButtons.some((button) => box.contains(button))) break;
        const found = describe(box, cancel);
        if (found.unsubscribe || found.website) return found;
      }
    }
    return null;
  };

  // The sender row a button belongs to: the list item or table row around
  // it, else the largest ancestor (up to eight levels) that holds no other
  // row button.
  const rowOf = (button, allButtons) => {
    const holdsOther = (el) => allButtons.some((other) => other !== button && el.contains(other));
    const semantic = button.closest(ROW_SELECTOR);
    if (semantic && !holdsOther(semantic)) return semantic;
    let row = button;
    for (let depth = 0; depth < 8; depth += 1) {
      const parent = row.parentElement;
      if (!parent || parent === button.ownerDocument.body || holdsOther(parent)) break;
      row = parent;
    }
    return row;
  };

  const rowKey = (row) => (row.textContent || "").replace(/\s+/g, " ").trim();

  // Guards the run's own clicks from following a row's link into a message
  // list or a search.
  const blockRowNav = (event) => {
    const link = event.target?.closest?.("a");
    if (!link) return;
    // An SVG <a> has an object, not a string, as its href.
    const href = typeof link.href === "string" ? link.href : link.getAttribute("href") || "";
    if (href.includes("sub_m") || href.includes("search/from")) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Rows a run has opened. Elements go in a WeakSet; row text goes in a Set
  // too, in case Gmail re-renders the list with new elements. A sender that
  // shows up twice is skipped rather than clicked twice.
  const createSeen = () => ({ elements: new WeakSet(), keys: new Set() });

  // Starts one bounded pass over the page and returns a handle. The pass
  // works bottom-up, opens each sender's dialog at most once, confirms only
  // one-click Unsubscribe dialogs, and cancels the rest. It ends when no
  // unattempted row is left, at the row limit, on stop(), when the page
  // leaves the subscriptions view, or when a dialog will not close. Passing
  // the previous run's `seen` continues it instead of starting over.
  const createRun = ({
    doc = globalThis.document,
    allowWebsites = false,
    limits = {},
    timing = {},
    sleep = defaultSleep,
    onProgress = () => {},
    seen = createSeen(),
  } = {}) => {
    const lim = { ...LIMITS, ...limits };
    const wait = { ...TIMING, ...timing };
    const win = doc.defaultView;
    const counts = { unsubscribed: 0, skipped: 0, websites: 0, attempted: 0 };
    let phase = "running";

    const snapshot = () => ({ phase, ...counts });
    const report = () => onProgress(snapshot());
    const end = (reason) => {
      if (phase === "running") phase = reason;
    };
    const active = () => {
      if (phase === "running" && !isOnSubscriptionsPage(win.location)) end("left-page");
      return phase === "running";
    };
    const onHashChange = () => {
      if (!isOnSubscriptionsPage(win.location)) end("left-page");
    };
    // Each run adds and removes its own listener, so a stopped run that
    // winds down after Start began a new one leaves the new run's guard on.
    const guardClicks = (event) => blockRowNav(event);

    // Polls check() until it returns something truthy; null on timeout or end.
    const waitFor = async (check) => {
      for (let i = 0; i < wait.waitSteps; i += 1) {
        const value = check();
        if (value) return value;
        await sleep(wait.stepMs);
        if (!active()) return null;
      }
      return check() || null;
    };
    const waitForClose = () => waitFor(() => !findOpenDialog(doc));

    const nextRow = () => {
      const buttons = findRowButtons(doc);
      for (let i = buttons.length - 1; i >= 0; i -= 1) {
        const button = buttons[i];
        const row = rowOf(button, buttons);
        if (seen.elements.has(button) || seen.elements.has(row) || seen.keys.has(rowKey(row))) continue;
        return { button, row };
      }
      return null;
    };

    const handleDialog = async (dialog) => {
      if (dialog.unsubscribe) {
        triggerClick(dialog.unsubscribe);
        counts.unsubscribed += 1;
        // Clicking Cancel now could undo the unsubscribe, so stop instead.
        if (!(await waitForClose()) && active()) end("dialog-stuck");
        return;
      }
      if (dialog.website && allowWebsites && counts.websites < lim.maxWebsiteTabs) {
        triggerClick(dialog.website);
        counts.websites += 1;
        await sleep(wait.settleMs);
        if (!active()) return;
      } else {
        counts.skipped += 1;
      }
      const stillOpen = findOpenDialog(doc);
      if (!stillOpen) return;
      triggerClick(stillOpen.cancel);
      if (!(await waitForClose()) && active()) end("dialog-stuck");
    };

    // Before each sender, a dialog that is still open is closed, never
    // confirmed: one that was open before Start, or one Gmail showed after
    // the run gave up waiting for it. Confirming it would credit the wrong
    // row and leave that row's sender untried.
    const closeLeftover = async (leftover) => {
      triggerClick(leftover.cancel);
      if (!(await waitForClose()) && active()) end("dialog-stuck");
    };

    const loop = async () => {
      doc.addEventListener("click", guardClicks, { capture: true });
      win.addEventListener("hashchange", onHashChange);
      try {
        while (active()) {
          // Only awaited when a dialog is open, so an empty list ends before
          // Start replies and the popup shows Done straight away.
          const leftover = findOpenDialog(doc);
          if (leftover) {
            await closeLeftover(leftover);
            if (!active()) break;
          }
          if (counts.attempted >= lim.maxRows) {
            end("limit");
            break;
          }
          const next = nextRow();
          if (!next) {
            end("done");
            break;
          }
          seen.elements.add(next.button);
          seen.elements.add(next.row);
          seen.keys.add(rowKey(next.row));
          counts.attempted += 1;

          next.button.scrollIntoView?.({ block: "center", behavior: "smooth" });
          await sleep(wait.scrollMs);
          if (!active()) break;

          triggerClick(next.button);
          const dialog = await waitFor(() => findOpenDialog(doc));
          if (!active()) break;
          if (dialog) {
            await handleDialog(dialog);
          } else {
            counts.skipped += 1;
          }
          report();
          if (!active()) break;
          await sleep(wait.settleMs);
        }
      } catch (error) {
        end("error");
        console.error("Gmail Auto Unsubscribe stopped:", error);
      } finally {
        doc.removeEventListener("click", guardClicks, { capture: true });
        win.removeEventListener("hashchange", onHashChange);
        end("stopped");
        report();
      }
      return snapshot();
    };

    report();
    const done = loop();
    return {
      done,
      seen,
      getState: snapshot,
      stop: () => {
        end("stopped");
        report();
      },
    };
  };

  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  // Popup status line for a run state.
  const describeState = (state) => {
    if (!state || !PHASES.includes(state.phase) || state.phase === "idle") return "Ready";
    if (state.phase === "wrong-page") return "Open Gmail's Manage subscriptions page first.";
    let counts = `${state.unsubscribed} unsubscribed, ${state.skipped} skipped`;
    if (state.websites) counts += `, ${plural(state.websites, "website")} opened`;
    switch (state.phase) {
      case "running":
        return `Running: ${counts}.`;
      case "done":
        return `Done: ${counts}.`;
      case "limit":
        return `Paused after ${LIMITS.maxRows} senders: ${counts}. Press Start to continue.`;
      case "left-page":
        return `Stopped because you left the subscriptions page: ${counts}.`;
      case "dialog-stuck":
        return `Stopped because a Gmail dialog did not close: ${counts}.`;
      case "error":
        return `Stopped after an unexpected error: ${counts}.`;
      default:
        return `Stopped: ${counts}.`;
    }
  };

  globalThis.GmailUnsubscriber = Object.freeze({
    LIMITS,
    TIMING,
    createRun,
    createSeen,
    describeState,
    findOpenDialog,
    findRowButtons,
    idleState,
    isOnSubscriptionsPage,
  });
})();
