import type { Result, Router } from '../../router'
import { checkOptionalRoute } from '../../utils/url'
import { Node } from './node'

export class TrieRouter<T> implements Router<T> {
  node: Node<T>

  constructor() {
    this.node = new Node()
  }

  add(method: string, path: string, handler: T) {
    const results = checkOptionalRoute(path)
    if (results) {
      for (const p of results) {
        this.node.insert(method, p, handler)
      }
      return
    }

    this.node.insert(method, path, handler)
  }

  match(method: string, path: string): Result<T> | null {
    return this.node.search(method, path)
  }
}
