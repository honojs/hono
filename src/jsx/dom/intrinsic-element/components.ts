import type { Props } from '../../base'
import type { FC, PropsWithChildren, RefObject } from '../../types'
import { newJSXNode } from '../utils'
import { createPortal, getNameSpaceContext } from '../render'
import { useContext } from '../../context'
import { useCallback, useState } from '../../hooks'
import { FormContext } from '../hooks'

const documentMetadataTag = (tag: string, props: Props, deDupAttrs: string[]) => {
  const jsxNode = newJSXNode({
    tag,
    props,
  })

  if (props?.itemProp) {
    return jsxNode
  }

  let selector = tag
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        const v = value.includes('"') ? value.replace(/"/g, '\\"') : value
        selector += `[${key}="${v}"]`
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(jsxNode as any).e = document.head.querySelector(selector)

  return createPortal(
    jsxNode,
    document.head
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
}
export const title: FC<PropsWithChildren> = (props) => {
  const nameSpaceContext = getNameSpaceContext()
  const ns = nameSpaceContext && useContext(nameSpaceContext)
  if (ns?.includes('svg')) {
    return newJSXNode({
      tag: 'title',
      props,
    })
  }
  return documentMetadataTag('title', props, [])
}

export const script: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('script', props, ['src'])
}

export const style: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('style', props, ['href'])
}

export const link: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('link', props, ['href'])
}

export const meta: FC<PropsWithChildren> = (props) => {
  return documentMetadataTag('meta', props, ['name', 'httpEquiv', 'charset', 'itemProp'])
}

export const form: FC<
  PropsWithChildren<{
    action?: Function | string
    method?: 'get' | 'post'
    ref?: RefObject<HTMLFormElement> | ((e: HTMLFormElement | null) => void | (() => void))
  }>
> = (props) => {
  const { action, ...restProps } = props
  if (typeof action !== 'function') {
    return newJSXNode({
      tag: 'form',
      props,
    })
  }

  const [data, setData] = useState<FormData | null>(null)
  const onSubmit = useCallback<(e: SubmitEvent) => void>(async (e: Event) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    setData(formData)
    await action(formData)
    setData(null)
  }, [])

  const [ref] = useState(() => (e: HTMLFormElement) => {
    let cleanup: (() => void) | undefined
    const propsRef = props.ref
    if (propsRef) {
      if (typeof propsRef === 'function') {
        cleanup =
          propsRef(e) ||
          (() => {
            propsRef(null)
          })
      } else if (propsRef && 'current' in propsRef) {
        propsRef.current = e
      }
    }

    e.addEventListener('submit', onSubmit)
    return () => {
      e.removeEventListener('submit', onSubmit)
      cleanup!()
    }
  })

  return newJSXNode({
    tag: FormContext as unknown as Function,
    props: {
      value: {
        pending: data !== null,
        data,
        method: props.method || 'get',
        action,
      },
      children: newJSXNode({
        tag: 'form',
        props: {
          ...restProps,
          ref,
        },
      }),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}
