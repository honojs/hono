import * as path from 'path'
import { inspectRoutes } from '../../helper/dev'
import type { Hono } from '../../hono'
import type { Env, Schema } from '../../types'

export interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

export interface ToSsgResult {
  success: boolean
  files?: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string) => {
  const fileName = routePath === '/' ? 'index.html' : routePath + '.html'
  return path.join(outDir, fileName)
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
  fsModule: FileSystemModule,
  outDir: string
): Promise<string[]> => {
  const files: string[] = []

  for (const [routePath, html] of htmlMap) {
    const filePath = generateFilePath(routePath, outDir)
    const dirPath = path.dirname(filePath)

    await fsModule.mkdir(dirPath, { recursive: true })
    await fsModule.writeFile(filePath, html)
    files.push(filePath)
  }

  return files
}

export interface ToSSGInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (app: Hono<E, S, BasePath>, fsModule: FileSystemModule, options: { dir: string }): Promise<{
    success: boolean
    files?: string[]
    error?: Error
  }>
}
