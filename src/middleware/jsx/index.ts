import type { Context } from '../../context'
import type { Next } from '../../hono'
import { escape } from '../../utils/html'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace h.JSX {
    interface IntrinsicElements {
      [tagName: string]: Record<string, string>
    }
  }
}

export const jsx = () => {
  return async (c: Context, next: Next) => {
    c.render = (content: string) => {
      const output = `<!doctype html>${content.toString()}`
      return c.html(output)
    }
    await next()
  }
}

type EscapedString = string & { isEscaped: true }

export const h = (
  tag: string | Function,
  props: Record<string, any>,
  ...children: (string | EscapedString)[]
): EscapedString => {
  if (typeof tag === 'function') {
    return tag.call(null, { ...props, children })
  }
  let attrs = ''
  const propsKeys = Object.keys(props || {})
  for (let i = 0, len = propsKeys.length; i < len; i++) {
    attrs += ` ${propsKeys[i]}="${escape(props[propsKeys[i]])}"`
  }

  const res: any = new String(
    `<${tag}${attrs}>${children
      .flat()
      .map((c) => ((c as any).isEscaped ? c : escape(c as string)))
      .join('')}</${tag}>`
  )
  res.isEscaped = true

  return res
}
