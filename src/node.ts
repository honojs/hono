import { splitPath, getPattern } from './utils/url'

const METHOD_NAME_OF_ALL = 'ALL'

export class Result<T> {
  handler: T
  params: { [key: string]: string }
  constructor(handler: T, params: { [key: string]: string }) {
    this.handler = handler
    this.params = params
  }
}

const noRoute = (): null => {
  return null
}

export class Node<T> {
  method: { [key: string]: T }
  handler: T
  children: { [key: string]: Node<T> }
  middlewares: []

  constructor(method?: string, handler?: any, children?: { [key: string]: Node<T> }) {
    this.children = children || {}
    this.method = {}
    if (method && handler) {
      this.method[method] = handler
    }
    this.middlewares = []
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
      const keys = Object.keys(curNode.children)

      for (let j = 0, len = keys.length; j < len; j++) {
        const key: string = keys[j]

        // Wildcard
        // '/hello/*/foo' => match /hello/bar/foo
        if (key === '*') {
          curNode = curNode.children['*']
          isWildcard = true
          break
        }
        const pattern = getPattern(key)
        // Named match
        if (pattern) {
          const match = p.match(new RegExp(pattern[1]))
          if (match) {
            const k: string = pattern[0]
            params[k] = match[1]
            curNode = curNode.children[key]
            isParamMatch = true
            break
          }
          return noRoute()
        }
      }

      if (isWildcard && i === len - 1) {
        break
      }

      if (isWildcard === false && isParamMatch === false) {
        return noRoute()
      }
    }

    const handler = curNode.method[METHOD_NAME_OF_ALL] || curNode.method[method]

    if (!handler) {
      return noRoute()
    }

    return new Result<T>(handler, params)
  }
}
