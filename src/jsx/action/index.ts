import type { Context, Hono } from '../..'
import type { BlankEnv } from '../../types'
import type { FC } from '../types'
import { useRequestContext } from '../../middleware/jsx-renderer'
import type { HtmlEscapedString } from '../../utils/html'
import { renderToReadableStream } from '../streaming'
import { jsxFn, Fragment } from '../base'
import client from './client'
import { PERMALINK } from '../constants'

interface ActionHandler<Env extends BlankEnv> {
  (data: Record<string, any> | undefined, c: Context<Env>):
    | HtmlEscapedString
    | Promise<HtmlEscapedString>
    | Response
    | Promise<Response>
}

type ActionReturn = [() => void, FC]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actionHandlerIndex = new WeakMap<Hono<any>, number>()

export const createAction = <Env extends BlankEnv>(
  app: Hono<Env>,
  handler: ActionHandler<Env>
): ActionReturn => {
  const index = actionHandlerIndex.get(app) || 0
  actionHandlerIndex.set(app, index + 1)
  let name = handler.name
  if (!name) {
    name = `/hono-action-${index}`
  }

  // FIXME: parentApp.route('/subdir', app)
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
  if (index === 0) {
    app.get(
      'action.js',
      () =>
        new Response(`(${client.toString()})()`, {
          headers: { 'Content-Type': 'application/javascript' },
        })
    )
  }

  const action = () => {}
  ;(action as any)[PERMALINK] = () => name
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
            { src: 'action.js', async: true },
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
