import { Buffer } from "node:buffer";
import { inspectRoutes } from '../../helper/dev/index.ts'
import type { Hono } from '../../hono.ts'
import type { Env, Schema } from '../../types.ts'

export const dirname = (path: string) => {
  const splitedPath = path.split(/[\/\\]/)

  return splitedPath.slice(0, -1).join('/') // Windows supports slash path
}
export const joinPaths = (...paths: string[]) => {
  const nomalizedPaths: string[] = []
  for (const path of paths) {
    const nomalizedPath = path.replace(/(\\)/g, '/').replace(/\/$/g, '')
    nomalizedPaths.push(nomalizedPath)
  }
  const resultPaths: string[] = []
  for (let path of nomalizedPaths.join('/').split('/')) {
    // Handle `..` or `../`
    if (path === '..') {
      if (resultPaths.length === 0) {
        resultPaths.push('..')
      } else {
        resultPaths.pop()
      }
      continue
    } else {
      // Handle `.` or `./`
      path = path.replace(/^\./g, '')
    }
    if (path !== ''){
      resultPaths.push(path)
    }
  }
  return resultPaths.join('/')
}

export interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

export interface ToSSGResult {
  success: boolean
  files?: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string) => {
  const fileName = routePath === '/' ? 'index.html' : routePath + '.html'
  return joinPaths(outDir, fileName)
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
    const dirPath = dirname(filePath)

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
  (
    app: Hono<E, S, BasePath>,
    fsModule: FileSystemModule,
    options?: { dir?: string }
  ): Promise<ToSSGResult>
}

export interface ToSSGAdaptorInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (app: Hono<E, S, BasePath>, options?: { dir?: string }): Promise<ToSSGResult>
}

export const toSSG: ToSSGInterface = async (app, fs, options) => {
  try {
    const outputDir = options?.dir ?? './static'
    const maps = await generateHtmlMap(app)
    const files = await saveHtmlToLocal(maps, fs, outputDir)
    return { success: true, files }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error))
    return { success: false, error: errorObj }
  }
}
