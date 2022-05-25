import type { Result, Router } from '../../router'
import { Node } from './node'

export class TrieRouter<T> implements Router<T> {
  node: Node<T>

  constructor() {
    this.node = new Node()
  }

  add(method: string, path: string, handler: T) {
    this.node.insert(method, path, handler)
  }

  match(method: string, path: string): Result<T> {
    return this.node.search(method, path)
  }
}
