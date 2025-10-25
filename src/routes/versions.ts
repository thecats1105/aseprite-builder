import { Hono } from 'hono'
import { Bindings } from '..'

const versions = new Hono<{ Bindings: Bindings }>()

versions.get('/', async c => {
  const EXPIRATION_TTL = 600 // 10 minutes
  const cacheKey = 'versions-list'

  let data = await c.env.KV.get(cacheKey, { type: 'json' })
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

    data = Object.entries(versionMap).map(([version, osSet]) => ({
      version,
      os: Array.from(osSet)
    }))

    await c.env.CACHE_KV.put(cacheKey, JSON.stringify(data), {
      expirationTtl: EXPIRATION_TTL
    })
  }

  return c.json(data, 200)
})

export default versions
