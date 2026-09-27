// Summarize NDJSON results produced by `HONO_JSON=1 bench.mts`.
// Usage: bun summarize.mts <results.ndjson> <base-label>
import { readFileSync } from 'node:fs'

const [file, baseLabel = 'base'] = process.argv.slice(2)

type Stats = { avg: number; min: number; p75: number }
type Line = { label: string; cases: Record<string, Stats> }

const lines: Line[] = readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))

// case name -> label -> avg per round
const byCase = new Map<string, Map<string, number[]>>()
for (const line of lines) {
  for (const [name, stats] of Object.entries(line.cases)) {
    const byLabel = byCase.get(name) ?? new Map<string, number[]>()
    byCase.set(name, byLabel)
    const avgs = byLabel.get(line.label) ?? []
    byLabel.set(line.label, avgs)
    avgs.push(stats.avg)
  }
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const fmt = (ns: number): string =>
  ns >= 1000 ? `${(ns / 1000).toFixed(2)} µs` : `${ns.toFixed(2)} ns`

for (const [name, byLabel] of byCase) {
  console.log(`• ${name}`)
  for (const [label, avgs] of byLabel) {
    const rounds = avgs.map(fmt).join(', ')
    console.log(`  ${label.padEnd(16)} median ${fmt(median(avgs)).padStart(10)}  rounds: [${rounds}]`)
  }
  const dev = byLabel.get('dev')
  const base = byLabel.get(baseLabel)
  if (dev && base) {
    const ratio = median(base) / median(dev)
    const [verb, x] = ratio >= 1 ? ['faster', ratio] : ['slower', 1 / ratio]
    console.log(`  summary: dev is ${x.toFixed(2)}x ${verb} than ${baseLabel} (median of round avgs)`)
  }
  console.log('')
}
