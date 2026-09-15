/**
 * Builds the profile's stats cards.
 *
 *   node scripts/build-stats.mjs
 *
 * Reads GH_TOKEN (a token with read:user; add repo/Metadata read to count the
 * private work too) and writes four SVGs plus a JSON snapshot into assets/.
 * The cards are drawn here, in this repo — nothing is fetched from a
 * third-party card service at render time.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { fetchStats } from './fetch.mjs'
import { THEMES, contributionsCard, languagesCard } from './cards.mjs'

const LOGIN = process.env.GH_LOGIN ?? 'SantiMerino'
const OUT = new URL('../assets/', import.meta.url)
/** Languages below this share are folded into “Other”. */
const TOP_LANGUAGES = 6
const WEEKS = 52

const token = process.env.GH_TOKEN
if (!token) {
  console.error('GH_TOKEN is required')
  process.exit(1)
}

/** GitHub's own rule: a zero-contribution today doesn't break the streak yet. */
function streaks(days) {
  let longest = 0
  let run = 0
  for (const [, count] of days) {
    run = count > 0 ? run + 1 : 0
    if (run > longest) longest = run
  }

  let current = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const [, count] = days[i]
    if (count === 0) {
      if (i === days.length - 1) continue // today, still open
      break
    }
    current++
  }
  return { current, longest }
}

/** The last N weeks as columns of seven days, Sunday first. */
function calendar(days, weeks) {
  const tail = days.slice(-weeks * 7 - 7)
  const cells = tail.map(([date, count]) => ({
    date,
    count,
    weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
  }))
  const columns = []
  let column = []
  for (const cell of cells) {
    if (cell.weekday === 0 && column.length) {
      columns.push(column)
      column = []
    }
    column.push(cell)
  }
  if (column.length) columns.push(column)
  return columns.slice(-weeks)
}

function languages(repos) {
  const totals = new Map()
  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const entry = totals.get(edge.node.name) ?? { bytes: 0, color: edge.node.color }
      entry.bytes += edge.size
      totals.set(edge.node.name, entry)
    }
  }
  const sorted = [...totals].sort((a, b) => b[1].bytes - a[1].bytes)
  const sum = sorted.reduce((acc, [, v]) => acc + v.bytes, 0)
  const top = sorted.slice(0, TOP_LANGUAGES).map(([name, v]) => ({
    name,
    color: v.color,
    share: (v.bytes / sum) * 100,
  }))
  const rest = 100 - top.reduce((acc, l) => acc + l.share, 0)
  if (rest > 0.05) top.push({ name: 'Other', color: null, share: rest })
  return top
}

const { user, days, privateCount } = await fetchStats(token, LOGIN)
const { current, longest } = streaks(days)
const repos = user.repositories.nodes
const privateRepos = repos.filter((r) => r.isPrivate).length
const updated = new Date().toISOString().slice(0, 10)

const contributions = {
  total: days.reduce((acc, [, count]) => acc + count, 0),
  currentStreak: current,
  longestStreak: longest,
  mergedPRs: user.merged.totalCount,
  repos: user.repositories.totalCount,
  weeks: calendar(days, WEEKS),
  note: `SINCE ${new Date(user.createdAt).getUTCFullYear()} · UPDATED ${updated}`,
}

const langs = {
  languages: languages(repos),
  note: `BY BYTES · ${repos.length} REPOS${privateRepos ? ` · ${privateRepos} PRIVATE` : ''}`,
}

await mkdir(OUT, { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) {
  await writeFile(new URL(`contributions-${name}.svg`, OUT), contributionsCard(theme, contributions))
  await writeFile(new URL(`languages-${name}.svg`, OUT), languagesCard(theme, langs))
}

await writeFile(
  new URL('stats.json', OUT),
  `${JSON.stringify(
    {
      updated,
      login: LOGIN,
      contributions: {
        total: contributions.total,
        private: privateCount,
        currentStreak: current,
        longestStreak: longest,
      },
      mergedPRs: contributions.mergedPRs,
      repositories: { total: contributions.repos, private: privateRepos },
      followers: user.followers.totalCount,
      languages: langs.languages.map((l) => ({ name: l.name, share: Number(l.share.toFixed(2)) })),
    },
    null,
    2,
  )}\n`,
)

console.log(
  `cards written — ${contributions.total} contributions, ${current}d streak, ` +
    `${langs.languages[0].name} ${langs.languages[0].share.toFixed(1)}%`,
)
