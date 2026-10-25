// Runs the extension's own files against the test fixture, in two iframes:
// one stands in for the Gmail tab, the other loads popup.html. This file
// plays the two parts the extension cannot run without: Chrome's extension
// APIs (tabs, scripting, runtime messaging) and Gmail's page behavior (a
// row's Unsubscribe opens a dialog, Unsubscribe in the dialog removes the
// row). It must be served over http(s) from the repository root, because it
// fetches popup.html and test/fixtures/ (see the README).
(async () => {
  const repo = new URL("../", location.href);
  const fromRepo = (file) => new URL(file, repo).href;
  const read = async (file) => {
    const res = await fetch(fromRepo(file));
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res.text();
  };

  // Every sender gets the one-click dialog except this one, which only
  // offers "Go to website", so a run shows both outcomes.
  const WEBSITE_ONLY = "offers@travel.example";
  const TAB_ID = 1;
  // What the popup sees as the tab's address. popup.js checks only the host.
  const TAB_URL = "https://mail.google.com/mail/u/0/#sub";

  const [page, oneClick, websiteOnly, popupHtml] = await Promise.all([
    read("test/fixtures/subscriptions-page.html"),
    read("test/fixtures/dialog-one-click.html"),
    read("test/fixtures/dialog-website-only.html"),
    read("popup.html"),
  ]);

  // Messages between the popup and the "tab", as chrome.runtime and
  // chrome.tabs deliver them.
  const tabListeners = [];
  const popupListeners = [];
  const deliver = (listeners, message, sender) =>
    new Promise((resolve, reject) => {
      if (listeners.length === 0) {
        reject(new Error("Could not establish connection. Receiving end does not exist."));
        return;
      }
      let answered = false;
      const sendResponse = (value) => {
        answered = true;
        resolve(value);
      };
      for (const listener of listeners) listener(message, sender, sendResponse);
      if (!answered) resolve(undefined);
    });

  const gmailFrame = document.getElementById("gmail");
  const popupFrame = document.getElementById("popup");
  const gmailWindow = () => gmailFrame.contentWindow;

  const injectScript = (file) =>
    new Promise((resolve, reject) => {
      const doc = gmailWindow().document;
      const script = doc.createElement("script");
      script.src = fromRepo(file);
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Could not load ${file}`));
      doc.head.append(script);
    });

  const popupChrome = {
    tabs: {
      query: async () => [{ id: TAB_ID, url: TAB_URL }],
      sendMessage: (tabId, message) =>
        tabId === TAB_ID ? deliver(tabListeners, message, { id: "demo" }) : Promise.reject(new Error("No tab")),
    },
    scripting: {
      executeScript: async ({ target, files }) => {
        if (target.tabId !== TAB_ID) throw new Error("No tab");
        for (const file of files) await injectScript(file);
        return files.map(() => ({ result: undefined }));
      },
    },
    runtime: {
      id: "demo",
      onMessage: { addListener: (listener) => popupListeners.push(listener) },
    },
  };

  const tabChrome = {
    runtime: {
      id: "demo",
      onMessage: { addListener: (listener) => tabListeners.push(listener) },
      sendMessage: (message) => deliver(popupListeners, message, { id: "demo", tab: { id: TAB_ID } }).catch(() => {}),
    },
  };

  // Gmail's part, on the fixture: dialogs open and close after a short
  // delay, as Gmail's animated ones do, a confirmed sender leaves the list,
  // and nothing navigates. The delays are well inside the run's ~3 second
  // wait for a dialog.
  const OPEN_MS = 600;
  const CLOSE_MS = 300;
  const playGmail = (win) => {
    const doc = win.document;
    const list = doc.querySelector('[role="list"]');
    const emailOf = (row) => row.querySelector(".sender-email").textContent;
    const nameOf = (row) => row.querySelector(".sender-name").textContent;
    let busy = false;
    let dialog = null;

    const open = (row) => {
      const email = emailOf(row);
      const html = (email === WEBSITE_ONLY ? websiteOnly : oneClick)
        .replace(/\{\{name\}\}/g, nameOf(row))
        .replace(/\{\{domain\}\}/g, email.split("@")[1]);
      const box = doc.createElement("div");
      box.className = "demo-backdrop";
      box.innerHTML = html.trim();
      box.dataset.email = email;
      doc.body.append(box);
      dialog = box;
    };
    const close = (confirmed) => {
      const box = dialog;
      const { email } = box.dataset;
      box.dataset.closing = "true";
      win.setTimeout(() => {
        if (confirmed) {
          for (const row of list.querySelectorAll('[role="listitem"]')) {
            if (emailOf(row) === email) row.remove();
          }
        }
        box.remove();
        dialog = null;
        busy = false;
      }, CLOSE_MS);
    };

    doc.addEventListener("click", (event) => {
      const target = event.target.closest('button, [role="button"], a');
      if (!target) return;
      // The demo never leaves the fixture or opens a sender's site.
      if (target.tagName === "A") event.preventDefault();
      const label = target.textContent.trim();
      if (dialog && dialog.contains(target)) {
        if (dialog.dataset.closing) return;
        if (label === "Unsubscribe" || label === "Cancel") close(label === "Unsubscribe");
        return;
      }
      const row = target.closest('[role="listitem"]');
      if (row && label === "Unsubscribe" && !busy) {
        busy = true;
        win.setTimeout(() => open(row), OPEN_MS);
      }
    });
  };

  const STAND_IN_STYLE = `
    body { margin: 0; font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2328; }
    nav { display: flex; gap: 16px; padding: 10px 16px; border-bottom: 1px solid #d0d7de; background: #f6f8fa; }
    nav a { color: #59636e; text-decoration: none; }
    nav a[href="#sub"] { color: #1f2328; font-weight: 600; }
    [role="main"] { padding: 4px 16px 16px; }
    h2 { font-size: 16px; margin: 10px 0; }
    [role="list"] { display: grid; gap: 8px; }
    [role="listitem"] { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 12px;
      padding: 10px 12px; border: 1px solid #d0d7de; border-radius: 8px; }
    [role="listitem"] a { color: inherit; text-decoration: none; display: flex; flex-wrap: wrap; gap: 0 8px; }
    .sender-name { font-weight: 600; }
    .sender-email, [role="listitem"] > span { color: #59636e; font-size: 13px; }
    [role="listitem"] > span { grid-column: 1; }
    [role="listitem"] > button { grid-column: 2; grid-row: 1 / span 2; }
    button, [role="button"], .buttons a { font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 6px;
      border: 1px solid #d0d7de; background: #fff; color: #1f2328; cursor: pointer; text-decoration: none; }
    .demo-backdrop { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(31, 35, 40, 0.35); }
    .demo-backdrop > * { width: min(340px, calc(100% - 32px)); padding: 16px; border-radius: 10px; background: #fff;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
    .demo-backdrop h3, .demo-backdrop .title { margin: 0 0 8px; font-size: 15px; font-weight: 600; }
    .demo-backdrop p { margin: 0 0 12px; color: #59636e; }
    .buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
    .buttons :last-child { background: #0b57d0; border-color: #0b57d0; color: #fff; }
  `;

  // The stand-in tab: the fixture page at #sub, with chrome.runtime for
  // content.js. The extension's scripts are injected only on Start.
  await new Promise((resolve) => {
    gmailFrame.addEventListener("load", resolve, { once: true });
    gmailFrame.srcdoc = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${STAND_IN_STYLE}</style></head><body>${page}</body></html>`;
  });
  gmailWindow().chrome = tabChrome;
  gmailWindow().location.hash = "#sub";
  playGmail(gmailWindow());

  // The popup: popup.html as it ships, with chrome.* defined before its
  // scripts run and its relative script paths resolved from the repo root.
  window.demoPopupChrome = popupChrome;
  popupFrame.srcdoc = popupHtml.replace(
    "<head>",
    `<head><base href="${repo.href}"><script>window.chrome = parent.demoPopupChrome;</script>`
  );

  document.getElementById("reset").addEventListener("click", () => location.reload());
})().catch((error) => {
  const alert = document.createElement("p");
  alert.setAttribute("role", "alert");
  alert.style.color = "#b42318";
  alert.textContent = `Demo failed to start: ${error.message || error}. Serve the repository root over http, then open /demo/.`;
  document.body.prepend(alert);
});
