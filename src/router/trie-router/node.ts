import type { Result } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { Pattern } from '../../utils/url'
import { splitPath, getPattern } from '../../utils/url'

type Next<T> = {
  nodes: Node<T>[]
  handlers: T[]
  params: Record<string, string>
}

function findParam<T>(node: Node<T>, name: string): boolean {
  for (let i = 0, len = node.patterns.length; i < len; i++) {
    if (typeof node.patterns[i] === 'object' && node.patterns[i][1] === name) {
      return true
    }
  }
  const nodes = Object.values(node.children)
  for (let i = 0, len = nodes.length; i < len; i++) {
    if (findParam(nodes[i], name)) {
      return true
    }
  }

  return false
}

export class Node<T> {
  methods: Record<string, T>[]
  handlers: T[]
  children: Record<string, Node<T>>
  patterns: Pattern[]

  constructor(method?: string, handler?: T, children?: Record<string, Node<T>>) {
    this.children = children || {}
    this.methods = []
    if (method && handler) {
      const m: Record<string, T> = {}
      m[method] = handler
      this.methods = [m]
    }
    this.patterns = []
  }

  insert(method: string, path: string, handler: T): Node<T> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitPath(path)

    const parentPatterns: Pattern[] = []

    const errorMessage = (name: string): string => {
      return `Duplicate param name, use another name instead of '${name}' - ${method} ${path} <--- '${name}'`
    }

    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]

      if (Object.keys(curNode.children).includes(p)) {
        parentPatterns.push(...curNode.patterns)
        curNode = curNode.children[p]
        continue
      }

      curNode.children[p] = new Node()
      const pattern = getPattern(p)
      if (pattern) {
        if (typeof pattern === 'object') {
          for (let j = 0, len = parentPatterns.length; j < len; j++) {
            if (typeof parentPatterns[j] === 'object' && parentPatterns[j][1] === pattern[1]) {
              throw new Error(errorMessage(pattern[1]))
            }
          }
          if (Object.values(curNode.children).some((n) => findParam(n, pattern[1]))) {
            throw new Error(errorMessage(pattern[1]))
          }
        }
        curNode.patterns.push(pattern)
        parentPatterns.push(...curNode.patterns)
      }
      parentPatterns.push(...curNode.patterns)
      curNode = curNode.children[p]
    }
    if (!curNode.methods.length) {
      curNode.methods = []
    }
    const m: Record<string, T> = {}
    m[method] = handler
    curNode.methods.push(m)
    return curNode
  }

  private getHandlers(node: Node<T>, method: string): T[] {
    const handlers: T[] = []
    node.methods.map((m) => {
      let handler = m[method]
      if (handler !== undefined) {
        handlers.push(handler)
        return
      }
      handler = m[METHOD_NAME_ALL]
      if (handler !== undefined) {
        handlers.push(handler)
        return
      }
    })

    return handlers
  }

  private next(node: Node<T>, part: string, method: string, isLast: boolean): Next<T> {
    const handlers: T[] = []
    const nextNodes: Node<T>[] = []
    const params: Record<string, string> = {}

    for (let j = 0, len = node.patterns.length; j < len; j++) {
      const pattern = node.patterns[j]

      // Wildcard
      // '/hello/*/foo' => match /hello/bar/foo
      if (pattern === '*') {
        const astNode = node.children['*']
        if (astNode) {
          handlers.push(...this.getHandlers(astNode, method))
          nextNodes.push(astNode)
        }
      }

      if (part === '') continue

      // Named match
      // `/posts/:id` => match /posts/123
      const [key, name, matcher] = pattern
      if (matcher === true || (matcher instanceof RegExp && matcher.test(part))) {
        if (typeof key === 'string') {
          if (isLast === true) {
            handlers.push(...this.getHandlers(node.children[key], method))
          }
          nextNodes.push(node.children[key])
        }
        if (typeof name === 'string') {
          params[name] = part
        }
      }
    }

    const nextNode = node.children[part]
    if (nextNode) {
      if (isLast === true) {
        // '/hello/*' => match '/hello'
        if (nextNode.children['*'] !== undefined) {
          handlers.push(...this.getHandlers(nextNode.children['*'], method))
        }
        handlers.push(...this.getHandlers(nextNode, method))
      }
      nextNodes.push(nextNode)
    }

    const next: Next<T> = {
      nodes: nextNodes,
      handlers: handlers,
      params: params,
    }
    return next
  }

  search(method: string, path: string): Result<T> {
    const handlers: T[] = []
    let params: Record<string, string> = {}

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const curNode: Node<T> = this
    let curNodes = [curNode]
    const parts = splitPath(path)

    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]
      const isLast = i === len - 1
      const tempNodes: Node<T>[] = []

      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const res = this.next(curNodes[j], p, method, isLast)
        if (res.nodes.length === 0) {
          continue
        }
        handlers.push(...res.handlers)
        params = Object.assign(params, res.params)
        tempNodes.push(...res.nodes)
      }

      curNodes = tempNodes
    }

    if (handlers.length <= 0) return null

    return { handlers, params }
  }
}
