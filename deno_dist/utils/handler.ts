import { COMPOSED_HANDLER } from '../hono-base.ts'

export const isMiddleware = (handler: Function) => handler.length > 1
export const findTargetHandler = (handler: Function): Function => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (handler as any)[COMPOSED_HANDLER]
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findTargetHandler((handler as any)[COMPOSED_HANDLER])
    : handler
}
