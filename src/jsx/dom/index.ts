import type { FC, Child, Props } from '..'
import { JSXNode, Fragment } from '..'
import type { HtmlEscapedString } from '../../utils/html'
import { HtmlEscapedCallbackPhase } from '../../utils/html'
import type { RefObject } from '../hooks'

const eventAliasMap: Record<string, string> = {
  change: 'input',
}

export const RENDER_TO_DOM = Symbol('RENDER_TO_DOM')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HasRenderToDom = FC<any> & { [RENDER_TO_DOM]: FC<any> }

const IS_TAG_FUNCTION_RESULT = Symbol('IS_TAG_FUNCTION_RESULT')
export const tagFunctionResultWithFallback = (
  jsxNode: JSXNode,
  fallback?: JSXNode,
  errorHandler?: ErrorHandler
): TagFunctionResult => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return [jsxNode, fallback, errorHandler, IS_TAG_FUNCTION_RESULT] as any
}
const isTagFunctionResult = (v: unknown): v is TagFunctionResult => {
  return Array.isArray(v) && v[3] === IS_TAG_FUNCTION_RESULT
}

type Container = HTMLElement | DocumentFragment

type ContextNode = [
  JSXNode, // source node
  JSXNode, // rendered node
  HTMLElement[] | undefined // rendered HTML element
]

type ErrorHandler = (e: unknown) => JSXNode | undefined
type TagFunctionResult = [
  JSXNode, // result
  JSXNode | undefined, // fallback
  ErrorHandler | undefined // error handler
]

const nodeMap = new WeakMap<Container, ContextNode[]>()
const propsMap = new WeakMap<HTMLElement, Props>()
export const updateCallbacks = new WeakMap<Function, Function[]>()
export const cleanupCallbacks = new WeakMap<Container, Function[]>()
export const UpdatePhase = {
  Updating: 1,
  UpdateAgain: 2,
  Done: 3,
} as const
export type UpdateData = [
  RenderContext, // render context
  Function, // update function
  number, // hook index
  typeof UpdatePhase[keyof typeof UpdatePhase], // update phase
  () => ContextNode | undefined // get context node function
]
export const updateStack: UpdateData[] = []

type CatcherData = [Container, number, ErrorHandler | undefined, UpdateData, Function]
type RenderContext = [
  CatcherData[], // catcher stack
  Promise<unknown>[], // promises
  (TagFunctionResult | undefined)[], // snapshots
  WeakMap<UpdateData, true>, // snapshot initialized
  0 | 1 | 2 // use snapshot: 0 is no snapshot context, 1 is consume snapshot, 2 is save snapshot
]

const getContextNode = (
  container: Container,
  node: JSXNode,
  nth: number
): ContextNode | undefined => {
  const nodes = nodeMap.get(container)
  if (!nodes) {
    return
  }

  return (
    (node.key ? nodes.find(([n]) => n.key === node.key) : nodes.find(([n]) => n === node)) ||
    nodes.filter(([n]) => n.tag === node.tag)[nth]
  )
}

const prepareRemoveElement = (element: Container | undefined) => {
  if (!(element instanceof HTMLElement || element instanceof Text)) {
    return
  }
  for (const callback of cleanupCallbacks.get(element) || []) {
    callback()
  }
}

const removeElement = (element: Container | undefined) => {
  if (!(element instanceof HTMLElement || element instanceof Text)) {
    return
  }
  prepareRemoveElement(element)
  element.remove()
}

const invokeTag = (
  renderContext: RenderContext,
  tag: Function,
  props: Record<string, unknown>,
  children: Child[]
): TagFunctionResult => {
  // return from snapshot
  if (renderContext[4] === 1 && renderContext[2].length) {
    const v = renderContext[2].shift()
    if (v) {
      // resolved promise value
      return v
    }
  }

  const func = (tag as HasRenderToDom)[RENDER_TO_DOM] || tag
  const res = func.call(null, {
    ...props,
    children: children.length <= 1 ? children[0] : children,
  })

  const tagFunctionResult = (Array.isArray(res) && res[3] === IS_TAG_FUNCTION_RESULT
    ? res
    : [res]) as unknown as TagFunctionResult

  if (renderContext[4] === 2 && renderContext[2]) {
    renderContext[2].push(undefined) // push placeholder
  }

  return tagFunctionResult
}

