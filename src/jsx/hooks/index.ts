import type { JSX } from '../base'
import { DOM_STASH } from '../constants'
import { buildDataStack, update } from '../dom/render'
import type { Context, Node, NodeObject, PendingType, UpdateHook } from '../dom/render'

type UpdateStateFunction<T> = (newState: T | ((currentState: T) => T)) => void

const STASH_SATE = 0
export const STASH_EFFECT = 1
const STASH_CALLBACK = 2
const STASH_MEMO = 3
const STASH_REF = 4

export type EffectData = [
  readonly unknown[] | undefined, // deps
  (() => void | (() => void)) | undefined, // layout effect
  (() => void) | undefined, // cleanup
  (() => void) | undefined, // effect
  (() => void) | undefined // insertion effect
]

const resolvedPromiseValueMap: WeakMap<Promise<unknown>, unknown> = new WeakMap<
  Promise<unknown>,
  unknown
>()

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

// PendingType is defined in "../dom/render", 3 is used for useDeferredValue
const pendingStack: [PendingType | 3, Promise<void>][] = []
const runCallback = (type: PendingType, callback: Function): void => {
  let resolve: (() => void) | undefined
  const promise = new Promise<void>((r) => (resolve = r))
  pendingStack.push([type, promise])
  try {
    const res = callback()
    if (res instanceof Promise) {
      res.then(resolve, resolve)
    } else {
      resolve!()
    }
  } finally {
    pendingStack.pop()
  }
}

export const startTransition = (callback: () => void): void => {
  runCallback(1, callback)
}
const startTransitionHook = (callback: () => void | Promise<void>): void => {
  runCallback(2, callback)
}

export const useTransition = (): [boolean, (callback: () => void | Promise<void>) => void] => {
  const buildData = buildDataStack.at(-1) as [Context, NodeObject]
  if (!buildData) {
    return [false, () => {}]
  }

  const [error, setError] = useState<[Error]>()
  const [state, updateState] = useState<boolean>()
  if (error) {
    throw error[0]
  }
  const startTransitionLocalHook = useCallback<typeof startTransitionHook>(
    (callback) => {
      startTransitionHook(() => {
        updateState((state) => !state)
        let res = callback()
        if (res instanceof Promise) {
          res = res.catch((e) => {
            setError([e])
          })
        }
        return res
      })
    },
    [state]
  )

  const [context] = buildData
  return [context[0] === 2, startTransitionLocalHook]
}

type UseDeferredValue = <T>(value: T, initialValue?: T) => T
export const useDeferredValue: UseDeferredValue = <T>(value: T, ...rest: [T | undefined]): T => {
  const [values, setValues] = useState<[T, T]>(
    (rest.length ? [rest[0], rest[0]] : [value, value]) as [T, T]
  )
  if (Object.is(values[1], value)) {
    return values[1]
  }

  pendingStack.push([3, Promise.resolve()])
  updateHook = async (context: Context, _, cb: (context: Context) => void) => {
    cb(context)
    values[0] = value
  }
  setValues([values[0], value])
  updateHook = undefined
  pendingStack.pop()

  return values[0]
}

type UseStateType = {
  <T>(initialState: T | (() => T)): [T, UpdateStateFunction<T>]
  <T = undefined>(): [T | undefined, UpdateStateFunction<T | undefined>]
}
export const useState: UseStateType = <T>(
  initialState?: T | (() => T)
): [T, UpdateStateFunction<T>] => {
  const resolveInitialState = () =>
    typeof initialState === 'function' ? (initialState as () => T)() : (initialState as T)

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

      if (!Object.is(newState, stateData[0])) {
        stateData[0] = newState
        if (pendingStack.length) {
          const [pendingType, pendingPromise] = pendingStack.at(-1) as [
            PendingType | 3,
            Promise<void>
          ]
          Promise.all([
            pendingType === 3
              ? node
              : update([pendingType, false, localUpdateHook as UpdateHook], node),
            pendingPromise,
          ]).then(([node]) => {
            if (!node || !(pendingType === 2 || pendingType === 3)) {
              return
            }

            const lastVC = node.vC

            const addUpdateTask = () => {
              setTimeout(() => {
                // return if `node` is rerendered after current transition
                if (lastVC !== node.vC) {
                  return
                }
                update([pendingType === 3 ? 1 : 0, false, localUpdateHook as UpdateHook], node)
              })
            }

            requestAnimationFrame(addUpdateTask)
          })
        } else {
          update([0, false, localUpdateHook as UpdateHook], node)
        }
      }
    },
  ])
}

export const useReducer = <T, A>(
  reducer: (state: T, action: A) => T,
  initialArg: T,
  init?: (initialState: T) => T
): [T, (action: A) => void] => {
  const handler = useCallback(
    (action: A) => {
      setState((state) => reducer(state, action))
    },
    [reducer]
  )
  const [state, setState] = useState(() => (init ? init(initialArg) : initialArg))
  return [state, handler]
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
    const data: EffectData = [deps, undefined, undefined, undefined, undefined]
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
export const useInsertionEffect = (
  effect: () => void | (() => void),
  deps?: readonly unknown[]
): void => useEffectCommon(4, effect, deps)

export const useCallback = <T extends Function>(callback: T, deps: readonly unknown[]): T => {
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
  const buildData = buildDataStack.at(-1) as [unknown, NodeObject]
  if (!buildData) {
    return { current: initialValue }
  }
  const [, node] = buildData

  const refArray = (node[DOM_STASH][1][STASH_REF] ||= [])
  const hookIndex = node[DOM_STASH][0]++

  return (refArray[hookIndex] ||= { current: initialValue })
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

let idCounter = 0
export const useId = (): string => useMemo(() => `:r${(idCounter++).toString(32)}:`, [])

// Define to avoid errors. This hook currently does nothing.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useDebugValue = (_value: unknown, _formatter?: (value: unknown) => string): void => {}

export const createRef = <T>(): RefObject<T> => {
  return { current: null }
}

export const forwardRef = <T, P = {}>(
  Component: (props: P, ref?: RefObject<T>) => JSX.Element
): ((props: P & { ref?: RefObject<T> }) => JSX.Element) => {
  return (props) => {
    const { ref, ...rest } = props
    return Component(rest as P, ref)
  }
}

export const useImperativeHandle = <T>(
  ref: RefObject<T>,
  createHandle: () => T,
  deps: readonly unknown[]
): void => {
  useEffect(() => {
    ref.current = createHandle()
    return () => {
      ref.current = null
    }
  }, deps)
}

export const useSyncExternalStore = <T>(
  subscribe: (callback: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T
): T => {
  const buildData = buildDataStack.at(-1) as [Context, unknown]
  if (!buildData) {
    // now a stringify process, maybe in server side
    if (!getServerSnapshot) {
      throw new Error('getServerSnapshot is required for server side rendering')
    }
    return getServerSnapshot()
  }

  const [serverSnapshotIsUsed] = useState<boolean>(!!(buildData[0][4] && getServerSnapshot))
  const [state, setState] = useState(() =>
    serverSnapshotIsUsed ? (getServerSnapshot as () => T)() : getSnapshot()
  )
  useEffect(() => {
    if (serverSnapshotIsUsed) {
      setState(getSnapshot())
    }
    return subscribe(() => {
      setState(getSnapshot())
    })
  }, [])

  return state
}
