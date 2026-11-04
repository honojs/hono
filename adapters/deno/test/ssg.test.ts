import { Hono } from 'hono'
import { toSSG } from '../src/index.ts'
import { assertEquals } from './assert.ts'

Deno.test('toSSG', async () => {
  const dir = './test/.ssg-output'
  const app = new Hono()
  app.get('/', (c) => c.text('Hello, World!'))
  app.get('/about', (c) => c.text('About Page'))
  app.get('/about/some', (c) => c.text('About Page 2tier'))
  app.post('/about/some/thing', (c) => c.text('About Page 3tier'))
  app.get('/bravo', (c) => c.html('Bravo Page'))

  try {
    const result = await toSSG(app, { dir })
    assertEquals(result.success, true)
    assertEquals(result.error, undefined)
    assertEquals(result.files !== undefined, true)
    assertEquals(await Deno.readTextFile(`${dir}/index.txt`), 'Hello, World!')
  } finally {
    await Deno.remove(dir, { recursive: true })
  }
})
