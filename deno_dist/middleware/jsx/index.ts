import { escapeToBuffer } from '../../utils/html.ts'
import type { StringBuffer, HtmlEscaped, HtmlEscapedString } from '../../utils/html.ts'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jsx.JSX {
    interface IntrinsicElements {
      [tagName: string]: Record<string, any>
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
    } else if (typeof child === 'number' || (child as any).isEscaped) {
      buffer[0] += child
    } else {
      // `child` type is `Child[]`, so stringify recursively
      childrenToStringToBuffer(child, buffer)
    }
  }
}

type Child = string | number | JSXNode | Child[]
export class JSXNode implements HtmlEscaped {
  tag: string | Function
  props: Record<string, any>
  children: Child[]
  isEscaped: true = true
  constructor(tag: string | Function, props: Record<string, any>, children: Child[]) {
    this.tag = tag
    this.props = props
    this.children = children
  }

  toString(): string {
    const buffer: StringBuffer = ['']
    this.toStringToBuffer(buffer)
    return buffer[0]
  }

  toStringToBuffer(buffer: StringBuffer): void {
    const tag = this.tag as string
    const props = this.props
    let { children } = this

    buffer[0] += `<${tag}`

    const propsKeys = Object.keys(props || {})

    for (let i = 0, len = propsKeys.length; i < len; i++) {
      const v = props[propsKeys[i]]
      if (typeof v === 'string') {
        buffer[0] += ` ${propsKeys[i]}="`
        escapeToBuffer(v, buffer)
        buffer[0] += '"'
      } else if (typeof v === 'number') {
        buffer[0] += ` ${propsKeys[i]}="${v}"`
      } else if (v === null || v === undefined) {
        // Do nothing
      } else if (typeof v === 'boolean' && booleanAttributes.includes(propsKeys[i])) {
        if (v) {
          buffer[0] += ` ${propsKeys[i]}=""`
        }
      } else if (propsKeys[i] === 'dangerouslySetInnerHTML') {
        if (children.length > 0) {
          throw 'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
        }

        const escapedString = new String(v.__html) as HtmlEscapedString
        escapedString.isEscaped = true
        children = [escapedString]
      } else {
        buffer[0] += ` ${propsKeys[i]}="`
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

    if (res instanceof JSXNode) {
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
  props: Record<string, any>,
  ...children: (string | HtmlEscapedString)[]
): JSXNode => {
  if (typeof tag === 'function') {
    return new JSXFunctionNode(tag, props, children)
  } else {
    return new JSXNode(tag, props, children)
  }
}

type FC<T = Record<string, any>> = (props: T) => HtmlEscapedString

const shallowEqual = (a: Record<string, any>, b: Record<string, any>): boolean => {
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
  return ((props: T): HtmlEscapedString => {
    if (prevProps && !propsAreEqual(prevProps, props)) {
      computed = undefined
    }
    prevProps = props
    return (computed ||= component(props))
  }) as FC<T>
}

export const Fragment = (props: { key?: string; children?: any }): JSXNode => {
  return new JSXFragmentNode('', {}, props.children || [])
}
