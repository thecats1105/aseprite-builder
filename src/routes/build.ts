import { Hono } from 'hono'
import { Bindings } from '..'
import { Octokit } from 'octokit'
import { app } from '..'
import { VersionsResponse } from './versions'

const build = new Hono<{ Bindings: Bindings }>()

build.post('/:version', async c => {
  const version = c.req.param('version')
  const isForceBulid = c.req.query('force') === 'true'
  const accessKey = c.req.header('X-Access-Key')

  if (accessKey !== c.env.ACCESS_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const octokit = new Octokit({
    auth: c.env.GITHUB_TOKEN
  })

  const githubRepo = c.env.GITHUB_REPOSITORY
  const [repo, repoBranch] = githubRepo.split(':')
  const [repoOwner, repoName] = repo.split('/')

  if (!isForceBulid) {
    const res = await app.request(
      '/versions',
      { method: 'GET' },
      c.env,
      c.executionCtx
    )
    const data = (await res.json()) as VersionsResponse
    const availableVersions = data.versions.map(v => v.version)
    if (availableVersions?.includes(version)) {
      return c.json({ success: false, message: 'Version already exists' }, 400)
    }
  }

  const workflows = ['build_and_release.yaml']

  try {
    const triggerPromises = workflows.map(async w => {
      await octokit.rest.actions.createWorkflowDispatch({
        owner: repoOwner,
        repo: repoName,
        workflow_id: w,
        ref: repoBranch,
        inputs: {
          tag: `v${version.replace(/^v/, '')}`
        }
      })

      console.log(
        `Triggered build for version ${version} using workflow ${w} in ${githubRepo}`
      )
    })

    await Promise.all(triggerPromises)

    return c.json({ success: true, message: 'Build triggered' }, 200)
  } catch (e) {
    return c.json({ success: false, message: 'Failed to trigger build' }, 500)
  }
})

export default build
