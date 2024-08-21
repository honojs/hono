/**
 * FS Adapter for Deno.
 * @module
 */

import { basename } from '../../helper/fs'
import type { CreateFS } from '../../helper/fs'
import { joinPaths } from '../../utils/filepath/join'

export const resolve = (path: string) => {
  const cwd = Deno.cwd()

  return joinPaths(cwd, path)
}

export const createFS: CreateFS = async (basePath: string) => {
  return {
    name: basename(basePath),
    kind: 'directory',
    isSameEntry(other) {

      return other.kind === 'directory' && 
    },
  }
}
