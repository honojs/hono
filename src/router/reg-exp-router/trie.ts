import { createNullObject } from '../utils'
import type { Context, ParamAssocArray } from './node'
import { Node } from './node'

export type ReplacementMap = number[]

export class Trie {
  #context: Context = { varIndex: 0 }
  #root: Node = new Node()
  #index: number = 0
  // path -> nodes from the root to the terminal, and the tokens between them
  #nodes: Record<string, Node[]> = createNullObject()
  #tokens: Record<string, string[]> = createNullObject()
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths: Record<string, [number, ParamAssocArray]> = createNullObject()

  has(path: string): boolean {
    return path in this.#nodes
  }

  isWildcard(path: string): boolean {
    const tokens = this.#tokens[path]
    const last = tokens[tokens.length - 1]
    return last === '*' || last === '/*'
  }

  insert(path: string, isStatic: boolean): void {
    if (isStatic) {
      // a static path has no pattern; every character is a literal token
      const tokens = path.split('')
      this.#nodes[path] = this.#root.insert(tokens, 0, [], this.#context, true)
      this.#tokens[path] = tokens
      return
    }

    const paramAssoc: ParamAssocArray = []

    const groups: [string, string][] = [] // [mark, original string]
    let markedPath = path
    for (let i = 0; ;) {
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

    this.#nodes[path] = this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false)
    this.#tokens[path] = tokens
    this.paths[path] = [this.#index++, paramAssoc]
  }

  // whether every request matching `path` also matches the wildcard path `wildcardPath`
  covers(wildcardPath: string, path: string): boolean {
    const nodes = this.#nodes[path]
    const wildcardNodes = this.#nodes[wildcardPath]
    // the node just before the wildcard terminal must be on the branch of `path`, at its own depth
    const i = wildcardNodes.length - 2
    if (nodes[i] !== wildcardNodes[i]) {
      return false
    }
    const tokens = this.#tokens[wildcardPath]
    // '*' matches everything below; '/*' needs `path` to end there or to continue with '/'
    return (
      tokens[tokens.length - 1] === '*' ||
      i === nodes.length - 1 ||
      this.#tokens[path][i][0] === '/'
    )
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
