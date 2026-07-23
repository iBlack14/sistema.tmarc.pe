const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario-model');
const { verificarAuth } = require('../middleware/auth');

// ========== ENDPOINTS DE AUTENTICACIÓN ==========

// Logout de usuario
router.post('/logout', async (req, res) => {
    try {
        // En este caso, como usamos tokens básicos, solo confirmamos el logout
        // En un sistema con JWT, aquí invalidaríamos el token en una blacklist
        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener información del usuario actual (protegido con JWT)
router.get('/me', verificarAuth, async (req, res) => {
    try {
        // El middleware verificarAuth ya validó el token y agregó req.usuario
        const usuario = await UsuarioModel.obtenerPorId(req.usuario.id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(401).json({
                success: false,
                error: 'Usuario inactivo'
            });
        }

        res.json({
            success: true,
            data: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email,
                nombre: usuario.nombre,
                tipo: usuario.tipo,
                activo: usuario.activo,
                fecha_registro: usuario.fecha_registro,
                ultimo_acceso: usuario.ultimo_acceso
            }
        });
    } catch (error) {
        console.error('Error obteniendo información del usuario:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// Login de usuario
router.post('/login', async (req, res) => {
    try {
        const { usernameOEmail, password } = req.body;

        if (!usernameOEmail || !password) {
            return res.status(400).json({
                error: 'Usuario/email y contraseña son requeridos'
            });
        }

        // Obtener usuario
        const usuario = await UsuarioModel.obtenerPorUsernameOEmail(usernameOEmail);
        if (!usuario) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(401).json({
                error: 'Usuario inactivo. Contacte al administrador.'
            });
        }

        // Verificar contraseña (soporta hash bcrypt y texto plano legacy)
        const passwordValida = await UsuarioModel.verificarPassword(usuario, password);
        if (!passwordValida) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Actualizar último acceso
        await UsuarioModel.actualizarUltimoAcceso(usuario.id);

        // Crear token JWT seguro
        const token = jwt.sign(
            {
                id: usuario.id,
                username: usuario.username,
                tipo: usuario.tipo
            },
            process.env.JWT_SECRET || 'secret-temporal-cambiar-urgente',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    email: usuario.email,
                    nombre: usuario.nombre,
                    tipo: usuario.tipo
                },
                token: token
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambio de contraseña del usuario actual
router.post('/change-password', verificarAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const usuarioId = req.usuario.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña actual y la nueva son requeridas'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Obtener usuario (con contraseña para verificar)
        const usuario = await UsuarioModel.obtenerPorIdConPassword(usuarioId);
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar contraseña actual
        const esValida = await UsuarioModel.verificarPassword(usuario, currentPassword);
        if (!esValida) {
            return res.status(401).json({
                success: false,
                error: 'La contraseña actual es incorrecta'
            });
        }

        // Hashear y guardar nueva contraseña
        const bcrypt = require('bcrypt');
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        const { query } = require('../database-config');
        await query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, usuarioId]);

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// Inicializar usuarios de prueba (para desarrollo)
router.post('/init-test-users', async (req, res) => {
    try {
        const UsuarioModel = require('../models/usuario-model');
        const bcrypt = require('bcrypt');

        // Verificar si ya existe el usuario demo
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

        // Crear usuario demo con contraseña conocida
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('demo123', saltRounds);

        const { query } = require('../database-config');
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
                },
                admin: {
                    username: 'admin',
                    email: 'admin@sistema.gov',
                    password: 'admin123',
                    nombre: 'Administrador del Sistema',
                    tipo: 'admin'
                }
            }
        });
    } catch (error) {
        console.error('Error inicializando usuarios de prueba:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;