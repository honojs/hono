import type { Params } from '../../router.ts'
import { METHOD_NAME_ALL } from '../../router.ts'
import type { Pattern } from '../../utils/url.ts'
import { splitPath, splitRoutingPath, getPattern } from '../../utils/url.ts'

type HandlerSet<T> = {
  handler: T
  possibleKeys: string[]
  score: number
  name: string // For debug
}

type HandlerParamsSet<T> = HandlerSet<T> & {
  params: Record<string, string>
}

export class Node<T> {
  methods: Record<string, HandlerSet<T>>[]

  children: Record<string, Node<T>>
  patterns: Pattern[]
  order: number = 0
  name: string
  params: Record<string, string> = Object.create(null)

  constructor(method?: string, handler?: T, children?: Record<string, Node<T>>) {
    this.children = children || Object.create(null)
    this.methods = []
    this.name = ''
    if (method && handler) {
      const m: Record<string, HandlerSet<T>> = Object.create(null)
      m[method] = { handler, possibleKeys: [], score: 0, name: this.name }
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

    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]

      if (Object.keys(curNode.children).includes(p)) {
        curNode = curNode.children[p]
        const pattern = getPattern(p)
        if (pattern) {
          possibleKeys.push(pattern[1])
        }
        continue
      }

      curNode.children[p] = new Node()

      const pattern = getPattern(p)
      if (pattern) {
        curNode.patterns.push(pattern)
        possibleKeys.push(pattern[1])
      }
      curNode = curNode.children[p]
    }

    if (!curNode.methods.length) {
      curNode.methods = []
    }

    const m: Record<string, HandlerSet<T>> = Object.create(null)

    const handlerSet: HandlerSet<T> = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      name: this.name,
      score: this.order,
    }

    m[method] = handlerSet
    curNode.methods.push(m)

    return curNode
  }

  // getHandlerSets
  private gHSets(
    node: Node<T>,
    method: string,
    nodeParams: Record<string, string>,
    params: Record<string, string>
  ): HandlerParamsSet<T>[] {
    const handlerSets: HandlerParamsSet<T>[] = []
    for (let i = 0, len = node.methods.length; i < len; i++) {
      const m = node.methods[i]
      const handlerSet = (m[method] || m[METHOD_NAME_ALL]) as HandlerParamsSet<T>
      const processedSet: Record<string, boolean> = Object.create(null)
      if (handlerSet !== undefined) {
        handlerSet.params = Object.create(null)
        handlerSet.possibleKeys.forEach((key) => {
          const processed = processedSet[handlerSet.name]
          handlerSet.params[key] =
            params[key] && !processed ? params[key] : nodeParams[key] ?? params[key]
          processedSet[handlerSet.name] = true
        })
        handlerSets.push(handlerSet)
      }
    }
    return handlerSets
  }

  search(method: string, path: string): [[T, Params][]] {
    const handlerSets: HandlerParamsSet<T>[] = []
    this.params = Object.create(null)

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
          nextNode.params = node.params
          if (isLast === true) {
            // '/hello/*' => match '/hello'
            if (nextNode.children['*']) {
              handlerSets.push(
                ...this.gHSets(nextNode.children['*'], method, node.params, Object.create(null))
              )
            }
            handlerSets.push(...this.gHSets(nextNode, method, node.params, Object.create(null)))
          } else {
            tempNodes.push(nextNode)
          }
        }

        for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
          const pattern = node.patterns[k]

          const params = { ...node.params }

          // Wildcard
          // '/hello/*/foo' => match /hello/bar/foo
          if (pattern === '*') {
            const astNode = node.children['*']
            if (astNode) {
              handlerSets.push(...this.gHSets(astNode, method, node.params, Object.create(null)))
              tempNodes.push(astNode)
            }
            continue
          }

          if (part === '') {
            continue
          }

          const [key, name, matcher] = pattern

          const child = node.children[key]

          // `/js/:filename{[a-z]+.js}` => match /js/chunk/123.js
          const restPathString = parts.slice(i).join('/')
          if (matcher instanceof RegExp && matcher.test(restPathString)) {
            params[name] = restPathString
            handlerSets.push(...this.gHSets(child, method, node.params, params))
            continue
          }

          if (matcher === true || (matcher instanceof RegExp && matcher.test(part))) {
            if (typeof key === 'string') {
              params[name] = part
              if (isLast === true) {
                handlerSets.push(...this.gHSets(child, method, params, node.params))
                if (child.children['*']) {
                  handlerSets.push(...this.gHSets(child.children['*'], method, params, node.params))
                }
              } else {
                child.params = params
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
