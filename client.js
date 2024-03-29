import io from 'socket.io-client';
import wildcard from 'socketio-wildcard';
import EventEmitter from 'events';

const patch = wildcard(io.Manager);

export default class RestocketClient {
  constructor (opts) {
    this.emitCount = 0;

    this._eventEmitter = new EventEmitter();

    this.addEventListener = this._eventEmitter.addListener.bind(this._eventEmitter);
    this.removeEventListener = this._eventEmitter.removeListener.bind(this._eventEmitter);

    this.socket = io(opts.host, {
      transports: ['websocket']
    });

    this.socket.on('*', (message) => {
      if (message.data[0][0] !== 'RESP') {
        const method = message.data[0][0];
        const route = message.data[0][1];
        const headers = message.data[0][2];
        const body = message.data[0][3];
        this._eventEmitter.emit('message', { method, route, body, headers });
      }
    });

    patch(this.socket);
  }

  close () {
    this.socket.close();
  }

  waitForMessage (correlationId) {
    return new Promise((resolve, reject) => {
      const watcher = (message) => {
        if (message.data[0][0] === 'RESP') {
          if (message.data[0][1]._cid === correlationId) {
            const headers = message.data[0][1];
            const body = message.data[0][2];
            this.socket.removeListener('*', watcher);
            resolve({ body, headers });
          }
        }
      };
      this.socket.on('*', watcher);
    });
  }

  waitForMessages (correlationId, fn) {
    const watcher = (message) => {
      if (Array.isArray(message.data[0])) {
        const headers = message.data[0][2];
        const body = message.data[0][3];

        if (headers && headers._cid === correlationId) {
          if (fn) {
            fn({
              method: message.data[0][0],
              path: message.data[0][1],
              headers,
              body
            });
          }
        }
      }
    };
    this.socket.on('*', watcher);
    return {
      unsubscribe: (cb) => {
        this.unsubscribe(correlationId, cb);
        this.socket.off('*', watcher);
      }
    };
  }

  async get (path) {
    const cid = this.emitCount++;
    const wait = this.waitForMessage(cid);

    this.socket.emit(['GET', path, { _cid: cid }]);

    return wait;
  }

  async post (path, body) {
    const cid = this.emitCount++;
    const wait = this.waitForMessage(cid);

    this.socket.emit(['POST', path, { _cid: cid }, body]);

    return wait;
  }

  async put (path, body) {
    const cid = this.emitCount++;
    const wait = this.waitForMessage(cid);

    this.socket.emit(['PUT', path, { _cid: cid }, body]);

    return wait;
  }

  async delete (path, body) {
    const cid = this.emitCount++;
    const wait = this.waitForMessage(cid);

    this.socket.emit(['DELETE', path, { _cid: cid }, body]);

    return wait;
  }

  async subscribe (path, body, cb) {
    const cid = this.emitCount++;
    const msgPromise = this.waitForMessage(cid);

    this.socket.emit(['SUB', path, { _cid: cid }, body]);

    const msg = await msgPromise;

    return Object.assign({}, msg, this.waitForMessages(cid, cb));
  }

  async unsubscribe (subscriptionCid) {
    const cid = this.emitCount++;
    const wait = this.waitForMessage(cid);

    this.socket.emit(['UNSUB', '/', { _cid: cid }, subscriptionCid]);

    return wait;
  }
}
