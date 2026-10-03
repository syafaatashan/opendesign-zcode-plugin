/**
 * OpenDesign core — transport-agnostic tool logic.
 *
 * Port of opendesign.cc's canonical `mcp/lib/core.mjs`, typed for the ZCode-native
 * plugin. Zero runtime deps beyond `@modelcontextprotocol/server` + `zod` (used for
 * inputSchema validation, not for network). All tokens are read live from opendesign.cc
 * via `fetch`, so the server process (not the sandboxed agent) holds network+no-CORS.
 */
import { z, type ZodRawShape } from "zod";

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
}

export const BASE = "https://opendesign.cc";
export const NAME = "opendesign";
export const VERSION = "1.0.0";
export const PROTOCOL = "2024-11-05";

const CATALOG_TTL_MS = 10 * 60 * 1000;

// ── catalog cache ──────────────────────────────────────────────
let _catalog: DesignEntry[] | null = null;
let _catalogAt = 0;

export interface DesignEntry {
  slug: string;
  title: string;
  url: string;
  tags: string[];
  summary: string;
  has_pack?: boolean;
  spec_completeness?: number;
  spec?: unknown;
  [k: string]: unknown;
}

export interface SlimDesign {
  slug: string;
  title: string;
  url: string;
  tags: string[];
  summary: string;
  has_pack: boolean;
  spec_completeness: number | null;
}

export interface Family {
  key: string;
  label: string;
  tags: string[];
}

export interface Recommendation {
  role: "primary" | "alternate";
  slug: string;
  title: string;
  url: string;
  tags: string[];
  summary: string;
  family: string;
  why: string;
}

async function httpGet(path: string, json = false): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "opendesign-mcp/1.0",
        Accept: json ? "application/json" : "text/markdown,text/plain,*/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function catalog(): Promise<DesignEntry[]> {
  const now = Date.now();
  if (!_catalog || now - _catalogAt > CATALOG_TTL_MS) {
    try {
      const d = await httpGet("/catalog.json", true);
      const parsed: unknown = JSON.parse(d);
      _catalog = Array.isArray(parsed)
        ? (parsed as DesignEntry[])
        : ((parsed as Record<string, unknown>).designs ??
          (parsed as Record<string, unknown>).sites ??
          (parsed as Record<string, unknown>).entries ??
          []) as DesignEntry[];
      _catalogAt = now;
    } catch (err) {
      if (!_catalog) throw err; // serve stale catalog if we have one
    }
  }
  return _catalog as DesignEntry[];
}

// ── search: light synonym layer ─────────────────────────────────
const SYNONYMS: Record<string, string[]> = {
  japanese: ["japan", "tokyo", "jp"],
  finance: ["fintech", "bank", "banking"],
  banking: ["fintech", "bank", "finance"],
  shop: ["e-commerce", "ecommerce", "store"],
  store: ["e-commerce", "ecommerce", "shop"],
  webgl: ["3d", "three.js", "immersive"],
  "3d": ["webgl", "immersive"],
  developer: ["dev", "developer tools", "devtools"],
  minimalist: ["minimal", "clean"],
  type: ["typography", "foundry"],
  motion: ["animation", "kinetic"],
  crypto: ["web3", "blockchain", "nft"],
  dashboard: ["app ui", "product", "saas"],
};

