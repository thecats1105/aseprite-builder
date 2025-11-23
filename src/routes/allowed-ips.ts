import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import { Bindings } from '..'

const allowedIPs = new Hono<{ Bindings: Bindings }>()

const AllowedIPsSchema = z.object({
  ips: z.array(z.ipv4())
})

export type AllowedIPsSchema = z.infer<typeof AllowedIPsSchema>

const AllowedIPBody = z.object({
  ips: z.array(z.ipv4())
})

allowedIPs.post('/add', zValidator('json', AllowedIPBody), async c => {
  const body = c.req.valid('json')
  const accessKey = c.req.header('X-Access-Key')

  if (accessKey !== c.env.ACCESS_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const existingIPs =
    ((await c.env.KV.get('allowed-ips', 'json')) as AllowedIPsSchema).ips || []

  const updatedAllowedIps: AllowedIPsSchema = {
    ips: Array.from(new Set([...existingIPs, ...body.ips]))
  }

  await c.env.KV.put('allowed-ips', JSON.stringify(updatedAllowedIps)).catch(
    err => {
      return c.json({ success: false, message: err }, 503)
    }
  )

  return c.json({ success: true, ips: body.ips }, 200)
})

allowedIPs.post('/remove', zValidator('json', AllowedIPBody), async c => {
  const body = c.req.valid('json')
  const accessKey = c.req.header('X-Access-Key')

  if (accessKey !== c.env.ACCESS_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const existingIPs =
    ((await c.env.KV.get('allowed-ips', 'json')) as AllowedIPsSchema).ips || []

  const updatedAllowedIps: AllowedIPsSchema = {
    ips: existingIPs.filter((ip: string) => !body.ips.includes(ip))
  }

  await c.env.KV.put('allowed-ips', JSON.stringify(updatedAllowedIps)).catch(
    err => {
      return c.json({ success: false, message: err }, 503)
    }
  )

  return c.json({ success: true, ips: body.ips }, 200)
})

export default allowedIPs
