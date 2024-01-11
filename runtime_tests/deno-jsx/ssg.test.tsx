import { FileSystemModule } from '../../deno_dist/helper/ssg/index.ts'
import { toSSG } from '../../src/adapter/deno/ssg.ts'
import { Hono } from '../../deno_dist/mod.ts'
import { assert, assertEquals } from '../deno/deps.ts'

// Test just only minimal patterns.
// Because others are already tested well in Cloudflare Workers environment.

Deno.test('toSSG function: Should correctly generate static HTML files for Hono routes', async () => {
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

    const fsMock: FileSystemModule = {
      writeFile: async (path, data) => {
        console.log(`writeFile called with path: ${path}, data: ${data}`);
        return Promise.resolve();
      },
      mkdir: async (path, options) => {
        console.log(`mkdir called with path: ${path}, options: ${JSON.stringify(options)}`);
        return Promise.resolve();
      },
    };

    const result = await toSSG(app, fsMock, { dir: './static' })

    assertEquals(result.success, true);
    assertEquals(result.files instanceof Array, true);
    assertEquals(result.files && result.files.length > 0, true);
  })


Deno.test('toSSG function: Should handle errors correctly', async () => {
    const app = new Hono()
    app.get('/', (c) => c.text('Hello, World!'))
    app.get('/about', (c) => c.text('About Page'))


    const fsMock: FileSystemModule = {
      writeFile: async (path, data) => Promise.reject(new Error('Write error')),
      mkdir: async (path, options) => Promise.resolve(),
    };
  
    const result = await toSSG(app, fsMock, { dir: './static' })

    assertEquals(result.success, false);
    assert(result.error !== undefined);
    assertEquals(result.files, undefined);
})