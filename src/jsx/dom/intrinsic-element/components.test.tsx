/** @jsxImportSource ../../ */
import { JSDOM, ResourceLoader } from 'jsdom'
import { useState } from '../../hooks'
import { Suspense, render } from '..'

describe('intrinsic element', () => {
  let CustomResourceLoader: typeof ResourceLoader
  beforeAll(() => {
    global.requestAnimationFrame = (cb) => setTimeout(cb)

    CustomResourceLoader = class CustomResourceLoader extends ResourceLoader {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetch(url: string) {
        return url.includes('invalid')
          ? Promise.reject()
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Promise.resolve(Buffer.from('')) as any)
      }
    }
  })

  let dom: JSDOM
  let root: HTMLElement
  beforeEach(() => {
    dom = new JSDOM('<html><head></head><body><div id="root"></div></body></html>', {
      runScripts: 'dangerously',
      resources: new CustomResourceLoader(),
    })
    global.document = dom.window.document
    global.HTMLElement = dom.window.HTMLElement
    global.SVGElement = dom.window.SVGElement
    global.Text = dom.window.Text
    global.FormData = dom.window.FormData
    root = document.getElementById('root') as HTMLElement
  })

  describe('document metadata', () => {
    describe('title element', () => {
      it('should be inserted into head', () => {
        const App = () => {
          return (
            <div>
              <title>Document Title</title>
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<title>Document Title</title>')
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be updated', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <title>Document Title {count}</title>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<title>Document Title 0</title>')
        expect(root.innerHTML).toBe('<div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<title>Document Title 1</title>')
      })

      it('should be preserved when unmounted', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              {count === 1 && <title>Document Title {count}</title>}
              <div>{count}</div>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe('<div><div>0</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<title>Document Title 1</title>')
        expect(root.innerHTML).toBe('<div><div>1</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<title>Document Title 1</title>')
        expect(root.innerHTML).toBe('<div><div>2</div><button>+</button></div>')
      })
    })

    describe('link element', () => {
      it('should be inserted into head', () => {
        const App = () => {
          return (
            <div>
              <link rel='stylesheet' href='style.css' />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<link href="style.css" rel="stylesheet">')
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be updated', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <link rel='stylesheet' href={`style${count}.css`} />
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<link href="style0.css" rel="stylesheet">')
        expect(root.innerHTML).toBe('<div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<link href="style1.css" rel="stylesheet">')
      })

      it('accept ref object', async () => {
        const ref = { current: null }
        const App = () => {
          const [disabled, setDisabled] = useState(false)
          return (
            <div>
              <link rel='stylesheet' href={'style.css'} ref={ref} disabled={disabled} />
              <button onClick={() => setDisabled(!disabled)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(ref.current).toBe(document.head.querySelector('link'))
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(ref.current).toBe(null)
      })

      it('accept ref function', async () => {
        const ref = vi.fn()
        const App = () => {
          const [disabled, setDisabled] = useState(false)
          return (
            <div>
              <link rel='stylesheet' href={'style.css'} ref={ref} disabled={disabled} />
              <button onClick={() => setDisabled(!disabled)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(ref).toHaveBeenCalledTimes(1)
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(ref).toHaveBeenCalledTimes(2)
      })

      it('accept ref function that returns cleanup function', async () => {
        const cleanup = vi.fn()
        const ref = vi.fn().mockReturnValue(cleanup)
        const App = () => {
          const [disabled, setDisabled] = useState(false)
          return (
            <div>
              <link rel='stylesheet' href={'style.css'} ref={ref} disabled={disabled} />
              <button onClick={() => setDisabled(!disabled)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(ref).toHaveBeenCalledTimes(1)
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(ref).toHaveBeenCalledTimes(1)
        expect(cleanup).toHaveBeenCalledTimes(1)
      })

      it('should be removed if disabled={true}', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <link rel='stylesheet' href={'style.css'} disabled={count === 1} />
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<link href="style.css" rel="stylesheet">')
        expect(root.innerHTML).toBe('<div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('')
      })

      it('should be ordered by precedence attribute', () => {
        const App = () => {
          return (
            <div>
              <link rel='stylesheet' href='style-a.css' precedence='default' />
              <link rel='stylesheet' href='style-b.css' precedence='high' />
              <link rel='stylesheet' href='style-c.css' precedence='default' />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<link href="style-a.css" rel="stylesheet"><link href="style-c.css" rel="stylesheet"><link href="style-b.css" rel="stylesheet">'
        )
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be de-duplicated by href attribute', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <link rel='stylesheet' href='style-a.css' precedence='default' />
              <link rel='stylesheet' href='style-b.css' precedence='high' />
              {count === 1 && (
                <>
                  <link rel='stylesheet' href='style-a.css' precedence='other' />
                  <link rel='stylesheet' href='style-c.css' precedence='other' />
                </>
              )}
              <button onClick={() => setCount(count + 1)}>+</button>
              {count}
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<link href="style-a.css" rel="stylesheet"><link href="style-b.css" rel="stylesheet">'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>0</div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe(
          '<link href="style-a.css" rel="stylesheet"><link href="style-b.css" rel="stylesheet"><link href="style-c.css" rel="stylesheet">'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>1</div>')
      })

      it('should be preserved when unmounted', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              {count === 1 && <link rel='stylesheet' href='style.css' />}
              <div>{count}</div>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe('<div><div>0</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<link href="style.css" rel="stylesheet">')
        expect(root.innerHTML).toBe('<div><div>1</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<link href="style.css" rel="stylesheet">')
        expect(root.innerHTML).toBe('<div><div>2</div><button>+</button></div>')
      })

      it('should be fired onLoad event', async () => {
        const onLoad = vi.fn()
        const onError = vi.fn()
        const App = () => {
          return (
            <div>
              <link
                rel='stylesheet'
                href='http://localhost/style.css'
                onLoad={onLoad}
                onError={onError}
              />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<link href="http://localhost/style.css" rel="stylesheet">'
        )
        await Promise.resolve()
        await new Promise((resolve) => setTimeout(resolve))
        expect(onLoad).toBeCalledTimes(1)
        expect(onError).not.toBeCalled()
      })

      it('should be fired onError event', async () => {
        const onLoad = vi.fn()
        const onError = vi.fn()
        const App = () => {
          return (
            <div>
              <link
                rel='stylesheet'
                href='http://localhost/invalid.css'
                onLoad={onLoad}
                onError={onError}
              />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<link href="http://localhost/invalid.css" rel="stylesheet">'
        )
        await Promise.resolve()
        await new Promise((resolve) => setTimeout(resolve))
        expect(onLoad).not.toBeCalled()
        expect(onError).toBeCalledTimes(1)
      })

      it('should be blocked by blocking attribute', async () => {
        const Component = () => {
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <div>
                <link rel='stylesheet' href='http://localhost/style.css' blocking='render' />
                Content
              </div>
            </Suspense>
          )
        }
        const App = () => {
          const [show, setShow] = useState(false)
          return (
            <div>
              {show && <Component />}
              <button onClick={() => setShow(true)}>Show</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe('<div><button>Show</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><div>Loading...</div><button>Show</button></div>')
        await new Promise((resolve) => setTimeout(resolve))
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><div>Content</div><button>Show</button></div>')
      })
    })

    describe('style element', () => {
      it('should be inserted into head', () => {
        const App = () => {
          return (
            <div>
              <style>{'body { color: red; }'}</style>
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<style>body { color: red; }</style>')
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be updated', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <style>{`body { color: ${count % 2 ? 'red' : 'blue'}; }`}</style>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<style>body { color: blue; }</style>')
        expect(root.innerHTML).toBe('<div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<style>body { color: red; }</style>')
      })

      it('should be preserved when unmounted', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              {count === 1 && <style>{'body { color: red; }'}</style>}
              <div>{count}</div>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe('<div><div>0</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<style>body { color: red; }</style>')
        expect(root.innerHTML).toBe('<div><div>1</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<style>body { color: red; }</style>')
        expect(root.innerHTML).toBe('<div><div>2</div><button>+</button></div>')
      })

      it('should be de-duplicated by href attribute', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <style>{'body { color: red; }'}</style>
              <style href='blue'>{'body { color: blue; }'}</style>
              <style>{'body { color: green; }'}</style>
              {count === 1 && (
                <>
                  <style href='blue'>{'body { color: blue; }'}</style>
                  <style>{'body { color: yellow; }'}</style>
                </>
              )}
              <button onClick={() => setCount(count + 1)}>+</button>
              {count}
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<style>body { color: red; }</style><style href="blue">body { color: blue; }</style><style>body { color: green; }</style>'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>0</div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe(
          '<style>body { color: red; }</style><style href="blue">body { color: blue; }</style><style>body { color: green; }</style><style>body { color: yellow; }</style>'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>1</div>')
      })

      it('should be ordered by precedence attribute', () => {
        const App = () => {
          return (
            <div>
              <style precedence='default'>{'body { color: red; }'}</style>
              <style precedence='high'>{'body { color: green; }'}</style>
              <style precedence='default'>{'body { color: blue; }'}</style>
              <style>{'body { color: yellow; }'}</style>
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<style>body { color: red; }</style><style>body { color: blue; }</style><style>body { color: green; }</style><style>body { color: yellow; }</style>'
        )
        expect(root.innerHTML).toBe('<div>Content</div>')
      })
    })

    describe('meta element', () => {
      it('should be inserted into head', () => {
        const App = () => {
          return (
            <div>
              <meta name='description' content='description' />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<meta name="description" content="description">')
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be updated', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <meta name='description' content={`description ${count}`} />
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<meta name="description" content="description 0">')
        expect(root.innerHTML).toBe('<div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<meta name="description" content="description 1">')
      })

      it('should not do special behavior if itemProp is present', () => {
        const App = () => {
          return (
            <div>
              <meta name='description' content='description' itemProp='test' />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe(
          '<div><meta name="description" content="description" itemprop="test">Content</div>'
        )
      })

      it('should be ordered by precedence attribute', () => {
        const App = () => {
          return (
            <div>
              <meta name='description-a' content='description-a' precedence='default' />
              <meta name='description-b' content='description-b' precedence='high' />
              <meta name='description-c' content='description-c' precedence='default' />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<meta name="description-a" content="description-a"><meta name="description-c" content="description-c"><meta name="description-b" content="description-b">'
        )
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be de-duplicated by name attribute', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <meta name='description-a' content='description-a' precedence='default' />
              <meta name='description-b' content='description-b' precedence='high' />
              {count === 1 && (
                <>
                  <meta name='description-a' content='description-a' precedence='other' />
                  <meta name='description-c' content='description-c' precedence='other' />
                </>
              )}
              <button onClick={() => setCount(count + 1)}>+</button>
              {count}
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<meta name="description-a" content="description-a"><meta name="description-b" content="description-b">'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>0</div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe(
          '<meta name="description-a" content="description-a"><meta name="description-b" content="description-b"><meta name="description-c" content="description-c">'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>1</div>')
      })
    })

    describe('script element', () => {
      it('should be inserted into head', async () => {
        const App = () => {
          return (
            <div>
              <script src='script.js' />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<script src="script.js"></script>')
        expect(root.innerHTML).toBe('<div>Content</div>')
      })

      it('should be updated', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <script src={`script${count}.js`} />
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<script src="script0.js"></script>')
        expect(root.innerHTML).toBe('<div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<script src="script1.js"></script>')
      })

      it('should be de-duplicated by src attribute with async=true', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              <script src='script-a.js' async={true} />
              <script src='script-b.js' async={true} />
              {count === 1 && (
                <>
                  <script src='script-a.js' async={true} />
                  <script src='script-c.js' async={true} />
                </>
              )}
              <button onClick={() => setCount(count + 1)}>+</button>
              {count}
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe(
          '<script src="script-a.js" async=""></script><script src="script-b.js" async=""></script>'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>0</div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe(
          '<script src="script-a.js" async=""></script><script src="script-b.js" async=""></script><script src="script-c.js" async=""></script>'
        )
        expect(root.innerHTML).toBe('<div><button>+</button>1</div>')
      })

      it('should be preserved when unmounted', async () => {
        const App = () => {
          const [count, setCount] = useState(0)
          return (
            <div>
              {count === 1 && <script src='script.js' />}
              <div>{count}</div>
              <button onClick={() => setCount(count + 1)}>+</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe('<div><div>0</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<script src="script.js"></script>')
        expect(root.innerHTML).toBe('<div><div>1</div><button>+</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(document.head.innerHTML).toBe('<script src="script.js"></script>')
        expect(root.innerHTML).toBe('<div><div>2</div><button>+</button></div>')
      })

      it('should be fired onLoad event', async () => {
        const onLoad = vi.fn()
        const onError = vi.fn()
        const App = () => {
          return (
            <div>
              <script src='http://localhost/script.js' onLoad={onLoad} onError={onError} />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<script src="http://localhost/script.js"></script>')
        await Promise.resolve()
        await new Promise((resolve) => setTimeout(resolve))
        expect(onLoad).toBeCalledTimes(1)
        expect(onError).not.toBeCalled()
      })

      it('should be fired onError event', async () => {
        const onLoad = vi.fn()
        const onError = vi.fn()
        const App = () => {
          return (
            <div>
              <script src='http://localhost/invalid.js' onLoad={onLoad} onError={onError} />
              Content
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('<script src="http://localhost/invalid.js"></script>')
        await Promise.resolve()
        await new Promise((resolve) => setTimeout(resolve))
        expect(onLoad).not.toBeCalled()
        expect(onError).toBeCalledTimes(1)
      })

      it('should be blocked by blocking attribute', async () => {
        const Component = () => {
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <div>
                <script src='http://localhost/script.js' blocking='render' />
                Content
              </div>
            </Suspense>
          )
        }
        const App = () => {
          const [show, setShow] = useState(false)
          return (
            <div>
              {show && <Component />}
              <button onClick={() => setShow(true)}>Show</button>
            </div>
          )
        }
        render(<App />, root)
        expect(document.head.innerHTML).toBe('')
        expect(root.innerHTML).toBe('<div><button>Show</button></div>')
        root.querySelector('button')?.click()
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><div>Loading...</div><button>Show</button></div>')
        await new Promise((resolve) => setTimeout(resolve))
        await Promise.resolve()
        expect(root.innerHTML).toBe('<div><div>Content</div><button>Show</button></div>')
      })
    })
  })

  describe('form element', () => {
    it('should accept Function as action', () => {
      const action = vi.fn()
      const App = () => {
        return (
          <form action={action} method='post'>
            <input type='text' name='name' value='Hello' />
            <button type='submit'>Submit</button>
          </form>
        )
      }
      render(<App />, root)
      root.querySelector('button')?.click()
      expect(action).toBeCalledTimes(1)
      const formData = action.mock.calls[0][0]
      expect(formData.get('name')).toBe('Hello')
    })

    it('should accept string as action', () => {
      const App = () => {
        return (
          <form action={'/entries'} method='post'>
            <button type='submit'>Submit</button>
          </form>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe(
        '<form action="/entries" method="post"><button type="submit">Submit</button></form>'
      )
    })

    it('toggle show / hide form', async () => {
      const action = vi.fn()
      const App = () => {
        const [show, setShow] = useState(false)
        console.log(show)
        return (
          <div>
            {show && (
              <form action={action} method='post'>
                <input type='text' name='name' value='Hello' />
              </form>
            )}
            <button onClick={() => setShow((status) => !status)}>Toggle</button>
          </div>
        )
      }
      render(<App />, root)
      expect(root.innerHTML).toBe('<div><button>Toggle</button></div>')
      root.querySelector('button')?.click()
      await Promise.resolve()
      expect(root.innerHTML).toBe(
        '<div><form method="post"><input type="text" name="name" value="Hello"></form><button>Toggle</button></div>'
      )
      root.querySelector('button')?.click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(root.innerHTML).toBe('<div><button>Toggle</button></div>')
    })
  })
})
