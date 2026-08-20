// server.js (versión corregida para cPanel/Passenger + SMTP)
require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');
const multer = require('multer');


// Rutas / servicios internos
const { inicializarBaseDatos } = require('./database-config'); // MySQL
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const passwordRecovery = require('./routes/password-recovery');

// === SMTP: manager + servicio ===
const smtpConfigManager = require('./smtp-config-manager');
const smtpServiceModule = require('./smtp-service');

// === Verificación de IP de salida ===
require('https').get('https://api.ipify.org', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('🌐 [SISTEMA] IP de salida detectada:', data));
});

// Si smtp-service exporta clase => instanciar; si exporta objeto => usar tal cual
const smtpService = (typeof smtpServiceModule === 'function')
  ? new smtpServiceModule()
  : smtpServiceModule;

// === Ruta de descarga segura ===
const downloadRoutes = require('./routes/download');

// -------------------------------------------------------------------
// App
// -------------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || process.env.NODE_PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';

// -------------------------------------------------------------------
// Middlewares de Seguridad
// -------------------------------------------------------------------
// Helmet: Protección de headers HTTP
app.use(helmet({
  contentSecurityPolicy: false, // Desactivar temporalmente para no romper el frontend
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting: Prevenir ataques de fuerza bruta
// Configuración más flexible para usuarios normales
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos (ventana más corta)
  max: 500, // 500 requests cada 5 minutos (más generoso)
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Excluir archivos estáticos del rate limit
    return req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i);
  }
});

// Aplicar rate limiting a todas las rutas de API
app.use('/api/', limiter);

// Rate limiting para login: balance entre seguridad y usabilidad
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 15, // 15 intentos cada 10 minutos (más razonable)
  message: { error: 'Demasiados intentos de login, intenta en 10 minutos' },
  skipSuccessfulRequests: true // No contar logins exitosos
});

app.use('/api/auth/login', loginLimiter);

// -------------------------------------------------------------------
// Middlewares base
// -------------------------------------------------------------------
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------------------------------------------------------
// Archivos estáticos (sirve login.html y todo el front)
// -------------------------------------------------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));

const STATIC_DIR = fs.existsSync(path.join(__dirname, 'public', 'login.html'))
  ? path.join(__dirname, 'public')
  : __dirname;

app.use(express.static(STATIC_DIR, {
  index: false,
  extensions: ['html', 'htm'],
  maxAge: 0, // Desactivar caché para desarrollo/corrección
}));

// Ruta raíz: Página de inicio con opciones
app.get('/', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// Rutas específicas para login
app.get(['/login', '/login.html'], (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'login.html'));
});

app.get(['/registrarse', '/registrarse.html'], (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'registrarse.html'));
});

// Rutas Premium para Administrador
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('/admin/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// Portal público de seguimiento (sin autenticación)
app.get('/seguimiento', (_req, res) => {
  res.sendFile(path.join(__dirname, 'seguimiento.html'));
});

// -------------------------------------------------------------------
// Salud y diagnóstico rápido
// -------------------------------------------------------------------
app.get('/api/healthz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/infoz', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    port: PORT,
    node: process.version,
    env: process.env.NODE_ENV || null
  });
});

