import io from 'socket.io-client'
import wildcard from 'socketio-wildcard'
import EventEmitter from 'wolfy87-eventemitter'

const patch = wildcard(io.Manager)

export default class RestocketClient {
  constructor (opts) {
    this.emitCount = 0

    this._eventEmitter = new EventEmitter()

    this.addEventListener = this._eventEmitter.addListener.bind(this._eventEmitter)
    this.removeEventListener = this._eventEmitter.addListener.bind(this._eventEmitter)

    this.socket = io(opts.host, {
      transports: ['websocket']
    })

    patch(this.socket)
  }

  waitForMessage (correlationId) {
    return new Promise((resolve, reject) => {
      const watcher = (message) => {
        if (message.data[0][0] === 'RESP') {
          const headers = message.data[0][1]
          const body = message.data[0][2]
          this.socket.removeListener('*', watcher)
          resolve({body, headers})
        } else {
          const method = message.data[0][0]
          const route = message.data[0][1]
          const headers = message.data[0][2]
          const body = message.data[0][3]
          this._eventEmitter.emit('message', {method, route, body, headers})
        }
      }
      this.socket.on('*', watcher)
    })
  }

  async get (path) {
    const cid = this.emitCount++
    const wait = this.waitForMessage(cid)

    this.socket.emit(['GET', path, {_cid: cid}])

    return wait
  }

  async post (path, body) {
    const cid = this.emitCount++
    const wait = this.waitForMessage(cid)

    this.socket.emit(['POST', path, {_cid: cid}, body])

    return wait
  }
}
