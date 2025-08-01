const LABEL_REG_EXP_STR = '[^/]+'
const ONLY_WILDCARD_REG_EXP_STR = '.*'
const TAIL_WILDCARD_REG_EXP_STR = '(?:|/.*)'
export const PATH_ERROR = Symbol()

export type ParamAssocArray = [string, number][]
export interface Context {
  varIndex: number
}

const regExpMetaChars = new Set('.\\+*[^]$()')

/**
 * Sort order:
 * 1. literal
 * 2. special pattern (e.g. :label{[0-9]+})
 * 3. common label pattern (e.g. :label)
 * 4. wildcard
 */
function compareKey(a: string, b: string): number {
  if (a.length === 1) {
    return b.length === 1 ? (a < b ? -1 : 1) : -1
  }
  if (b.length === 1) {
    return 1
  }

  // wildcard
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1
  }

  // label
  if (a === LABEL_REG_EXP_STR) {
    return 1
  } else if (b === LABEL_REG_EXP_STR) {
    return -1
  }

  return a.length === b.length ? (a < b ? -1 : 1) : b.length - a.length
}

export class Node {
  #index?: number
  #varIndex?: number
  #children: Record<string, Node> = Object.create(null)

  insert(
    tokens: readonly string[],
    index: number,
    paramMap: ParamAssocArray,
    context: Context,
    pathErrorCheckOnly: boolean
  ): void {
    if (tokens.length === 0) {
      if (this.#index !== undefined) {
        throw PATH_ERROR
      }
      if (pathErrorCheckOnly) {
        return
      }

      this.#index = index
      return
    }

    const [token, ...restTokens] = tokens
    const pattern =
      token === '*'
        ? restTokens.length === 0
          ? ['', '', ONLY_WILDCARD_REG_EXP_STR] // '*' matches to all the trailing paths
          : ['', '', LABEL_REG_EXP_STR]
        : token === '/*'
        ? ['', '', TAIL_WILDCARD_REG_EXP_STR] // '/path/to/*' is /\/path\/to(?:|/.*)$
        : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)

    let node
    if (pattern) {
      const name = pattern[1]
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR
      if (name && pattern[2]) {
        if (regexpStr === '.*') {
          throw PATH_ERROR
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, '(?:') // (a|b) => (?:a|b)
        if (/\((?!\?:)/.test(regexpStr)) {
          // prefix(?:a|b) is allowed, but prefix(a|b) is not
          throw PATH_ERROR
        }
      }

      node = this.#children[regexpStr]
      if (!node) {
        if (
          Object.keys(this.#children).some(
            (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
          )
        ) {
          throw PATH_ERROR
        }
        if (pathErrorCheckOnly) {
          return
        }
        node = this.#children[regexpStr] = new Node()
        if (name !== '') {
          node.#varIndex = context.varIndex++
        }
      }
      if (!pathErrorCheckOnly && name !== '') {
        paramMap.push([name, node.#varIndex as number])
      }
    } else {
      node = this.#children[token]
      if (!node) {
        if (
          Object.keys(this.#children).some(
            (k) =>
              k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
          )
        ) {
          throw PATH_ERROR
        }
        if (pathErrorCheckOnly) {
          return
        }
        node = this.#children[token] = new Node()
      }
    }

    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly)
  }

  buildRegExpStr(): string {
    const childKeys = Object.keys(this.#children).sort(compareKey)

    const strList = childKeys.map((k) => {
      const c = this.#children[k]
      return (
        (typeof c.#varIndex === 'number'
          ? `(${k})@${c.#varIndex}`
          : regExpMetaChars.has(k)
          ? `\\${k}`
          : k) + c.buildRegExpStr()
      )
    })

    if (typeof this.#index === 'number') {
      strList.unshift(`#${this.#index}`)
    }

    if (strList.length === 0) {
      return ''
    }
    if (strList.length === 1) {
      return strList[0]
    }

    return '(?:' + strList.join('|') + ')'
  }
}
