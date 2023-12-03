import { h, Fragment, renderSSR } from 'nano-jsx'
import { buildPage } from './page'

export const render = () => renderSSR(buildPage({ jsx: h, Fragment }))