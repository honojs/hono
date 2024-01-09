import * as path from 'path'
import { inspectRoutes } from '../../helper/dev'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

const generateFilePath = (routePath: string) => {
  const fileName = routePath === '/' ? 'index.html' : routePath + '.html'
  return path.join('./static', fileName)
}

export const generateHtmlMap = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>
): Promise<Map<string, string>> => {
  const htmlMap = new Map<string, string>()
  const baseURL = 'http://localhost'

  for (const route of inspectRoutes(app)) {
    if (route.isMiddleware) continue

    const url = new URL(route.path, baseURL).toString()
    const response = await app.fetch(new Request(url))
    const html = await response.text()

    htmlMap.set(route.path, html)
  }

  return htmlMap
}

export const saveHtmlToLocal = async (
  htmlMap: Map<string, string>,
  fsModule: FileSystemModule
): Promise<void> => {
  for (const [routePath, html] of htmlMap) {
    const filePath = generateFilePath(routePath)
    const dirPath = path.dirname(filePath)

    await fsModule.mkdir(dirPath, { recursive: true })
    await fsModule.writeFile(filePath, html)
    console.log(`Written: ${filePath}`)
  }
}

export const toSsg = async <
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
>(
  app: Hono<E, S, BasePath>,
  fsModule: FileSystemModule
): Promise<void> => {
  const maps = await generateHtmlMap(app)
  await saveHtmlToLocal(maps, fsModule)
  console.log('Static site generation completed.')
}
