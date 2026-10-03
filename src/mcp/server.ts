#!/usr/bin/env node
/**
 * OpenDesign for ZCode — MCP server.
 *
 * Exposes the 7 OpenDesign tools under ZCode server name `opendesign`, so ZCode maps
 * them to `mcp__opendesign__<tool>` (see SKILL.md). stdio transport; all fetching happens
 * in this process against opendesign.cc so ZCode's sandbox URL policy is bypassed.
 *
 * Build: `npm run build` (esbuild → dist/mcp/server.js).
 */
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { TOOLS, callTool, NAME, VERSION } from "../lib/core.js";

const server = new McpServer({ name: NAME, version: VERSION });

for (const t of TOOLS) {
  server.registerTool(
    t.name,
    { title: t.title, description: t.description, inputSchema: t.inputSchema },
    async (args: Record<string, unknown>) => {
      try {
        const result = await callTool(t.name, args);
        const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
        return { content: [{ type: "text", text }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
      }
    },
  );
}

export function main(): Promise<void> {
  return server.connect(new StdioServerTransport());
}

// This is a stdio MCP server: it runs directly as a process and is never
// imported in-process, so connection boots unconditionally (canonical MCP pattern).
main().catch((err) => {
  console.error("Fatal error in main():", err);
  process.exit(1);
});
