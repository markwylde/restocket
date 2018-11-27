const http = require('http')
const pathToRegexp = require('path-to-regexp')
const querystring = require('querystring')

const flatten = (fns, fn) => {
  function _flatten (arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? _flatten(toFlatten) : toFlatten)
    }, [])
  }

  _flatten([fns])
    .forEach(el => fn(el))
}

function RestocketServer () {
  this.middleware = []

  this.use = (fns) =>
    flatten(fns, fn => {
      this.middleware = this.middleware.concat(fn.middleware)
    })

  this.onSocketConnected = (fns) =>
    flatten(fns, fn =>
      this.middleware.push(['CONNECT', undefined, fn]))

  this.onSocketDisconnected = (fns) =>
    flatten(fns, fn =>
      this.middleware.push(['DISCONNECT', undefined, fn]))

  this.all = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['ALL', route, fn])
    })

  this.get = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['GET', route, fn])
    })

  this.put = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['PUT', route, fn])
    })

  this.post = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['POST', route, fn])
    })

  this.patch = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['PATCH', route, fn])
    })

  this.delete = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['DELETE', route, fn])
    })

  this.subscribe = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['SUB', route, fn])
    })

  this.unsubscribe = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['UNSUB', route, fn])
    })

  this.executeRequest = (req, res, { method, route, query, headers, body, socket }) => {
    if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'SUB', 'UNSUB'].find(el => method)) {
      console.log(`method [${method}] not allowed`)
      return
    }

    const middleware = this.middleware
      .filter(mw => mw[0] === method)

    let found = false
    middleware
      .forEach(mw => {
        let keys = []
        const re = pathToRegexp(mw[1], keys)
        const paramsRaw = re.exec(route)

        if (paramsRaw) {
          found = true
          paramsRaw.shift()
          const params = paramsRaw.reduce((prev, cur, idx) => {
            prev[keys[idx].name] = cur
            return prev
          }, {})

          mw[2](Object.assign({}, req, {
            method,
            route,
            params,
            headers,
            query,
            body
          }), Object.assign({}, res, {
            send: function (message) {
              socket.emit(['RESP', { _cid: headers._cid }, message])
            },
            emit: function (message) {
              socket.emit(message)
            }
          }))
        }
      })

    if (!found) {
      console.log('no router found for: ', { method, route, query })
      socket.emit(['RESP', { _cid: headers._cid }, {
        status: 404,
        error: {
          code: 'NOT_FOUND',
          friendly: 'Route could not be found'
        }
      }])
    }
  }

  this.start = function (opts) {
    return new Promise((resolve, reject) => {
      opts = Object.assign({
        port: 80,
        host: '0.0.0.0'
      }, opts)

      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('http not implemented')
      })

      const io = require('socket.io')(server)
      io.on('connection', (socket) => {
        const req = {
          socket,
          state: {}
        }

        const res = {
          send: function (message) {
            socket.emit(message)
          }
        }

        this.middleware
          .filter(mw => mw[0] === 'CONNECT')
          .forEach(mw =>
            mw[2](req, res)
          )

        socket.on('disconnect', () => {
          this.middleware
            .filter(mw => mw[0] === 'DISCONNECT')
            .forEach(mw =>
              mw[2](req, res)
            )
        })

        socket.use((socketRequest, next) => {
          const [method, url, headers, body] = socketRequest[0]

          let [route, query] = url.split('?')
          query = querystring.parse(query)

          this.executeRequest(req, res, { method, route, query, headers, body, socket })
        })
      })

      server.listen(opts.port, opts.host, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}

module.exports = RestocketServer
