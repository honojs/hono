import { Result, METHOD_NAME_ALL } from '@/router'
import type { Pattern } from '@/utils/url'
import { splitPath, getPattern } from '@/utils/url'

const noRoute = (): null => {
  return null
}

export class Node<T> {
  method: Record<string, T>
  handler: T
  children: Record<string, Node<T>>
  middlewares: []
  patterns: Pattern[]

  constructor(method?: string, handler?: T, children?: Record<string, Node<T>>) {
    this.children = children || {}
    this.method = {}
    if (method && handler) {
      this.method[method] = handler
    }
    this.middlewares = []
    this.patterns = []
  }

  insert(method: string, path: string, handler: T): Node<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitPath(path)
    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]
      if (Object.keys(curNode.children).includes(p)) {
        curNode = curNode.children[p]
        continue
      }
      curNode.children[p] = new Node()
      const pattern = getPattern(p)
      if (pattern) {
        curNode.patterns.push(pattern)
      }

      curNode = curNode.children[p]
    }
    curNode.method[method] = handler
    return curNode
  }

  search(method: string, path: string): Result<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this

    const params: { [key: string]: string } = {}
    const parts = splitPath(path)

    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]

      // '*' => match any path
      // /api/* => default wildcard match
      if (curNode.children['*'] && !curNode.children[p]) {
        const astNode = curNode.children['*']
        if (Object.keys(astNode.children).length === 0) {
          curNode = astNode
          break
        }
      }

      const nextNode = curNode.children[p]

      if (nextNode) {
        curNode = nextNode
        // '/hello/*' => match '/hello'
        if (!(i == len - 1 && nextNode.children['*'])) {
          continue
        }
      }

      let isWildcard = false
      let isParamMatch = false

      for (let j = 0, len = curNode.patterns.length; j < len; j++) {
        const pattern = curNode.patterns[j]

        // Wildcard
        // '/hello/*/foo' => match /hello/bar/foo
        if (pattern === '*') {
          curNode = curNode.children['*']
          isWildcard = true
          break
        }

        // Named match
        const [key, name, matcher] = pattern
        if (p !== '' && (matcher === true || matcher.test(p))) {
          params[name] = p
          curNode = curNode.children[key]
          isParamMatch = true
          break
        }
        return noRoute()
      }

      if (isWildcard && i === len - 1) {
        break
      }

      if (isWildcard === false && isParamMatch === false) {
        return noRoute()
      }
    }

    const handler = curNode.method[METHOD_NAME_ALL] || curNode.method[method]

    if (!handler) {
      return noRoute()
    }

    return new Result<T>(handler, params)
  }
}
