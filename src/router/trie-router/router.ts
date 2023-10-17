import type { Result, Router } from '../../router'
import { checkOptionalParameter } from '../../utils/url'
import { Node } from './node'

export class TrieRouter<T> implements Router<T> {
  name: string = 'TrieRouter'
  node: Node<T>

  constructor() {
    this.node = new Node()
  }

  add(method: string, path: string, handler: T) {
    const results = checkOptionalParameter(path)
    if (results) {
      for (const p of results) {
        this.node.insert(method, p, handler)
      }
      return
    }

    this.node.insert(method, path, handler)
  }

  match(method: string, path: string): Result<T> {
    return this.node.search(method, path)
  }
}
