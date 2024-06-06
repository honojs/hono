/**
 * Normalizes intrinsic element properties by converting JSX element properties
 * to their corresponding HTML attributes.
 *
 * @param props - JSX element properties.
 */
export const normalizeIntrinsicElementProps = (props: Record<string, unknown>): void => {
  if (props && 'className' in props) {
    props['class'] = props['className']
    delete props['className']
  }
  if (props && 'htmlFor' in props) {
    props['for'] = props['htmlFor']
    delete props['htmlFor']
  }
}

export const styleObjectForEach = (
  style: Record<string, string | number>,
  fn: (key: string, value: string | null) => void
): void => {
  for (const [k, v] of Object.entries(style)) {
    const key =
      k[0] === '-' || !/[A-Z]/.test(k)
        ? k // a CSS variable or a lowercase only property
        : k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`) // a camelCase property. convert to kebab-case
    fn(
      key,
      v == null
        ? null
        : typeof v === 'number'
        ? !key.match(
            /^(?:a|border-im|column(?:-c|s)|flex(?:$|-[^b])|grid-(?:ar|[^a])|font-w|li|or|sca|st|ta|wido|z)|ty$/
          )
          ? `${v}px`
          : `${v}`
        : v
    )
  }
}
