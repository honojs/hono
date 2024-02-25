import { createWSMessageEvent } from '.'

describe('`createWSMessageEvent`', () => {
    it('Should `createWSMessageEvent` is working for string', () => {
        const randomString = Math.random().toString()
        const event = createWSMessageEvent(randomString)

        expect(event.data).toBe(randomString)
    })
    it('Should `createWSMessageEvent` type is `message`', () => {
        const event = createWSMessageEvent('')
        expect(event.type).toBe('message')
    })
})