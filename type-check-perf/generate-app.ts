import { writeFile } from 'node:fs'

const count = 200

const generateRoutes = (count: number) => {
  let routes = `import { Hono } from '../src'
export const app = new Hono()`
  for (let i = 1; i <= count; i++) {
    routes += `
  .get('/route${i}/:id', (c) => {
    return c.json({
      ok: true
    })
  })`
  }
  return routes
}

const routes = generateRoutes(count)

writeFile(import.meta.dirname + '/app.ts', routes, (err) => {
  if (err) throw err
  console.log(`${count} routes have been written to app.ts`)
})
