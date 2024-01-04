import * as path from 'path'
import { inspectRoutes } from '../../helper/dev'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void>
}

export const toSsg = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>,
  fsModule: FileSystemModule
) => {
  const routes = inspectRoutes(app).map((route) => route.path)
  const baseURL = 'http://localhost'

  await Promise.all(
    routes.map(async (route) => {
      const url = new URL(route, baseURL).toString()
      const response = await app.fetch(new Request(url))
      const html = await response.text()

      const filePath = path.join('./static', route === '/' ? 'index.html' : route + '.html')
      const dirPath = path.dirname(filePath)

      await fsModule.mkdir(dirPath, { recursive: true })
      await fsModule.writeFile(filePath, html)
      console.log(`File written: ${filePath}`)
    })
  )

  console.log('Static site generation completed.')
}