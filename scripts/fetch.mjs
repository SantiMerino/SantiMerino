/**
 * Pulls everything the cards need from the GitHub GraphQL API, in one request
 * per batch of years. No dependencies — Node's own fetch does the work.
 */

const API = 'https://api.github.com/graphql'

async function gql(token, query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'santimerino-profile-stats',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`)
  const body = await res.json()
  if (body.errors) throw new Error(JSON.stringify(body.errors))
  return body.data
}

const PROFILE = `
  query ($login: String!) {
    user(login: $login) {
      createdAt
      followers { totalCount }
      merged: pullRequests(states: MERGED) { totalCount }
      openPRs: pullRequests(states: OPEN) { totalCount }
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false,
                   orderBy: {field: PUSHED_AT, direction: DESC}) {
        totalCount
        nodes {
          name
          isPrivate
          stargazerCount
          languages(first: 12, orderBy: {field: SIZE, direction: DESC}) {
            edges { size node { name color } }
          }
        }
      }
    }
  }
`

/** One contributionsCollection per year, aliased, so it's a single round trip. */
function calendarQuery(years) {
  const fields = years
    .map(
      (y) => `y${y}: contributionsCollection(from: "${y}-01-01T00:00:00Z",
                                             to: "${y}-12-31T23:59:59Z") {
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount } }
        }
      }`,
    )
    .join('\n')
  return `query ($login: String!) { user(login: $login) { ${fields} } }`
}

export async function fetchStats(token, login) {
  const profile = await gql(token, PROFILE, { login })
  const user = profile.user

  const firstYear = new Date(user.createdAt).getUTCFullYear()
  const thisYear = new Date().getUTCFullYear()
  const years = []
  for (let y = firstYear; y <= thisYear; y++) years.push(y)

  const calendars = await gql(token, calendarQuery(years), { login })

  const days = new Map()
  let privateCount = 0
  for (const y of years) {
    const collection = calendars.user[`y${y}`]
    privateCount += collection.restrictedContributionsCount
    for (const week of collection.contributionCalendar.weeks) {
      for (const day of week.contributionDays) days.set(day.date, day.contributionCount)
    }
  }

  // The current year's calendar runs to December, so drop the days that
  // haven't happened yet — otherwise every streak ends at a wall of zeros.
  const today = new Date().toISOString().slice(0, 10)
  const past = [...days.entries()]
    .filter(([date]) => date <= today)
    .sort(([a], [b]) => a.localeCompare(b))

  return { user, days: past, privateCount }
}
