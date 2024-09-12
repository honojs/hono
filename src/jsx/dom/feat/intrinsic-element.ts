/**
 * @module
 * This module install intrinsic-element features to `hono/jsx/dom`.
 */

import { intrinsicElementTags } from '../tiny/jsx-dev-runtime'
import * as intrinsicElementTagsImplemented from '../intrinsic-element/components'

for (const key in intrinsicElementTagsImplemented) {
  intrinsicElementTags[key] =
    intrinsicElementTagsImplemented[key as keyof typeof intrinsicElementTagsImplemented]
}