// -------------------------------------------------------------------
// API real
// -------------------------------------------------------------------
app.use('/api', (req, _res, next) => { 
  console.log(`[API] ${req.method} ${req.path}`); 
  next(); 
});
app.use('/api/auth', passwordRecovery);
app.use('/api/auth', authRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api', apiRoutes);

// Inicializar BD manualmente (si lo necesitas)
app.get('/api/init-db', async (_req, res) => {
  try {
    await inicializarBaseDatos();
    res.json({ success: true, message: 'Base de datos inicializada correctamente' });
  } catch (error) {
    console.error('Error init-db:', error);
    res.status(500).json({ error: 'Error inicializando base de datos', details: String(error.message || error) });
  }
});

// --- ENDPOINTS SMTP -------------------------------------------------
// Estado/diagnóstico
app.get('/api/smtp/status', (_req, res) => {
  const cfg = smtpConfigManager.obtenerConfig();
  res.json({
    configuracion_activa: smtpConfigManager.hayConfiguracionValida(),
    server: cfg?.server || null,
    port: cfg?.port || null,
    ssl_enabled: !!cfg?.ssl_enabled,
    fromEmail: cfg?.fromEmail || null
  });
});

// Envío real desde el backend (lo llama tu frontend)
app.post('/api/email/credenciales', async (req, res) => {
  try {
    const r = await smtpConfigManager.enviarEmail(req.body);
    if (!r.success) return res.status(400).json(r);
    return res.json(r);
  } catch (e) {
    console.error('SMTP /credenciales error:', e);
    return res.status(500).json({ success:false, message:e.message || 'Error SMTP' });
  }
});

// Test rápido
app.post('/api/email/test', async (req, res) => {
  try {
    const r = await smtpConfigManager.enviarEmail({
      destinatario: req.body.to,
      asunto: 'Prueba SMTP',
      contenido: '<b>SMTP OK</b>',
      fechaEnvio: new Date().toISOString(),
      tipo: 'test'
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ success:false, message:e.message || 'Error SMTP' });
  }
});

// -------------------------------------------------------------------
// 404 JSON para /api
// -------------------------------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// 404 del front
app.use((req, res) => {
  const notFoundFile = path.join(STATIC_DIR, '404.html');
  if (fs.existsSync(notFoundFile)) return res.status(404).sendFile(notFoundFile);
  res.status(404).send('404 Not Found');
});

// -------------------------------------------------------------------
// -------------------------------------------------------------------
// Manejadores de error (para /api y front) — con soporte Multer/MySQL
// -------------------------------------------------------------------
app.use((err, req, res, _next) => {
  // 1) Errores de Multer (subida de archivos)
  if (err instanceof multer.MulterError) {
    console.error('MULTER ERROR:', {
      code: err.code,
      field: err.field,
      message: err.message,
      stack: err.stack
    });
    return res
      .status(400)
      .json({ success:false, where:'multer', code: err.code, message: err.message });
  }

  // 2) Errores de filtro de archivos (multer fileFilter — son Error normales, no MulterError)
  const fileFilterMessages = ['Solo se permiten archivos PDF', 'Solo se permiten archivos PDF, DOC', 'Solo se permiten archivos PDF, Word'];
  if (err && err.message && fileFilterMessages.some(msg => err.message.startsWith(msg))) {
    return res
      .status(400)
      .json({ success: false, where: 'file_filter', message: err.message });
  }

  // 3) Cualquier otro error
  const isApi = req.path && req.path.startsWith('/api');

  // Log completo en servidor
  console.error('API error:', {
    message: err?.message,
    code: err?.code,
    errno: err?.errno
  });

  if (isApi) {
    // DEVUELVE DETALLES ÚTILES para depurar el 500 desde Network > Response
    return res.status(500).json({
      success: false,
      where: 'server',
      message: err?.message || 'server_error',
      code: err?.code || null,        // ej. ER_NO_REFERENCED_ROW_2
      errno: err?.errno || null,      // ej. 1452
      sqlState: err?.sqlState || null,
      sqlMessage: err?.sqlMessage || null,
      sql: err?.sql || null           // la consulta que falló (si aplica)
    });
  }

  // Si no es /api, responde HTML simple
  res.status(500).send('500 Internal Server Error');
});


// -------------------------------------------------------------------
// Servidor HTTP + WebSocket
// -------------------------------------------------------------------
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

// -------------------------------------------------------------------
// Inicialización (DB + SMTP)
// -------------------------------------------------------------------
async function iniciarServidor() {
  try {
    await inicializarBaseDatos();
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error iniciando base de datos:', error);
    throw error;
  }

  try {
    // 1) Config desde .env
    let configSMTP = null;
    const useAuth = process.env.SMTP_USE_AUTH !== 'false';
    if (process.env.SMTP_HOST && (useAuth ? (process.env.SMTP_USER && process.env.SMTP_PASSWORD) : true)) {
      configSMTP = {
        server: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        ssl_enabled: String(process.env.SMTP_SSL_ENABLED).toLowerCase() === 'true',
        use_auth: useAuth,
        fromEmail: process.env.SMTP_FROM_EMAIL,
        fromName: process.env.SMTP_FROM_NAME || 'Sistema Mesa de Partes Virtual',
        activo: true
      };
      console.log(`📧 SMTP cargado desde .env (Auth: ${useAuth ? 'SI' : 'NO'})`);
    } else {
      console.log('ℹ️ Variables SMTP incompletas en .env; usando configuración guardada');
    }

    // 2) Si no hay en .env, toma lo guardado (localStorage/archivo según tu manager)
    const guardada = smtpConfigManager.obtenerConfig();
    if (!configSMTP && guardada && guardada.activo) {
      configSMTP = guardada;
      console.log('📧 SMTP cargado desde configuración guardada');
    }

    // 3) Si tenemos config, GUARDAR en manager e inyectar el servicio real
    if (configSMTP && configSMTP.activo) {
      // guarda dentro del manager para que hayConfiguracionValida() sea true
      smtpConfigManager.guardarConfig(configSMTP);

      // Configurar el servicio real (nodemailer) y enlazarlo al manager
      const rCfg = (typeof smtpService?.configurar === 'function')
        ? smtpService.configurar(configSMTP)
        : { success:true };

      if (!rCfg?.success) {
        console.log('⚠️ Error configurando el servicio SMTP:', rCfg?.message || 'desconocido');
      } else {
        console.log('✅ Servicio SMTP configurado');
      }

      if (typeof smtpConfigManager.setSMTPService === 'function') {
        smtpConfigManager.setSMTPService(smtpService);
      }
    } else {
      console.log('ℹ️ SMTP no configurado todavía.');
    }

    console.log('✅ Inicialización completa (sincrónica)');
  } catch (e) {
    console.error('❌ Error configurando SMTP/manager:', e);
  }
}

process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo no manejado:', reason);
});

iniciarServidor();
