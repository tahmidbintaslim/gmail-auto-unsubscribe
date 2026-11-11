// Shared by every page. All content is plain HTML; this file adds the hero's
// working mini-demo and, when motion is allowed, scroll reveals.

const here = location.pathname.replace(/(index)?\.html$/, "").replace(/\/$/, "");
for (const a of document.querySelectorAll<HTMLAnchorElement>(".site-head nav a")) {
  const href = (a.getAttribute("href") ?? "").replace(/\/$/, "");
  if (here && href === here) a.setAttribute("aria-current", "page");
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// The hero demo: a pretend subscriptions list the visitor can sweep. Works without GSAP.
const stage = document.getElementById("sweep");
if (stage) {
  const rows = [...stage.querySelectorAll<HTMLLIElement>(".win:not(.before) .rows li")];
  const start = stage.querySelector<HTMLButtonElement>(".start")!;
  const reset = stage.querySelector<HTMLButtonElement>(".stop")!;
  const out = stage.querySelector("output")!;
  let timer = 0;
  let touched = false;

  const paint = (done: number, running: boolean) => {
    // Like the real extension, it works from the bottom row up.
    rows.forEach((li, i) => {
      const n = rows.length - 1 - i;
      li.classList.toggle("is-gone", n < done);
      li.classList.toggle("is-now", running && n === done);
      li.querySelector(".pill")!.textContent = n < done ? "Unsubscribed" : running && n === done ? "Unsubscribing" : "Unsubscribe";
    });
    out.textContent = !running && done === 0 ? "Ready" : `${running ? "Running" : "Swept"}: ${done} unsubscribed, 0 skipped.`;
    start.disabled = running;
  };

  const run = () => {
    clearInterval(timer);
    let done = 0;
    paint(done, true);
    timer = window.setInterval(() => {
      done += 1;
      const finished = done >= rows.length;
      paint(done, !finished);
      if (finished) clearInterval(timer);
    }, reducedMotion ? 250 : 800);
  };

  start.addEventListener("click", () => ((touched = true), run()));
  reset.addEventListener("click", () => {
    touched = true;
    clearInterval(timer);
    paint(0, false);
  });
  // Show it once by itself so the page explains the product before anyone clicks.
  if (!reducedMotion) setTimeout(() => touched || run(), 1400);
}

async function reveal() {
  const targets = document.querySelectorAll<HTMLElement>(".panel, .statement .wrap, .plan, .demo-frame, .finale");
  if (!targets.length) return;
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);
  for (const el of targets) {
    // Anything already on screen stays put; only content below the fold animates in.
    if (el.getBoundingClientRect().top < innerHeight * 0.9) continue;
    el.classList.add("will-reveal");
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onComplete: () => el.classList.remove("will-reveal"),
    });
    // The product shot inside a panel drifts up a little slower than the panel.
    const show = el.querySelector(".show > *");
    if (show) gsap.from(show, { y: 60, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 80%", once: true } });
  }
}

if (!reducedMotion) requestAnimationFrame(() => setTimeout(reveal, 0));
