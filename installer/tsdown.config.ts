import { defineConfig } from "tsdown";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  entry: { cli: "src/cli.ts" },
  outDir: "dist",
  clean: true,
  platform: "node",
  format: "esm",
  shims: true,
  fixedExtension: false,
  async onSuccess() {
    // Inject ESM shims for __dirname/__filename after shebang
    const esmShim = `import{fileURLToPath as __f2p}from"node:url";import{dirname as __dn}from"node:path";if(typeof globalThis.__dirname==="undefined"){globalThis.__filename=__f2p(import.meta.url);globalThis.__dirname=__dn(globalThis.__filename);}\n`;
    const f = join(import.meta.dirname!, "dist", "cli.js");
    if (existsSync(f)) {
      const content = readFileSync(f, "utf-8");
      if (!content.includes("globalThis.__dirname")) {
        if (content.startsWith("#!")) {
          const nlIdx = content.indexOf("\n");
          writeFileSync(f, content.slice(0, nlIdx + 1) + esmShim + content.slice(nlIdx + 1));
        } else {
          writeFileSync(f, esmShim + content);
        }
      }
    }
  },
});
