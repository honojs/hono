/** @jsx jsx */
/** @jsxFrag Fragment */

import { toSSG } from '../../deno_dist/helper.ts'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx } from '../../deno_dist/middleware.ts'
import { Hono } from '../../deno_dist/mod.ts'
import { assertEquals } from '../deno/deps.ts'

Deno.test('toSSG function', async () => {
  const app = new Hono()
  app.get('/', (c) => c.text('Hello, World!'))
  app.get('/about', (c) => c.text('About Page'))
  app.get('/about/some', (c) => c.text('About Page 2tier'))
  app.post('/about/some/thing', (c) => c.text('About Page 3tier'))
  app.get('/bravo', (c) => c.html('Bravo Page'))
  app.get('/Charlie', async (c, next) => {
    c.setRenderer((content) => {
      return c.html(
        <html>
          <body>
            <p>{content}</p>
          </body>
        </html>
      )
    })
    await next()
  })
  app.get('/Charlie', (c) => {
    return c.render('Hello!')
  })

  const result = await toSSG(app, { dir: './ssg-static' })
  assertEquals(result.success, true)
  assertEquals(result.error, undefined)
  assertEquals(result.files !== undefined, true)

  await deleteDirectory('./ssg-static')
})

async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    const stat = await Deno.stat(dirPath)

    if (stat.isDirectory) {
      for await (const dirEntry of Deno.readDir(dirPath)) {
        const entryPath = `${dirPath}/${dirEntry.name}`
        await deleteDirectory(entryPath)
      }
      await Deno.remove(dirPath)
    } else {
      await Deno.remove(dirPath)
    }
  } catch (error) {
    console.error(`Error deleting directory: ${error}`)
  }
}