export const invokeUpdate = (updateData: UpdateData, result?: TagFunctionResult) => {
  const [, update, , , getContextNode] = updateData
  updateData[3] = UpdatePhase.Updating
  updateStack.push(updateData)
  let promise = undefined

  try {
    do {
      updateData[2] = 0
      promise = update(result)
      result = undefined
    } while (
      (updateData[3] as typeof UpdatePhase[keyof typeof UpdatePhase]) === UpdatePhase.UpdateAgain
    )
    updateData[3] = UpdatePhase.Done
    const callbacks = updateCallbacks.get(update)
    if (callbacks) {
      const el = getContextNode()?.[2]?.[0] as Container
      if (el) {
        updateCallbacks.set(update, [])
      }
      cleanupCallbacks.set(el, [])
      for (const callback of callbacks) {
        const cleanup = callback()
        if (cleanup && el) {
          cleanupCallbacks.set(el, [...(cleanupCallbacks.get(el) || []), cleanup])
        }
      }
    }
  } finally {
    updateStack.pop()
  }

  if (promise) {
    promise.then((res?: TagFunctionResult) => {
      if (res) {
        invokeUpdate(updateData, isTagFunctionResult(res) ? res : undefined)
      }
    })
  }
}

const handleResponsePromise = (
  renderContext: RenderContext,
  res: Promise<unknown>
): Promise<unknown> => {
  const closestErrorHandler = renderContext[0].reverse().find(([, , handler]) => handler)
  return (
    res
      // for `use` hook
      .then((v) =>
        typeof v === 'string' || typeof v === 'number' || v === undefined || v === null
          ? v
          : Array.isArray(v)
          ? v
          : [v]
      )
      .catch((e) => {
        // for async ErrorBoundary
        if (closestErrorHandler) {
          e = e instanceof Error ? e : new Error(e)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = closestErrorHandler[2]?.(e) as any
          invokeUpdate(
            closestErrorHandler[3],
            tagFunctionResultWithFallback(v) as TagFunctionResult
          )
        } else {
          throw e
        }
      })
  )
}

