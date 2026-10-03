#!/usr/bin/env node
/**
 * OpenDesign for ZCode — smoke self-check.
 * Launches the built MCP server as a child process, exercises tools/list and a
 * live search_designs call, and asserts the surface required by PRD §7.
 * Exits 0 only when all gates pass.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const SERVER = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(import.meta.dirname, "..", "dist", "mcp", "server.js");
const BASE = "https://opendesign.cc";

let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
}

const child = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
let stderr = "";
child.stderr.on("data", (d) => (stderr += d.toString()));

function send(req) {
  child.stdin.write(JSON.stringify(req) + "\n");
}

/** Send a JSON-RPC request and collect its single-line JSON response. */
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1_000_000);
    const onData = (chunk) => {
      const text = chunk.toString();
      const lines = text.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === id) {
          child.stdout.off("data", onData);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      }
    };
    child.stdout.on("data", onData);
    send({ jsonrpc: "2.0", id, method, params });
    setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 25_000);
  });
}

try {
  // Gate 1: tools/list returns exactly the 7 OpenDesign tools. PRD §7 M1.
  const tools = await call("tools/list");
  const names = tools.tools.map((t) => t.name).sort();
  const expected = [
    "get_critique_rubric",
    "get_design_system",
    "get_director_protocol",
    "list_designs",
    "recommend_references",
    "search_designs",
    "fetch_design_spec_markdown",
  ];
  check("tools/list returns 7 tools", tools.tools.length === 7, `${tools.tools.length} found`);
  check("tools are the 7 OpenDesign tools", JSON.stringify(names) === JSON.stringify(expected.slice().sort()), names.join(", "));

  // Gate 2: server name is opendesign (mcp__opendesign__<tool> mapping). PRD §4.1.
  const init = await call("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    clientInfo: { name: "opendesign-smoke", version: "1.0.0" },
  });
  check("server name is opendesign", init.serverInfo.name === "opendesign", JSON.stringify(init.serverInfo));

  // Gate 3 (network): search_designs returns ranked slug matches. PRD §7 M2.
  const res = await call("tools/call", {
    name: "search_designs",
    arguments: { query: "linear", limit: 5 },
  });
  const text = res.content[0].text;
  const parsed = JSON.parse(text);
  const hasLinear = (parsed.designs || []).some((d) => d.slug === "linear");
  check("search_designs('linear') finds the linear slug", hasLinear, `count=${parsed.count}`);

  // Gate 4 (network): get_design_system returns real tokens. PRD §7.
  const sys = await call("tools/call", {
    name: "get_design_system",
    arguments: { slug: "mercury" },
  });
  const sysText = JSON.parse(sys.content[0].text);
  check("get_design_system returns a slug + resources", sysText.slug === "mercury" && !!sysText.resources, JSON.stringify(Object.keys(sysText)));

  console.log(`\nstderr (if any): ${stderr.trim().slice(0, 200) || "(empty)"}`);
} catch (err) {
  console.error("SMOKE CHECK ERROR:", err?.message || err);
  failures++;
} finally {
  child.stdin.end();
  const code = (failures === 0) ? 0 : 1;
  console.log(`\n${failures === 0 ? "ALL GATES PASS" : failures + " GATE(S) FAILED"}`);
  process.exitCode = code;
}
