import { BodyParser } from '..'
import { parseValues } from './value'

export const parseObject = <T extends Record<string, unknown | string[]>>(
  chain: string[],
  value: T,
  valueParsed: boolean
) => {
  const { options } = BodyParser
  let leaf = valueParsed ? value : parseValues(value as never)

  for (let i = chain.length - 1; i >= 0; --i) {
    let obj: string[] | Record<string, unknown | string[]>
    const root = chain[i]

    if (root === '[]') {
      obj = [].concat(leaf as never)
    } else {
      obj = {}

      const isEncapsulated = root.charAt(0) === '[' && root.at(-1) === ']'
      const cleanRoot = isEncapsulated ? root.slice(1, -1) : root
      const index = +cleanRoot

      if (!options.parseArrays && cleanRoot === '') {
        obj = { 0: leaf }
      } else if (
        !Number.isNaN(index) &&
        root !== cleanRoot &&
        String(index) === cleanRoot &&
        index >= 0 &&
        options.parseArrays &&
        index <= options.arrayLimit
      ) {
        obj = []
        obj[index] = leaf as never
      } else if (cleanRoot !== '__proto__') {
        obj[cleanRoot] = leaf
      }
    }

    leaf = obj as typeof leaf
  }

  return leaf
}
