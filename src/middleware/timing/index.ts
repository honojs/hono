import type { TimingVariables } from './timing'
export { timing, setMetric, startTime, endTime } from './timing'
import '../../context'

declare module '../../context' {
  interface ContextVariableMap extends TimingVariables {}
}
