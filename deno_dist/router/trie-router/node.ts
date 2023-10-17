import type { Params } from '../../router.ts'
import { METHOD_NAME_ALL } from '../../router.ts'
import type { Pattern } from '../../utils/url.ts'
import { splitPath, splitRoutingPath, getPattern } from '../../utils/url.ts'

type HandlerSet<T> = {
  handler: T
  params: Record<string, string>
  possibleKeys: string[]
  score: number
  name: string // For debug
}

export class Node<T> {
  methods: Record<string, HandlerSet<T>>[]

  children: Record<string, Node<T>>
  patterns: Pattern[]
  order: number = 0
  name: string
  params: Record<string, string> = {}

  constructor(method?: string, handler?: T, children?: Record<string, Node<T>>) {
    this.children = children || {}
    this.methods = []
    this.name = ''
    if (method && handler) {
      const m: Record<string, HandlerSet<T>> = {}
      m[method] = { handler, params: {}, possibleKeys: [], score: 0, name: this.name }
      this.methods = [m]
    }
    this.patterns = []
  }

  insert(method: string, path: string, handler: T): Node<T> {
    this.name = `${method} ${path}`
    this.order = ++this.order

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitRoutingPath(path)

    const possibleKeys: string[] = []
    const parentPatterns: Pattern[] = []

    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]

      if (Object.keys(curNode.children).includes(p)) {
        parentPatterns.push(...curNode.patterns)
        curNode = curNode.children[p]
        const pattern = getPattern(p)
        if (pattern) possibleKeys.push(pattern[1])
        continue
      }

      curNode.children[p] = new Node()

      const pattern = getPattern(p)
      if (pattern) {
        curNode.patterns.push(pattern)
        parentPatterns.push(...curNode.patterns)
        possibleKeys.push(pattern[1])
      }
      parentPatterns.push(...curNode.patterns)
      curNode = curNode.children[p]
    }

    if (!curNode.methods.length) {
      curNode.methods = []
    }

    const m: Record<string, HandlerSet<T>> = {}

    const handlerSet: HandlerSet<T> = {
      handler,
      params: {},
      possibleKeys,
      name: this.name,
      score: this.order,
    }

    m[method] = handlerSet
    curNode.methods.push(m)

    return curNode
  }

  // getHandlerSets
  private gHSets(node: Node<T>, method: string, params: Record<string, string>): HandlerSet<T>[] {
    const handlerSets: HandlerSet<T>[] = []
    for (let i = 0, len = node.methods.length; i < len; i++) {
      const m = node.methods[i]
      const handlerSet = m[method] || m[METHOD_NAME_ALL]
      if (handlerSet !== undefined) {
        handlerSet.possibleKeys.map((key) => {
          handlerSet.params[key] = params[key]
        })
        handlerSets.push(handlerSet)
      }
    }
    return handlerSets
  }

  search(method: string, path: string): [[T, Params][]] {
    const handlerSets: HandlerSet<T>[] = []

    const params: Record<string, string> = {}
    this.params = {}

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const curNode: Node<T> = this
    let curNodes = [curNode]
    const parts = splitPath(path)

    for (let i = 0, len = parts.length; i < len; i++) {
      const part: string = parts[i]
      const isLast = i === len - 1
      const tempNodes: Node<T>[] = []

      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j]
        const nextNode = node.children[part]

        if (nextNode) {
          if (isLast === true) {
            // '/hello/*' => match '/hello'
            if (nextNode.children['*']) {
              handlerSets.push(
                ...this.gHSets(nextNode.children['*'], method, { ...params, ...node.params })
              )
            }
            handlerSets.push(...this.gHSets(nextNode, method, { ...params, ...node.params }))
          } else {
            tempNodes.push(nextNode)
          }
        }

        for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
          const pattern = node.patterns[k]

          // Wildcard
          // '/hello/*/foo' => match /hello/bar/foo
          if (pattern === '*') {
            const astNode = node.children['*']
            if (astNode) {
              handlerSets.push(...this.gHSets(astNode, method, { ...params, ...node.params }))
              tempNodes.push(astNode)
            }
            continue
          }

          if (part === '') continue

          const [key, name, matcher] = pattern

          const child = node.children[key]

          // `/js/:filename{[a-z]+.js}` => match /js/chunk/123.js
          const restPathString = parts.slice(i).join('/')
          if (matcher instanceof RegExp && matcher.test(restPathString)) {
            params[name] = restPathString
            handlerSets.push(...this.gHSets(child, method, { ...params, ...node.params }))
            continue
          }

          if (matcher === true || (matcher instanceof RegExp && matcher.test(part))) {
            if (typeof key === 'string') {
              params[name] = part
              if (isLast === true) {
                handlerSets.push(...this.gHSets(child, method, { ...params, ...node.params }))
                if (child.children['*']) {
                  handlerSets.push(
                    ...this.gHSets(child.children['*'], method, { ...params, ...node.params })
                  )
                }
              } else {
                child.params = { ...params }
                tempNodes.push(child)
              }
            }
          }
        }
      }

      curNodes = tempNodes
    }
    const results = handlerSets.sort((a, b) => {
      return a.score - b.score
    })

    return [results.map(({ handler, params }) => [handler, params] as [T, Params])]
  }
}
