/** @jsxRuntime automatic @jsxImportSource ../../src/jsx/dom */
import { useEffect, useState } from '../../src/jsx/dom'
import { createRoot } from '../../src/jsx/dom/client'
;(() => {
  if (!('run-dom-app' in globalThis)) {
    return
  }

  const App = () => {
    const [count, setCount] = useState(0)
    useEffect(() => {
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

export const shouldNotBeIncluded = ['/jsx/base']
