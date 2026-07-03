/**
 * @module
 * This module provides Hono's JSX runtime.
 */

export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'
export type { JSX } from './jsx-dev-runtime'
import { raw } from '../helper/html'
import type { HtmlEscapedString, StringBuffer, HtmlEscaped } from '../utils/html'
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import { JSXFragmentNode } from './base'
import type { Child } from './base'
import { isValidAttributeName, styleObjectForEach } from './utils'

/**
 * Runtime for the "precompile" JSX transform (Deno's `jsx: "precompile"`).
 *
 * The transform emits a static template split into `strings` with the dynamic
 * parts hoisted into `values`, e.g. `<div><Consumer/></div>` becomes
 * `jsxTemplate(['<div>', '</div>'], jsx(Consumer, null))`.
 *
 * Interpolated values are wrapped in a lazy `JSXFragmentNode` rather than being
 * stringified here, so a component `value` only renders when the surrounding
 * tree is stringified — not eagerly at call time. This mirrors the classic
 * `react-jsx` runtime, where an intermediate DOM element is itself a lazy
 * `JSXNode`. Eager stringification broke context propagation whenever a plain
 * DOM element sat between a `<Context.Provider>` and its consumer, because the
 * consumer was rendered before the Provider pushed its value (honojs/hono#4326).
 */
export const jsxTemplate = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): HtmlEscapedString => {
  const children: Child[] = []
  for (let i = 0, len = strings.length - 1; i < len; i++) {
    children.push(raw(strings[i]), values[i] as Child)
  }
  children.push(raw(strings[strings.length - 1]))
  return new JSXFragmentNode('', {}, children) as unknown as HtmlEscapedString
}

export const jsxAttr = (
  key: string,
  v: string | Promise<string> | Record<string, string | number | null | undefined | boolean>
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  if (!isValidAttributeName(key)) {
    return raw('')
  }
  const buffer: StringBuffer = [`${key}="`] as StringBuffer
  if (key === 'style' && typeof v === 'object') {
    // object to style strings
    let styleStr = ''
    styleObjectForEach(v as Record<string, string | number>, (property, value) => {
      if (value != null) {
        styleStr += `${styleStr ? ';' : ''}${property}:${value}`
      }
    })
    escapeToBuffer(styleStr, buffer)
    buffer[0] += '"'
  } else if (typeof v === 'string') {
    escapeToBuffer(v, buffer)
    buffer[0] += '"'
  } else if (v === null || v === undefined) {
    return raw('')
  } else if (typeof v === 'number' || (v as unknown as HtmlEscaped).isEscaped) {
    buffer[0] += `${v}"`
  } else if (v instanceof Promise) {
    buffer.unshift('"', v)
  } else {
    escapeToBuffer(v.toString(), buffer)
    buffer[0] += '"'
  }

  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, undefined)
}

export const jsxEscape = (value: string) => value
