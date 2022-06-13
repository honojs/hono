import { escape } from '../../utils/html'
import type { HtmlEscapedString } from '../../utils/html'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jsx.JSX {
    interface IntrinsicElements {
      [tagName: string]: Record<string, any>
    }
  }
}

export const jsx = (
  tag: string | Function,
  props: Record<string, any>,
  ...children: (string | HtmlEscapedString)[]
): HtmlEscapedString => {
  if (typeof tag === 'function') {
    return tag.call(null, { ...props, children: children.length <= 1 ? children[0] : children })
  }

  let result = tag !== '' ? `<${tag}` : ''

  const propsKeys = Object.keys(props || {})
  for (let i = 0, len = propsKeys.length; i < len; i++) {
    const v = props[propsKeys[i]]
    if (propsKeys[i] === 'dangerouslySetInnerHTML') {
      if (children.length > 0) {
        throw 'Can only set one of `children` or `props.dangerouslySetInnerHTML`.'
      }

      const escapedString = new String(v.__html) as HtmlEscapedString
      escapedString.isEscaped = true
      children = [escapedString]
      continue
    } else if (v === null || v === undefined) {
      continue
    }

    result += ` ${propsKeys[i]}="${escape(v.toString())}"`
  }

  if (tag !== '') {
    result += '>'
  }

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

  if (tag !== '') {
    result += `</${tag}>`
  }

  const escapedString = new String(result) as HtmlEscapedString
  escapedString.isEscaped = true

  return escapedString
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

export const Fragment = (props: { key?: string; children?: any }): HtmlEscapedString => {
  return jsx('', {}, ...(props.children || []))
}
