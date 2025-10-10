import { run, group, bench } from 'mitata'

const arr = new Array(100000).fill(Math.random())

bench('noop', () => {})

group('loop', () => {
  bench('map', () => {
    const newArr = []
    arr.map((e) => {
      newArr.push(e)
    })
  })

  bench('forEach', () => {
    const newArr = []
    arr.forEach((e) => {
      newArr.push(e)
    })
  })

  bench('for of', () => {
    const newArr = []
    for (const e of arr) {
      newArr.push(e)
    }
  })

  bench('for', () => {
    const newArr = []
    for (let i = 0; i < arr.length; i++) {
      newArr.push(arr[i])
    }
  })
})

run()
