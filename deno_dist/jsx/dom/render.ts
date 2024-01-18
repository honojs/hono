import type { FC, Child, Props } from '../index.ts'
import type { JSXNode } from '../index.ts'
import type { HtmlEscapedString } from '../../utils/html.ts'
import { HtmlEscapedCallbackPhase } from '../../utils/html.ts'
import type { EffectData } from '../hooks/index.ts'
import { STASH_EFFECT } from '../hooks/index.ts'

const eventAliasMap: Record<string, string> = {
  change: 'input',
}

export const RENDER_TO_DOM = Symbol()
export const ERROR_HANDLER = Symbol()
export const STASH = Symbol()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HasRenderToDom = FC<any> & { [RENDER_TO_DOM]: FC<any> }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ErrorHandler = (error: any, retry: () => void) => Child | undefined

type Container = HTMLElement | DocumentFragment

export type NodeObject = {
  pP: Props | undefined // previous props
  nN: Node | undefined // next node
  vC: Node[] // virtual dom children
  vR: Node[] // virtual dom children to remove
  s?: Node[] // shadow virtual dom children
  c: Container | undefined // container
  e: HTMLElement | Text | undefined // rendered element
  [STASH]: [
    number, // current hook index
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any[][] // stash for hooks
  ]
} & JSXNode
type NodeString = [string] & {
  e?: Text
  // like a NodeObject
  vC: undefined
  nN: undefined
  // from JSXNode
  key: undefined
  tag: undefined
}
export type Node = NodeString | NodeObject

export type PendingType =
  | 0 // no pending
  | 1 // global
  | 2 // hook
export type Context =
  | [
      PendingType, // PendingType
      boolean, // got an error
      boolean // with startViewTransition
    ]
  | [PendingType, boolean]
  | [PendingType]
  | []

export const buildDataStack: [Context, Node][] = []

const isNodeString = (node: Node): node is NodeString => Array.isArray(node)

