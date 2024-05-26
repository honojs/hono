import type { TimingVariables } from './timing'
export { TimingVariables }
export { timing, setMetric, startTime, endTime } from './timing'

declare module '../..' {
  interface ContextVariableMap extends TimingVariables {}
}
