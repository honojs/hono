// Run from the repository root: bun benchmarks/jsx-dom/benchmark.ts
// Measures build() only, excluding JSX creation and DOM updates.
import { jsx } from '../../src/jsx/dom/jsx-runtime'
import type { NodeObject } from '../../src/jsx/dom/render'
import { build, buildNode } from '../../src/jsx/dom/render'

for (const size of [100, 1000, 5000]) {
  for (const kind of [
    'same-order',
    'remove-second',
    'adjacent-swap',
    'reverse',
    'reverse-unkeyed-footer',
  ]) {
    const ids = Array.from({ length: size }, (_, i) => i)
    const hasFooter = kind === 'reverse-unkeyed-footer'
    const createChildren = (ids: number[]) => {
      const children = ids.map((id) => jsx('p', {}, String(id)))
      if (hasFooter) {
        children.push(jsx('p', {}))
      }
      return children
    }
    const nextIds = [...ids]
    if (kind === 'remove-second') {
      nextIds.splice(1, 1)
    } else if (kind === 'adjacent-swap') {
      ;[nextIds[1], nextIds[2]] = [nextIds[2], nextIds[1]]
    } else if (kind.startsWith('reverse')) {
      nextIds.reverse()
    }
    const samples: number[] = []
    // Use fresh nodes in short batches instead of mixing long-lived node states.
    for (let batch = 0; batch < 5; batch++) {
      const parent = buildNode(jsx('div', { children: createChildren(ids) })) as NodeObject
      build([], parent)
      const initialChildren = parent.vC
      const update = (children: ReturnType<typeof createChildren>) => {
        parent.vC = initialChildren
        parent.props.children = children
        build([], parent)
      }
      for (let i = 0; i < 10; i++) {
        update(createChildren(nextIds))
      }
      const inputs = Array.from({ length: 20 }, () => createChildren(nextIds))
      const start = performance.now()
      for (const children of inputs) {
        update(children)
      }
      samples.push((performance.now() - start) / inputs.length)
      if (
        parent.vC.length !== nextIds.length + Number(hasFooter) ||
        parent.vC.some(
          (child, i) => child !== initialChildren[i < nextIds.length ? nextIds[i] : size]
        )
      ) {
        throw new Error('Unexpected child identity after update')
      }
    }
    samples.sort((a, b) => a - b)
    const ms = samples[Math.floor(samples.length / 2)]
    console.log(`${kind}, ${size} keyed children: ${ms.toFixed(3)} ms/build (median)`)
  }
}
