import { Cron, CronContext } from 'kuron'
import { app, Bindings } from '.'
import { Octokit } from 'octokit'
import { VersionsResponse } from './routes/versions'
import { isNewer, compareVersions } from './utils/version'

export default new Cron().schedule('0 15 * * *', async c => checkUpdates(c))

interface CheckUpdatesResult {
  success: boolean
  currentVersion: string
  upstreamVersion: string | null
  newVersionFound: boolean
  buildTriggered: boolean
  error: string | null
}

async function checkUpdates(c: CronContext) {
  const env = c.env as Bindings
  const result: CheckUpdatesResult = {
    success: false,
    currentVersion: '',
    upstreamVersion: null,
    newVersionFound: false,
    buildTriggered: false,
    error: null
  }

  try {
    const currentVersionsRes = await app.request(
      '/versions',
      { method: 'GET' },
      env,
      c.executionCtx
    )

    if (!currentVersionsRes.ok) {
      result.error = 'Failed to fetch current versions'
      console.log(JSON.stringify(result))
      return
    }

    const currentVersionsData =
      (await currentVersionsRes.json()) as VersionsResponse
    const currentLatest = currentVersionsData.latest
    result.currentVersion = currentLatest

    const octokit = new Octokit({
      auth: env.GITHUB_TOKEN
    })

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
      result.error = 'No stable tags found'
      console.log(JSON.stringify(result))
      return
    }

    const upstreamLatestTag = stableTags[0]
    const upstreamLatest = upstreamLatestTag.replace(/^v/, '')
    result.upstreamVersion = upstreamLatest

    if (isNewer(upstreamLatest, currentLatest)) {
      result.newVersionFound = true

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
        result.buildTriggered = true
        result.success = true
      } else {
        result.error = `Failed to trigger build: ${await buildRes.text()}`
      }
    } else {
      result.success = true
    }
  } catch (error) {
    result.error = `Failed to fetch Aseprite latest release from GitHub: ${error instanceof Error ? error.message : String(error)}`
  }

  console.log(JSON.stringify(result))
}
