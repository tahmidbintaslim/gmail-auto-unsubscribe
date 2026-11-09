import { it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";

it("ext/lib never references chrome.*", () => {
  const dir = new URL(".", import.meta.url);
  const files = readdirSync(dir).filter((f: string) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f));
  for (const f of files) expect(readFileSync(new URL(f, dir), "utf8"), f).not.toMatch(/\bchrome\./);
});
