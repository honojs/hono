import type { Result, Router } from '../../router'
import { checkOptionalParameter } from '../../utils/url'
import { Node } from './node'

export class TrieRouter<T> implements Router<T> {
  name: string = 'TrieRouter'
  #node: Node<T> = new Node()

  add(method: string, path: string, handler: T) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler)
    }
  }

  match(method: string, path: string): Result<T> {
    return this.#node.search(method, path)
  }
}
