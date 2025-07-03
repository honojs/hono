import * as readline from 'node:readline'

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })
  const tsImplLabel = process.env['BENCHMARK_TS_IMPL_LABEL']
  if (!tsImplLabel) {
    throw new Error('BENCHMARK_TS_IMPL_LABEL must be set')
  }

  const toKebabCase = (str: string): string => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_\/]+/g, '-')
      .toLowerCase()
  }
  const metrics = []
  for await (const line of rl) {
    if (!line || line.trim() === '') {
      continue
    }
    const [name, value] = line.split(':')
    const unitMatch = value?.trim().match(/^(\d+(\.\d+)?)([a-zA-Z]*)$/)
    if (unitMatch) {
      const [, number, , unit] = unitMatch
      metrics.push({
        key: toKebabCase(name?.trim()),
        name: name?.trim(),
        value: parseFloat(number),
        unit: unit || undefined,
      })
    } else {
      metrics.push({
        key: toKebabCase(name?.trim()),
        name: name?.trim(),
        value: parseFloat(value?.trim()),
      })
    }
  }
  const benchmark = {
    key: `diagnostics-${toKebabCase(tsImplLabel)}`,
    name: `Compiler Diagnostics (${tsImplLabel})`,
    metrics,
  }
  console.log(JSON.stringify(benchmark, null, 2))
}

main()
