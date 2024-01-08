import { JSXNode } from '..'
import type { Props, Child } from '..'

export interface VirtualNode {
  tag: string
  props: Props
  children: Child[]
  jsxNode?: JSXNode
}

export const nodeMap = new WeakMap<HTMLElement, [JSXNode, JSXNode, HTMLElement | undefined][]>()
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

const mount = (node: JSXNode, container: HTMLElement, replaceElement?: HTMLElement) => {
  const { tag, props, children } = node as JSXNode

  let nodes = nodeMap.get(container)
  if (typeof tag === 'function') {
    let contextNode = nodes?.find(([n]) => n === node)
    const update = () => {
      const res = (tag as Function).call(null, {
        ...props,
        children: children.length <= 1 ? children[0] : children,
      })
      if (res instanceof JSXNode) {
        if (contextNode) {
          patch(contextNode[1], res, contextNode[2] as HTMLElement)
          contextNode[1] = res
        } else {
          contextNode = [node, res, undefined]
          if (!nodes) {
            nodes = []
            nodeMap.set(container, nodes)
          }
          nodes.push(contextNode)

          mount(res, container, replaceElement)
        }
        return
      } else if (typeof res === 'string') {
        const el = document.createTextNode(res)
        container.appendChild(el)
        return
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
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value)
    } else {
      el.setAttribute(key, value)
    }
  }
  for (const child of node.children) {
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(child.toString()))
    } else {
      mount(child as JSXNode, el)
    }
  }
  if (nodes) {
    for (const node of nodes) {
      if (node[2]) {
        break
      }
      node[2] = el
    }
  }

  if (replaceElement) {
    container.replaceChild(el, replaceElement)
  } else {
    container.appendChild(el)
  }
}

const patch = (oldNode: JSXNode, newNode: JSXNode, container: HTMLElement) => {
  if (oldNode.tag !== newNode.tag) {
    mount(newNode, container.parentElement as HTMLElement, container)
    return
  }

  for (const [key, value] of Object.entries(newNode.props)) {
    if (oldNode.props[key] !== value) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        container.removeEventListener(eventName, oldNode.props[key])
        container.addEventListener(eventName, value)
      } else {
        container.setAttribute(key, value)
      }
    }
  }
  for (const [key, value] of Object.entries(oldNode.props)) {
    if (!(key in newNode.props)) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        container.removeEventListener(eventName, value)
      } else {
        container.removeAttribute(key)
      }
    }
  }

  const oldChildren = oldNode.children

  const newChildren = newNode.children
  if (newChildren.some((child) => (child as JSXNode).key !== undefined)) {
    newChildren.forEach((newChild, i) => {
      const oldChild = oldChildren[i]
      if (oldChild === undefined) {
        return
      }
      if (newChild instanceof JSXNode) {
        if (oldChild instanceof JSXNode) {
          if (newChild.key === oldChild.key) {
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
    })
  }

  const length = Math.max(oldChildren.length, newChildren.length)
  for (let i = 0; i < length; i++) {
    if (newChildren[i] === undefined) {
      const el = container.childNodes[i] as HTMLElement
      for (const callback of unloadCallbacks.get(el) || []) {
        callback()
      }
      container.removeChild(container.childNodes[i])
    } else if (oldChildren[i] === undefined) {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        container.appendChild(document.createTextNode((newChildren[i] as string).toString()))
      } else {
        mount(newChildren[i] as JSXNode, container)
      }
    } else {
      if (typeof newChildren[i] === 'string' || typeof newChildren[i] === 'number') {
        container.replaceChild(
          document.createTextNode((newChildren[i] as string).toString()),
          container.childNodes[i]
        )
      } else {
        patch(
          oldChildren[i] as JSXNode,
          newChildren[i] as JSXNode,
          container.childNodes[i] as HTMLElement
        )
      }
    }
  }
}

export const render = (node: unknown, container: HTMLElement) => {
  if (!(node instanceof JSXNode)) {
    throw new Error('Invalid node')
  }
  mount(node, container)
}
