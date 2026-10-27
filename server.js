// El servidor local y Passenger comparten la misma aplicación y controles.
require('dotenv').config();
const app = require('./app');
const WebSocket = require('ws');
const PORT = process.env.PORT || process.env.NODE_PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
  console.log(`📁 Archivos servidos desde: ${__dirname}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
  console.log(`🗄️ Init DB: http://localhost:${PORT}/api/init-db`);
});

const wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket conectado');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      switch (data.tipo) {
        case 'registro_usuario':
          require('./usuarios-activos').agregarUsuario(data.usuario, ws);
          console.log(`👤 Usuario ${data.usuario?.nombre || 'desconocido'} activo`);
          break;
        case 'ping':
          require('./usuarios-activos').actualizarActividad(data.usuarioId);
          ws.send(JSON.stringify({ tipo: 'pong', timestamp: new Date() }));
          break;
        case 'obtener_usuarios_activos':
          ws.send(JSON.stringify({
            tipo: 'usuarios_activos',
            data: require('./usuarios-activos').obtenerUsuariosActivos(),
            timestamp: new Date()
          }));
          break;
        default:
          console.log('📨 WS tipo desconocido:', data.tipo);
      }
    } catch (e) {
      console.error('❌ WS error parseando mensaje:', e);
    }
  });

  ws.on('close', () => console.log('🔌 WS desconectado'));
  ws.on('error', (e) => console.error('❌ WS error:', e));
});
