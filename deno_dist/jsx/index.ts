import { raw } from '../helper/html/index.ts'
import { escapeToBuffer, stringBufferToString } from '../utils/html.ts'
import type { StringBuffer, HtmlEscaped, HtmlEscapedString } from '../utils/html.ts'
import type { IntrinsicElements as IntrinsicElementsDefined } from './intrinsic-elements.ts'
export { ErrorBoundary } from './components.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Props = Record<string, any>

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

export type Child = string | Promise<string> | number | JSXNode | Child[]
export class JSXNode implements HtmlEscaped {
  tag: string | Function
  props: Props
  children: Child[]
  isEscaped: true = true as const
  constructor(tag: string | Function, props: Props, children: Child[]) {
    this.tag = tag
    this.props = props
    this.children = children
  }

  toString(): string | Promise<string> {
    const buffer: StringBuffer = ['']
    this.toStringToBuffer(buffer)
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
      buffer.unshift('', res)
    } else if (res instanceof JSXNode) {
      res.toStringToBuffer(buffer)
    } else if (typeof res === 'number' || (res as HtmlEscaped).isEscaped) {
      buffer[0] += res
    } else {
      escapeToBuffer(res, buffer)
    }
  }
}

class JSXFragmentNode extends JSXNode {
  toStringToBuffer(buffer: StringBuffer): void {
    childrenToStringToBuffer(this.children, buffer)
  }
}

export { jsxFn as jsx }
const jsxFn = (
  tag: string | Function,
  props: Props,
  ...children: (string | HtmlEscapedString)[]
): JSXNode => {
  if (typeof tag === 'function') {
    return new JSXFunctionNode(tag, props, children)
  } else {
    return new JSXNode(tag, props, children)
  }
}

export type FC<T = Props> = (
  props: T & { children?: Child }
) => HtmlEscapedString | Promise<HtmlEscapedString>

const shallowEqual = (a: Props, b: Props): boolean => {
  if (a === b) {
    return true
  }

  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) {
    return false
  }

  for (let i = 0, len = aKeys.length; i < len; i++) {
    if (a[aKeys[i]] !== b[aKeys[i]]) {
      return false
    }
  }

  return true
}

export const memo = <T>(
  component: FC<T>,
  propsAreEqual: (prevProps: Readonly<T>, nextProps: Readonly<T>) => boolean = shallowEqual
): FC<T> => {
  let computed = undefined
  let prevProps: T | undefined = undefined
  return ((props: T & { children?: Child }): HtmlEscapedString => {
    if (prevProps && !propsAreEqual(prevProps, props)) {
      computed = undefined
    }
    prevProps = props
    return (computed ||= component(props))
  }) as FC<T>
}

export const Fragment = (props: {
  key?: string
  children?: Child | HtmlEscapedString
}): HtmlEscapedString => {
  return new JSXFragmentNode('', {}, props.children ? [props.children] : []) as never
}

export interface Context<T> {
  values: T[]
  Provider: FC<{ value: T }>
}

export const createContext = <T>(defaultValue: T): Context<T> => {
  const values = [defaultValue]
  return {
    values,
    Provider(props): HtmlEscapedString | Promise<HtmlEscapedString> {
      values.push(props.value)
      const string = props.children
        ? (Array.isArray(props.children)
            ? new JSXFragmentNode('', {}, props.children)
            : props.children
          ).toString()
        : ''
      values.pop()

      if (string instanceof Promise) {
        return Promise.resolve().then<HtmlEscapedString>(async () => {
          values.push(props.value)
          const awaited = await string
          const promiseRes = raw(awaited, (awaited as HtmlEscapedString).callbacks)
          values.pop()
          return promiseRes
        })
      } else {
        return raw(string)
      }
    },
  }
}

export const useContext = <T>(context: Context<T>): T => {
  return context.values[context.values.length - 1]
}
