export const normalizeIntrinsicElementProps = (props: Record<string, unknown>): void => {
  if (props && 'className' in props) {
    props['class'] = props['className']
    delete props['className']
  }
}

export const styleObjectForEach = (
  style: Record<string, string>,
  fn: (key: string, value: string | null) => void
): void => {
  for (const [k, v] of Object.entries(style)) {
    fn(
      k[0] === '-'
        ? k // CSS variable
        : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), // style property. convert to kebab-case
      v == null ? null : typeof v === 'number' ? v + 'px' : (v as string)
    )
  }
}
