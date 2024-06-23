/**
 * @module
 * This module provides the `hono/jsx/dom` dev runtime.
 */

import type { JSXNode, Props } from '../base'
import { newJSXNode } from './utils'

export const jsxDEV = (tag: string | Function, props: Props, key?: string): JSXNode => {
  return newJSXNode({
    tag,
    props,
    key,
  })
}

export const Fragment = (props: Record<string, unknown>): JSXNode => jsxDEV('', props, undefined)
