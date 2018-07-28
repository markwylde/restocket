# Restocket
This library allows you to build apis like in express, but that expose a websocket and http(s) endpoint.

## Example Usage
### Server Side
```javascript
const Restocket = require('restocket').RestocketServer
const server = new Restocket()

// Receive an event when a client connects via websocket
server.onSocketConnected(function (req, res) {
  console.log('Websocket is connected...')
})

// Add a new route
server.get('/hello/:name', function (req, res) {
  res.send({ message: `Hello ${name}` })
})

// You can also use other Restocket instances
const routes = new Restocket()
routes.get('/goodbye/:name', function (req, res) {
  res.send({ message: `Goodbye ${name}` })
})

server.use(routes)

// Start the websocket and http instance
server.start({
  port: 3000
}).then(() => {
  console.log('Listening')
})
```

### Client Side
```javascript
const Restocket = require('restocket').RestocketClient

const api = new Restocket({
  host: '127.0.0.1'
})

async function main () {
  const result = await opts.api.get('/hello/tester')
  console.log(result)
}

main()
```
