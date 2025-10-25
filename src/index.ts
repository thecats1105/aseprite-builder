import { Hono } from 'hono'
import allowedIPs from './routes/allowed-ips'
import download from './routes/download'
import root from './routes/root'
import versions from './routes/versions'

export type Bindings = {
  ACCESS_KEY: string
  CACHE_KV: KVNamespace
  R2: R2Bucket
  KV: KVNamespace
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  R2_ACCOUNT_ID: string
  R2_BUCKET: string
  R2_BUCKET_REGION?: string
  path: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Root route
app.route('/', root)

// Get Available versions
app.route('/versions', versions)

// Get Aseprite by version and OS
app.route('/', download)

// Manage allowed IPs
app.route('/allowed-ips', allowedIPs)

export default app