// ── search: CJK term map (catalog tags are English; users query in CJK) ──
const CN_TERMS: Record<string, string[]> = {
  极简: ["minimal", "minimalist", "clean"], 简约: ["minimal", "clean"], 干净: ["clean"],
  克制: ["restraint", "calm"], 冷静: ["calm"], 高级: ["premium", "refined"],
  精致: ["refined", "refinement"], 奢侈: ["luxury"], 轻奢: ["luxury", "premium"],
  大胆: ["bold", "expressive"], 张扬: ["expressive", "bold"], 实验: ["experimental"],
  实验性: ["experimental"], 前卫: ["experimental", "bold"], 有趣: ["playful"],
  活泼: ["playful", "friendly"], 温暖: ["warm"], 友好: ["friendly"],
  几何: ["geometric"], 网格: ["grid"], 渐变: ["gradient"],
  黑白: ["monochrome"], 单色: ["monochrome"], 深色: ["dark mode", "dark"],
  暗色: ["dark mode", "dark"], 夜间模式: ["dark mode"], 编辑风: ["editorial"],
  杂志风: ["editorial", "publishing"], 排版: ["typography"], 字体: ["typography", "foundry"],
  大字: ["bold typography"], 摄影: ["photographic"], 图片: ["photographic", "gallery"],
  动效: ["motion", "animation"], 动画: ["motion", "animation"], 沉浸: ["webgl", "3d"],
  作品集: ["portfolio"], 个人网站: ["portfolio"], 工作室: ["studio"],
  设计工作室: ["studio", "design"], 代理商: ["agency"], 机构: ["agency"],
  开发者工具: ["developer tools", "developer", "tooling"], 开发工具: ["developer tools", "tooling"],
  程序员: ["developer", "developer tools"], 设计工具: ["design tools"],
  产品: ["product"], 效率: ["productivity"], 生产力: ["productivity"],
  笔记: ["notes"], 协作: ["collaboration"], 仪表盘: ["app ui", "product"],
  后台: ["app ui", "saas"], 移动端: ["mobile ui"], 电商: ["e-commerce", "dtc"],
  购物: ["e-commerce"], 商店: ["e-commerce"], 金融: ["fintech", "finance"],
  理财: ["fintech"], 支付: ["fintech"], 区块链: ["web3", "crypto", "blockchain"],
  加密货币: ["crypto", "web3"], 人工智能: ["ai"], 智能: ["ai"],
  数据: ["data", "analytics"], 分析: ["analytics", "data"], 搜索: ["search"],
  时尚: ["fashion"], 服装: ["fashion", "streetwear"], 潮牌: ["streetwear"],
  美妆: ["beauty"], 家具: ["furniture"], 建筑: ["architecture"],
  博物馆: ["museum"], 艺术: ["art", "gallery"], 画廊: ["gallery"],
  展览: ["gallery", "museum"], 音乐: ["music"], 视频: ["video"],
  食品: ["food"], 饮料: ["beverage"], 咖啡: ["beverage", "food"],
  汽车: ["automotive"], 硬件: ["hardware"], 出版: ["publishing"],
  社区: ["community"], 品牌: ["brand"], 创意: ["creative"],
  精选: ["curation"], 案例: ["case study", "reference"], 参考: ["reference"],
  基础设施: ["infra"], 语音: ["voice"], 聊天: ["chat"],
  日本: ["japan", "tokyo", "jp"], 日式: ["japan", "tokyo"], 东京: ["tokyo"],
  瑞士: ["swiss"], 北欧: ["nordic", "scandinavian"], 德国: ["german"],
};
const CN_KEYS = Object.keys(CN_TERMS).sort((a, b) => b.length - a.length);
const HAS_CJK = /[一-鿿]/;

function scanCJK(s: string): string[] {
  const found: string[] = [];
  let i = 0;
  outer: while (i < s.length) {
    for (const k of CN_KEYS) {
      if (k.length <= s.length - i && s.startsWith(k, i)) { found.push(k); i += k.length; continue outer; }
    }
    i += 1;
  }
  return found.length ? found : [s];
}

function tokenize(q: string): string[] {
  const out: string[] = [];
  for (const part of String(q || "").toLowerCase().split(/\s+/).filter(Boolean)) {
    if (HAS_CJK.test(part)) out.push(...scanCJK(part));
    else out.push(part);
  }
  return out;
}

function probesFor(w: string): string[] {
  return CN_TERMS[w] || [w];
}

function scoreEntry(s: SlimDesign, words: string[], want: Set<string>, matchedTerms: Set<string>): number | null {
  const tagset = new Set(s.tags.map((t) => String(t).toLowerCase()));
  if (want.size && ![...want].some((w) => tagset.has(w))) return null;
  const base = want.size ? 2 : 0;
  let score = base;
  const hay = `${s.slug} ${s.title} ${s.tags.join(" ")} ${s.summary}`.toLowerCase();
  for (const w of words) {
    let hit = 0;
    for (const p of probesFor(w)) {
      if (tagset.has(p)) { hit = Math.max(hit, 3); }
      else if (hay.includes(p)) { hit = Math.max(hit, 1); }
      else {
        for (const syn of SYNONYMS[p] || []) {
          if (tagset.has(syn) || hay.includes(syn)) { hit = Math.max(hit, 2); break; }
        }
      }
    }
    if (hit) { score += hit; matchedTerms.add(w); }
  }
  if (words.length && score === base) return null;
  return score;
}

function slim(e: DesignEntry): SlimDesign {
  return {
    slug: e.slug, title: e.title, url: e.url, tags: e.tags || [],
    summary: e.summary || "", has_pack: !!e.has_pack,
    spec_completeness: typeof e.spec_completeness === "number" ? e.spec_completeness : null,
  };
}

