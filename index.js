const http = require('http')
const pathToRegexp = require('path-to-regexp')

const flatten = (fns, fn) => {
  function _flatten (arr) {
    return arr.reduce(function (flat, toFlatten) {
      return flat.concat(Array.isArray(toFlatten) ? _flatten(toFlatten) : toFlatten)
    }, [])
  }

  _flatten([fns])
    .forEach(el => fn(el))
}

function Restocket () {
  this.middleware = []

  this.use = (fns) =>
    flatten(fns, fn => {
      this.middleware = this.middleware.concat(fn.middleware)
    })

  this.onSocketConnected = (fns) =>
    flatten(fns, fn =>
      this.middleware.push(['CONNECT', undefined, fn]))

  this.all = (route, fns) =>
    flatten(fns, fn => {
      this.middleware.push(['ALL', route, fn])
    })

  this.GET = (route, fns) =>
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

  this.start = function (opts) {
    return new Promise((resolve, reject) => {
      opts = Object.assign({
        port: 80,
        host: '0.0.0.0'
      }, opts)

      const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('okay')
      })

      const io = require('socket.io')(server)
      io.on('connection', (socket) => {
        const state = {}
        this.middleware
          .filter(mw => mw[0] === 'CONNECT')
          .forEach(mw =>
            mw[2](Object.assign(socket, {state}), {
              send: function (message) {
                socket.emit(message)
              }
            })
          )
        socket.use((socketRequest, next) => {
          const [method, route, headers, body] = socketRequest[0]

          if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].find(el => method)) {
            console.log(`method [${method}] not allowed`)
            return
          }

          this.middleware
            .filter(mw => mw[0] === method)
            .forEach(mw => {
              let keys = []
              const re = pathToRegexp(mw[1], keys)
              const paramsRaw = re.exec(route)
              if (paramsRaw) {
                paramsRaw.shift()
                const params = paramsRaw.reduce((prev, cur, idx) => {
                  prev[keys[idx].name] = cur
                  return prev
                }, {})

                mw[2]({
                  method,
                  route,
                  params,
                  headers,
                  body
                }, {
                  send: function (message) {
                    socket.emit(['RESP', {_cid: headers._cid}, message])
                  }
                })
              }
            })
        })
      })

      server.listen(opts.port, opts.host, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}

module.exports = Restocket
