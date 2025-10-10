import { cpus } from 'node:os'
import type { WorkerInput, WorkerOutput } from './remove-private-fields-worker'

const workers = Array.from({ length: Math.ceil(cpus().length / 2) }).map(
  () => new Worker(`${import.meta.dirname}/remove-private-fields-worker.ts`, { type: 'module' })
)
let workerIndex = 0
let taskId = 0

export async function removePrivateFields(file: string): Promise<string> {
  const currentTaskId = taskId++
  const worker = workers[workerIndex]
  workerIndex = (workerIndex + 1) % workers.length

  return new Promise<string>((resolve, reject) => {
    const abortController = new AbortController()
    worker.addEventListener(
      'message',
      ({ data: { type, value, taskId } }: { data: WorkerOutput }) => {
        if (taskId === currentTaskId) {
          if (type === 'success') {
            resolve(value)
          } else {
            reject(value)
          }

          abortController.abort()
        }
      },
      { signal: abortController.signal }
    )
    worker.postMessage({ file, taskId: currentTaskId } satisfies WorkerInput)
  })
}

export function cleanupWorkers() {
  for (const worker of workers) {
    worker.terminate()
  }
}