const applyAttributes = (container: HTMLElement, attributes: Props, oldAttributes?: Props) => {
  for (const [key, value] of Object.entries(attributes)) {
    if (!oldAttributes || oldAttributes[key] !== value) {
      if (key === 'dangerouslySetInnerHTML' && value) {
        container.innerHTML = value.__html
      } else if (key === 'ref') {
        if (typeof value === 'function') {
          value(container)
        } else {
          ;(value as RefObject<HTMLElement>).current = container
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        const jsxEventName = key.slice(2).toLowerCase()
        const eventName = eventAliasMap[jsxEventName] || jsxEventName
        if (oldAttributes) {
          container.removeEventListener(eventName, oldAttributes[key])
        }
        container.addEventListener(eventName, value)
      } else if (value instanceof Promise) {
        value.then((v) => {
          const callbacks = (v as HtmlEscapedString).callbacks
          if (callbacks) {
            callbacks.forEach((c) =>
              c({
                phase: HtmlEscapedCallbackPhase.BeforeDom,
                context: {},
              })
            )
          }
          container.setAttribute(key, v)
        })
      } else {
        if (value === null || value === undefined || value === false) {
          container.removeAttribute(key)
        } else {
          container.setAttribute(key, value)
        }
      }
    }
  }
  if (oldAttributes) {
    for (const [key, value] of Object.entries(oldAttributes)) {
      if (!(key in attributes)) {
        if (key === 'ref') {
          if (typeof value === 'function') {
            value(null)
          } else {
            value.current = null
          }
        } else if (key.startsWith('on')) {
          const eventName = key.slice(2).toLowerCase()
          container.removeEventListener(eventName, value)
        } else {
          container.removeAttribute(key)
        }
      }
    }
  }
}

const preProcessUpdateDom = (renderContext: RenderContext, res: JSXNode) => {
  if (res instanceof Promise) {
    const stack = renderContext[0].reverse().find(([, , handler]) => handler)
    if (stack) {
      throw handleResponsePromise(renderContext, res)
    } else {
      const snapshot = renderContext[2]
      const snapshotIndex = snapshot.length - 1
      res.then((v) => {
        snapshot[snapshotIndex] = tagFunctionResultWithFallback(v)
      })
      renderContext[1].push(res)
      res = Fragment({ children: [] }) as unknown as JSXNode
    }
  }
  return res
}

const prepareSnapshotEnvironment = (
  fallback: JSXNode | undefined,
  handler: ErrorHandler | undefined,
  renderContext: RenderContext,
  updateData: UpdateData
) => {
  if (fallback && !handler && !renderContext[3].get(updateData)) {
    renderContext[2] = []
    renderContext[4] = 2
    renderContext[3].set(updateData, true)
  }
}

const finalizeSnapshotEnvironment = (
  fallback: JSXNode | undefined,
  renderContext: RenderContext,
  updateData: UpdateData,
  updateDom: (res: JSXNode) => void,
  originalRes: JSXNode
) => {
  if (fallback && renderContext[1].length) {
    const promises = renderContext[1]
    renderContext[1] = []
    const backup = renderContext[2]
    renderContext[2] = []
    Promise.all(promises)
      .then(() => {
        renderContext[2] = backup
        renderContext[4] = 1
        updateDom(originalRes)
        renderContext[2] = []
        renderContext[4] = 0
        renderContext[3].delete(updateData)
      })
      .catch(() => {})

    updateDom(fallback)
  }
}

const mount = (
  renderContext: RenderContext,
  node: JSXNode,
  container: Container,
  nth: number = 0,
  replaceElement?: Container[],
  insertBefore?: Container
): HTMLElement | undefined => {
  if (typeof node === 'boolean' || node === null || node === undefined) {
    replaceElement?.forEach(removeElement)
    return
  }

  if (Array.isArray(node)) {
    const replacementParents =
      nodeMap
        .get(container)
        ?.filter((node) => node[2]?.every((el, i) => replaceElement?.[i] === el)) || []
    insertBefore ||= replaceElement?.at(-1)?.nextSibling as Container
    replaceElement?.forEach(removeElement)
    const tagCounter = new Map<unknown, number>()
    const newElms = node
      .map((child) => {
        const nth = tagCounter.get(child.tag) || 0
        tagCounter.set(child.tag, nth + 1)
        return mount(renderContext, child, container, nth, undefined, insertBefore)
      })
      .filter(Boolean) as HTMLElement[]
    replacementParents.forEach((parent) => {
      parent[2] = newElms
    })
    return
  }

  const { tag, props, children } = node as JSXNode

  let nodes = nodeMap.get(container)
  if (typeof tag === 'function') {
    let contextNode = getContextNode(container, node, nth)
    const update = (result?: TagFunctionResult) => {
      const [res, fallback, handler] =
        result || invokeTag(renderContext, tag as Function, props, children)

      if (fallback || handler) {
        renderContext[0].push([container, nth, handler, updateData, tag])
      }
      const updateDom = (res: JSXNode) => {
        res = preProcessUpdateDom(renderContext, res)
        if (res instanceof JSXNode || Array.isArray(res)) {
          prepareSnapshotEnvironment(fallback, handler, renderContext, updateData)

          if (contextNode && contextNode[2]) {
            patch(renderContext, contextNode[1], res, contextNode[2], nth)
            contextNode[1] = res
            nodes?.forEach((node) => {
              node[2] ||= contextNode?.[2]
            })
          } else {
            contextNode = [node, res, undefined]
            if (!nodes) {
              nodes = []
              nodeMap.set(container, nodes)
            }
            nodes.push(contextNode)

            mount(renderContext, res, container, nth, replaceElement)
          }

          finalizeSnapshotEnvironment(fallback, renderContext, updateData, updateDom, res)
        } else if (typeof res === 'string') {
          const el = document.createTextNode(res)
          container.appendChild(el)
        } else {
          const wrap = document.createElement('div')
          wrap.innerHTML = res
          wrap.childNodes.forEach((child) => {
            container.appendChild(child as Container)
          })
        }
      }

      try {
        updateDom(res)
      } catch (e) {
        if (fallback && e instanceof Promise) {
          updateDom(fallback)
          return handleResponsePromise(renderContext, e)
        } else if (handler) {
          const res = handler(e)
          if (res) {
            updateDom(res)
          }
        } else {
          throw e
        }
      } finally {
        if (fallback || handler) {
          renderContext[0].pop()
        }
      }
    }
    const updateData: UpdateData = [
      renderContext,
      update,
      0,
      UpdatePhase.Updating,
      () => contextNode,
    ]
    invokeUpdate(updateData)
    return
  }

  const el = document.createElement(tag as string)
  propsMap.set(el, node.props)
  applyAttributes(el, node.props)

  const tagCounter = new Map<unknown, number>()
  for (const child of node.children) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child.toString()))
    } else if (child instanceof JSXNode) {
      const nth = tagCounter.get(child.tag) || 0
      tagCounter.set(child.tag, nth + 1)
      mount(renderContext, child, el, nth)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mount(renderContext, child as any, el, nth)
    }
  }

  if (nodes) {
    nodes.forEach((n) => {
      if (!n[2] || n[2].every((el, i) => replaceElement?.[i] === el)) {
        n[2] = [el]
      }
    })
    nodeMap.set(container, nodes)
  }

  if (replaceElement) {
    insertBefore = replaceElement.at(-1)?.nextSibling as Container
  }

  if (replaceElement || insertBefore) {
    replaceElement?.forEach(removeElement)
    container.insertBefore(el, insertBefore || null)
  } else {
    container.appendChild(el)
  }

  return el
}

