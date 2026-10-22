// Draws the STACK card (folders + ~/stack tree) in the style of santimh.dev.
// Icons and the Geist Mono font are embedded, so the SVG renders the same inside GitHub's <img>.
// Run: node scripts/build-stack.mjs  →  assets/stack-dark.svg, assets/stack-light.svg

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = join(ROOT, 'assets/stack');
const FONTS = join(ROOT, 'assets/fonts');

/* ============ DATA ============ */
// [name, icon, darkIcon?] — the first three of each group go on the folder's cards.
const GROUPS = [
  { label: ['Languages'], dir: 'languages', back: '#5c83b2', front: '#648fc2', items: [
    ['TypeScript', 'typescript.svg'], ['JavaScript', 'javascript.svg'], ['Python', 'python.svg'],
    ['Java', 'java.svg'], ['PHP', 'php.svg', 'php_dark.svg'], ['C#', 'csharp.svg'],
    ['HTML5', 'html5.svg'], ['CSS', 'css_old.svg'], ['MATLAB', 'matlab.svg']] },
  { label: ['Frontend'], dir: 'frontend', back: '#3e8ba4', front: '#4498b3', items: [
    ['React', 'react_light.svg', 'react_dark.svg'], ['Next.js', 'nextjs_icon_dark.svg'], ['Tailwind CSS', 'tailwindcss.svg'],
    ['shadcn/ui', 'shadcn-ui.svg', 'shadcn-ui_dark.svg'], ['Motion', 'motion.svg', 'motion_dark.svg'], ['Vite', 'vite.svg']] },
  { label: ['Backend', '& data'], dir: 'backend-and-data', back: '#5c8f65', front: '#649c6e', items: [
    ['Node.js', 'nodejs.svg'], ['Prisma', 'prisma.svg', 'prisma_dark.svg'], ['PostgreSQL', 'postgresql.svg'],
    ['SQL Server', 'sql-server.svg'], ['MySQL', 'mysql-icon-light.svg', 'mysql-icon-dark.svg'],
    ['MongoDB', 'mongodb-icon-light.svg', 'mongodb-icon-dark.svg'], ['Express', 'expressjs.svg', 'expressjs_dark.svg'],
    ['.NET', 'dotnet.svg'], ['Zod', 'zod.svg']] },
  { label: ['AI'], dir: 'ai', back: '#ac6f5b', front: '#bb7963', items: [
    ['Claude', 'claude-ai-icon.svg'], ['OpenAI', 'openai.svg', 'openai_dark.svg'], ['Codex', 'codex_light.svg', 'codex_dark.svg'],
    ['Gemini', 'gemini.svg'], ['GitHub Copilot', 'copilot.svg', 'copilot_dark.svg'],
    ['Groq', 'groq.svg'], ['Ollama', 'ollama_light.svg', 'ollama_dark.svg'], ['Bolt', 'bolt-new.svg', 'bolt-new_dark.svg']] },
  { label: ['Testing', '& workflow'], dir: 'testing-and-workflow', back: '#8277ae', front: '#8e82be', items: [
    ['Vitest', 'vitest.svg'], ['Playwright', 'playwright.svg'], ['Jest', 'jest.svg'],
    ['Testing Library', 'testinglibrary.svg'], ['GitHub Actions', 'githubactions.svg'], ['Linear', 'linear.svg'], ['Jira', 'jira.svg']] },
  { label: ['Tools', '& cloud'], dir: 'tools-and-cloud', back: '#9a7b43', front: '#a88649', items: [
    ['Vercel', 'vercel.svg', 'vercel_dark.svg'], ['Azure', 'azure.svg'], ['Grafana', 'grafana.svg'],
    ['Auth0', 'auth0.svg'], ['Resend', 'resend-icon-black.svg', 'resend-icon-white.svg'], ['Git', 'git.svg'],
    ['GitHub', 'github_light.svg', 'github_dark.svg'], ['Figma', 'figma.svg'], ['Notion', 'notion.svg']] },
];

/* ============ THEMES (from santimh.dev) ============ */
const THEMES = {
  dark: { bg: '#090a0c', stroke: '#1e2126', panel: '#111317', line: '#1e2126', fg: '#f5f7fa', file: '#f5f7fa', muted: '#767c86' },
  light: { bg: '#fcfcfd', stroke: '#e8eaee', panel: '#eceef2', line: '#dfe2e7', fg: '#14161a', file: '#4a515d', muted: '#646b76' },
};
const CARD = ['#e5e5e5', '#f2f2f2', '#ffffff'];

