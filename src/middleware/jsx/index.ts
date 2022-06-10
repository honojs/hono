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
    return tag.call(null, { ...props, children: children.length <= 1 ? children[0] : children })
  }

  let result = `<${tag}`

  const propsKeys = Object.keys(props || {})
  for (let i = 0, len = propsKeys.length; i < len; i++) {
    const v = props[propsKeys[i]]
    if (v === null || v === undefined) {
      continue
    }
    else if (v === null || v === undefined) {
      continue
    }

    result += ` ${propsKeys[i]}="${escape(v.toString())}"`
  }

  result += '>'

  const flattenChildren = children.flat(Infinity)
  for (let i = 0, len = flattenChildren.length; i < len; i++) {
    const child = flattenChildren[i]
    if (typeof child === 'boolean' || child === null || child === undefined) {
      continue
    } else if (typeof child === 'object' && (child as any).isEscaped) {
      result += child
    } else {
      result += escape(child.toString())
    }
  }

  result += `</${tag}>`

  const escapedString = new String(result) as EscapedString
  escapedString.isEscaped = true

  return escapedString
}
