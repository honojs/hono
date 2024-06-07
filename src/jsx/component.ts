import type { HtmlEscapedString } from '../utils/html'
import { jsx, memo, toFunctionComponent } from './base'
import type { FC, Props } from './base'
import { ErrorBoundary } from './components'
import { useEffect, useState } from './hooks'
import type { Context } from './context'
import { useContext } from './context'

const functionComponent = Symbol()

export abstract class Component {
  static contextType?: Context<unknown>
  static [functionComponent]: FC | undefined = undefined
  static [toFunctionComponent](
    this: (new (props: Props) => Component) & {
      contextType?: Context<unknown>
      [functionComponent]: FC | undefined
      getDerivedStateFromProps?: (
        nextProps: unknown,
        prevState: unknown
      ) => Record<string, unknown> | null
    }
  ): FC {
    return (this[functionComponent] ||= (props: Props) => {
      let instance: Component | undefined = undefined
      let rerender = true
      if (props.children) {
        const onError = (error: Error) => instance!.componentDidCatch(error)
        props.children = jsx(
          ErrorBoundary,
          {
            onError,
          },
          props.children as HtmlEscapedString
        )
      }
      ;[instance] = useState<Component>(() => {
        rerender = false
        return new this(props)
      })
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ;[instance.state, instance.setState] = useState(instance.state)
      const [, forceUpdate] = useState<boolean>(true)

      useEffect(() => {
        instance.componentDidMount()
        return () => instance.componentWillUnmount()
      }, [])

      useEffect(() => {
        if (rerender) {
          instance.componentDidUpdate()
        }
      })

      if (rerender) {
        if (this.getDerivedStateFromProps) {
          props = this.getDerivedStateFromProps(props, instance!.state) as Record<string, unknown>
        }
        if (props !== null) {
          instance!.props = props
        }
      } else {
        if (this.contextType) {
          instance!.context = useContext(this.contextType)
        }
        instance.forceUpdate = (cb) => {
          forceUpdate((current) => !current)
          cb()
        }
      }
      return instance.render()
    })
  }

  state: unknown
  props: Record<string, unknown> = {}
  context: unknown

  constructor(props: Record<string, unknown> | undefined) {
    this.props = props || {}
  }

  render(): HtmlEscapedString | Promise<HtmlEscapedString> {
    throw new Error('Component subclasses must implement a render method')
  }

  /* eslint-disable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
  componentDidCatch(error: Error) {}
  setState(newState: unknown): void {}
  componentDidMount(): void {}
  componentDidUpdate(): void {}
  componentWillUnmount(): void {}
  forceUpdate(callback: Function): void {}
  /* eslint-enable @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars */
}

export abstract class PureComponent extends Component {
  static [toFunctionComponent](this: new (props: Record<string, unknown>) => Component) {
    const render = super[toFunctionComponent]()
    return memo(render)
  }
}
