import { JSXNode } from '../index.ts'
import type { Props, Child } from '../index.ts'
import type { HtmlEscapedString } from '../../utils/html.ts'
import { HtmlEscapedCallbackPhase } from '../../utils/html.ts'

export interface VirtualNode {
  tag: string
  props: Props
  children: Child[]
  jsxNode?: JSXNode
}

type ContextNode = [JSXNode, JSXNode, HTMLElement | undefined]
export const nodeMap = new WeakMap<HTMLElement, ContextNode[]>()
export const updateCallbacks = new WeakMap<Function, Function[]>()
export const unloadCallbacks = new WeakMap<HTMLElement, Function[]>()
export const UpdatePhase = {
  Updating: 1,
  UpdateAgain: 2,
  Done: 3,
} as const
export type UpdateData = [
  Function, // update function
  number, // hook index
  typeof UpdatePhase[keyof typeof UpdatePhase]
]
export const updateStack: UpdateData[] = []

const getContextNode = (
  container: HTMLElement,
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

const removeElement = (element: HTMLElement | undefined) => {
  if (!element) {
    return
  }
  for (const callback of unloadCallbacks.get(element) || []) {
    callback()
  }
  element.remove()
}

const mount = (
  node: JSXNode,
  container: HTMLElement,
  nth: number = 0,
  replaceElement?: HTMLElement
) => {
  if (typeof node === 'boolean' || node === null || node === undefined) {
    removeElement(replaceElement)
    return
  }

  if (Array.isArray(node)) {
    const tagCounter = new Map<unknown, number>()
    node.forEach((child) => {
      const nth = tagCounter.get(child.tag) || 0
      tagCounter.set(child.tag, nth + 1)
      mount(child, container, nth)
    })
    return
  }

  const { tag, props, children } = node as JSXNode

  let nodes = nodeMap.get(container)
  if (typeof tag === 'function') {
    let contextNode = getContextNode(container, node, nth)
    const update = () => {
      const res = (tag as Function).call(null, {
        ...props,
        children: children.length <= 1 ? children[0] : children,
      })
      if (res instanceof JSXNode) {
        if (contextNode) {
          patch(contextNode[1], res, contextNode[2] as HTMLElement, nth)
          contextNode[1] = res
        } else {
          contextNode = [node, res, undefined]
          if (!nodes) {
            nodes = []
            nodeMap.set(container, nodes)
          }
          nodes.push(contextNode)

          mount(res, container, nth, replaceElement)
        }
        return
      } else if (typeof res === 'string') {
        const el = document.createTextNode(res)
        container.appendChild(el)
        return
      } else {
        const wrap = document.createElement('div')
        wrap.innerHTML = res
        wrap.childNodes.forEach((child) => {
          container.appendChild(child as HTMLElement)
        })
      }
    }
    const updateData: UpdateData = [update, 0, UpdatePhase.Updating]
    updateStack.push(updateData)
    do {
      updateData[1] = 0
      update()
    } while (updateData[2] === UpdatePhase.UpdateAgain)
    updateData[2] = UpdatePhase.Done
    for (const callback of updateCallbacks.get(update) || []) {
      const unload = callback()
      if (unload) {
        const el = (contextNode as [JSXNode, JSXNode, HTMLElement])[2]
        unloadCallbacks.set(el, [...(unloadCallbacks.get(el) || []), unload])
      }
    }
    updateStack.pop()
    return
  }

  const el = document.createElement(tag as string)

  for (const [key, value] of Object.entries(node.props)) {
    if (key === 'ref') {
      if (typeof value === 'function') {
        value(el)
      } else {
        value.current = el
      }
    } else if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value)
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
      el.setAttribute(key, value)
    }
  }

  const tagCounter = new Map<unknown, number>()
  for (const child of node.children) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child.toString()))
    } else if (child instanceof JSXNode) {
      const nth = tagCounter.get(child.tag) || 0
      tagCounter.set(child.tag, nth + 1)
      mount(child, el, nth)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mount(child as any, el, nth)
    }
  }
  if (nodes) {
    for (const node of nodes) {
      node[2] ||= el
    }
  }

  if (replaceElement) {
    if (nodes) {
      nodes = nodes.filter(([, , oldReplaceElement]) => oldReplaceElement !== replaceElement)
      nodeMap.set(container, nodes)
    }
    container.replaceChild(el, replaceElement)
  } else {
    container.appendChild(el)
  }
}

const patchChildren = (oldChildren: Child[], newChildren: Child[], container: HTMLElement) => {
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
      removeElement(container.childNodes[j] as HTMLElement)
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
        mount(newChildren[i] as JSXNode, container, nth)
      }
    } else {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        container.replaceChild(
          document.createTextNode((newChildren[i] as string).toString()),
          container.childNodes[i]
        )
      } else {
        if (Array.isArray(oldChildren[i]) && Array.isArray(newChildren[i])) {
          patchChildren(oldChildren[i] as Child[], newChildren[i] as Child[], container)
        } else {
          patch(
            oldChildren[i] as JSXNode,
            newChildren[i] as JSXNode,
            container.childNodes[j] as HTMLElement,
            nth
          )
        }
      }
    }
  }
}

const patch = (oldNode: JSXNode, newNode: JSXNode, container: HTMLElement, nth: number) => {
  if (!container) {
    // show stack trace
    // console.log(oldNode)
    // console.log(newNode)
    console.log(new Error('Invalid container').stack)
  }

  if (typeof oldNode.tag === 'function') {
    const contextNode = nodeMap
      .get(container.parentElement as HTMLElement)
      ?.find(([n]) => n === oldNode)
    const replaceElement = contextNode?.[2] as HTMLElement
    if (typeof newNode.tag === 'function') {
      if (oldNode.tag !== newNode.tag) {
        mount(newNode, container.parentElement as HTMLElement, nth, replaceElement)
        return
      }
      if (contextNode) {
        const { tag, props, children } = newNode
        const res = (tag as Function).call(null, {
          ...props,
          children: children.length <= 1 ? children[0] : children,
        })
        patch(contextNode[1], res, contextNode[2] as HTMLElement, 0)
        contextNode[1] = res
      } else {
        mount(newNode, container.parentElement as HTMLElement, nth, replaceElement)
      }
      return
    } else {
      mount(newNode, container.parentElement as HTMLElement, nth, replaceElement)
      return
    }
  }

  if (oldNode.tag !== newNode.tag) {
    mount(newNode, container.parentElement as HTMLElement, nth, container)
    return
  }

  for (const [key, value] of Object.entries(newNode.props)) {
    if (oldNode.props[key] !== value) {
      if (key === 'ref') {
        if (typeof value === 'function') {
          value(container)
        } else {
          value.current = container
        }
      } else if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        container.removeEventListener(eventName, oldNode.props[key])
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
        container.setAttribute(key, value)
      }
    }
  }
  for (const [key, value] of Object.entries(oldNode.props)) {
    if (!(key in newNode.props)) {
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

  patchChildren(oldNode.children, newNode.children, container)
}

export const render = (node: unknown, container: HTMLElement) => {
  if (!(node instanceof JSXNode)) {
    throw new Error('Invalid node')
  }
  mount(node, container)
}
