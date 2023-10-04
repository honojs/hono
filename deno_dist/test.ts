export type Expect<T extends true> = T
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false

type Handler<T> = (c: Context<T>) => void
type Handlers<T extends unknown[] | []> = T extends [...infer U, ...infer V]
  ? U extends Handler<infer W>[]
    ? V extends Handler<unknown>[]
      ? [...Handler<W>[], ...Handlers<Handler<W>[] & V[]>]
      : V extends Handler<infer X>[]
        ? [...Handler<W>[], ...Handlers<Handler<W & X>[]>]
        : []
    : []
  : never

class App {
  post<T>(path: string, ...handlers: Handlers<Handler<T>[]>): void {
    'foo'
  }
}

class Context<T> {
  constructor() {
    this.getValidatedData = () => {
      return '' as T
    }
  }
  getValidatedData: () => T
}

const validator = <T>(validatorFunc: () => T): Handler<T> => {
  return () => {}
}

const app = new App()

// simple pattern
app.post(
  '/',
  validator(() => {
    return {
      title: 'Hello!',
    }
  }),
  (c) => {
    const data = c.getValidatedData()
    type verify = Expect<Equal<typeof data, { title: string }>>
  },
)

// complex pattern
app.post(
  '/',
  validator(() => {
    return {
      id: 123,
    }
  }),
  (c) => {
    const data = c.getValidatedData()
    type verify = Expect<Equal<typeof data, { id: number }>>
  },
  validator(() => {
    return {
      title: 'Hello!',
    }
  }),
  (c) => {
    const data = c.getValidatedData() // get validated result
    const { id, title } = data // id is `number`, title is `string`,
    type verify = Expect<Equal<typeof id, number>>
    type verify2 = Expect<Equal<typeof title, string>>
  }
)
