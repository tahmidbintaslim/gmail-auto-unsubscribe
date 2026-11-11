// The hero scene: paper envelopes drifting in warm light, and a sweeping arc
// that brushes them out of frame as `setProgress` goes from 0 to 1.
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

export interface Hero {
  setProgress(p: number): void;
}

const ACCENT = "#C2410C";
const ACCENT_LIGHT = "#FB923C";
const PAPERS = ["#FFF8EE", "#FBF3E7", "#F3E6D3", "#EAD7BC", "#F7E9D7"];

const canvasTexture = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
};

// White envelope art; each instance tints it to a paper colour.
const envelopeTexture = () =>
  canvasTexture(320, 208, (g) => {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 320, 208);
    g.strokeStyle = "#d8c6ad";
    g.lineWidth = 6;
    g.strokeRect(3, 3, 314, 202);
    g.lineJoin = "round";
    g.lineWidth = 5;
    g.strokeStyle = "#cdb698";
    g.beginPath();
    g.moveTo(8, 10);
    g.lineTo(160, 118);
    g.lineTo(312, 10);
    g.stroke();
    g.fillStyle = "#E8590C";
    g.fillRect(250, 26, 44, 52);
    g.strokeStyle = "#d4c0a2";
    g.lineCap = "round";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(80, 160);
    g.lineTo(210, 160);
    g.moveTo(80, 180);
    g.lineTo(176, 180);
    g.stroke();
  });

// u runs from the trailing edge (0) to the leading edge (1); v along the radius.
const bristleTexture = () =>
  canvasTexture(512, 256, (g) => {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) {
      const y = rand() * 256;
      const start = rand() * 300;
      const grad = g.createLinearGradient(start, 0, 512, 0);
      grad.addColorStop(0, "rgba(251,146,60,0)");
      grad.addColorStop(0.8, i % 3 ? "rgba(251,146,60,0.55)" : "rgba(194,65,12,0.6)");
      grad.addColorStop(1, "rgba(194,65,12,0.95)");
      g.fillStyle = grad;
      g.fillRect(start, y, 512 - start, 0.8 + rand() * 2.4);
    }
    g.fillStyle = ACCENT;
    g.fillRect(498, 0, 14, 256);
    g.fillStyle = ACCENT_LIGHT;
    g.fillRect(488, 0, 5, 256);
  });

