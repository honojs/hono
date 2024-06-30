import type { Context, Hono } from '../..'
import type { BlankEnv } from '../../types'
import type { FC } from '../types'
import { useRequestContext } from '../../middleware/jsx-renderer'
import type { HtmlEscapedString } from '../../utils/html'
import { renderToReadableStream } from '../streaming'
import { jsxFn, Fragment } from '../base'
import client from './client'
import { PERMALINK } from '../constants'
import { absolutePath } from '../../utils/url'
import { createHash } from 'node:crypto'

interface ActionHandler<Env extends BlankEnv> {
  (data: Record<string, any> | undefined, c: Context<Env>):
    | HtmlEscapedString
    | Promise<HtmlEscapedString>
    | Response
    | Promise<Response>
}

type ActionReturn = [() => void, FC]

const clientScript = `(${client.toString()})()`
const clientScriptUrl = `/hono-action-${createHash('sha256').update(clientScript).digest('hex')}.js`

export const createAction = <Env extends BlankEnv>(
  app: Hono<Env>,
  handler: ActionHandler<Env>
): ActionReturn => {
  const name = `/hono-action-${createHash('sha256').update(handler.toString()).digest('hex')}`

  app.post(name, async (c) => {
    const data = await c.req.parseBody()
    const res = await handler(data, c)
    if (res instanceof Response) {
      return res
    } else {
      return c.body(renderToReadableStream(res), {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Transfer-Encoding': 'chunked',
        },
      })
    }
  })

  // FIXME: dedupe
  app.get(
    absolutePath(clientScriptUrl),
    () =>
      new Response(clientScript, {
        headers: { 'Content-Type': 'application/javascript' },
      })
  )

  const action = () => {}
  let actionName: string | undefined
  ;(action as any)[PERMALINK] = () => {
    if (!actionName) {
      app.routes.forEach(({ path }) => {
        if (path.includes(name)) {
          actionName = path
        }
      })
    }
    return actionName
  }

  return [
    action,
    async () => {
      const c = useRequestContext()
      const res = await handler(undefined, c)
      if (res instanceof Response) {
        throw new Error('Response is not supported in JSX')
      }
      return Fragment({
        children: [
          // TBD: load client library, Might be simpler to make it globally referenceable and read from CDN
          jsxFn(
            'script',
            { src: clientScriptUrl, async: true },
            jsxFn(async () => '', {}, []) as any
          ) as any,
          jsxFn('hono-action', { 'data-hono-action': name }, [res]),
        ],
      })
    },
  ]
}

export const createForm = <Env extends BlankEnv>(
  app: Hono<Env>,
  handler: ActionHandler<Env>
): [ActionReturn[1]] => {
  const [action, Component] = createAction(app, handler)
  return [
    () => {
      return jsxFn('form', { action }, [jsxFn(Component as any, {}, []) as any]) as any
    },
  ]
}
