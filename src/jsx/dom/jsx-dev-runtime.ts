/**
 * @module
 * This module provides the `hono/jsx/dom` dev runtime.
 */

import type { JSXNode, Props } from '../base'
import { newJSXNode } from './utils'
import * as intrinsicElementTags from './intrinsic-element-tags'

export const jsxDEV = (tag: string | Function, props: Props, key?: string): JSXNode => {
  return newJSXNode({
    tag:
      (typeof tag === 'string' && intrinsicElementTags[tag as keyof typeof intrinsicElementTags]) ||
      tag,
    props,
    key,
  })
}

export const Fragment = (props: Record<string, unknown>): JSXNode => jsxDEV('', props, undefined)
