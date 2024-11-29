import type { Params } from '../../router'
import { METHOD_NAME_ALL } from '../../router'
import type { Pattern } from '../../utils/url'
import { getPattern, splitPath, splitRoutingPath } from '../../utils/url'

type HandlerSet<T> = {
  handler: T
  possibleKeys: string[]
  score: number
}

type HandlerParamsSet<T> = HandlerSet<T> & {
  params: Record<string, string>
}

const createEmptyParams = () => Object.create(null)

const emptyParams = createEmptyParams()

export class Node<T> {
  #methods: Record<string, HandlerSet<T>>[] = []

  #children: Record<string, Node<T>> = createEmptyParams()
  #patterns: Pattern[] = []
  #order: number = 0
  #params: Record<string, string> = createEmptyParams()

  constructor(method?: string, handler?: T) {
    if (method && handler) {
      const m: Record<string, HandlerSet<T>> = createEmptyParams()
      m[method] = { handler, possibleKeys: [], score: 0 }
      this.#methods = [m]
    }
  }

  insert(method: string, path: string, handler: T): Node<T> {
    this.#order++

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitRoutingPath(path)

    const possibleKeys: string[] = []

    for (let i = 0, len = parts.length; i < len; i++) {
      const p: string = parts[i]
      const pattern = getPattern(p)

      if (curNode.#children[p]) {
        curNode = curNode.#children[p]
        if (pattern) {
          possibleKeys.push(pattern[1])
        }
        continue
      }

      curNode.#children[p] = new Node()

      if (pattern) {
        curNode.#patterns.push(pattern)
        possibleKeys.push(pattern[1])
      }
      curNode = curNode.#children[p]
    }

    const m: Record<string, HandlerSet<T>> = createEmptyParams()

    const handlerSet: HandlerSet<T> = {
      handler,
      possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
      score: this.#order,
    }

    m[method] = handlerSet
    curNode.#methods.push(m)

    return curNode
  }

  #getHandlerSets(
    node: Node<T>,
    method: string,
    nodeParams: Record<string, string>,
    params: Record<string, string>
  ): HandlerParamsSet<T>[] {
    const handlerSets: HandlerParamsSet<T>[] = []
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i]
      const handlerSet = (m[method] || m[METHOD_NAME_ALL]) as HandlerParamsSet<T> | undefined
      const processedSet: Record<number, boolean> = {}
      if (handlerSet) {
        handlerSet.params = createEmptyParams()
        for (let i = 0, len = handlerSet.possibleKeys.length; i < len; i++) {
          const key = handlerSet.possibleKeys[i]
          const processed = processedSet[handlerSet.score]
          handlerSet.params[key] =
            params[key] && !processed ? params[key] : nodeParams[key] ?? params[key]
          processedSet[handlerSet.score] = true
        }

        handlerSets.push(handlerSet)
      }
    }
    return handlerSets
  }

  search(method: string, path: string): [[T, Params][]] {
    const handlerSets: HandlerParamsSet<T>[] = []

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
        const nextNode = node.#children[part]

        if (nextNode) {
          nextNode.#params = node.#params
          if (isLast) {
            // '/hello/*' => match '/hello'
            if (nextNode.#children['*']) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children['*'], method, node.#params, emptyParams)
              )
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params, emptyParams))
          } else {
            tempNodes.push(nextNode)
          }
        }

        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k]

          const params = { ...node.#params }

          // Wildcard
          // '/hello/*/foo' => match /hello/bar/foo
          if (pattern === '*') {
            const wildcardNode = node.#children['*']
            if (wildcardNode) {
              handlerSets.push(
                ...this.#getHandlerSets(wildcardNode, method, node.#params, createEmptyParams())
              )
              tempNodes.push(wildcardNode)
            }
            continue
          }

          if (part === '') {
            continue
          }

          const [key, name, matcher] = pattern

          const child = node.#children[key]

          // `/js/:filename{[a-z]+.js}` => match /js/chunk/123.js
          const restPathString = parts.slice(i).join('/')

          const isMatcher = matcher instanceof RegExp

          if (isMatcher && matcher.test(restPathString)) {
            params[name] = restPathString
            handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params))
            continue
          }

          if (!isMatcher || matcher.test(part)) {
            params[name] = part
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params))
              if (child.#children['*']) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children['*'], method, params, node.#params)
                )
              }
            } else {
              child.#params = params
              tempNodes.push(child)
            }
          }
        }
      }

      curNodes = tempNodes
    }

    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score
      })
    }

    this.#params = createEmptyParams()

    return [handlerSets.map(({ handler, params }) => [handler, params] as [T, Params])]
  }
}
