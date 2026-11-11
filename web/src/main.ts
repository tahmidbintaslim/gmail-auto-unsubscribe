// Shared by every page. Hero text and all content are plain HTML; this file only adds motion.
// With prefers-reduced-motion it imports neither three.js nor GSAP, so nothing pins or animates.

const here = location.pathname.replace(/(index)?\.html$/, "").replace(/\/$/, "");
for (const a of document.querySelectorAll<HTMLAnchorElement>(".site-head nav a")) {
  const href = a.getAttribute("href") ?? "";
  if (href.startsWith("/") && href.replace(/\/$/, "") === here && here) a.setAttribute("aria-current", "page");
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const hasWebGL = () => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
};

const sweepStatus = (hit: number, total: number) => {
  if (hit < 0) return "Ready";
  if (hit >= total) return `Swept: ${hit} unsubscribed, 0 skipped.`;
  return `Running: ${hit} unsubscribed, 0 skipped.`;
};

async function enhance() {
  const art = document.getElementById("hero-art");
  const how = document.getElementById("how");
  if (!art && !how) return;

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);

  // Hero first: ScrollTriggers must be created in page order.
  if (art && hasWebGL()) {
    const hero = art.closest<HTMLElement>(".hero")!;
    const label = document.getElementById("sweep-status")!;
    const { startHero } = await import("./hero3d");
    const scene = startHero(art, {
      mobile: matchMedia("(max-width: 700px), (pointer: coarse)").matches,
      onCount: (hit, total) => (label.textContent = sweepStatus(hit, total)),
    });
    if (scene) {
      art.classList.add("is-live");
      hero.classList.add("can-sweep");
      ScrollTrigger.create({
        trigger: hero,
        // Pin once the whole hero is in view, so the art is never cut off on phones.
        start: "bottom bottom",
        end: "+=110%",
        pin: true,
        scrub: 0.6,
        onUpdate: (st) => scene.setProgress(st.progress),
      });
    }
  }

  if (how) {
    const steps = [...how.querySelectorAll("li")];
    const show = (n: number) => steps.forEach((li, i) => li.classList.toggle("is-active", i === n));
    gsap.matchMedia().add("(min-width: 900px)", () => {
      how.classList.add("is-pinned");
      ScrollTrigger.create({
        trigger: how,
        start: "top top",
        end: "+=150%",
        pin: true,
        onUpdate: (st) => show(Math.min(steps.length - 1, Math.floor(st.progress * steps.length))),
      });
      return () => {
        how.classList.remove("is-pinned");
        show(0);
      };
    });
  }
  ScrollTrigger.refresh();
}

// After first paint, so the HTML hero is on screen before any heavy JS loads.
if (!reducedMotion) requestAnimationFrame(() => setTimeout(enhance, 0));