// ── aesthetic families (skill.md §3 routing rule) ───────────────
export const FAMILIES: Family[] = [
  { key: "restraint", label: "Restraint / trust (Swiss, editorial)", tags: ["clean", "premium", "calm", "refined", "restraint", "minimal", "monochrome", "fintech", "refinement"] },
  { key: "dev-tool", label: "Dev-tool / dense", tags: ["dev", "saas", "developer tools", "devtools", "dark mode", "productivity", "tooling", "infra", "tool", "design tools", "developer"] },
  { key: "bold-brand", label: "Bold brand / high-energy", tags: ["bold typography", "playful", "expressive", "consumer", "warm", "friendly"] },
  { key: "motion", label: "Motion / experimental (WebGL, studio)", tags: ["experimental", "geometric", "ai", "hardware"] },
  { key: "type-craft", label: "Type-driven / quiet-craft", tags: ["editorial", "typography", "portfolio", "photographic", "studio", "gallery", "type", "foundry", "museum", "reference", "fashion", "beauty"] },
];

function classifyFamily(tags: string[]): Family {
  const t = new Set((tags || []).map((x) => String(x).toLowerCase()));
  let best: Family | null = null;
  let bestScore = 0;
  for (const fam of FAMILIES) {
    const score = fam.tags.reduce((n, tag) => n + (t.has(tag) ? 1 : 0), 0);
    if (score > bestScore) { best = fam; bestScore = score; }
  }
  return best || FAMILIES[0];
}

// ── Tool input schemas (zod; the SDK converts these to JSON Schema for tools/list) ──
export const TOOLS = [
  {
    name: "search_designs",
    title: "Search OpenDesign",
    description:
      "Search the OpenDesign library by need. `query` words are score-ranked (tag hit strongest; any word may match — NOT strict AND; check `unmatched_terms` in the result for query words that hit nothing). `tags` is the only hard filter. Returns slim matches — then call get_design_system for the real tokens. e.g. search_designs('fintech trust restrained') or search_designs('', ['ai','minimal']).",
    inputSchema: {
      query: z.string().default(""),
      tags: z.array(z.string()).default([]),
      limit: z.number().int().min(1).default(20),
    },
  },
  {
    name: "list_designs",
    title: "Browse OpenDesign Catalog",
    description: "Browse the catalog (slim: slug/title/tags/summary). Paginated; use to get an overview of what's available. Prefer search_designs when you have a need.",
    inputSchema: {
      limit: z.number().int().min(1).default(40),
      offset: z.number().int().min(0).default(0),
    },
  },
  {
    name: "get_design_system",
    title: "Get Design System Tokens",
    description:
      "THE core tool. Get a site's grounded design tokens (real colors, typography scale, spacing, surfaces, layout, motion — extracted from the live site, verified against computed styles), plus resource URLs (full 11-layer spec, screenshots ZIP). Build with THESE actual values, not from memory. `slug` is from search_designs/list_designs (e.g. 'linear', 'stripe', 'mercury').",
    inputSchema: { slug: z.string().min(1) },
  },
  {
    name: "fetch_design_spec_markdown",
    title: "Fetch Full Design Spec (Markdown)",
    description:
      "Get a site's full DESIGN_SPEC as Markdown (the readable 11-layer spec incl. voice + anti-patterns/donts) — ideal to drop straight into a prompt. `lang` optional: en (default) / zh-CN / ja / ko / zh-TW.",
    inputSchema: {
      slug: z.string().min(1),
      lang: z.string().default("en"),
    },
  },
  {
    name: "get_director_protocol",
    title: "Design Director Protocol",
    description: "Read the OpenDesign design-director protocol (skill.md) — how to diagnose the need, give a professional point of view, route to real references, and decompose them into a grounded build. Read this first to act as a design director.",
    inputSchema: {},
  },
  {
    name: "recommend_references",
    title: "Recommend Design References",
    description:
      "Task-oriented routing (skill.md step 3): given a brief, return 1 primary + 2 alternates picked from DIFFERENT aesthetic families on purpose — the classic safe/bold/unexpected spread — instead of 3 near-duplicates. Family diversity is enforced in code, not left to chance. Then call get_design_system on the one the user picks.",
    inputSchema: {
      query: z.string().default(""),
      tags: z.array(z.string()).default([]),
    },
  },
  {
    name: "get_critique_rubric",
    title: "Design Critique Rubric",
    description:
      "The OpenDesign 5-dimension critique rubric (skill.md 'when asked to review a design'): reference fidelity, visual hierarchy, craft, function, originality — each scored 0-10, plus the Keep/Fix/Quick-wins output shape. Apply it yourself against the design in front of you.",
    inputSchema: {},
  },
] satisfies ToolDef[];

