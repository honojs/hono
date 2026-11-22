import type { JSONParsed } from '../../../src/utils/types'

type Item = { id: string; position?: 'a' | 'b'; note: string | undefined }

declare const parsed: JSONParsed<Item>
export const item: Item = parsed
