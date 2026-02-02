import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    env: {
      NAME: 'Node',
    },
    globals: true,
    name: 'lambda-edge',
  },
})
