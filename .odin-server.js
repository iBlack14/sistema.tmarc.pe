const app = require('./app.js');
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log('[odisea] Server listening on ' + HOST + ':' + PORT);
});
server.on('error', (err) => {
  console.error('[odisea] Listen error:', err.message);
  process.exit(1);
});
