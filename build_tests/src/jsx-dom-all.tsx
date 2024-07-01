/** @jsxRuntime automatic @jsxImportSource ../../src/jsx/dom */
import * as React from '../../src/jsx/dom'
import { createRoot } from '../../src/jsx/dom/client'
;(() => {
  if (!('run-dom-app' in globalThis)) {
    return
  }

  // accessing React by random key
  const key = Math.random().toString(36).slice(2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log((React as any)[key])

  const App = () => {
    const [count, setCount] = React.useState(0)
    React.useEffect(() => {
      console.log('effect', count)
    }, [count])
    return (
      <div>
        <h1>Count: {count}</h1>
        <button onClick={() => setCount(count + 1)}>Increment</button>
      </div>
    )
  }

  const domNode = document.getElementById('root')
  const root = createRoot(domNode as HTMLElement)
  root.render(<App />)
})()

export const shouldNotBeIncluded = ['/helper/html']
