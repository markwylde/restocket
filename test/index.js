import test from 'basictap';
import { RestocketServer, RestocketClient, RestocketRouter } from '../index.js';

test('simple server works', async t => {
  t.plan(4);

  const server = new RestocketServer();

  server.onSocketConnected(function (req, res) {
    t.pass('onSocketConnected was called');
  });

  server.get('/hello/:name', function (req, res) {
    res.send({ message: `Hello ${req.params.name}` });
  });

  const routes = new RestocketRouter();
  routes.get('/goodbye/:name', function (req, res) {
    res.send({ message: `Goodbye ${req.params.name}` });
  });

  server.use(routes);

  await server.start({
    port: 3000
  });

  t.pass('server started listening');

  const client = new RestocketClient({
    host: 'http://0.0.0.0:3000'
  });

  const helloResult = await client.get('/hello/tester');
  t.deepEqual(helloResult, { body: { message: 'Hello tester' }, headers: { _cid: 0 } }, 'top level route worked');

  const goodbyeResult = await client.get('/goodbye/tester');
  t.deepEqual(goodbyeResult, { body: { message: 'Goodbye tester' }, headers: { _cid: 1 } }, 'router worked');

  client.close();
  server.close();
});
