import type { Result } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { Pattern } from '../../utils/url'
import { splitPath, getPattern } from '../../utils/url'

type Next<T> = {
  nodes: Node<T>[]
  handlerSets: HandlerSet<T>[]
  params: Record<string, string>
}

type HandlerSet<T> = {
  handler: T
  score: number
  name: string // For debug
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
  methods: Record<string, HandlerSet<T>>[]

  children: Record<string, Node<T>>
  patterns: Pattern[]
  order: number = 0
  name: string

  constructor(method?: string, handler?: T, children?: Record<string, Node<T>>) {
    this.children = children || {}
    this.methods = []
    if (method && handler) {
      const m: Record<string, HandlerSet<T>> = {}
      m[method] = { handler: handler, score: 0, name: this.name }
      this.methods = [m]
    }
    this.patterns = []
  }

  insert(method: string, path: string, handler: T): Node<T> {
    this.name = `${method} ${path}`
    this.order = ++this.order

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitPath(`https://dummyhostname${path === '*' ? '/*' : path}`)

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

    let score = 1

    if (path === '*') {
      score = score + this.order * 0.01
    } else {
      score = parts.length + this.order * 0.01
    }

    if (!curNode.methods.length) {
      curNode.methods = []
    }

    const m: Record<string, HandlerSet<T>> = {}

    const handlerSet: HandlerSet<T> = { handler: handler, name: this.name, score: score }

    m[method] = handlerSet
    curNode.methods.push(m)

    return curNode
  }

  private getHandlerSets(node: Node<T>, method: string, wildcard?: boolean): HandlerSet<T>[] {
    const handlerSets: HandlerSet<T>[] = []
    node.methods.map((m) => {
      const handlerSet = m[method] || m[METHOD_NAME_ALL]
      if (handlerSet !== undefined) {
        const hs = { ...handlerSet }
        if (wildcard) {
          hs.score = handlerSet.score - 1
        }
        handlerSets.push(hs)
        return
      }
    })

    return handlerSets
  }

  private next(node: Node<T>, part: string, method: string, isLast: boolean): Next<T> {
    const handlerSets: HandlerSet<T>[] = []
    const nextNodes: Node<T>[] = []
    const params: Record<string, string> = {}

    for (let j = 0, len = node.patterns.length; j < len; j++) {
      const pattern = node.patterns[j]

      // Wildcard
      // '/hello/*/foo' => match /hello/bar/foo
      if (pattern === '*') {
        const astNode = node.children['*']
        if (astNode) {
          handlerSets.push(...this.getHandlerSets(astNode, method))
          nextNodes.push(astNode)
        }
        continue
      }

      if (part === '') continue

      // Named match
      // `/posts/:id` => match /posts/123
      const [key, name, matcher] = pattern
      if (matcher === true || (matcher instanceof RegExp && matcher.test(part))) {
        if (typeof key === 'string') {
          if (isLast === true) {
            handlerSets.push(...this.getHandlerSets(node.children[key], method))
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
        if (nextNode.children['*']) {
          handlerSets.push(...this.getHandlerSets(nextNode.children['*'], method, true))
        }
        handlerSets.push(...this.getHandlerSets(nextNode, method))
      }
      nextNodes.push(nextNode)
    }

    const next: Next<T> = {
      nodes: nextNodes,
      handlerSets: handlerSets,
      params: params,
    }
    return next
  }

  search(method: string, path: string): Result<T> | null {
    const handlerSets: HandlerSet<T>[] = []
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
        handlerSets.push(...res.handlerSets)
        params = { ...params, ...res.params }
        tempNodes.push(...res.nodes)
      }

      curNodes = tempNodes
    }

    if (handlerSets.length <= 0) return null

    const handlers = handlerSets
      .sort((a, b) => {
        return a.score - b.score
      })
      .map((s) => {
        return s.handler
      })

    return { handlers, params }
  }
}
