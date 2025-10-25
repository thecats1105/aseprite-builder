import { Hono } from 'hono'
import { Bindings } from '..'

const root = new Hono<{ Bindings: Bindings }>()

root.get('/', c => {
  return c.text('Aseprite Download Service')
})

export default root