// ── tool implementations ───────────────────────────────────────

async function searchDesigns(args: { query?: string; tags?: string[]; limit?: number }) {
  const items = await catalog();
  const q = String(args.query || "").toLowerCase().trim();
  const want = new Set((args.tags || []).map((t) => String(t).toLowerCase()));
  const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 100);
  const words = tokenize(q);
  const matchedTerms = new Set<string>();
  const scored: { s: SlimDesign; score: number }[] = [];
  for (const e of items) {
    const s = slim(e);
    const score = scoreEntry(s, words, want, matchedTerms);
    if (score === null) continue;
    let adj = score;
    adj += (typeof e.spec_completeness === "number" ? e.spec_completeness : 0.5) * 0.5;
    scored.push({ s, score: adj });
  }
  scored.sort((a, b) => b.score - a.score);
  const out = scored.slice(0, limit).map((x) => x.s);
  const unmatched = words.filter((w) => !matchedTerms.has(w));
  const res: { query: string; tags: string[]; count: number; designs: SlimDesign[]; unmatched_terms?: string[]; warning?: string } = {
    query: args.query || "",
    tags: args.tags || [],
    count: out.length,
    designs: out,
  };
  if (unmatched.length) {
    res.unmatched_terms = unmatched;
    res.warning = `These query terms matched nothing in the catalog: ${unmatched.join(", ")}. Results only reflect the remaining terms — do not present them as covering the full query.`;
  }
  return res;
}

async function listDesigns(args: { limit?: number; offset?: number }) {
  const items = await catalog();
  const limit = Math.min(Math.max(Number(args.limit) || 40, 1), 100);
  const offset = Math.max(0, Number(args.offset) || 0);
  const rows = items.slice(offset, offset + limit).map(slim);
  return { total: items.length, offset, limit, has_more: offset + limit < items.length, designs: rows };
}

async function getDesignSystem(args: { slug: string }) {
  const slug = args.slug;
  if (!slug) throw new Error("slug required");
  const items = await catalog();
  const e = items.find((x) => x.slug === slug);
  if (!e) {
    const sample = items.slice(0, 25).map((x) => x.slug).join(", ");
    throw new Error(`No slug '${slug}'. Use search_designs/list_designs. Sample slugs: ${sample} …`);
  }
  let spec: unknown = null;
  try { spec = JSON.parse(await httpGet(`/packs/${slug}/spec.json`, true)); } catch { /* no pack → null */ }
  const folder = `${BASE}/packs/${slug}/`;
  return {
    slug, title: e.title, url: e.url, tags: e.tags || [], summary: e.summary || "",
    tokens: spec,
    resources: {
      design_spec_md: `${folder}DESIGN_SPEC.en.md`,
      design_md: `${folder}DESIGN.md`,
      spec_json: `${folder}spec.json`,
      pack_zip: `${folder}${slug}-design-pack.zip`,
      screenshots_folder: folder,
      detail_page: `${BASE}/en/sites/${slug}`,
    },
    note: spec ? "tokens are real, grounded against the live site's computed styles." : "tier-1 entry: no full pack yet — use the detail_page / original url as reference.",
  };
}

async function fetchDesignSpecMarkdown(args: { slug: string; lang?: string }) {
  const slug = String(args.slug || "");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error("invalid slug (expected kebab-case, e.g. 'linear')");
  const LANGS = ["en", "zh-CN", "zh-TW", "ja", "ko"];
  const lang = (args.lang || "en").replace(/^zh$/, "zh-CN");
  if (!LANGS.includes(lang)) throw new Error(`invalid lang '${args.lang}' — use one of ${LANGS.join("/")}`);
  try {
    return await httpGet(`/packs/${slug}/DESIGN_SPEC.${lang}.md`);
  } catch {
    const md = await httpGet(`/packs/${slug}/DESIGN_SPEC.en.md`);
    return lang === "en" ? md : `> (requested ${lang}, served en — no ${lang} spec for this pack)\n\n${md}`;
  }
}

async function getDirectorProtocol() {
  return await httpGet("/skill.md");
}

