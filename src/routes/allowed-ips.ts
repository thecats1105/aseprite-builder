import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import * as z from 'zod'
import { Bindings } from '..'

const allowedIPs = new Hono<{ Bindings: Bindings }>()

const AllowedIPBody = z.object({
  ips: z.array(z.ipv4())
})

allowedIPs.post('/add', zValidator('json', AllowedIPBody), async c => {
  const body = c.req.valid('json')
  const accessKey = c.req.header('X-Access-Key')

  if (accessKey !== c.env.ACCESS_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const existingIPs = JSON.parse((await c.env.KV.get('allowed-ips')) || '[]')

  const updatedIps = Array.from(new Set([...existingIPs, ...body.ips]))

  await c.env.KV.put('allowed-ips', JSON.stringify(updatedIps)).catch(err => {
    return c.json({ success: false, message: err }, 503)
  })

  return c.json({ success: true, ips: body.ips }, 200)
})

allowedIPs.post('/remove', zValidator('json', AllowedIPBody), async c => {
  const body = c.req.valid('json')
  const accessKey = c.req.header('X-Access-Key')

  if (accessKey !== c.env.ACCESS_KEY) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const existingIPs = JSON.parse((await c.env.KV.get('allowed-ips')) || '[]')

  const updatedIps = existingIPs.filter((ip: string) => !body.ips.includes(ip))

  await c.env.KV.put('allowed-ips', JSON.stringify(updatedIps)).catch(err => {
    return c.json({ success: false, message: err }, 503)
  })

  return c.json({ success: true, ips: body.ips }, 200)
})

export default allowedIPs