const patchChildren = (
  renderContext: RenderContext,
  oldChildren: Child[],
  newChildren: Child[],
  container: Container
) => {
  oldChildren = oldChildren.flat()
  newChildren = newChildren.flat()

  if (newChildren.some((child) => child && (child as JSXNode).key !== undefined)) {
    newChildren.forEach((newChild, i) => {
      const oldChild = oldChildren[i]
      if (oldChild === undefined) {
        return
      }
      if (newChild instanceof JSXNode) {
        if (!newChild.key) {
          return
        }
        if (oldChild instanceof JSXNode) {
          if (!oldChild.key || newChild.key === oldChild.key) {
            return
          }
          const oldChildIndex = oldChildren.findIndex(
            (child) => (child as JSXNode).key === newChild.key
          )
          if (oldChildIndex !== -1) {
            const oldChild = oldChildren[oldChildIndex]
            oldChildren[oldChildIndex] = oldChildren[i]
            oldChildren[i] = oldChild
            const oldChildNode = container.childNodes[oldChildIndex]
            container.insertBefore(oldChildNode, container.childNodes[i])
            return
          }
        }
      }
    })
  }

  const length = Math.max(oldChildren.length, newChildren.length)
  const tagCounter = new Map<unknown, number>()
  for (let i = 0, j = 0; i < length; i++, j++) {
    const newChild = newChildren[i]

    if (typeof newChild === 'boolean' || newChild === null || newChild === undefined) {
      removeElement(container.childNodes[j] as Container)
      j--
      continue
    }

    let nth = 0
    if (newChild instanceof JSXNode) {
      nth = tagCounter.get(newChild.tag) || 0
      tagCounter.set(newChild.tag, nth + 1)
    }

    if (oldChildren[i] === undefined) {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        container.appendChild(document.createTextNode((newChildren[i] as string).toString()))
      } else {
        mount(renderContext, newChildren[i] as JSXNode, container, nth)
      }
    } else {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        const replaced = container.childNodes[j]
        prepareRemoveElement(replaced as Container)
        container.replaceChild(
          document.createTextNode((newChildren[i] as string).toString()),
          replaced
        )
      } else {
        if (container.childNodes[j] === undefined) {
          mount(renderContext, newChildren[i] as JSXNode, container, nth)
        } else {
          patch(
            renderContext,
            oldChildren[i] as JSXNode,
            newChildren[i] as JSXNode,
            [container.childNodes[j] as Container],
            nth
          )
        }
      }
    }
  }
}

