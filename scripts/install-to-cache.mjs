#!/usr/bin/env node
/**
 * Install the built OpenDesign plugin into the local ZCode plugin cache, mirroring the
 * android-emulator cache layout (cache/zcode-plugins-official/opendesign/0.1.0/).
 * Renders .zcode-plugin/plugin.json with the resolved absolute server path and writes a
 * .zcode-plugin-seed.json so ZCode can discover the plugin on its next cache scan.
 *
 * Usage: node scripts/install-to-cache.mjs [target-dir]
 */
import { cp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const version = "0.1.0";
const home = process.env.USERPROFILE || "/c/Users/M SYAFA'AT ASHAN";
const defaultCache = resolve(home, ".zcode", "cli", "plugins", "cache", "zcode-plugins-official", "opendesign", version);
const target = resolve(process.argv[2] || defaultCache);
const pluginId = "opendesign@zcode-plugins-official";
const registryPath = resolve(home, ".zcode", "cli", "plugins", "installed_plugins.json");

// Files/dirs to publish into the cache (no dist rebuild — uses already-built dist/).
const publish = ["dist", "skills", "commands", "hooks", "scripts",
  "package.json", "tsconfig.json", ".mcp.json", "README.md", "PRD.md"];

console.log("[install] pluginRoot =", pluginRoot);
console.log("[install] target     =", target);

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

for (const name of publish) {
  const src = resolve(pluginRoot, name);
  const dst = resolve(target, name);
  await cp(src, dst, { recursive: true });
  console.log("[install] copied", name);
}

// Render .zcode-plugin/plugin.json with resolved absolute server path.
const seed = JSON.stringify(
  {
    hash: "opendesign-0.1.0-seed",
    marketplace: "zcode-plugins-official",
    plugin: "opendesign",
    pluginVersion: version,
    source: "filesystem",
    version: 1,
  },
  null,
  2,
);

// ZCode uses a real absolute path for the MCP server entry. Forward slashes are fine
// on Windows for Node; we render the cache root in place of ${ZCODE_PLUGIN_ROOT}.
const pluginJsonTemplate = await readFile(resolve(pluginRoot, ".zcode-plugin/plugin.json"), "utf8");
const pluginJson = pluginJsonTemplate.replace(
  "\${ZCODE_PLUGIN_ROOT}/dist/mcp/server.js",
  `${target.replace(/\\/g, "/")}/dist/mcp/server.js`,
);

await mkdir(resolve(target, ".zcode-plugin"), { recursive: true });
await writeFile(resolve(target, ".zcode-plugin/plugin.json"), pluginJson, "utf8");
await writeFile(resolve(target, ".zcode-plugin-seed.json"), seed, "utf8");
console.log("[install] wrote .zcode-plugin/plugin.json + .zcode-plugin-seed.json");

// Register the plugin in ZCode's installed-plugins registry so it is cataloged
// (a populated cache dir alone is NOT surfaced in the ZCode Plugins panel).
const now = new Date().toISOString();
let registry;
try {
  registry = JSON.parse(await readFile(registryPath, "utf8"));
} catch {
  registry = { version: 1, plugins: [] };
}
if (!Array.isArray(registry.plugins)) registry.plugins = [];
const idx = registry.plugins.findIndex((p) => p.id === pluginId);
const entry = {
  id: pluginId,
  name: "opendesign",
  marketplace: "zcode-plugins-official",
  version,
  installPath: target,
  installedAt: now,
  updatedAt: now,
  scope: "user",
  source: { source: "filesystem" },
};
if (idx >= 0) registry.plugins[idx] = entry;
else registry.plugins.push(entry);
registry.version = registry.version || 1;
await writeFile(registryPath, JSON.stringify(registry, null, 2), "utf8");
console.log("[install] registered in installed_plugins.json:", registryPath);

console.log("[install] done. Restart ZCode to activate discovery.");