const applyProps = (container: HTMLElement, attributes: Props, oldAttributes?: Props) => {
  attributes ||= {}
  for (const [key, value] of Object.entries(attributes)) {
    if (!oldAttributes || oldAttributes[key] !== value) {
      if (key === 'dangerouslySetInnerHTML' && value) {
        container.innerHTML = value.__html
      } else if (key === 'ref') {
        if (typeof value === 'function') {
          value(container)
        } else if ('current' in value) {
          value.current = container
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

const invokeTag = (context: Context, node: NodeObject): Child[] => {
  if (node.s) {
    const res = node.s
    node.s = undefined
    return res
  }

  node[STASH][0] = 0
  buildDataStack.push([context, node])
  const func = (node.tag as HasRenderToDom)[RENDER_TO_DOM] || node.tag
  try {
    return [
      func.call(null, {
        ...node.props,
        children: node.children,
      }),
    ]
  } finally {
    buildDataStack.pop()
  }
}

const getNextChildren = (
  node: NodeObject,
  container: Container,
  nextChildren: Node[],
  childrenToRemove: Node[],
  callbacks: EffectData[]
) => {
  childrenToRemove.push(...node.vR)
  if (typeof node.tag === 'function') {
    node[STASH][1][STASH_EFFECT]?.forEach((data: EffectData) => callbacks.push(data))
  }
  node.vC.forEach((child) => {
    if (isNodeString(child)) {
      nextChildren.push(child)
    } else {
      if (typeof child.tag === 'function' || child.tag === '') {
        child.c = container
        getNextChildren(child, container, nextChildren, childrenToRemove, callbacks)
      } else {
        nextChildren.push(child)
        childrenToRemove.push(...child.vR)
      }
    }
  })
}

const findInsertBefore = (node: Node | undefined): ChildNode | null => {
  if (!node) {
    return null
  } else if (node.e) {
    return node.e
  }

  if (node.vC) {
    for (let i = 0; i < node.vC.length; i++) {
      const e = findInsertBefore(node.vC[i])
      if (e) {
        return e
      }
    }
  }

  return findInsertBefore(node.nN)
}

const removeNode = (node: Node) => {
  node.e?.remove()
  if (!isNodeString(node)) {
    node[STASH]?.[1][STASH_EFFECT]?.forEach((data: EffectData) => data[2]?.())
    node.vC?.forEach(removeNode)
  }
}

const apply = (node: NodeObject, container: Container) => {
  node.c = container
  applyNodeObject(node, container)
}

const applyNode = (node: Node, container: Container) => {
  if (isNodeString(node)) {
    container.textContent = node[0]
  } else {
    applyNodeObject(node, container)
  }
}

const applyNodeObject = (node: NodeObject, container: Container) => {
  const next: Node[] = []
  const remove: Node[] = []
  const callbacks: EffectData[] = []
  getNextChildren(node, container, next, remove, callbacks)
  let offset = container.childNodes.length
  const insertBefore = findInsertBefore(node.nN) || next.find((n) => n.e)?.e
  if (insertBefore) {
    for (let i = 0; i < offset; i++) {
      if (container.childNodes[i] === insertBefore) {
        offset = i
        break
      }
    }
  }

  for (let i = 0; i < next.length; i++, offset++) {
    const child = next[i]

    let el: HTMLElement | Text
    if (isNodeString(child)) {
      if (child.e) {
        child.e.textContent = child[0]
      }
      el = child.e ||= document.createTextNode(child[0])
    } else {
      el = child.e ||= document.createElement(child.tag as string)
      applyProps(el as HTMLElement, child.props, child.pP)
      applyNode(child, el as HTMLElement)
    }
    if (container.childNodes[offset] !== el) {
      container.insertBefore(el, container.childNodes[offset] || null)
    }
  }
  remove.forEach(removeNode)
  callbacks.forEach(([, cb]) => cb?.())
}

export const build = (
  context: Context,
  node: NodeObject,
  topLevelErrorHandlerNode: NodeObject | undefined,
  children?: Child[]
): void => {
  let errorHandler: ErrorHandler | undefined
  children ||= typeof node.tag == 'function' ? invokeTag(context, node) : node.children
  if ((children[0] as JSXNode)?.tag === '') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorHandler = (children[0] as any)[ERROR_HANDLER] as ErrorHandler
    topLevelErrorHandlerNode ||= node
  }
  const oldVChildren: Node[] = node.vC ? [...node.vC] : []
  const vChildren: Node[] = []
  const vChildrenToRemove: Node[] = []
  let prevNode: Node | undefined
  try {
    children.flat().forEach((c: Child) => {
      let child = buildNode(c)
      if (child) {
        if (prevNode) {
          prevNode.nN = child
        }
        prevNode = child

        let oldChild: Node | undefined
        const i = oldVChildren.findIndex((c) => c.key === (child as Node).key)
        if (i !== -1) {
          oldChild = oldVChildren[i]
          oldVChildren.splice(i, 1)
        }

        if (oldChild) {
          if (isNodeString(child)) {
            if (!isNodeString(oldChild)) {
              vChildrenToRemove.push(oldChild)
            } else {
              oldChild[0] = child[0] // update text content
              child = oldChild
            }
          } else if (oldChild.tag !== child.tag) {
            vChildrenToRemove.push(oldChild)
          } else {
            oldChild.pP = oldChild.props
            oldChild.props = child.props
            oldChild.children = child.children
            child = oldChild
          }
        }

        if (!isNodeString(child)) {
          build(context, child, topLevelErrorHandlerNode)
        }
        vChildren.push(child)
      }
    })
    node.vC = vChildren
    vChildrenToRemove.push(...oldVChildren)
    node.vR = vChildrenToRemove
  } catch (e) {
    if (errorHandler) {
      const withStartViewTransition = context[2]
      const fallback = errorHandler(e, () =>
        update([], topLevelErrorHandlerNode as NodeObject, !!withStartViewTransition)
      )
      if (fallback) {
        if (context[0] === 1) {
          context[1] = true
        } else {
          build(context, node, topLevelErrorHandlerNode, [fallback])
        }
        return
      }
    }
    throw e
  }
}

const buildNode = (node: Child): Node | undefined => {
  if (node === undefined || node === null || typeof node === 'boolean') {
    return undefined
  } else if (typeof node === 'string' || typeof node === 'number') {
    return [node.toString()] as NodeString
  } else {
    if (typeof (node as JSXNode).tag === 'function') {
      ;(node as NodeObject)[STASH] = [0, []]
    }
    return node as NodeObject
  }
}

const replaceContainer = (node: NodeObject, from: DocumentFragment, to: Container) => {
  if (node.c === from) {
    node.c = to
    node.vC.forEach((child) => replaceContainer(child as NodeObject, from, to))
  }
}

const updateSync = (context: Context, node: NodeObject) => {
  build(context, node, undefined)
  if (context[0] !== 1 || !context[1]) {
    apply(node, node.c as Container)
  }
}

export const update = (context: Context, node: NodeObject, withStartViewTransition: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (withStartViewTransition && (document as any).startViewTransition) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(document as any).startViewTransition(() => {
      const localContext: Context = [...context]
      localContext[2] = true
      updateSync(localContext, node)
    })
  } else {
    updateSync(context, node)
  }
}

export const render = (jsxNode: unknown, container: Container) => {
  const node = buildNode({ children: [jsxNode] } as JSXNode) as NodeObject
  build([], node, undefined)

  const fragment = document.createDocumentFragment()
  apply(node, fragment)
  replaceContainer(node, fragment, container)
  container.replaceChildren(fragment)
}