async function recommendReferences(args: { query?: string; tags?: string[] }) {
  const items = await catalog();
  const q = String(args.query || "").toLowerCase().trim();
  const want = new Set((args.tags || []).map((t) => String(t).toLowerCase()));
  const words = tokenize(q);
  const matchedTerms = new Set<string>();
  const scored: { s: SlimDesign; score: number; family: Family }[] = [];
  for (const e of items) {
    const s = slim(e);
    const score = scoreEntry(s, words, want, matchedTerms);
    if (score === null) continue;
    let adj = score;
    adj += (typeof e.spec_completeness === "number" ? e.spec_completeness : 0.5) * 0.5;
    scored.push({ s, score: adj, family: classifyFamily(s.tags) });
  }
  scored.sort((a, b) => b.score - a.score);
  if (!scored.length) {
    return { query: args.query || "", tags: args.tags || [], picks: [], note: "No matches — try broader terms or fewer tag filters." };
  }
  const unmatchedRec = words.filter((w) => !matchedTerms.has(w));

  const why = (c: { s: SlimDesign; family: Family }) =>
    `${c.s.title} reads ${c.family.label.toLowerCase()} — tagged ${(c.s.tags.slice(0, 3).join(", ") || "n/a")}. ${c.s.summary || ""}`.trim();

  const primary = scored[0];
  const usedFamilies = new Set([primary.family.key]);
  const alternates: { s: SlimDesign; score: number; family: Family }[] = [];
  for (const c of scored.slice(1)) {
    if (alternates.length >= 2) break;
    if (usedFamilies.has(c.family.key)) continue;
    alternates.push(c);
    usedFamilies.add(c.family.key);
  }
  if (alternates.length < 2) {
    for (const c of scored.slice(1)) {
      if (alternates.length >= 2) break;
      if (alternates.includes(c) || c === primary) continue;
      alternates.push(c);
    }
  }

  const label = (c: { s: SlimDesign; family: Family }, role: "primary" | "alternate"): Recommendation => ({
    role, slug: c.s.slug, title: c.s.title, url: c.s.url, tags: c.s.tags,
    summary: c.s.summary, family: c.family.label, why: why(c),
  });
  const recRes: { query: string; tags: string[]; picks: Recommendation[]; next_step: string; unmatched_terms?: string[]; warning?: string } = {
    query: args.query || "",
    tags: args.tags || [],
    picks: [label(primary, "primary"), ...alternates.map((c) => label(c, "alternate"))],
    next_step: "Call get_design_system(slug) on whichever the user picks to get its actual grounded tokens.",
  };
  if (unmatchedRec.length) {
    recRes.unmatched_terms = unmatchedRec;
    recRes.warning = `These query terms matched nothing: ${unmatchedRec.join(", ")}. The picks reflect only the remaining terms.`;
  }
  return recRes;
}

async function getCritiqueRubric() {
  return {
    instructions: "Apply this yourself against the design in front of you — this tool returns the rubric, it does not see or judge anything server-side. Score each dimension 0-10, then output Keep / Fix / Quick-wins.",
    dimensions: [
      { key: "reference_fidelity", question: "Does it honor a real system, or is it generic?", check: "squint test — blur your eyes, is the hierarchy still legible?" },
      { key: "visual_hierarchy", question: "Does the eye flow where intended?", check: "title:body contrast ≥ 2.5×" },
      { key: "craft", question: "Alignment, spacing rhythm, restraint.", check: "one grid, ≤3-4 colors, ≤2 type families" },
      { key: "function", question: "Would removing any element make it worse?", check: "if not, it's filler — cut it" },
      { key: "originality", question: "A signature move, or template clichés?", check: 'e.g. a gradient orb defaulting to "AI" is a cliché, not a choice' },
    ],
    output_shape: {
      total: "sum of the 5 scores, out of 50",
      keep: "what's actually working — be specific, not generic praise",
      fix: "tag each issue ⚠️ fatal / ⚡ important / 💡 polish",
      quick_wins: "top 3 five-minute fixes, ordered by impact",
    },
    note: "Critique the design, not the designer.",
  };
}

/** Dispatch a tool call by name. Returns a JSON-serializable value. */
export async function callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  switch (name) {
    case "search_designs": return await searchDesigns(args as Parameters<typeof searchDesigns>[0]);
    case "list_designs": return await listDesigns(args as Parameters<typeof listDesigns>[0]);
    case "get_design_system": return await getDesignSystem(args as { slug: string });
    case "fetch_design_spec_markdown": return await fetchDesignSpecMarkdown(args as Parameters<typeof fetchDesignSpecMarkdown>[0]);
    case "get_director_protocol": return await getDirectorProtocol();
    case "recommend_references": return await recommendReferences(args as Parameters<typeof recommendReferences>[0]);
    case "get_critique_rubric": return await getCritiqueRubric();
    default: throw new Error(`unknown tool: ${name}`);
  }
}
