import { Buffer } from "node:buffer";
import { inspectRoutes } from '../../helper/dev/index.ts'
import type { Hono } from '../../hono.ts'
import type { Env, Schema } from '../../types.ts'
import { joinPaths, dirname } from './utils.ts'

/**
 * @experimental
 * `FileSystemModule` is an experimental feature.
 * The API might be changed.
 */
export interface FileSystemModule {
  writeFile(path: string, data: string | Buffer): Promise<void>
  mkdir(path: string, options: { recursive: boolean }): Promise<void | string>
}

/**
 * @experimental
 * `ToSSGResult` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGResult {
  success: boolean
  files?: string[]
  error?: Error
}

const generateFilePath = (routePath: string, outDir: string) => {
  const fileName = routePath === '/' ? 'index.html' : routePath + '.html'
  return joinPaths(outDir, fileName)
}

/**
 * @experimental
 * `generateHtmlMap` is an experimental feature.
 * The API might be changed.
 */
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

/**
 * @experimental
 * `saveHtmlToLocal` is an experimental feature.
 * The API might be changed.
 */
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

/**
 * @experimental
 * `ToSSGInterface` is an experimental feature.
 * The API might be changed.
 */
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

/**
 * @experimental
 * `ToSSGAdaptorInterface` is an experimental feature.
 * The API might be changed.
 */
export interface ToSSGAdaptorInterface<
  E extends Env = Env,
  S extends Schema = {},
  BasePath extends string = '/'
> {
  (app: Hono<E, S, BasePath>, options?: { dir?: string }): Promise<ToSSGResult>
}

/**
 * @experimental
 * `toSSG` is an experimental feature.
 * The API might be changed.
 */
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
