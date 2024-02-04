export const normalizeIntrinsicElementProps = (props: Record<string, unknown>): void => {
  if (props && 'className' in props) {
    props['class'] = props['className']
    delete props['className']
  }
}
