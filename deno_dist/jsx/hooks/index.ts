import { DOM_STASH } from '../constants.ts'
import { buildDataStack, update, build } from '../dom/render.ts'
import type { Node, NodeObject, Context, PendingType, UpdateHook } from '../dom/render.ts'

type UpdateStateFunction<T> = (newState: T | ((currentState: T) => T)) => void

const STASH_SATE = 0
export const STASH_EFFECT = 1
const STASH_CALLBACK = 2
const STASH_USE = 3
const STASH_MEMO = 4

export type EffectData = [
  readonly unknown[] | undefined, // deps
  (() => void | (() => void)) | undefined, // layout effect
  (() => void) | undefined, // cleanup
  (() => void) | undefined // effect
]

const resolvedPromiseValueMap = new WeakMap<Promise<unknown>, unknown>()

const isDepsChanged = (
  prevDeps: readonly unknown[] | undefined,
  deps: readonly unknown[] | undefined
): boolean =>
  !prevDeps ||
  !deps ||
  prevDeps.length !== deps.length ||
  deps.some((dep, i) => dep !== prevDeps[i])

let viewTransitionState:
  | [
      boolean, // isUpdating
      boolean // useViewTransition() is called
    ]
  | undefined = undefined

const documentStartViewTransition: (cb: () => void) => { finished: Promise<void> } = (cb) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((document as any)?.startViewTransition) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (document as any).startViewTransition(cb)
  } else {
    cb()
    return { finished: Promise.resolve() }
  }
}

let updateHook: UpdateHook | undefined = undefined
const viewTransitionHook = (
  context: Context,
  node: Node,
  cb: (context: Context) => void
): Promise<void> => {
  const state: [boolean, boolean] = [true, false]
  let lastVC = node.vC
  return documentStartViewTransition(() => {
    if (lastVC === node.vC) {
      viewTransitionState = state
      cb(context)
      viewTransitionState = undefined
      lastVC = node.vC
    }
  }).finished.then(() => {
    if (state[1] && lastVC === node.vC) {
      state[0] = false
      viewTransitionState = state
      cb(context)
      viewTransitionState = undefined
    }
  })
}

export const startViewTransition = (callback: () => void): void => {
  updateHook = viewTransitionHook

  try {
    callback()
  } finally {
    updateHook = undefined
  }
}

export const useViewTransition = (): [boolean, (callback: () => void) => void] => {
  const buildData = buildDataStack.at(-1) as [Context, NodeObject]
  if (!buildData) {
    return [false, () => {}]
  }

  if (viewTransitionState) {
    viewTransitionState[1] = true
  }
  return [!!viewTransitionState?.[0], startViewTransition]
}

const pendingStack: PendingType[] = []
const runCallback = (type: PendingType, callback: Function): void => {
  pendingStack.push(type)
  try {
    callback()
  } finally {
    pendingStack.pop()
  }
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

  const stateArray = (node[DOM_STASH][1][STASH_SATE] ||= [])
  const hookIndex = node[DOM_STASH][0]++

  return (stateArray[hookIndex] ||= [
    resolveInitialState(),
    (newState: T | ((currentState: T) => T)) => {
      const localUpdateHook = updateHook
      const stateData = stateArray[hookIndex]
      if (typeof newState === 'function') {
        newState = (newState as (currentState: T) => T)(stateData[0])
      }

      if (newState !== stateData[0]) {
        stateData[0] = newState
        if (pendingStack.length) {
          const pendingType = pendingStack.at(-1) as PendingType
          update([pendingType, false, localUpdateHook as UpdateHook], node).then((node) => {
            if (!node || pendingType !== 2) {
              return
            }

            const lastVC = node.vC

            const addUpdateTask = () => {
              setTimeout(() => {
                // `node` is not rerendered after current transition
                if (lastVC !== node.vC) {
                  return
                }

                const shadowNode = Object.assign({}, node) as NodeObject

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ;(shadowNode as any).vC = undefined // delete the prev build data and build with clean state
                build([], shadowNode, undefined)
                setShadow(shadowNode) // save the `shadowNode.vC` of the virtual DOM of the build result as a result of shadow virtual DOM `shadowNode.s`

                node.s = shadowNode.s
                update([0, false, localUpdateHook as UpdateHook], node)
              })
            }

            if (localUpdateHook) {
              // wait for next animation frame, then invoke `update()`
              requestAnimationFrame(addUpdateTask)
            } else {
              addUpdateTask()
            }
          })
        } else {
          update([0, false, localUpdateHook as UpdateHook], node)
        }
      }
    },
  ])
}

const useEffectCommon = (
  index: number,
  effect: () => void | (() => void),
  deps?: readonly unknown[]
): void => {
  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return
  }
  const [, node] = buildData

  const effectDepsArray = (node[DOM_STASH][1][STASH_EFFECT] ||= [])
  const hookIndex = node[DOM_STASH][0]++

  const [prevDeps, , prevCleanup] = (effectDepsArray[hookIndex] ||= [])
  if (isDepsChanged(prevDeps, deps)) {
    if (prevCleanup) {
      prevCleanup()
    }
    const runner = () => {
      data[index] = undefined // clear this effect in order to avoid calling effect twice
      data[2] = effect() as (() => void) | undefined
    }
    const data: EffectData = [deps, undefined, undefined, undefined]
    data[index] = runner
    effectDepsArray[hookIndex] = data
  }
}
export const useEffect = (effect: () => void | (() => void), deps?: readonly unknown[]): void =>
  useEffectCommon(3, effect, deps)
export const useLayoutEffect = (
  effect: () => void | (() => void),
  deps?: readonly unknown[]
): void => useEffectCommon(1, effect, deps)

export const useCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: readonly unknown[]
): T => {
  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return callback
  }
  const [, node] = buildData

  const callbackArray = (node[DOM_STASH][1][STASH_CALLBACK] ||= [])
  const hookIndex = node[DOM_STASH][0]++

  const prevDeps = callbackArray[hookIndex]
  if (isDepsChanged(prevDeps?.[1], deps)) {
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
  promise.then(
    (res) => resolvedPromiseValueMap.set(promise, [res]),
    (e) => resolvedPromiseValueMap.set(promise, [undefined, e])
  )

  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    throw promise
  }
  const [, node] = buildData

  const promiseArray = (node[DOM_STASH][1][STASH_USE] ||= [])
  const hookIndex = node[DOM_STASH][0]++

  promise.then(
    (res) => {
      promiseArray[hookIndex] = [res]
    },
    (e) => {
      promiseArray[hookIndex] = [undefined, e]
    }
  )

  const res = promiseArray[hookIndex]
  if (res) {
    if (res.length === 2) {
      throw res[1]
    }
    return res[0] as T
  }

  throw promise
}

export const useMemo = <T>(factory: () => T, deps: readonly unknown[]): T => {
  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return factory()
  }
  const [, node] = buildData

  const memoArray = (node[DOM_STASH][1][STASH_MEMO] ||= [])
  const hookIndex = node[DOM_STASH][0]++

  const prevDeps = memoArray[hookIndex]
  if (isDepsChanged(prevDeps?.[1], deps)) {
    memoArray[hookIndex] = [factory(), deps]
  }
  return memoArray[hookIndex][0] as T
}
