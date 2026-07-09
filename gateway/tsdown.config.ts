import { defineConfig } from "tsdown";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, cpSync } from "node:fs";
import { join } from "node:path";

export default defineConfig({
  entry: {
    entry: "src/entry.ts",
    cli: "src/cli.ts",
    "mcp/mcp-server": "src/mcp/mcp-server.ts",
  },
  outDir: "dist",
  clean: true,
  platform: "node",
  format: "esm",
  shims: true,
  fixedExtension: false,
  // Break ESM circular dependency between chunks.
  // Puts all shared source modules into a "shared" chunk so no chunk
  // needs to import them back from entry.js.
  outputOptions: {
    codeSplitting: {
      groups: [
        {
          name: "shared",
          test: /gateway[\\/]src[\\/](?!entry\.ts|cli\.ts|mcp[\\/])/,
          minShareCount: 2,
          priority: 20,
        },
      ],
    },
  },
  async onSuccess() {
    // Copy commands/ directory to dist/commands/
    const commandsSrc = join(import.meta.dirname!, "src/commands");
    const commandsDst = join(import.meta.dirname!, "dist/commands");
    if (existsSync(commandsSrc)) {
      cpSync(commandsSrc, commandsDst, { recursive: true });
    }

    // Copy skills/ directory to dist/skills/
    const skillsSrc = join(import.meta.dirname!, "src/skills");
    const skillsDst = join(import.meta.dirname!, "dist/skills");
    if (existsSync(skillsSrc)) {
      mkdirSync(skillsDst, { recursive: true });
      for (const f of readdirSync(skillsSrc)) {
        if (f.endsWith(".md")) {
          cpSync(join(skillsSrc, f), join(skillsDst, f));
        }
      }
    }

    // Copy config template
    const templatesSrc = join(import.meta.dirname!, "config");
    const templatesDst = join(import.meta.dirname!, "dist/templates");
    if (existsSync(templatesSrc)) {
      mkdirSync(templatesDst, { recursive: true });
      cpSync(join(templatesSrc, "gateway.json"), join(templatesDst, "gateway.json"));
    }

    // Inject ESM shims for __dirname/__filename after shebang in entry files
    const esmShim = `import{fileURLToPath as __f2p}from"node:url";import{dirname as __dn}from"node:path";if(typeof globalThis.__dirname==="undefined"){globalThis.__filename=__f2p(import.meta.url);globalThis.__dirname=__dn(globalThis.__filename);}\n`;
    for (const entry of ["entry.js", "cli.js", "mcp/mcp-server.js"]) {
      const f = join(import.meta.dirname!, "dist", entry);
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
    }
  },
});
