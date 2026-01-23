import { Cron, CronContext } from 'kuron'
import { app, Bindings } from '.'
import { Octokit } from 'octokit'
import { VersionsResponse } from './routes/versions'
import semver from 'semver'

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
    const { data: asepriteData } = await octokit.rest.repos.getLatestRelease({
      owner: 'aseprite',
      repo: 'aseprite'
    })

    const upstreamLatestTag = asepriteData.tag_name
    const upstreamLatest = upstreamLatestTag.replace(/^v/, '')

    console.log(`Upstream latest version: ${upstreamLatest}`)

    if (semver.gt(upstreamLatest, currentLatest)) {
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
