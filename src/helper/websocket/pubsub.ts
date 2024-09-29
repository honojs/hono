export class WSPubSub<T extends WebSocket = WebSocket> {
    _topics: {[key in string]: Set<T>}
    constructor() {
        this._topics = {}
    }
    subscribe(topic: string, ws: T):void {
        this._topics[topic].add(ws)
    }
    unsubscribe(topic: string, ws: T): void {
        this._topics[topic].delete(ws)
    }
    publish(topic: string, message: string | ArrayBufferLike | ArrayBufferView) {
        for (const ws of this._topics[topic]) {
            ws.send(message)
        }
    }
}