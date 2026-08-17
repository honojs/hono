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

const emptyParams = Object.create(null)
let order = 0

export class Node<T> {
  #methods: Record<string, HandlerSet<T>>[] = []

  #children: Record<string, Node<T>> = Object.create(null)
  #patterns: Node<T>[] = []
  #pattern?: Pattern | string
  #params: Record<string, string> = emptyParams

  insert(method: string, path: string, handler: T): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let curNode: Node<T> = this
    const parts = splitRoutingPath(path)

    const possibleKeys = new Set<string>()

    let i = 0
    for (const p of parts) {
      const nextP = parts[++i]
      const pattern =
        getPattern(p, nextP) ||
        (nextP === undefined && p && p.indexOf('*') === p.length - 1 ? p : null)
      const isParam = Array.isArray(pattern)
      const key = isParam ? pattern[0] : pattern || p

      const child = (curNode.#children[key] ||= new Node())
      if (pattern && !child.#pattern) {
        child.#pattern = pattern
        curNode.#patterns.push(child)
      }
      curNode = child
      if (isParam) {
        possibleKeys.add(pattern[1])
      }
    }

    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order,
      },
    })
  }

  #pushHandlerSets(
    handlerSets: HandlerParamsSet<T>[],
    node: Node<T>,
    method: string,
    nodeParams: Record<string, string>,
    params?: Record<string, string>
  ): void {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i]
      const handlerSet = (m[method] || m[METHOD_NAME_ALL]) as HandlerParamsSet<T>
      if (handlerSet) {
        handlerSet.params = Object.create(null)
        handlerSets.push(handlerSet)
        for (let i = 0, len = handlerSet.possibleKeys.length; i < len; i++) {
          const key = handlerSet.possibleKeys[i]
          handlerSet.params[key] =
            params?.[key] && !i ? params[key] : (nodeParams[key] ?? params?.[key])
        }
      }
    }
  }

  search(method: string, path: string): [[T, Params][]] {
    const handlerSets: HandlerParamsSet<T>[] = []
    this.#params = emptyParams

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const curNode: Node<T> = this
    let curNodes = [curNode]
    const parts = splitPath(path)
    const curNodesQueue: Node<T>[][] = []

    const len = parts.length
    let partOffsets: number[] | null = null

    for (let i = 0; i < len; i++) {
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
              this.#pushHandlerSets(handlerSets, nextNode.#children['*'], method, node.#params)
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params)
          } else {
            tempNodes.push(nextNode)
          }
        }

        for (const child of node.#patterns) {
          const pattern = child.#pattern!
          const params = node.#params === emptyParams ? {} : { ...node.#params }

          // Wildcard
          // '/hello/*/foo' => match /hello/bar/foo
          if (typeof pattern === 'string') {
            if (pattern === '*' || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params)
              if (pattern === '*') {
                child.#params = params
                tempNodes.push(child)
              }
            }
            continue
          }

          const [, name, matcher] = pattern

          if (!part && matcher === true) {
            continue
          }

          // `/js/:filename{[a-z]+.js}` => match /js/chunk/123.js
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = []
              let offset = path[0] === '/' ? 1 : 0
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset
                offset += parts[p].length + 1
              }
            }
            const restPathString = path.slice(partOffsets[i])

            const m = matcher.exec(restPathString)
            if (m) {
              params[name] = m[0]
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params)

              // '/:id{[0-9]+}/*' => match '/123'
              if (m[0].length === restPathString.length && child.#children['*']) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children['*'],
                  method,
                  node.#params,
                  params
                )
              }

              for (const _ in child.#children) {
                child.#params = params
                const componentCount = m[0].match(/\//g)?.length ?? 0
                const targetCurNodes = (curNodesQueue[componentCount] ||= [])
                targetCurNodes.push(child)
                break
              }

              continue
            }
          }

          if (matcher === true || matcher.test(part)) {
            params[name] = part
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params)
              if (child.#children['*']) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children['*'],
                  method,
                  params,
                  node.#params
                )
              }
            } else {
              child.#params = params
              tempNodes.push(child)
            }
          }
        }
      }

      const shifted = curNodesQueue.shift()
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes
    }

    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score
      })
    }

    return [handlerSets.map(({ handler, params }) => [handler, params] as [T, Params])]
  }
}
