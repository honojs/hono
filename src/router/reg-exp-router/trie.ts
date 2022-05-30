import type { ParamMap, Context } from './node'
import { Node } from './node'

export type { ParamMap } from './node'
export type ReplacementMap = number[]

interface InitOptions {
  reverse: boolean
}

export class Trie {
  context: Context = { varIndex: 0 }
  root: Node

  constructor({ reverse }: InitOptions = { reverse: false }) {
    this.root = new Node({ reverse })
  }

  insert(path: string, index: number): ParamMap {
    const paramMap: ParamMap = []

    /**
     *  - pattern (:label, :label{0-9]+}, ...)
     *  - /* wildcard
     *  - character
     */
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    this.root.insert(tokens, index, paramMap, this.context)

    return paramMap
  }

  buildRegExp(): [RegExp, ReplacementMap, ReplacementMap] {
    let regexp = this.root.buildRegExpStr()

    let captureIndex = 0
    const indexReplacementMap: ReplacementMap = []
    const paramReplacementMap: ReplacementMap = []

    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (typeof handlerIndex !== 'undefined') {
        indexReplacementMap[++captureIndex] = Number(handlerIndex)
        return '$()'
      }
      if (typeof paramIndex !== 'undefined') {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex
        return ''
      }

      return ''
    })

    return [new RegExp(`^https?:\/\/[a-zA-Z0-9\-\.:]+${regexp}`), indexReplacementMap, paramReplacementMap]
  }
}
