import { raw } from '../helper/html'
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import type { StringBuffer, HtmlEscaped, HtmlEscapedString } from '../utils/html'
import type { Context } from './context'
import { globalContexts } from './context'
import type { IntrinsicElements as IntrinsicElementsDefined } from './intrinsic-elements'
import { normalizeIntrinsicElementProps } from './utils'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Props = Record<string, any>
export type FC<T = Props> = (props: T) => HtmlEscapedString | Promise<HtmlEscapedString>

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    type Element = HtmlEscapedString | Promise<HtmlEscapedString>
    interface ElementChildrenAttribute {
      children: Child
    }
    interface IntrinsicElements extends IntrinsicElementsDefined {
      [tagName: string]: Props
    }
  }
}

const emptyTags = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]
const booleanAttributes = [
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'formnovalidate',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'nomodule',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'selected',
]

const childrenToStringToBuffer = (children: Child[], buffer: StringBuffer): void => {
  for (let i = 0, len = children.length; i < len; i++) {
    const child = children[i]
    if (typeof child === 'string') {
      escapeToBuffer(child, buffer)
    } else if (typeof child === 'boolean' || child === null || child === undefined) {
      continue
    } else if (child instanceof JSXNode) {
      child.toStringToBuffer(buffer)
    } else if (
      typeof child === 'number' ||
      (child as unknown as { isEscaped: boolean }).isEscaped
    ) {
      ;(buffer[0] as string) += child
    } else if (child instanceof Promise) {
      buffer.unshift('', child)
    } else {
      // `child` type is `Child[]`, so stringify recursively
      childrenToStringToBuffer(child, buffer)
    }
  }
}

type LocalContexts = [Context<unknown>, unknown][]
export type Child = string | Promise<string> | number | JSXNode | Child[]
export class JSXNode implements HtmlEscaped {
  tag: string | Function
  props: Props
  key?: string
  children: Child[]
  isEscaped: true = true as const
  localContexts?: LocalContexts
  constructor(tag: string | Function, props: Props, children: Child[]) {
    this.tag = tag
    this.props = props
    this.children = children
  }

  toString(): string | Promise<string> {
    const buffer: StringBuffer = ['']
    this.localContexts?.forEach(([context, value]) => {
      context.values.push(value)
    })
    try {
      this.toStringToBuffer(buffer)
    } finally {
      this.localContexts?.forEach(([context]) => {
        context.values.pop()
      })
    }
    return buffer.length === 1 ? buffer[0] : stringBufferToString(buffer)
  }

  toStringToBuffer(buffer: StringBuffer): void {
    const tag = this.tag as string
    const props = this.props
    let { children } = this

    buffer[0] += `<${tag}`

    const propsKeys = Object.keys(props || {})

    for (let i = 0, len = propsKeys.length; i < len; i++) {
      const key = propsKeys[i]
      const v = props[key]
      // object to style strings
      if (key === 'style' && typeof v === 'object') {
        const styles = Object.keys(v)
          .map((k) => {
            const property = k.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
            return `${property}:${v[k]}`
          })
          .join(';')
        buffer[0] += ` style="${styles}"`
      } else if (typeof v === 'string') {
        buffer[0] += ` ${key}="`
        escapeToBuffer(v, buffer)
        buffer[0] += '"'
      } else if (v === null || v === undefined) {
        // Do nothing
      } else if (typeof v === 'number' || (v as HtmlEscaped).isEscaped) {
        buffer[0] += ` ${key}="${v}"`
      } else if (typeof v === 'boolean' && booleanAttributes.includes(key)) {
        if (v) {
          buffer[0] += ` ${key}=""`
        }
      } else if (key === 'dangerouslySetInnerHTML') {
        if (children.length > 0) {
          throw 'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
        }

        children = [raw(v.__html)]
      } else if (v instanceof Promise) {
        buffer[0] += ` ${key}="`
        buffer.unshift('"', v)
      } else if (typeof v === 'function') {
        if (!key.startsWith('on')) {
          throw `Invalid prop '${key}' of type 'function' supplied to '${tag}'.`
        }
        // maybe event handler for client components, just ignore in server components
      } else {
        buffer[0] += ` ${key}="`
        escapeToBuffer(v.toString(), buffer)
        buffer[0] += '"'
      }
    }

    if (emptyTags.includes(tag as string)) {
      buffer[0] += '/>'
      return
    }

    buffer[0] += '>'

    childrenToStringToBuffer(children, buffer)

    buffer[0] += `</${tag}>`
  }
}

