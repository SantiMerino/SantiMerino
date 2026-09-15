/**
 * Draws the two cards as SVG, in the portfolio's own tokens — same palette,
 * same type, same rounded card as the banner. Nothing here talks to the
 * network; it takes the numbers and returns a string.
 */

export const THEMES = {
  dark: {
    bg: '#090a0c', line: '#1e2126', strong: '#2a2e35', fg: '#f5f7fa',
    muted: '#9ea4ae', faint: '#767c86', accent: '#16bf5e', empty: '#16181d',
  },
  light: {
    bg: '#fcfcfd', line: '#e8eaee', strong: '#d8dce2', fg: '#0b0c0e',
    muted: '#4a515d', faint: '#646b76', accent: '#16a34a', empty: '#eceef2',
  },
}

const SANS = "Inter, 'Segoe UI', Helvetica, Arial, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'Geist Mono', Menlo, Consolas, monospace"

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const num = (n) => n.toLocaleString('en-US')

/** The five shades a day can take, mirroring GitHub's own scale. */
const LEVELS = [0, 1, 3, 6, 10]
const OPACITY = [0, 0.3, 0.5, 0.75, 1]

const level = (count) => {
  let l = 0
  for (let i = 1; i < LEVELS.length; i++) if (count >= LEVELS[i]) l = i
  return l
}

function card(t, width, height, title, note, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="16" fill="${t.bg}" stroke="${t.line}"/>
  <text x="32" y="42" font-family="${MONO}" font-size="12" letter-spacing="1.4" fill="${t.faint}">${esc(title)}</text>
  <text x="${width - 32}" y="42" text-anchor="end" font-family="${MONO}" font-size="11" fill="${t.faint}">${esc(note)}</text>
${body}
</svg>
`
}

/** Big number over a small label — the card's unit of measure. */
function metric(t, x, y, value, label, accent = false) {
  return `  <text x="${x}" y="${y}" font-family="${SANS}" font-size="34" font-weight="600" letter-spacing="-0.6" fill="${accent ? t.accent : t.fg}">${esc(value)}</text>
  <text x="${x}" y="${y + 22}" font-family="${MONO}" font-size="11" letter-spacing="0.6" fill="${t.faint}">${esc(label)}</text>`
}

export function contributionsCard(t, data) {
  const W = 880
  const CELL = 11
  const GAP = 3
  const weeks = data.weeks // [[{date,count} ×7] × 52]
  const x0 = 32 // flush with the labels above it
  const y0 = 196

  const metrics = [
    [num(data.total), 'CONTRIBUTIONS', true],
    [`${data.currentStreak}`, 'CURRENT STREAK'],
    [`${data.longestStreak}`, 'LONGEST STREAK'],
    [num(data.mergedPRs), 'MERGED PRS'],
    [num(data.repos), 'REPOSITORIES'],
  ]
  const step = (W - 64) / metrics.length
  const body = [
    metrics
      .map(([value, label, accent], i) => metric(t, 32 + i * step, 104, value, label, accent))
      .join('\n'),
    `  <path d="M32 148 H${W - 32}" stroke="${t.line}"/>`,
    `  <text x="32" y="180" font-family="${MONO}" font-size="11" letter-spacing="0.6" fill="${t.faint}">LAST ${weeks.length} WEEKS</text>`,
    weeks
      .map((week, wi) =>
        week
          .map((day) => {
            const l = level(day.count)
            const fill = l === 0 ? t.empty : t.accent
            const op = l === 0 ? 1 : OPACITY[l]
            const x = x0 + wi * (CELL + GAP)
            const y = y0 + day.weekday * (CELL + GAP)
            return `  <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${fill}" opacity="${op}"/>`
          })
          .join('\n'),
      )
      .join('\n'),
  ].join('\n')

  const H = y0 + 7 * (CELL + GAP) - GAP + 32
  return card(t, W, H, 'CONTRIBUTIONS', data.note, body)
}

export function languagesCard(t, data) {
  const W = 880
  const barX = 32
  const barW = W - 64
  const barY = 72

  let offset = 0
  const bar = data.languages
    .map((lang) => {
      const w = (lang.share / 100) * barW
      const rect = `  <rect x="${(barX + offset).toFixed(1)}" y="${barY}" width="${Math.max(w - 2, 1).toFixed(1)}" height="12" rx="3" fill="${lang.color ?? t.strong}"/>`
      offset += w
      return rect
    })
    .join('\n')

  // Two rows of legend, so six languages plus the remainder stay readable.
  const perRow = Math.ceil(data.languages.length / 2)
  const colW = (W - 64) / perRow
  const legend = data.languages
    .map((lang, i) => {
      const x = barX + (i % perRow) * colW
      const y = 124 + Math.floor(i / perRow) * 26
      return `  <circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${lang.color ?? t.strong}"/>
  <text x="${x + 18}" y="${y}" font-family="${SANS}" font-size="13" fill="${t.fg}">${esc(lang.name)}</text>
  <text x="${x + 18 + lang.name.length * 7.4 + 8}" y="${y}" font-family="${MONO}" font-size="12" fill="${t.faint}">${lang.share.toFixed(1)}%</text>`
    })
    .join('\n')

  const rows = Math.ceil(data.languages.length / perRow)
  const H = 124 + rows * 26 + 12
  return card(t, W, H, 'LANGUAGES', data.note, `${bar}\n${legend}`)
}
