// Mounts the fixture into a jsdom window and plays Gmail's part: a row's
// Unsubscribe opens a dialog, the dialog's buttons close it, and a
// confirmed sender leaves the list. Every click the run makes is logged.
import { readRepoFile } from "./dom.js";

const fixture = (name) => readRepoFile(`test/fixtures/${name}`);

const DIALOGS = {
  "one-click": fixture("dialog-one-click.html"),
  "website-only": fixture("dialog-website-only.html"),
  "no-role": fixture("dialog-no-role.html"),
  // Gmail opens this one but none of its buttons respond.
  stuck: fixture("dialog-one-click.html"),
};

const fill = (html, values) => html.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);

const parse = (doc, html) => {
  const box = doc.createElement("div");
  box.innerHTML = html.trim();
  return box.firstElementChild;
};

// kinds maps a sender email to "one-click", "website-only", "no-role",
// "stuck" or "none" (no dialog at all). Senders not listed are one-click.
// With rerender, Gmail rebuilds every remaining row as new elements after
// each dialog closes, as a virtual list might; with churn the rebuilt rows
// also change their text, so no run can tell them from new senders.
export function mountGmail(win, { kinds = {}, rerender = false, churn = false, onConfirm } = {}) {
  const doc = win.document;
  doc.body.innerHTML = fixture("subscriptions-page.html");
  win.location.hash = "#sub";

  const log = [];
  const list = doc.querySelector('[role="list"]');
  const emailOf = (row) => row.querySelector(".sender-email").textContent;
  const nameOf = (row) => row.querySelector(".sender-name").textContent;
  let confirmed = 0;
  let openDialog = null;

  let renders = 0;
  const rebuild = () => {
    if (!rerender && !churn) return;
    renders += 1;
    for (const row of Array.from(list.children)) {
      const copy = row.cloneNode(true);
      if (churn) copy.querySelector(":scope > span").textContent = `render ${renders}`;
      list.replaceChild(copy, row);
    }
  };

  const close = () => {
    openDialog?.remove();
    openDialog = null;
    rebuild();
  };

  const onClick = (event) => {
    const target = event.target.closest('button, [role="button"], a');
    if (!target) return;
    const label = target.textContent.trim();

    if (openDialog && openDialog.contains(target)) {
      const { email, kind } = openDialog.dataset;
      log.push({ click: label, email });
      if (label === "Go to website") event.preventDefault();
      if (kind === "stuck") return;
      if (label === "Cancel") close();
      if (label === "Unsubscribe") {
        list.querySelectorAll('[role="listitem"]').forEach((row) => {
          if (emailOf(row) === email) row.remove();
        });
        confirmed += 1;
        close();
        onConfirm?.({ confirmed, doc, win });
      }
      return;
    }

    const row = target.closest('[role="listitem"]');
    if (row && label === "Unsubscribe") {
      const email = emailOf(row);
      const kind = kinds[email] || "one-click";
      log.push({ click: "row", email });
      if (kind === "none") return;
      const [, domain] = email.split("@");
      openDialog = parse(doc, fill(DIALOGS[kind], { name: nameOf(row), domain }));
      openDialog.dataset.email = email;
      openDialog.dataset.kind = kind;
      doc.body.append(openDialog);
      return;
    }

    if (target.closest('[data-view="message"]')) log.push({ click: "message-view", label });
  };
  doc.addEventListener("click", onClick);

  const rows = () => Array.from(list.querySelectorAll('[role="listitem"]')).map(emailOf);
  const clicks = (filter) => log.filter((entry) => entry.click === filter);
  const emptyList = () => list.replaceChildren();
  const showMessageView = () => {
    doc.querySelector('[data-view="sub"]').hidden = true;
    doc.querySelector('[data-view="message"]').hidden = false;
  };
  const unmount = () => doc.removeEventListener("click", onClick);

  return { doc, win, log, rows, clicks, emptyList, showMessageView, unmount, dialogOpen: () => Boolean(openDialog) };
}
