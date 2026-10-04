/**
 * @module
 * This module provides Hono's JSX runtime.
 */

export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime'
export { jsxDEV as jsxs } from './jsx-dev-runtime'
export type { JSX } from './jsx-dev-runtime'
import { html, raw } from '../helper/html'
import type { HtmlEscapedString, StringBuffer } from '../utils/html'
import { escapeToBuffer, stringBufferToString } from '../utils/html'
import { attributeToBuffer } from './base'
import { JSX_TEMPLATE } from './constants'
import { isValidAttributeName } from './utils'

const markJSXTemplate = (value: HtmlEscapedString): HtmlEscapedString => {
  ;(value as unknown as Record<symbol, boolean>)[JSX_TEMPLATE] = true
  return value
}

export const jsxTemplate: typeof html = (strings, ...values) => {
  const result = html(strings, ...values)
  return result instanceof Promise ? result.then(markJSXTemplate) : markJSXTemplate(result)
}

export const jsxAttr = (
  key: string,
  v: string | Promise<string> | Record<string, string | number | null | undefined | boolean>
): HtmlEscapedString | Promise<HtmlEscapedString> => {
  if (!isValidAttributeName(key)) {
    return raw('')
  }
  if (typeof v === 'string') {
    const buffer: StringBuffer = [`${key}="`]
    escapeToBuffer(v, buffer)
    return raw(buffer[0] + '"')
  }
  const buffer: StringBuffer = ['']
  attributeToBuffer(buffer, '', key, v)
  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, undefined)
}

export const jsxEscape = (value: string) => value
