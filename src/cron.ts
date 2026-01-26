import { Cron, CronContext } from 'kuron'
import { app, Bindings } from '.'
import { Octokit } from 'octokit'
import { VersionsResponse } from './routes/versions'
import { isNewer, compareVersions } from './utils/version'

export default new Cron().schedule('0 15 * * *', async c => checkUpdates(c))

async function checkUpdates(c: CronContext) {
  const env = c.env as Bindings
  const currentVersionsRes = await app.request(
    '/versions',
    { method: 'GET' },
    env,
    c.executionCtx
  )

  if (!currentVersionsRes.ok) {
    console.error('Failed to fetch current versions')
    return
  }

  const currentVersionsData =
    (await currentVersionsRes.json()) as VersionsResponse
  const currentLatest = currentVersionsData.latest

  console.log(`Current latest built version: ${currentLatest}`)

  const octokit = new Octokit({
    auth: env.GITHUB_TOKEN
  })

  try {
    const { data: tags } = await octokit.rest.repos.listTags({
      owner: 'aseprite',
      repo: 'aseprite',
      per_page: 30
    })

    const stableTags = tags
      .map(t => t.name)
      .filter(name => !name.includes('-') && !name.includes('beta'))
      .sort((a, b) => compareVersions(b, a))

    if (stableTags.length === 0) {
      console.error('No stable tags found')
      return
    }

    const upstreamLatestTag = stableTags[0]
    const upstreamLatest = upstreamLatestTag.replace(/^v/, '')

    console.log(`Upstream latest version: ${upstreamLatest}`)

    if (isNewer(upstreamLatest, currentLatest)) {
      console.log(
        `New version found! Upstream: ${upstreamLatest} > Current: ${currentLatest}`
      )
      console.log(`Triggering build for version ${upstreamLatest}...`)

      const buildRes = await app.request(
        `/build/${upstreamLatest}`,
        {
          method: 'POST',
          headers: {
            'X-Access-Key': env.ACCESS_KEY
          }
        },
        env,
        c.executionCtx
      )

      if (buildRes.ok) {
        console.log(`Successfully triggered build for ${upstreamLatest}`)
      } else {
        console.error(
          `Failed to trigger build for ${upstreamLatest}: ${await buildRes.text()}`
        )
      }
    } else {
      console.log('No new version found.')
    }
  } catch (error) {
    console.error('Failed to fetch Aseprite latest release from GitHub', error)
  }
}
