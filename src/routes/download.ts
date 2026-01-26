import { Hono } from 'hono'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { AllowedIPsSchema } from './auth'
import { Bindings } from '..'

const download = new Hono<{ Bindings: Bindings }>()

download.notFound(c => {
  return c.json({ success: false, message: 'Not Found' }, 404)
})

download.get('/:version/:os', async c => {
  const clientIP = c.req.header('CF-Connecting-IP')
  const allowedIPs = (await c.env.KV.get(
    'allowed-ips',
    'json'
  )) as AllowedIPsSchema | null

  console.log({
    clientIP,
    headers: c.req.header()
  })

  if (
    clientIP &&
    !(allowedIPs?.ips.includes(clientIP) || clientIP === '127.0.0.1')
  ) {
    return c.json({ success: false, message: 'Access Denied' }, 403)
  }

  const { version: tag, os } = c.req.param()
  let { path } = c.env

  if (path.endsWith('/')) path = path.slice(0, -1)

  const R1 = new S3Client({
    region: c.env.R2_BUCKET_REGION || 'auto',
    endpoint: `https://${c.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: c.env.R2_ACCESS_KEY_ID,
      secretAccessKey: c.env.R2_SECRET_ACCESS_KEY
    }
  })

  const version = tag.replace(/^v/, '')
  const key = `${path}/v${version}/Aseprite-v${version}-${os}.zip`
  const object = await c.env.R2.head(key)

  if (!object) {
    return c.notFound()
  }

  const signedUrl = await getSignedUrl(
    R1,
    new GetObjectCommand({ Bucket: c.env.R2_BUCKET, Key: key }),
    { expiresIn: 60 }
  )

  return c.redirect(signedUrl, 301)
})

export default download
