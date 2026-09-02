import { createNullObject } from '../utils'

export const LABEL_REG_EXP_STR = '[^/]+'
export const ONLY_WILDCARD_REG_EXP_STR = '.*'
export const TAIL_WILDCARD_REG_EXP_STR = '(?:|/.*)'
export const PATH_ERROR = Symbol()

export type ParamAssocArray = [string, number][]
export interface Context {
  varIndex: number
}

const regExpMetaChars = new Set('.\\+*[^]$()')

interface ParsedToken {
  name: string
  regexp: string | null
}

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

  // wildcard: the only wildcard (.*) precedes the tail wildcard
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1
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
  // handler index of a dynamic path, or -1 for a static path terminal
  #index?: number
  #varIndex?: number
  #children: Record<string, Node> = createNullObject()

  insert(
    tokens: readonly string[],
    index: number,
    paramMap: ParamAssocArray,
    context: Context,
    isStatic: boolean
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let node: Node = this
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i]
      const parsed = this.parseToken(token, i, len)
      if (parsed) {
        let regexpStr = parsed.regexp ?? LABEL_REG_EXP_STR
        if (parsed.name !== '' && parsed.regexp !== null) {
          regexpStr = this.validateRegexpStr(regexpStr)
        }
        node = this.addDynamicChild(node, regexpStr)
        if (parsed.name !== '') {
          node.#varIndex ??= context.varIndex++
          paramMap.push([parsed.name, node.#varIndex])
        }
      } else {
        node = this.addStaticChild(node, token)
      }
    }

    if (node.#index !== undefined) {
      throw PATH_ERROR
    }
    node.#index = isStatic ? -1 : index
  }

  // Distinguishes a dynamic token (:label, :label{regexp}, '*', '/*') from a literal one.
  parseToken(token: string, i: number, len: number): ParsedToken | null {
    if (token.length === 1) {
      if (token === '*') {
        return {
          name: '',
          regexp: i === len - 1 ? ONLY_WILDCARD_REG_EXP_STR : LABEL_REG_EXP_STR, // '*' matches to all the trailing paths
        }
      }
      return null
    }
    if (token === '/*') {
      return { name: '', regexp: TAIL_WILDCARD_REG_EXP_STR } // '/path/to/*' is /\/path\/to(?:|/.*)$
    }
    const m = token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/)
    if (m) {
      return { name: m[1], regexp: m[2] ?? null }
    }
    return null
  }

  // Validates a user-supplied regexp for a named label (:label{regexp}) and returns it unchanged.
  validateRegexpStr(regexpStr: string): string {
    if (regexpStr === '.*') {
      throw PATH_ERROR
    }
    regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, '(?:') // (a|b) => (?:a|b)
    if (/\((?!\?:)/.test(regexpStr)) {
      // prefix(?:a|b) is allowed, but prefix(a|b) is not
      throw PATH_ERROR
    }
    if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
      // a single-char pattern like :x{.} is ambiguous with a literal character
      throw PATH_ERROR
    }
    return regexpStr
  }

  // Registers (or reuses) a child reached via a dynamic regexp pattern.
  addDynamicChild(node: Node, regexpStr: string): Node {
    let nextNode = node.#children[regexpStr]
    if (!nextNode) {
      if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
        for (const k in node.#children) {
          if (
            // a single-char pattern coexists with single-char literals as a literal does
            (regexpStr.length > 1 || k.length > 1) &&
            k !== ONLY_WILDCARD_REG_EXP_STR &&
            k !== TAIL_WILDCARD_REG_EXP_STR
          ) {
            throw PATH_ERROR
          }
        }
      }
      nextNode = node.#children[regexpStr] = new Node()
    }
    return nextNode
  }

  // Registers (or reuses) a child reached via a literal token.
  addStaticChild(node: Node, token: string): Node {
    let nextNode = node.#children[token]
    if (!nextNode) {
      for (const k in node.#children) {
        if (
          k.length > 1 &&
          k !== ONLY_WILDCARD_REG_EXP_STR &&
          k !== TAIL_WILDCARD_REG_EXP_STR
        ) {
          throw PATH_ERROR
        }
      }
      nextNode = node.#children[token] = new Node()
    }
    return nextNode
  }

  buildRegExpStr(): string {
    const childKeys = Object.keys(this.#children).sort(compareKey)

    const strList = childKeys
      .map((k) => {
        const c = this.#children[k]
        const childStr = c.buildRegExpStr()
        // an empty childStr means a static-only branch, which is handled by staticMap
        return childStr === ''
          ? ''
          : (typeof c.#varIndex === 'number'
              ? `(${k})@${c.#varIndex}`
              : regExpMetaChars.has(k)
                ? `\\${k}`
                : k) + childStr
      })
      .filter(Boolean)

    if (typeof this.#index === 'number' && this.#index !== -1) {
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
