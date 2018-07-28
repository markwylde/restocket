# Restocket
This library allows you to build apis like in express, but that expose a websocket and http(s) endpoint.

## Example Usage
### Server Side
```javascript
const {RestocketServer} = require('restocket')
const server = new RestocketServer()

// Receive an event when a client connects via websocket
server.onSocketConnected(function (req, res) {
  console.log('Websocket is connected...')
})

// Add a new route
server.get('/hello/:name', function (req, res) {
  res.send({ message: `Hello ${name}` })
})

// You can also use other Restocket instances
const {RestocketRouter} = require('restocket')
const routes = new RestocketRouter()
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
const {RestocketClient} = require('restocket')

const api = new RestocketClient({
  host: '127.0.0.1'
})

async function main () {
  const result = await opts.api.get('/hello/tester')
  console.log(result)
}

main()
```

## How it works
In the above example the endpoints `/hello/:name` and `/goodbye/:name` have been created on the websocket and http servers.

You can make a HTTP request to http://127.0.0.1/hello/tester as you would normally in express.

You can make a websocket request to ws://127.0.0.1 with the following data:
```json
// string Method, string Path, optional object Headers, optional any Body
["GET", "/hello/tester"]
```

### Correlation ID
Unlike http requests, websocket queries do not respond one for one. Or at least there is no built in way to related a request with a response.

If you pass a `_cid` header with your request, the response from the server will also contain the same correlation id in the header.

For example:

1. Send the following to the websocket
```javascript
["GET", "/hello/tester", { "_cid": 1 }]
```

2. Receive the following from the server
```javascript
["RESP", { "_cid": 1 }, { "message": "Hello tester" }]
```

#### Using RestocketClient
The above is a low level description of using the websocket api directly. However if you use the RestocketClient this is hidden from you in the form of promises.