const patch = (
  renderContext: RenderContext,
  oldNode: JSXNode,
  newNode: JSXNode,
  containers: Container[],
  nth: number
) => {
  const container = containers[0]
  if (Array.isArray(newNode)) {
    if (Array.isArray(oldNode)) {
      patchChildren(renderContext, oldNode, newNode, container.parentElement as Container)
    } else {
      mount(renderContext, newNode, container.parentElement as Container, 0, containers)
    }
    return
  }

  if (typeof oldNode.tag === 'function') {
    const contextNode = getContextNode(container.parentElement as Container, oldNode, nth)
    const replaceElement = contextNode?.[2]
    if (typeof newNode.tag === 'function') {
      if (oldNode.tag !== newNode.tag) {
        mount(renderContext, newNode, container.parentElement as Container, nth, replaceElement)
        return
      }
      if (contextNode) {
        const { tag, props, children } = newNode
        const update = (result?: TagFunctionResult) => {
          const [res, fallback, handler] =
            result || invokeTag(renderContext, tag as Function, props, children)

          if (fallback || handler) {
            renderContext[0].push([container, nth, handler, updateData, tag])
          }
          const updateDom = (res: JSXNode) => {
            res = preProcessUpdateDom(renderContext, res)

            prepareSnapshotEnvironment(fallback, handler, renderContext, updateData)

            patch(
              renderContext,
              contextNode[1],
              res,
              contextNode[2] as Container[], // contextNode[2] may be updated, so we need to use contextNode[2] instead of replaceElement
              0
            )
            contextNode[1] = res

            finalizeSnapshotEnvironment(fallback, renderContext, updateData, updateDom, res)
          }
          try {
            updateDom(res)
          } catch (e) {
            if (fallback && e instanceof Promise) {
              updateDom(fallback)
              return handleResponsePromise(renderContext, e)
            } else if (handler) {
              const res = handler(e)
              if (res) {
                updateDom(res)
              }
            } else {
              throw e
            }
          } finally {
            if (fallback || handler) {
              renderContext[0].pop()
            }
          }
        }
        const updateData: UpdateData = [
          renderContext,
          update,
          0,
          UpdatePhase.Updating,
          () => contextNode,
        ]
        invokeUpdate(updateData)
      } else {
        mount(renderContext, newNode, container.parentElement as Container, nth, replaceElement)
      }
      return
    } else {
      mount(renderContext, newNode, container.parentElement as Container, nth, replaceElement)
      return
    }
  }

  if (
    oldNode.key !== newNode.key ||
    oldNode.tag !== newNode.tag ||
    newNode.tag.toUpperCase() !== container.nodeName
  ) {
    mount(renderContext, newNode, container.parentElement as Container, nth, containers)
    return
  }

  if (container instanceof HTMLElement) {
    const oldProps = propsMap.get(container)
    applyAttributes(container, newNode.props, oldProps)
    propsMap.set(container, newNode.props)
  }

  patchChildren(renderContext, oldNode.children, newNode.children, container)
}

export const render = (node: unknown, container: Container) => {
  if (!(node instanceof JSXNode)) {
    throw new Error('Invalid node')
  }

  const renderContext: RenderContext = [
    [], // catcher stack
    [], // promises
    [], // snapshots
    new WeakMap(), // snapshots
    0, // no snapshot context
  ]
  const fragment = document.createDocumentFragment()
  mount(renderContext, node, fragment)

  // copy meta data
  nodeMap.set(container, nodeMap.get(fragment) || [])
  cleanupCallbacks.set(container, cleanupCallbacks.get(fragment) || [])

  container.replaceChildren(fragment)
}
