import { Hono } from 'hono'
import { Bindings } from '..'
import { sortVersions } from '../utils/version'

export interface VersionInfo {
  version: string
  os: string[]
}

export interface VersionsResponse {
  latest: string
  versions: VersionInfo[]
}

const versions = new Hono<{ Bindings: Bindings }>()

versions.get('/', async c => {
  const EXPIRATION_TTL = 600 // 10 minutes
  const cacheKey = 'versions-list'

  let data = (await c.env.CACHE_KV.get(cacheKey, {
    type: 'json'
  })) as VersionsResponse | null
  let fromCache = true

  if (!data) {
    fromCache = false

    const path = c.env.path.endsWith('/') ? c.env.path.slice(0, -1) : c.env.path

    const objectList = await c.env.R2.list({
      prefix: path
    })

    const regex = new RegExp(
      // @ts-ignore: https://github.com/microsoft/TypeScript/issues/61321
      `${RegExp.escape(path)}/([^/]+)/Aseprite-[^/]+-(\\w+)\\.zip$`
    )

    const versionMap: Record<string, Set<string>> = {}

    for (const obj of objectList.objects) {
      const match = obj.key.match(regex)
      if (match) {
        const version = match[1]
        const os = match[2]
        if (!versionMap[version]) versionMap[version] = new Set()
        versionMap[version].add(os)
      }
    }

    const versionsList: VersionInfo[] = Object.entries(versionMap).map(
      ([version, osSet]) => ({
        version: version.replace(/^v/, ''),
        os: Array.from(osSet)
      })
    )

    const sortedVersions = sortVersions(versionsList.map(v => v.version))

    data = {
      latest: sortedVersions.length > 0 ? sortedVersions[0] : '0.0.0',
      versions: versionsList
    }

    await c.env.CACHE_KV.put(cacheKey, JSON.stringify(data), {
      expirationTtl: EXPIRATION_TTL
    })
  }

  return c.json<VersionsResponse>(data, 200)
})

versions.delete('/', async c => {
  const accessKey = c.req.header('X-Access-Key')
  const version = c.req.query('version')

  if (accessKey !== c.env.ACCESS_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  if (!version) {
    return c.json(
      { success: false, message: 'Version query parameter is required' },
      400
    )
  }

  const path = c.env.path.endsWith('/') ? c.env.path.slice(0, -1) : c.env.path
  const prefix = `${path}/v${version.replace(/^v/, '')}/`

  let deletedCount = 0
  let truncated = true
  let cursor: string | undefined

  while (truncated) {
    const list = await c.env.R2.list({
      prefix,
      cursor
    })

    if (list.objects.length > 0) {
      const keys = list.objects.map(o => o.key)
      await c.env.R2.delete(keys)
      deletedCount += keys.length
    }

    truncated = list.truncated
    if (list.truncated) {
      cursor = list.cursor
    }
  }

  if (deletedCount > 0) {
    await c.env.CACHE_KV.delete('versions-list')
  }

  return c.json({ success: true, deleted: deletedCount }, 200)
})

export default versions
