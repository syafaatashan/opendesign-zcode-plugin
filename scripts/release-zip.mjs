#!/usr/bin/env node
/**
 * Build a ZCode-installable `plugin.zip` (+ plugin.zip.sha256) from the cache layout.
 *
 * ZCode installs "filesystem"/cache plugins by extracting a zip whose root is the plugin
 * cache directory contents (dist/, skills/, commands/, hooks/, scripts/, package.json,
 * .mcp.json, .zcode-plugin/plugin.json, .zcode-plugin-seed.json).
 *
 * Pure-Node writer: deflate via zlib.deflateRawSync (method 8), crc32 via zlib.crc32.
 * No `zip`/`7z` dependency.
 *
 * Usage: node scripts/release-zip.mjs [target-cache-dir]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { deflateRawSync, crc32 } from "node:zlib";
import { join, sep } from "node:path";
import { createHash } from "node:crypto";

const args = process.argv.slice(2);
const home = process.env.USERPROFILE || "/c/Users/M SYAFA'AT ASHAN";
const target =
  args[0] ||
  join(home, ".zcode", "cli", "plugins", "cache", "zcode-plugins-official", "opendesign", "0.1.0");

const outDir = join(process.cwd(), "release");
mkdirSync(outDir, { recursive: true });
const zipPath = join(outDir, "plugin.zip");
const shaPath = join(outDir, "plugin.zip.sha256");

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

function dosTime(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = (d.getFullYear() - 1980) << 9 | (d.getMonth() + 1) << 5 | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}
const dt = dosTime();

// ---- Walk the cache dir into a flat list of entries ----
const files = []; // { name: "/", data }
const dirs = new Set();

function walk(dir, prefix) {
  if (prefix) dirs.add(prefix);
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, rel);
    else if (e.isFile()) files.push({ name: rel.split(sep).join("/"), data: readFileSync(full) });
  }
}
walk(target, "");

// ---- Build the zip ----
const CHUNK_SIZE = 1 << 16; // 64KB
const chunks = [];
let cursor = 0; // current length of the whole output

function emit(buf) {
  chunks.push(buf);
  cursor += buf.length;
}

const central = [];

// Local file header: 30 bytes + name
function localHeader(nameBuf, method, crc, compLen, uncompLen) {
  const h = Buffer.alloc(30);
  h.writeUInt32LE(SIG_LOCAL, 0);
  h.writeUInt16LE(20, 4); // version needed
  h.writeUInt16LE(0, 6); // flags
  h.writeUInt16LE(method, 8);
  h.writeUInt16LE(dt.time, 10);
  h.writeUInt16LE(dt.date, 12);
  h.writeUInt32LE(crc, 14);
  h.writeUInt32LE(compLen, 18);
  h.writeUInt32LE(uncompLen, 22);
  h.writeUInt16LE(nameBuf.length, 26);
  h.writeUInt16LE(0, 28); // extra length
  return h;
}

for (const d of [...dirs].sort()) {
  const name = d + "/";
  const nameBuf = Buffer.from(name, "utf8");
  const localOff = cursor;
  emit(localHeader(nameBuf, 0, 0, 0, 0));
  emit(nameBuf);
  central.push({ name: nameBuf, method: 0, crc: 0, compLen: 0, uncompLen: 0, localOff });
}

for (const f of files) {
  const nameBuf = Buffer.from(f.name, "utf8");
  const comp = deflateRawSync(f.data);
  const crc = crc32(f.data);
  const localOff = cursor;
  emit(localHeader(nameBuf, 8, crc, comp.length, f.data.length));
  emit(nameBuf);
  emit(comp);
  central.push({ name: nameBuf, method: 8, crc, compLen: comp.length, uncompLen: f.data.length, localOff });
}

const cdStart = cursor;
for (const e of central) {
  const cdh = Buffer.alloc(46);
  cdh.writeUInt32LE(SIG_CENTRAL, 0);
  cdh.writeUInt16LE(20, 4); // version made by
  cdh.writeUInt16LE(20, 6); // version needed
  cdh.writeUInt16LE(0, 8); // flags
  cdh.writeUInt16LE(e.method, 10);
  cdh.writeUInt16LE(dt.time, 12);
  cdh.writeUInt16LE(dt.date, 14);
  cdh.writeUInt32LE(e.crc, 16);
  cdh.writeUInt32LE(e.compLen, 20);
  cdh.writeUInt32LE(e.uncompLen, 24);
  cdh.writeUInt16LE(e.name.length, 28);
  cdh.writeUInt16LE(0, 30); // extra
  cdh.writeUInt16LE(0, 32); // comment
  cdh.writeUInt16LE(0, 34); // disk start
  cdh.writeUInt16LE(0, 36); // internal attrs
  cdh.writeUInt32LE(0, 38); // external attrs
  cdh.writeUInt32LE(e.localOff, 42);
  emit(cdh);
  emit(e.name);
}

const cdSize = cursor - cdStart;
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(SIG_EOCD, 0);
eocd.writeUInt16LE(0, 4); // disk
eocd.writeUInt16LE(0, 6); // cd disk
eocd.writeUInt16LE(central.length, 8); // entries this disk
eocd.writeUInt16LE(central.length, 10); // total entries
eocd.writeUInt32LE(cdSize, 12); // cd size
eocd.writeUInt32LE(cdStart, 16); // cd offset
eocd.writeUInt16LE(0, 20); // comment length
emit(eocd);

writeFileSync(zipPath, Buffer.concat(chunks));

const sha = createHash("sha256").update(Buffer.concat(chunks)).digest("hex");
writeFileSync(shaPath, `${sha}  plugin.zip\n`);

const sizeKB = (Buffer.concat(chunks).length / 1024).toFixed(1);
console.log(`[release-zip] wrote ${zipPath} (${sizeKB} KB, ${central.length} entries)`);
console.log(`[release-zip] wrote ${shaPath} = ${sha}`);
