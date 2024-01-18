import { buildDataStack, update, build, STASH } from '../dom/render'
import type { Node, NodeObject, Context, PendingType } from '../dom/render'

type UpdateStateFunction<T> = (newState: T | ((currentState: T) => T)) => void

const STASH_SATE = 0
export const STASH_EFFECT = 1
const STASH_CALLBACK = 2
const STASH_USE = 3

export type EffectData = [
  readonly unknown[] | undefined,
  (() => void | (() => void)) | undefined,
  (() => void) | undefined
]

const resolvedPromiseValueMap = new WeakMap<Promise<unknown>, unknown>()

type PendingStackItem = [PendingType, Map<Node, Function>]
const pendingStack: PendingStackItem[] = []
const runCallback = (type: PendingType, callback: Function): void => {
  const map = new Map()
  pendingStack.push([type, map])
  try {
    callback()
  } finally {
    pendingStack.pop()
  }
  map.forEach((cb) => cb())
}

export const startTransition = (callback: () => void): void => {
  runCallback(1, callback)
}
const startTransitionHook = (callback: () => void): void => {
  runCallback(2, callback)
}

export const useTransition = (): [boolean, (callback: () => void) => void] => {
  const buildData = buildDataStack.at(-1) as [Context, NodeObject]
  if (!buildData) {
    return [false, () => {}]
  }
  const [context] = buildData
  return [context[0] === 2, startTransitionHook]
}

export const useDeferredValue = <T>(value: T): T => {
  const buildData = buildDataStack.at(-1) as [Context, NodeObject]
  if (buildData) {
    buildData[0][0] = 1
  }
  return value
}

const setShadow = (node: Node) => {
  if (node.vC) {
    node.s = node.vC
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(node as any).vC = undefined
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(node as any).s?.forEach(setShadow)
}

export const useState = <T>(initialState: T | (() => T)): [T, UpdateStateFunction<T>] => {
  const resolveInitialState = () =>
    typeof initialState === 'function' ? (initialState as () => T)() : initialState

  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return [resolveInitialState(), () => {}]
  }
  const [, node] = buildData

  const stateArray = (node[STASH][1][STASH_SATE] ||= [])
  const hookIndex = node[STASH][0]++

  return (stateArray[hookIndex] ||= [
    resolveInitialState(),
    (newState: T | ((currentState: T) => T)) => {
      const stateData = stateArray[hookIndex]
      if (typeof newState === 'function') {
        newState = (newState as (currentState: T) => T)(stateData[0])
      }

      if (newState !== stateData[0]) {
        stateData[0] = newState
        if (pendingStack.length) {
          const [type, map] = pendingStack.at(-1) as PendingStackItem
          map.set(node, () => {
            const context: Context = [type, false]
            if (type === 2) {
              setTimeout(async () => {
                const shadowNode = Object.assign({}, node) as NodeObject

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(shadowNode as any).vC = undefined // delete the prev build data and build with clean state
                build([], shadowNode, undefined)
                setShadow(shadowNode) // save the `shadowNode.vC` of the virtual DOM of the build result as a result of shadow virtual DOM `shadowNode.s`

                // `node` is not rerendered after current transition
                if (lastVC === node.vC) {
                  node.s = shadowNode.s
                  update([], node)
                }
              })
            }

            update(context, node)
            const lastVC = node.vC
          })
        } else {
          update([], node)
        }
      }
    },
  ])
}

export const useEffect = (effect: () => void | (() => void), deps?: readonly unknown[]): void => {
  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return
  }
  const [, node] = buildData

  const effectDepsArray = (node[STASH][1][STASH_EFFECT] ||= [])
  const hookIndex = node[STASH][0]++

  const [prevDeps, , prevCleanup] = (effectDepsArray[hookIndex] ||= [])
  if (!deps || !prevDeps || deps.some((dep, i) => dep !== prevDeps[i])) {
    if (prevCleanup) {
      prevCleanup()
    }
    const data: EffectData = [
      deps,
      () => {
        data[1] = undefined // clear this effect in order to avoid calling effect twice
        data[2] = effect() as (() => void) | undefined
      },
      undefined,
    ]
    effectDepsArray[hookIndex] = data
  }
}

export const useCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: readonly unknown[]
): T => {
  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return callback
  }
  const [, node] = buildData

  const callbackArray = (node[STASH][1][STASH_CALLBACK] ||= [])
  const hookIndex = node[STASH][0]++

  const prevDeps = callbackArray[hookIndex]
  if (!prevDeps || deps.some((dep, i) => dep !== prevDeps[1][i])) {
    callbackArray[hookIndex] = [callback, deps]
  } else {
    callback = callbackArray[hookIndex][0] as T
  }
  return callback
}

export type RefObject<T> = { current: T | null }
export const useRef = <T>(initialValue: T | null): RefObject<T> => {
  return { current: initialValue }
}

export const use = <T>(promise: Promise<T>): T => {
  const cachedRes = resolvedPromiseValueMap.get(promise) as [T] | [undefined, unknown] | undefined
  if (cachedRes) {
    if (cachedRes.length === 2) {
      throw cachedRes[1]
    }
    return cachedRes[0] as T
  }
  promise
    .then((res) => resolvedPromiseValueMap.set(promise, [res]))
    .catch((e) => resolvedPromiseValueMap.set(promise, [undefined, e]))

  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    throw promise
  }
  const [, node] = buildData

  const promiseArray = (node[STASH][1][STASH_USE] ||= [])
  const hookIndex = node[STASH][0]++

  promise
    .then((res) => {
      promiseArray[hookIndex] = [res]
    })
    .catch((e) => {
      promiseArray[hookIndex] = [undefined, e]
    })

  const res = promiseArray[hookIndex]
  if (res) {
    if (res.length === 2) {
      throw res[1]
    }
    return res[0] as T
  }

  throw promise
}
