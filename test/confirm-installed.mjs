#!/usr/bin/env node
/**
 * Deterministic gate: boot the INSTALLED server (cache copy) and confirm it serves
 * exactly the 7 OpenDesign tools under server name "opendesign". No network — so the
 * result is stable regardless of connectivity. Exits 0 only on success.
 *
 * Usage: node test/confirm-installed.mjs <absolute-path-to-installed-server.js>
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const SERVER = resolve(process.argv[2]);
let ok = true;
const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
const onErr = (d) => process.stderr.write(`[server] ${d}`);
child.stderr.on("data", onErr);

function send(req) {
  child.stdin.write(JSON.stringify(req) + "\n");
}
function call(method, params = {}) {
  return new Promise((res, rej) => {
    const id = Math.floor(Math.random() * 1_000_000);
    const on = (c) => {
      for (const line of c.toString().split("\n").filter(Boolean)) {
        let m;
        try { m = JSON.parse(line); } catch { continue; }
        if (m.id === id) {
          child.stdout.off("data", on);
          if (m.error) rej(m.error);
          else res(m.result);
        }
      }
    };
    child.stdout.on("data", on);
    send({ jsonrpc: "2.0", id, method, params });
    setTimeout(() => rej(new Error(`timeout ${method}`)), 15_000);
  });
}

try {
  const init = await call("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "confirm", version: "1.0.0" },
  });
  const tools = await call("tools/list");
  const names = tools.tools.map((t) => t.name).sort();
  const expected = [
    "search_designs", "list_designs", "get_design_system", "fetch_design_spec_markdown",
    "get_director_protocol", "recommend_references", "get_critique_rubric",
  ].sort();

  console.log("server_name:", init.serverInfo.name);
  console.log("tools_count:", tools.tools.length);

  const nameOk = init.serverInfo.name === "opendesign";
  const toolOk = tools.tools.length === 7 && JSON.stringify(names) === JSON.stringify(expected);
  if (nameOk) console.log("PASS  server name = opendesign"); else { console.log("FAIL  server name =", init.serverInfo.name); ok = false; }
  if (toolOk) console.log("PASS  tools/list = 7 OpenDesign tools"); else { console.log("FAIL  tools =", names); ok = false; }
  console.log(ok ? "CONFIRMED" : "NOT CONFIRMED");
} catch (e) {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  ok = false;
} finally {
  child.stdin.end();
  const timeout = setTimeout(() => process.exit(1), 3000);
  child.on("exit", () => { clearTimeout(timeout); process.exitCode = ok ? 0 : 1; });
}