/* ============ HELPERS ============ */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const b64 = file => readFileSync(file).toString('base64');
const iconCache = new Map();
const icon = file => {
  if (!iconCache.has(file)) iconCache.set(file, `data:image/svg+xml;base64,${b64(join(ICONS, file))}`);
  return iconCache.get(file);
};
const r = n => Math.round(n * 100) / 100;

/* ============ LAYOUT ============ */
const W = 880, PAD = 32;
const FW = 84, FH = 67, FOLDER_Y = 132, LIFT = 8, OPEN = 0;
const PANEL_Y = 270, ROW = 22, COLS = 3, TREE_PAD = 14;
const colW = (W - 2 * PAD - 2 * TREE_PAD) / COLS;
const rowsTop = Math.max(...GROUPS.slice(0, 3).map(g => g.items.length + 1));
const rowsBottom = Math.max(...GROUPS.slice(3).map(g => g.items.length + 1));
const PANEL_H = 44 + 14 + rowsTop * ROW + 18 + rowsBottom * ROW + 14;
const H = PANEL_Y + PANEL_H + PAD;
const total = GROUPS.reduce((n, g) => n + g.items.length, 0);

/* ============ PIECES ============ */
function folder(g, cx, t, open) {
  const x = cx - FW / 2, y = FOLDER_Y - (open ? LIFT : 0);
  const parts = [];
  const label = () => g.label.forEach((line, i) => parts.push(`<text x="${cx}" y="${FOLDER_Y + FH + 24 + i * 15}" text-anchor="middle" class="${open ? 'm5' : 'm'}" font-size="12" fill="${open ? t.fg : t.muted}">${esc(line)}</text>`));
  if (!open) {
    parts.push(`<rect x="${r(x)}" y="${r(y - FH * 0.105)}" width="${r(FW * 0.3)}" height="${r(FH * 0.2)}" rx="5" fill="${g.back}"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="${FW}" height="${FH}" rx="10" fill="${g.back}"/>`);
    parts.push(`<rect x="${x}" y="${r(y + FH * 0.1)}" width="${FW}" height="${r(FH * 0.9)}" rx="10" fill="${g.front}"/>`);
    label();
    return parts.join('\n    ');
  }
  // back panel + tab
  parts.push(`<rect x="${r(x + FW * 0.02)}" y="${r(y - FH * 0.105)}" width="${r(FW * 0.3)}" height="${r(FH * 0.16)}" rx="5" fill="${g.back}"/>`);
  parts.push(`<path d="M${x} ${y} H${x + FW - 10} Q${x + FW} ${y} ${x + FW} ${y + 10} V${y + FH - 10} Q${x + FW} ${y + FH} ${x + FW - 10} ${y + FH} H${x + 10} Q${x} ${y + FH} ${x} ${y + FH - 10} Z" fill="${g.back}"/>`);
  // cards (left, right, centre-front)
  const specs = [[0.7, -1.2, -0.7, -15], [0.8, 0.1, -0.7, 15], [0.9, -0.5, -1.0, 5]];
  specs.forEach(([wk, tx, ty, rot], i) => {
    const item = g.items[i]; if (!item) return;
    const cw = FW * wk, ch = FH * 0.8;
    const x0 = x + FW / 2, y0 = y + FH * 0.9 - ch;
    const ccx = x0 + cw / 2 + tx * cw, ccy = y0 + ch / 2 + ty * ch;
    const s = ch * 0.42;
    parts.push(`<g transform="translate(${r(ccx)} ${r(ccy)}) rotate(${rot})">` +
      `<rect x="${r(-cw / 2)}" y="${r(-ch / 2)}" width="${r(cw)}" height="${r(ch)}" rx="10" fill="${CARD[i]}" stroke="rgba(0,0,0,0.06)"/>` +
      `<image href="${icon(item[1])}" x="${r(-s / 2)}" y="${r(-s / 2)}" width="${r(s)}" height="${r(s)}"/></g>`);
  });
  // open front flap
  const ty = y + FH * 0.36, by = y + FH, k = 7;
  const tl = x - FW * 0.06, tr = x + FW * 1.06, bl = x + FW * 0.05, br = x + FW * 0.95;
  parts.push(`<path d="M${r(tl + k)} ${r(ty)} H${r(tr - k)} Q${r(tr)} ${r(ty)} ${r(tr - 1)} ${r(ty + k)} L${r(br + 1)} ${r(by - k)} Q${r(br)} ${r(by)} ${r(br - k)} ${r(by)} H${r(bl + k)} Q${r(bl)} ${r(by)} ${r(bl - 1)} ${r(by - k)} L${r(tl + 1)} ${r(ty + k)} Q${r(tl)} ${r(ty)} ${r(tl + k)} ${r(ty)} Z" fill="${g.front}"/>`);
  label();
  return parts.join('\n    ');
}

