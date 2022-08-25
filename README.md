# Restocket
This library allows you to build API's like in Express, but that also expose a websocket and http(s) endpoint.

## Example Usage
### Server Side
```javascript
import { RestocketServer, RestocketRouter } from 'restocket';
const server = new RestocketServer()

// Receive an event when a client connects via websocket
server.onSocketConnected(function (req, res) {
  console.log('Websocket is connected...')
})

// Add a new route
server.get('/hello/:name', function (req, res) {
  res.send({ message: `Hello ${req.params.name}` })
})

// You can also use other Restocket instances
const routes = new RestocketRouter()
routes.get('/goodbye/:name', function (req, res) {
  res.send({ message: `Goodbye ${req.params.name}` })
})

server.use(routes)

// Start the websocket and http instance
await server.start({
  port: 3000
})

console.log('Listening')
```

### Client Side
```javascript
import { RestocketClient } from 'restocket';

const api = new RestocketClient({
  host: '127.0.0.1:3000'
})

const result = await api.get('/hello/tester')
console.log(result)
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
