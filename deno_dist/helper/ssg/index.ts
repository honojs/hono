import { Buffer } from "node:buffer";
import * as path from 'node:path'
import { inspectRoutes } from '../../helper/dev/index.ts'
import type { Hono } from '../../hono.ts'
import type { Env, Schema } from '../../types.ts'

interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void>
}

const generateFilePath = (routePath: string) => {
  const fileName = routePath === '/' ? 'index.html' : routePath + '.html'
  return path.join('./static', fileName)
}

export const toSsg = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>,
  fsModule: FileSystemModule
) => {
  const baseURL = 'http://localhost'

  for (const route of inspectRoutes(app)) {
    if (route.isMiddleware) continue

    const url = new URL(route.path, baseURL).toString()
    const response = await app.fetch(new Request(url))
    const html = await response.text()

    const filePath = generateFilePath(route.path)
    const dirPath = path.dirname(filePath)

    await fsModule.mkdir(dirPath, { recursive: true })
    await fsModule.writeFile(filePath, html)
    console.log(`File written: ${filePath}`)
  }

  console.log('Static site generation completed.')
}