// An annular sector hanging down from the origin, leading edge at angle 0.
const sectorGeometry = (r1: number, r2: number, trail: number) => {
  const A = 24;
  const R = 8;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let a = 0; a <= A; a++) {
    const theta = -trail * (1 - a / A);
    for (let r = 0; r <= R; r++) {
      const rad = r1 + ((r2 - r1) * r) / R;
      pos.push(rad * Math.sin(theta), -rad * Math.cos(theta), 0);
      uv.push(a / A, r / R);
    }
  }
  for (let a = 0; a < A; a++) {
    for (let r = 0; r < R; r++) {
      const i = a * (R + 1) + r;
      index.push(i, i + R + 1, i + 1, i + 1, i + R + 1, i + R + 2);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geo.setIndex(index);
  return geo;
};

export function startHero(host: HTMLElement, opts: { mobile: boolean; onCount: (hit: number, total: number) => void }): Hero | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, opts.mobile ? 1.5 : 2));
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  host.insertBefore(canvas, host.querySelector(".sweep-status"));

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.z = 24;
  scene.add(new HemisphereLight(0xfff4e6, 0xd9b48f, 1.7));
  const sun = new DirectionalLight(0xffe2c4, 1.6);
  sun.position.set(-6, 8, 10);
  scene.add(sun);

  // Envelopes on a jittered grid so they never clump.
  const cols = opts.mobile ? 5 : 8;
  const rows = opts.mobile ? 4 : 6;
  const total = cols * rows;
  let seed = 42;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const envs = Array.from({ length: total }, (_, i) => ({
    u: ((i % cols) + 0.2 + rand() * 0.6) / cols,
    v: (Math.floor(i / cols) + 0.2 + rand() * 0.6) / rows,
    z: -3 + rand() * 5,
    rz: (rand() - 0.5) * 0.9,
    phase: rand() * Math.PI * 2,
    spin: rand() < 0.5 ? -1 : 1,
    lead: 0.03 + rand() * 0.08,
  }));
  const mesh = new InstancedMesh(
    new BoxGeometry(1.6, 1.04, 0.03),
    new MeshStandardMaterial({ map: envelopeTexture(), roughness: 0.85, metalness: 0 }),
    total,
  );
  envs.forEach((_, i) => mesh.setColorAt(i, new Color(PAPERS[i % PAPERS.length])));
  scene.add(mesh);

  const broom = new Group();
  const bristles = new Mesh(
    new BufferGeometry(),
    new MeshBasicMaterial({ map: bristleTexture(), transparent: true, depthTest: false, depthWrite: false }),
  );
  const handle = new Mesh(new BoxGeometry(0.12, 1, 0.05), new MeshBasicMaterial({ color: 0x7c2d12, depthTest: false }));
  bristles.renderOrder = handle.renderOrder = 2;
  broom.add(bristles, handle);
  scene.add(broom);

  // Geometry that depends on the box's aspect ratio.
  let hw = 1;
  let hh = 1;
  let pivotY = 1;
  let from = 0;
  let to = 0;
  const layout = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    hh = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    hw = hh * camera.aspect;
    pivotY = hh * 2.2;
    const r1 = pivotY - hh - 0.6;
    const r2 = Math.hypot(hw + 1.5, pivotY + hh + 1.5);
    bristles.geometry.dispose();
    bristles.geometry = sectorGeometry(r1, r2, 0.34);
    handle.scale.y = r1;
    handle.position.y = -r1 / 2;
    broom.position.set(0, pivotY, 0);
    const edge = Math.atan2(hw + 1.6, pivotY - hh - 1);
    from = -edge - 0.05;
    to = edge + 0.5;
  };
  layout();
  new ResizeObserver(layout).observe(host);

  let progress = 0;
  let lastHit = -1;
  const dummy = new Object3D();
  const frame = (ms: number) => {
    const t = ms / 1000;
    const eased = progress * progress * (3 - 2 * progress);
    const sweep = from + (to - from) * eased;
    broom.rotation.z = sweep;
    broom.visible = progress > 0;
    let hit = 0;
    envs.forEach((e, i) => {
      let x = (e.u * 2 - 1) * (hw - 1) + Math.sin(t * 0.3 + e.phase) * 0.25;
      let y = (1 - e.v * 2) * (hh - 0.8) + Math.cos(t * 0.4 + e.phase * 1.3) * 0.3;
      let rz = e.rz + Math.sin(t * 0.5 + e.phase) * 0.08;
      let rx = Math.sin(t * 0.35 + e.phase) * 0.25;
      const ry = Math.cos(t * 0.3 + e.phase) * 0.3;
      const theta = Math.atan2(x, pivotY - y);
      const behind = sweep - theta;
      if (progress > 0 && behind > 0) {
        // Caught: ride just ahead of the leading edge, tumbling.
        hit++;
        const r = Math.hypot(x, pivotY - y) * (1 + 0.04 * behind);
        const a = sweep + e.lead + behind * 0.1;
        x = r * Math.sin(a);
        y = pivotY - r * Math.cos(a);
        rz += behind * 3 * e.spin;
        rx += behind * 1.4;
      }
      dummy.position.set(x, y, e.z);
      dummy.rotation.set(rx, ry, rz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (hit !== lastHit) {
      lastHit = hit;
      opts.onCount(progress > 0 ? hit : -1, total);
    }
    renderer.render(scene, camera);
  };

  // Render only while the hero is on screen.
  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(host);
  renderer.setAnimationLoop((ms) => {
    if (visible) frame(ms);
  });

  return {
    setProgress(p) {
      progress = Math.min(1, Math.max(0, p));
    },
  };
}
