/* eslint-disable quotes */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { jsx, Fragment } from '../../jsx'
import type {
  css as cssHelper,
  keyframes as keyframesHelper,
  viewTransition as viewTransitionHelper,
  rawCssString as rawCssStringHelper,
  Style as StyleComponent,
} from './index'

interface Support {
  nest: boolean
}
export const renderTest = (
  getEnv: () => {
    css: typeof cssHelper
    keyframes: typeof keyframesHelper
    viewTransition: typeof viewTransitionHelper
    rawCssString: typeof rawCssStringHelper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toString: (template: any) => Promise<string>
    Style: typeof StyleComponent
    support: Support
  }
) => {
  const { support } = getEnv()

  let css: typeof cssHelper
  let keyframes: typeof keyframesHelper
  let viewTransition: typeof viewTransitionHelper
  let rawCssString: typeof rawCssStringHelper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let toString: (template: any) => Promise<string>
  let Style: typeof StyleComponent
  beforeEach(() => {
    ;({ css, keyframes, viewTransition, rawCssString, toString, Style } = getEnv())
  })

  describe('render css', () => {
    it('Should render CSS styles with JSX', async () => {
      const headerClass = css`
        background-color: blue;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1>'
      )
    })

    it('Should render CSS with keyframes', async () => {
      const animation = keyframes`
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      `
      const headerClass = css`
        background-color: blue;
        animation: ${animation} 1s ease-in-out;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1580801783{background-color:blue;animation:css-9294673 1s ease-in-out}@keyframes css-9294673{from{opacity:0}to{opacity:1}}</style><h1 class="css-1580801783">Hello!</h1>'
      )
    })

    it('Should not output the same class name multiple times.', async () => {
      const headerClass = css`
        background-color: blue;
      `
      const headerClass2 = css`
        background-color: blue;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
          <h1 class={headerClass2}>Hello2!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1><h1 class="css-2458908649">Hello2!</h1>'
      )
    })

    it('Should render CSS with variable', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${"I'm a variable!"}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-4027435072{background-color:blue;content:\'I\\\'m a variable!\'}</style><h1 class="css-4027435072">Hello!</h1>'
      )
    })

    it('Should escape </style>', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${'</style>'}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-372954897{background-color:blue;content:\'<\\/style>\'}</style><h1 class="css-372954897">Hello!</h1>'
      )
    })

    it('Should not escape URL', async () => {
      const headerClass = css`
        background-color: blue;
        background: url('${'http://www.example.com/path/to/file.jpg'}');
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1321888780{background-color:blue;background:url(\'http://www.example.com/path/to/file.jpg\')}</style><h1 class="css-1321888780">Hello!</h1>'
      )
    })

    it('Should render CSS with escaped variable', async () => {
      const headerClass = css`
        background-color: blue;
        content: '${rawCssString('say "Hello!"')}';
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2238574885{background-color:blue;content:\'say "Hello!"\'}</style><h1 class="css-2238574885">Hello!</h1>'
      )
    })

    it('Should render CSS with number', async () => {
      const headerClass = css`
        background-color: blue;
        font-size: ${1}rem;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1847536026{background-color:blue;font-size:1rem}</style><h1 class="css-1847536026">Hello!</h1>'
      )
    })

    it('Should render CSS with array', async () => {
      const animation = keyframes`
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      `
      const headerClass = css`
        background-color: blue;
        animation: ${animation} 1s ease-in-out;
      `
      const extendedHeaderClass = css`
        ${headerClass}
        color: red;
      `
      const template = (
        <>
          <Style />
          <h1 class={extendedHeaderClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-2558359670{background-color:blue;animation:css-9294673 1s ease-in-out;color:red}@keyframes css-9294673{from{opacity:0}to{opacity:1}}</style><h1 class="css-2558359670">Hello!</h1>'
      )
    })

    it.runIf(support.nest)(
      'Should be used as a class name for syntax `${className} {`',
      async () => {
        const headerClass = css`
          font-weight: bold;
        `
        const containerClass = css`
          ${headerClass} {
            h1 {
              color: red;
            }
          }
        `
        const template = (
          <>
            <Style />
            <div class={containerClass}>
              <h1 class={headerClass}>Hello!</h1>
            </div>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-4220297002{.css-1032195302{h1{color:red}}}.css-1032195302{font-weight:bold}</style><div class="css-4220297002"><h1 class="css-1032195302">Hello!</h1></div>'
        )
      }
    )

    it('Should be inserted to global if style string starts with :-hono-root', async () => {
      const globalClass = css`
        :-hono-global {
          html {
            color: red;
          }
          body {
            display: flex;
          }
        }
      `
      const template = (
        <>
          <Style />
          <div class={globalClass}>
            <h1>Hello!</h1>
          </div>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">html{color:red}body{display:flex}</style><div class=""><h1>Hello!</h1></div>'
      )
    })

    it.runIf(support.nest)(
      'Should be inserted to global if style string starts with :-hono-root and extends class name',
      async () => {
        const headerClass = css`
          display: flex;
        `
        const specialHeaderClass = css`
          :-hono-global {
            ${headerClass} {
              h1 {
                color: red;
              }
            }
          }
        `
        const template = (
          <>
            <Style />
            <div class={specialHeaderClass}>
              <h1>Hello!</h1>
            </div>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-3980466870{h1{color:red}}.css-3980466870{display:flex}</style><div class="css-3980466870"><h1>Hello!</h1></div>'
        )
      }
    )

    it('Should be inserted as global css if passed css`` to Style component', async () => {
      const headerClass = css`
        font-size: 1rem;
      `
      const template = (
        <>
          <Style>{css`
            html {
              color: red;
            }
            body {
              display: flex;
            }
          `}</Style>
          <div>
            <h1 class={headerClass}>Hello!</h1>
          </div>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">html{color:red}body{display:flex}.css-1740067317{font-size:1rem}</style><div><h1 class="css-1740067317">Hello!</h1></div>'
      )
    })

    it('Should be ignored :-hono-root inside Style component', async () => {
      const headerClass = css`
        font-size: 1rem;
      `
      const template = (
        <>
          <Style>{css`
            :-hono-global {
              html {
                color: red;
              }
              body {
                display: flex;
              }
            }
          `}</Style>
          <div>
            <h1 class={headerClass}>Hello!</h1>
          </div>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">html{color:red}body{display:flex}.css-1740067317{font-size:1rem}</style><div><h1 class="css-1740067317">Hello!</h1></div>'
      )
    })

    describe('viewTransition', () => {
      it('Should render CSS with unique view-transition-name', async () => {
        const transition = viewTransition()
        const template = (
          <>
            <Style />
            <h1 class={transition}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-1644952339{view-transition-name:css-1644952339}</style><h1 class="css-1644952339">Hello!</h1>'
        )
      })

      it('Should render CSS with css and keyframes', async () => {
        const kf = keyframes`
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      `
        const transition = viewTransition(css`
          ::view-transition-old() {
            animation-name: ${kf};
          }
          ::view-transition-new() {
            animation-name: ${kf};
          }
        `)
        const headerClass = css`
          ${transition}
          background-color: blue;
        `
        const template = (
          <>
            <Style />
            <h1 class={headerClass}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-1245070278{view-transition-name:css-399742870;background-color:blue}@keyframes css-9294673{from{opacity:0}to{opacity:1}}::view-transition-old(css-399742870){animation-name:css-9294673}::view-transition-new(css-399742870){animation-name:css-9294673}</style><h1 class="css-1245070278">Hello!</h1>'
        )
      })

      it('Should works as a template tag function', async () => {
        const kf = keyframes`
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      `
        const transition = viewTransition`
          ::view-transition-old() {
            animation-name: ${kf};
          }
          ::view-transition-new() {
            animation-name: ${kf};
          }
        `
        const headerClass = css`
          ${transition}
          background-color: blue;
        `
        const template = (
          <>
            <Style />
            <h1 class={headerClass}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-1245070278{view-transition-name:css-399742870;background-color:blue}@keyframes css-9294673{from{opacity:0}to{opacity:1}}::view-transition-old(css-399742870){animation-name:css-9294673}::view-transition-new(css-399742870){animation-name:css-9294673}</style><h1 class="css-1245070278">Hello!</h1>'
        )
      })
    })

    it.runIf(support.nest)('Should render sub CSS with keyframe', async () => {
      const headerClass = css`
        background-color: blue;
        ${[1, 2].map(
          (i) =>
            css`
              :nth-child(${i}) {
                color: red;
              }
            `
        )}
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClass}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-1539881271{background-color:blue;:nth-child(1){color:red}:nth-child(2){color:red}}</style><h1 class="css-1539881271">Hello!</h1>'
      )
    })

    it('Should be generated deferent class name for deferent first line comment even if the content is the same', async () => {
      const headerClassA = css`
        /* class A */
        display: flex;
      `
      const headerClassB = css`
        /* class B */
        display: flex;
      `
      const template = (
        <>
          <Style />
          <h1 class={headerClassA}>Hello!</h1>
          <h1 class={headerClassB}>Hello!</h1>
        </>
      )
      expect(await toString(template)).toBe(
        '<style id="hono-css">.css-3170754153{display:flex}.css-896513246{display:flex}</style><h1 class="css-3170754153">Hello!</h1><h1 class="css-896513246">Hello!</h1>'
      )
    })

    describe('Booleans, Null, and Undefined Are Ignored', () => {
      it.each([true, false, undefined, null])('%s', async (value) => {
        const headerClass = css`
          ${value}
          background-color: blue;
        `
        const template = (
          <>
            <Style />
            <h1 class={headerClass}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-2458908649{background-color:blue}</style><h1 class="css-2458908649">Hello!</h1>'
        )
      })

      it('falsy value', async () => {
        const value = 0
        const headerClass = css`
          padding: ${value};
        `
        const template = (
          <>
            <Style />
            <h1 class={headerClass}>Hello!</h1>
          </>
        )
        expect(await toString(template)).toBe(
          '<style id="hono-css">.css-478287868{padding:0}</style><h1 class="css-478287868">Hello!</h1>'
        )
      })
    })
  })
}
