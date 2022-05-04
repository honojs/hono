import { Result, METHOD_NAME_OF_ALL } from '@/router'
import type { Pattern } from '@/utils/url'
import { splitPath, getPattern } from '@/utils/url'

const noRoute = (): null => {
  return null
}

type Next<T> = {
  nodes: Node<T>[]
  handlers: T[]
  params: Record<string, string>
}

export class Node<T> {
  method: Record<string, T[]>
  handlers: T[]
  children: Record<string, Node<T>>
  patterns: Pattern[]

  constructor(method?: string, handlers?: T[], children?: Record<string, Node<T>>) {
    this.children = children || {}
    this.method = {}
    if (method && handlers) {
      this.method[method] = handlers
    }
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
    if (!curNode.method[method]) {
      curNode.method[method] = []
    }
    curNode.method[method].push(handler)
    return curNode
  }

  private getHandlers(node: Node<T>, method: string): T[] {
    const handlers: T[] = []
    if (node.method[method]) handlers.push(...node.method[method])
    if (node.method[METHOD_NAME_OF_ALL]) handlers.push(...node.method[METHOD_NAME_OF_ALL])
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
        handlers.push(...this.getHandlers(node.children['*'], method))
        if (!node.children[part]) {
          nextNodes.push(node.children['*'])
        }
      }

      // Named match
      // `/posts/:id` => match /posts/123
      if (part === '') continue
      const [key, name, matcher] = pattern
      if (matcher === true || (matcher instanceof RegExp && matcher.test(part))) {
        if (typeof key === 'string') {
          if (isLast) {
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
      if (isLast) {
        // '/hello/*' => match '/hello'
        if (nextNode.children['*']) {
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

    const len = parts.length
    for (let i = 0; i < len; i++) {
      const p: string = parts[i]
      const isLast = i === len - 1
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const res = this.next(curNodes[j], p, method, isLast)
        if (res.nodes.length === 0) {
          continue
        }
        handlers.push(...res.handlers)
        params = Object.assign(params, res.params)
        curNodes = res.nodes
      }
    }

    if (!handlers.length) return noRoute()

    return new Result<T>(handlers, params)
  }
}
