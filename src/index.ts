import { Hono } from 'hono'
import auth from './routes/auth'
import build from './routes/build'
import download from './routes/download'
import root from './routes/root'
import versions from './routes/versions'
import cron from './cron'

export type Bindings = {
  ACCESS_KEY: string
  CACHE_KV: KVNamespace
  GITHUB_REPOSITORY: string
  GITHUB_TOKEN: string
  KV: KVNamespace
  R2: R2Bucket
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_ACCOUNT_ID: string
  R2_BUCKET: string
  R2_BUCKET_REGION?: string
  path: string
}

export const app = new Hono<{ Bindings: Bindings }>()
  // Root route
  .route('/', root)

  // Get Available versions
  .route('/versions', versions)

  // Get Aseprite by version and OS
  .route('/', download)

  // Manage allowed IPs
  .route('/auth', auth)

  // Trigger build
  .route('/build', build)

export default {
  fetch: app.fetch,
  scheduled: cron.scheduled
}
