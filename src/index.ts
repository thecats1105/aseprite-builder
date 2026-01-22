import { Hono } from 'hono'
import auth from './routes/auth'
import build from './routes/build'
import download from './routes/download'
import root from './routes/root'
import versions from './routes/versions'

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
export type AppType = typeof app

// Root route
app.route('/', root)

// Get Available versions
app.route('/versions', versions)

// Get Aseprite by version and OS
app.route('/', download)

// Manage allowed IPs
app.route('/auth', auth)

// Trigger build
app.route('/build', build)

export default app
