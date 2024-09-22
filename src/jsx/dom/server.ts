/**
 * @module
 * This module provides APIs for `hono/jsx/server`, which is compatible with `react-dom/server`.
 */

import type { HtmlEscapedString } from '../../utils/html'
import type { Child } from '../base'
import { renderToReadableStream as renderToReadableStreamHono } from '../streaming'
import version from './'

export interface RenderToStringOptions {
  identifierPrefix?: string
}

/**
 * Render JSX element to string.
 * @param element JSX element to render.
 * @param options Options for rendering.
 * @returns Rendered string.
 */
const renderToString = (element: Child, options: RenderToStringOptions = {}): string => {
  if (Object.keys(options).length > 0) {
    console.warn('options are not supported yet')
  }
  const res = element?.toString() ?? ''
  if (typeof res !== 'string') {
    throw new Error('Async component is not supported in renderToString')
  }
  return res
}

export interface RenderToReadableStreamOptions {
  identifierPrefix?: string
  namespaceURI?: string
  nonce?: string
  bootstrapScriptContent?: string
  bootstrapScripts?: string[]
  bootstrapModules?: string[]
  progressiveChunkSize?: number
  signal?: AbortSignal
  onError?: (error: unknown) => string | void
}

/**
 * Render JSX element to readable stream.
 * @param element JSX element to render.
 * @param options Options for rendering.
 * @returns Rendered readable stream.
 */
const renderToReadableStream = async (
  element: Child,
  options: RenderToReadableStreamOptions = {}
): Promise<ReadableStream<Uint8Array>> => {
  if (Object.keys(options).some((key) => key !== 'onError')) {
    console.warn('options are not supported yet, except onError')
  }

  if (!element || typeof element !== 'object') {
    element = element?.toString() ?? ''
  }

  return renderToReadableStreamHono(element as HtmlEscapedString, options.onError)
}

export { renderToString, renderToReadableStream, version }
export default {
  renderToString,
  renderToReadableStream,
  version,
}
