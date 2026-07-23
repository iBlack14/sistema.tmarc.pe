#!/usr/bin/env node

/**
 * app.js - Punto de entrada para cPanel/Passenger
 * Este archivo exporta la aplicación Express sin iniciar el servidor automáticamente
 * Passenger manejará el inicio del servidor
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Rutas / servicios internos
const { inicializarBaseDatos } = require('./database-config');
const apiRoutes = require('./routes/api');
const passwordRecovery = require('./routes/password-recovery');

// === SMTP: manager + servicio ===
const smtpConfigManager = require('./smtp-config-manager');
const smtpServiceModule = require('./smtp-service');
const smtpService = (typeof smtpServiceModule === 'function')
  ? new smtpServiceModule()
  : smtpServiceModule;

// === Verificación de IP de salida ===
require('https').get('https://api.ipify.org', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log('🌐 [SISTEMA] IP de salida detectada:', data));
});

// === Ruta de descarga segura ===
const downloadRoutes = require('./routes/download');

// -------------------------------------------------------------------
// App
// -------------------------------------------------------------------
const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || process.env.NODE_PORT || 3002;

// -------------------------------------------------------------------
// Middlewares de Seguridad
// -------------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path.match(/\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$/i);
  }
});

app.use('/api/', limiter);

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: { error: 'Demasiados intentos de login, intenta en 10 minutos' },
  skipSuccessfulRequests: true
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

app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// -------------------------------------------------------------------
// Archivos estáticos
// -------------------------------------------------------------------
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/templates', express.static(path.join(__dirname, 'templates')));

const STATIC_DIR = fs.existsSync(path.join(__dirname, 'public', 'login.html'))
  ? path.join(__dirname, 'public')
  : __dirname;

app.use(express.static(STATIC_DIR, {
  index: false,
  extensions: ['html', 'htm'],
  maxAge: '1h',
}));

// Ruta raíz
app.get('/', (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

// Rutas específicas para login
app.get(['/login', '/login.html'], (_req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'login.html'));
});

// -------------------------------------------------------------------
// Salud y diagnóstico
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
    env: process.env.NODE_ENV || 'production'
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
app.use('/api/download', downloadRoutes);
app.use('/api', apiRoutes);

// Inicializar BD manualmente
app.get('/api/init-db', async (_req, res) => {
  try {
    await inicializarBaseDatos();
    res.json({ success: true, message: 'Base de datos inicializada correctamente' });
  } catch (error) {
    console.error('Error init-db:', error);
    res.status(500).json({ error: 'Error inicializando base de datos', details: String(error.message || error) });
  }
});

// Inicializar usuarios de prueba
app.post('/api/init-test-users', async (_req, res) => {
  try {
    const UsuarioModel = require('./models/usuario-model');
    const bcrypt = require('bcrypt');

    const existingUser = await UsuarioModel.obtenerPorUsernameOEmail('demo');
    if (existingUser) {
      return res.json({
        success: true,
        message: 'Usuarios de prueba ya existen',
        data: {
          admin: { username: 'admin', email: 'admin@sistema.gov' },
          demo: { username: 'demo', email: 'demo@ejemplo.com' }
        }
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('demo123', saltRounds);

    const { query } = require('./database-config');
    await query(`
      INSERT INTO usuarios (username, email, password, nombre, tipo)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE password = VALUES(password)
    `, ['demo', 'demo@ejemplo.com', hashedPassword, 'Usuario Demo', 'usuario']);

    console.log('✅ Usuarios de prueba inicializados');

    res.json({
      success: true,
      message: 'Usuarios de prueba inicializados correctamente',
      data: {
        demo: {
          username: 'demo',
          email: 'demo@ejemplo.com',
          password: 'demo123',
          nombre: 'Usuario Demo',
          tipo: 'usuario'
        }
      }
    });
  } catch (error) {
    console.error('Error inicializando usuarios de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// --- ENDPOINTS SMTP -------------------------------------------------
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
// 404 handlers
// -------------------------------------------------------------------
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

app.use((req, res) => {
  const notFoundFile = path.join(STATIC_DIR, '404.html');
  if (fs.existsSync(notFoundFile)) return res.status(404).sendFile(notFoundFile);
  res.status(404).send('404 Not Found');
});

// -------------------------------------------------------------------
// Manejadores de error
// -------------------------------------------------------------------
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    console.error('MULTER ERROR:', {
      code: err.code,
      field: err.field,
      message: err.message
    });
    return res
      .status(400)
      .json({ success:false, where:'multer', code: err.code, message: err.message });
  }

  const isApi = req.path && req.path.startsWith('/api');

  console.error('API error:', {
    message: err?.message,
    code: err?.code,
    errno: err?.errno
  });

  if (isApi) {
    return res.status(500).json({
      success: false,
      where: 'server',
      message: err?.message || 'server_error',
      code: err?.code || null
    });
  }

  res.status(500).send('500 Internal Server Error');
});

// -------------------------------------------------------------------
// Inicialización (solo servicios, NO servidor HTTP)
// -------------------------------------------------------------------
async function inicializarServicios() {
  try {
    await inicializarBaseDatos();
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('❌ Error iniciando base de datos:', error);
    console.log('⚠️ Puedes llamar /api/init-db manualmente');
  }

  try {
    let configSMTP = null;
    if (process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL) {
      configSMTP = {
        server: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465', 10),
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        ssl_enabled: String(process.env.SMTP_SSL_ENABLED).toLowerCase() === 'true',
        use_auth: String(process.env.SMTP_USE_AUTH).toLowerCase() !== 'false',
        require_tls: String(process.env.SMTP_REQUIRE_TLS).toLowerCase() !== 'false',
        fromEmail: process.env.SMTP_FROM_EMAIL,
        fromName: process.env.SMTP_FROM_NAME || 'Sistema Mesa de Partes Virtual',
        activo: true
      };
      console.log('📧 SMTP cargado desde variables de entorno');
    }

    const guardada = smtpConfigManager.obtenerConfig();
    if (!configSMTP && guardada && guardada.activo) {
      configSMTP = guardada;
      console.log('📧 SMTP cargado desde configuración guardada');
    }

    if (configSMTP && configSMTP.activo) {
      smtpConfigManager.guardarConfig(configSMTP);

      const rCfg = (typeof smtpService?.configurar === 'function')
        ? smtpService.configurar(configSMTP)
        : { success:true };

      if (!rCfg?.success) {
        console.log('⚠️ Error configurando SMTP:', rCfg?.message || 'desconocido');
      } else {
        console.log('✅ Servicio SMTP configurado');
      }

      if (typeof smtpConfigManager.setSMTPService === 'function') {
        smtpConfigManager.setSMTPService(smtpService);
      }
    } else {
      console.log('ℹ️ SMTP no configurado');
    }

    console.log('✅ Servicios inicializados');
  } catch (e) {
    console.error('❌ Error configurando servicios:', e);
  }
}

// Inicializar servicios al cargar el módulo
inicializarServicios().catch(err => {
  console.error('Error fatal en inicialización:', err);
});

// Manejo de errores globales (solo log, no exit)
process.on('uncaughtException', (error) => {
  console.error('Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo no manejado:', reason);
});

// -------------------------------------------------------------------
// EXPORTAR LA APP (Passenger la usará)
// -------------------------------------------------------------------
module.exports = app;