class JSXFunctionNode extends JSXNode {
  toStringToBuffer(buffer: StringBuffer): void {
    const { children } = this

    const res = (this.tag as Function).call(null, {
      ...this.props,
      children: children.length <= 1 ? children[0] : children,
    })

    if (res instanceof Promise) {
      if (globalContexts.length === 0) {
        buffer.unshift('', res)
      } else {
        // save current contexts for resuming
        const currentContexts: LocalContexts = globalContexts.map((c) => [c, c.values.at(-1)])
        buffer.unshift(
          '',
          res.then((childRes) => {
            if (childRes instanceof JSXNode) {
              childRes.localContexts = currentContexts
            }
            return childRes
          })
        )
      }
    } else if (res instanceof JSXNode) {
      res.toStringToBuffer(buffer)
    } else if (typeof res === 'number' || (res as HtmlEscaped).isEscaped) {
      buffer[0] += res
    } else {
      escapeToBuffer(res, buffer)
    }
  }
}

export class JSXFragmentNode extends JSXNode {
  toStringToBuffer(buffer: StringBuffer): void {
    childrenToStringToBuffer(this.children, buffer)
  }
}

export const jsx = (
  tag: string | Function,
  props: Props,
  ...children: (string | HtmlEscapedString)[]
): JSXNode => {
  let key
  if (props) {
    key = props?.key
    delete props['key']
  }
  const node = jsxFn(tag, props, children)
  node.key = key
  return node
}

export const jsxFn = (
  tag: string | Function,
  props: Props,
  children: (string | HtmlEscapedString)[]
): JSXNode => {
  if (typeof tag === 'function') {
    return new JSXFunctionNode(tag, props, children)
  } else {
    normalizeIntrinsicElementProps(props)
    return new JSXNode(tag, props, children)
  }
}

const shallowEqual = (a: Props, b: Props): boolean => {
  if (a === b) {
    return true
  }

  const aKeys = Object.keys(a).sort()
  const bKeys = Object.keys(b).sort()
  if (aKeys.length !== bKeys.length) {
    return false
  }

  for (let i = 0, len = aKeys.length; i < len; i++) {
    if (
      aKeys[i] === 'children' &&
      bKeys[i] === 'children' &&
      !a.children?.length &&
      !b.children?.length
    ) {
      continue
    } else if (a[aKeys[i]] !== b[aKeys[i]]) {
      return false
    }
  }

  return true
}

export const memo = <T>(
  component: FC<T>,
  propsAreEqual: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean = shallowEqual
): FC<T> => {
  let computed: HtmlEscapedString | Promise<HtmlEscapedString> | undefined = undefined
  let prevProps: T | undefined = undefined
  return ((props: T & { children?: Child }): HtmlEscapedString | Promise<HtmlEscapedString> => {
    if (prevProps && !propsAreEqual(prevProps, props)) {
      computed = undefined
    }
    prevProps = props
    return (computed ||= component(props))
  }) as FC<T>
}

export const Fragment = ({
  children,
}: {
  key?: string
  children?: Child | HtmlEscapedString
}): HtmlEscapedString => {
  return new JSXFragmentNode(
    '',
    {},
    Array.isArray(children) ? children : children ? [children] : []
  ) as never
}

export const isValidElement = (element: unknown): element is JSXNode => {
  return !!(
    element &&
    typeof element === 'object' &&
    'tag' in element &&
    'props' in element &&
    'children' in element
  )
}

export const cloneElement = <T extends JSXNode | JSX.Element>(
  element: T,
  props: Partial<Props>,
  ...children: Child[]
): T => {
  return jsxFn(
    (element as JSXNode).tag,
    { ...(element as JSXNode).props, ...props },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children.length ? children : ((element as JSXNode).children as any) || []
  ) as T
}
