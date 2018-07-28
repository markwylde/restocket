import io from 'socket.io-client'
import wildcard from 'socketio-wildcard'
const patch = wildcard(io.Manager)

export default class RestocketClient {
  constructor () {
    this.emitCount = 0

    this.socket = io('http://localhost:3000', {
      transports: ['websocket']
    })

    patch(this.socket)
  }

  waitForMessage (correlationId) {
    return new Promise((resolve, reject) => {
      const watcher = (message) => {
        const headers = message.data[0][1]
        const body = message.data[0][2]

        if (headers._cid === correlationId) {
          this.socket.removeListener('*', watcher)
          resolve({body, headers})
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
