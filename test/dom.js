// A jsdom window that runs the extension's files the way Chrome does: as
// classic scripts evaluated in the page's global scope.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const readRepoFile = (file) => readFileSync(join(root, file), "utf8");

// jsdom does no layout, so every element measures 0x0. Elements get a size
// unless they or an ancestor are hidden, so isVisible() treats the fixture
// markup the way Chrome would.
const giveElementsLayout = (win) => {
  const isHidden = (el) => {
    for (let node = el; node; node = node.parentElement) {
      if (node.hidden || node.style?.display === "none") return true;
    }
    return false;
  };
  win.Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const shown = this.isConnected && !isHidden(this);
    const width = shown ? 120 : 0;
    const height = shown ? 24 : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: height, width, height, toJSON() {} };
  };
  win.Element.prototype.scrollIntoView = function scrollIntoView() {};
};

export function createWindow({ body = "", url = "https://mail.google.com/mail/u/0/#sub" } = {}) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${body}</body></html>`, {
    url,
    runScripts: "outside-only",
  });
  giveElementsLayout(dom.window);
  return dom.window;
}

export function loadScript(win, file) {
  win.eval(`${readRepoFile(file)}\n//# sourceURL=${file}`);
}
