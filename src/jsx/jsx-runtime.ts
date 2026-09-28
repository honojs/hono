/**
 * @module
 * This module provides Hono's JSX runtime.
 */

export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'
export type { JSX } from './jsx-dev-runtime'
import { html, raw } from '../helper/html'
import type { HtmlEscapedString, StringBuffer, HtmlEscaped } from '../utils/html'
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import { booleanAttributes, resolveAttributePromise } from './base'
import { isValidAttributeName, styleObjectForEach } from './utils'

export { html as jsxTemplate }

export const jsxAttr = (
  key: string,
  v: string | Promise<string> | Record<string, string | number | null | undefined | boolean>
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  if (!isValidAttributeName(key)) {
    return raw('')
  }
  if (key === 'style' && typeof v === 'object' && v !== null) {
    // object to style strings
    const buffer: StringBuffer = [`${key}="`] as StringBuffer
    let styleStr = ''
    styleObjectForEach(v as Record<string, string | number>, (property, value) => {
      if (value != null) {
        styleStr += `${styleStr ? ';' : ''}${property}:${value}`
      }
    })
    escapeToBuffer(styleStr, buffer)
    buffer[0] += '"'
    return raw(buffer[0])
  } else if (v === null || v === undefined) {
    return raw('')
  } else if (typeof v === 'boolean' && booleanAttributes.has(key)) {
    return v ? raw(`${key}=""`) : raw('')
  } else if (typeof v === 'function') {
    // maybe event handler for client components, just ignore in server components
    return raw('')
  }

  const buffer: StringBuffer = [`${key}="`] as StringBuffer
  if (typeof v === 'string') {
    escapeToBuffer(v, buffer)
    buffer[0] += '"'
  } else if (
    typeof v === 'number' ||
    (v instanceof String && (v as unknown as HtmlEscaped).isEscaped)
  ) {
    buffer[0] += `${v}"`
  } else if (v instanceof Promise) {
    buffer.unshift('"', resolveAttributePromise(v) as Promise<string>)
  } else {
    const s = (v as { toString(): string | Promise<string> }).toString()
    if (s instanceof Promise) {
      buffer.unshift(
        '"',
        s.then((resolved) => String(resolved))
      )
    } else {
      escapeToBuffer(s, buffer)
      buffer[0] += '"'
    }
  }

  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, undefined)
}

export const jsxEscape = (value: string) => value
