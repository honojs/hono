import type { Context, ParamAssocArray } from './node'
import { Node } from './node'

export type ReplacementMap = number[]

export class Trie {
  #context: Context = { varIndex: 0 }
  #root: Node = new Node()
  #index: number = 0
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths: Record<string, [number, ParamAssocArray]> = Object.create(null)

  insert(path: string, isStatic: boolean): void {
    if (isStatic) {
      // a static path has no pattern; every character is a literal token
      this.#root.insert(path.split(''), 0, [], this.#context, true)
      return
    }

    const paramAssoc: ParamAssocArray = []

    const groups: [string, string][] = [] // [mark, original string]
    let markedPath = path
    for (let i = 0; ; ) {
      let replaced = false
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`
        groups[i] = [mark, m]
        i++
        replaced = true
        return mark
      })
      if (!replaced) {
        break
      }
    }

    /**
     *  - pattern (:label, :label{0-9]+}, ...)
     *  - /* wildcard
     *  - character
     */
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || []
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i]
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1])
          break
        }
      }
    }

    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false)
    this.paths[path] = [this.#index++, paramAssoc]
  }

  buildRegExp(): [RegExp, ReplacementMap, ReplacementMap] {
    let regexp = this.#root.buildRegExpStr()
    if (regexp === '') {
      return [/^$/, [], []] // never match
    }

    let captureIndex = 0
    const indexReplacementMap: ReplacementMap = []
    const paramReplacementMap: ReplacementMap = []

    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== undefined) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex)
        return '$()'
      }
      if (paramIndex !== undefined) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex
        return ''
      }

      return ''
    })

    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap]
  }
}