function tree(g, x, y, t, dark) {
  const right = x + colW - 10, out = [];
  const midY = y + ROW / 2;
  // chevron (open) + folder glyph + name + count
  out.push(`<path d="M${x + 4} ${midY - 2} l3.5 3.5 l3.5 -3.5" fill="none" stroke="${t.muted}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`);
  out.push(`<path d="M${x + 20} ${midY - 5} h4.5 l1.6 1.8 h6.4 a1.2 1.2 0 0 1 1.2 1.2 v7 a1.2 1.2 0 0 1 -1.2 1.2 h-11.3 a1.2 1.2 0 0 1 -1.2 -1.2 Z" fill="${g.front}" fill-opacity="0.3" stroke="${g.front}" stroke-width="1.3" stroke-linejoin="round"/>`);
  out.push(`<text x="${x + 42}" y="${midY + 4.5}" class="m5" font-size="13" fill="${t.fg}">${esc(g.dir)}</text>`);
  out.push(`<text x="${right}" y="${midY + 4}" text-anchor="end" class="m" font-size="11" fill="${t.muted}">${g.items.length} files</text>`);
  // guide line
  out.push(`<line x1="${x + 7.5}" y1="${y + ROW + 2}" x2="${x + 7.5}" y2="${y + ROW * (g.items.length + 1) - 2}" stroke="${t.line}"/>`);
  g.items.forEach(([name, light, darkIcon], i) => {
    const ry = y + ROW * (i + 1), my = ry + ROW / 2;
    out.push(`<image href="${icon(dark && darkIcon ? darkIcon : light)}" x="${x + 21}" y="${my - 7}" width="14" height="14"/>`);
    out.push(`<text x="${x + 42}" y="${my + 4.5}" class="m" font-size="13" fill="${t.file}">${esc(name)}</text>`);
    out.push(`<text x="${right}" y="${my + 4}" text-anchor="end" class="m" font-size="11" fill="${t.muted}">${String(i + 1).padStart(2, '0')}</text>`);
  });
  return out.join('\n    ');
}

/* ============ CARD ============ */
function build(mode) {
  const t = THEMES[mode], dark = mode === 'dark';
  const f400 = b64(join(FONTS, 'geist-mono-latin-400-normal.woff2'));
  const f500 = b64(join(FONTS, 'geist-mono-latin-500-normal.woff2'));
  const step = (W - 2 * PAD) / GROUPS.length;
  const folders = GROUPS.map((g, i) => folder(g, PAD + step * (i + 0.5), t, i === OPEN)).join('\n    ');
  const treeTop = PANEL_Y + 44 + 14;
  const trees = GROUPS.map((g, i) => {
    const col = i % COLS, row = Math.floor(i / COLS);
    return tree(g, PAD + TREE_PAD + col * colW, treeTop + row * (rowsTop * ROW + 18), t, dark);
  }).join('\n    ');
  const names = GROUPS.flatMap(g => g.items.map(i => i[0])).join(', ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack: ${esc(names)}">
  <style>
    @font-face { font-family: "GM"; font-weight: 400; src: url(data:font/woff2;base64,${f400}) format("woff2"); }
    @font-face { font-family: "GM"; font-weight: 500; src: url(data:font/woff2;base64,${f500}) format("woff2"); }
    .m { font-family: "GM", ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-weight: 400; }
    .m5 { font-family: "GM", ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-weight: 500; }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.bg}" stroke="${t.stroke}"/>
  <text x="${PAD}" y="42" class="m" font-size="12" letter-spacing="1.4" fill="${t.muted}">STACK</text>
  <text x="${W - PAD}" y="42" text-anchor="end" class="m" font-size="11" fill="${t.muted}">${total} TOOLS · ${GROUPS.length} FOLDERS</text>
  <g>
    ${folders}
  </g>
  <rect x="${PAD}" y="${PANEL_Y}" width="${W - 2 * PAD}" height="${PANEL_H}" rx="10" fill="${t.panel}"/>
  <text x="${PAD + 14}" y="${PANEL_Y + 27}" class="m" font-size="12" fill="${t.muted}">~/stack</text>
  <line x1="${PAD}" y1="${PANEL_Y + 44}" x2="${W - PAD}" y2="${PANEL_Y + 44}" stroke="${t.line}"/>
  <g>
    ${trees}
  </g>
</svg>
`;
}

for (const mode of ['dark', 'light']) {
  const svg = build(mode);
  writeFileSync(join(ROOT, `assets/stack-${mode}.svg`), svg);
  console.log(`assets/stack-${mode}.svg  ${(svg.length / 1024).toFixed(0)} KB`);
}
