export { jsxDEV as jsx, Fragment } from './jsx-dev-runtime.ts'
export { jsxDEV as jsxs } from './jsx-dev-runtime.ts'

import { raw, html } from '../helper/html/index.ts'
export { html as jsxTemplate }
export const jsxAttr = (name: string, value: string | Promise<string>) =>
  typeof value === 'string' ? raw(name + '="' + html`${value}` + '"') : html`${name}="${value}"`
export const jsxEscape = (value: string) => value
