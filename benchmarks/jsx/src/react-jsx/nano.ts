import { renderSSR } from 'nano-jsx'
import { buildPage } from './page-nano.tsx'

export const render = () => renderSSR(buildPage())