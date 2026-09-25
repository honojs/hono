import { createHash } from 'node:crypto'
import type { Context, Hono } from '../..'
import { useRequestContext } from '../../middleware/jsx-renderer'
import type { BlankEnv } from '../../types'
import { raw } from '../../utils/html'
import type { HtmlEscapedString } from '../../utils/html'
import { absolutePath } from '../../utils/url'
import { jsxFn, Fragment } from '../base'
import type { Props } from '../base'
import { PERMALINK } from '../constants'
import { renderToReadableStream } from '../streaming'
import type { FC } from '../types'
import client from './client'

interface ActionHandler<Env extends BlankEnv> {
  (
    data: Record<string, any> | undefined,
    c: Context<Env>,
    props: Props | undefined
  ): HtmlEscapedString | Promise<HtmlEscapedString> | Response | Promise<Response>
}

type ActionReturn = [(key: string) => () => void, FC]

const clientScript = `(${client.toString()})()`
const clientScriptUrl = `/hono-action-${createHash('sha256').update(clientScript).digest('hex')}.js`

export const createAction = <Env extends BlankEnv>(
  app: Hono<Env>,
  handler: ActionHandler<Env>
): ActionReturn => {
  const name = `/hono-action-${createHash('sha256').update(handler.toString()).digest('hex')}`

  app.post(`${name}/:key`, async (c) => {
    if (!c.req.header('X-Hono-Action')) {
      return c.json({ error: 'Not a Hono Action' }, 400)
    }

    const props = JSON.parse(c.req.header('X-Hono-Action-Props') || '{}')
    const data = await c.req.parseBody()
    const res = await handler(data, c, props)
    if (res instanceof Response) {
      if (res.status > 300 && res.status < 400) {
        return new Response('', {
          headers: {
            'X-Hono-Action-Redirect': res.headers.get('Location') || '',
          },
        })
      }
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

  const permalinkGenerator = (key: string) => {
    let actionName: string | undefined
    const subAction = () => {
      if (!actionName) {
        app.routes.forEach(({ path }) => {
          if (path.includes(name)) {
            actionName = path.replace(':key', key)
          }
        })
      }
      return actionName
    }
    ;(subAction as any)['key'] = key
    return subAction
  }

  const action = (key: string) => {
    const a = () => {}
    ;(a as any)[PERMALINK] = permalinkGenerator(key)
    return a
  }
  ;(action as any)[PERMALINK] = permalinkGenerator('default')

  return [
    action,
    async (props: Props = {}) => {
      const subAction = props.action || action
      const key = (subAction as any)[PERMALINK]['key']

      const c = useRequestContext()
      const res = await handler(undefined, c, props)
      if (res instanceof Response) {
        throw new Error('Response is not supported in JSX')
      }
      return Fragment({
        children: [
          // TBD: load client library, Might be simpler to make it globally referenceable and read from CDN
          jsxFn(
            'script',
            { src: absolutePath(clientScriptUrl), async: true },
            jsxFn(async () => '', {}, []) as any
          ) as any,
          raw(
            `<!-- ${name}/${key} props:${JSON.stringify(props)
              .replace(/</g, '\\u003c')
              .replace(/>/g, '\\u003e')} -->`
          ),
          res,
          raw(`<!-- /${name}/${key} -->`),
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
  const subAction = action(Math.random().toString(36).substring(2, 15))
  return [
    (props: Props = {}) => {
      return jsxFn('form', { action: subAction }, [
        jsxFn(Component as any, { ...props, action: subAction }, []) as any,
      ]) as any
    },
  ]
}
