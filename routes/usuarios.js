const express = require('express');
const router = express.Router();
const UsuarioModel = require('../models/usuario-model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para avatars
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/avatars');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes'));
        }
    }
});

// ========== ENDPOINTS DE USUARIOS ==========

// Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const filtros = {
            tipo: req.query.tipo,
            activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
            busqueda: req.query.busqueda,
            limite: req.query.limite ? parseInt(req.query.limite) : null
        };

        const usuarios = await UsuarioModel.obtenerTodos(filtros);
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar si usuario existe por email
router.get('/existe/:email', async (req, res) => {
    try {
        const { email } = req.params;

        // Buscar en MySQL
        const usuario = await UsuarioModel.obtenerPorUsernameOEmail(email);
        const existe = !!usuario;

        res.json({
            success: true,
            data: {
                existe: existe,
                id: existe ? usuario.id : null,
                detalles: {
                    mysql: usuario,
                    localStorage: null
                }
            }
        });
    } catch (error) {
        console.error('Error verificando existencia de usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener usuario por ID
// IMPORTANTE: esta ruta dinámica debe declararse después de /existe/:email.
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await UsuarioModel.obtenerPorId(parseInt(id));

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ success: true, data: usuario });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nuevo usuario
router.post('/', async (req, res) => {
    try {
        const datosUsuario = req.body;

        console.log('📥 Recibiendo solicitud de creación de usuario:', {
            username: datosUsuario.username,
            email: datosUsuario.email,
            nombre: datosUsuario.nombre
        });

        // Validación básica
        if (!datosUsuario.username || !datosUsuario.email || !datosUsuario.password || !datosUsuario.nombre) {
            return res.status(400).json({
                error: 'Los campos username, email, password y nombre son requeridos'
            });
        }

        // Verificar si username ya existe
        const usernameExiste = await UsuarioModel.usernameExiste(datosUsuario.username);
        if (usernameExiste) {
            console.warn('⚠️ Username ya existe:', datosUsuario.username);
            return res.status(409).json({
                error: 'El nombre de usuario ya existe'
            });
        }

        // Verificar si email ya existe
        const usuarioExistente = await UsuarioModel.obtenerTodos({ busqueda: datosUsuario.email });
        const userFound = usuarioExistente.find(u => u.email === datosUsuario.email);
        
        if (userFound) {
            console.warn('⚠️ Email ya existe:', datosUsuario.email);
            return res.status(409).json({
                error: 'El email ya está registrado',
                id: userFound.id
            });
        }

        // Crear usuario
        const resultado = await UsuarioModel.crearUsuario(datosUsuario);

        console.log('✅ Usuario creado con ID:', resultado.insertId);

        res.status(201).json({
            success: true,
            message: 'Usuario creado exitosamente',
            data: { id: resultado.insertId }
        });
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Actualizar usuario
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datosUsuario = req.body;

        // Verificar que el usuario existe
        const usuarioActual = await UsuarioModel.obtenerPorId(id);
        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Actualizar usuario
        const resultado = await UsuarioModel.actualizarUsuario(id, datosUsuario);

        // Obtener usuario actualizado
        const usuarioActualizado = await UsuarioModel.obtenerPorId(id);

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: usuarioActualizado
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar contraseña actual
router.post('/:id/verify-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Validación básica
        if (!password) {
            return res.status(400).json({
                error: 'La contraseña es requerida'
            });
        }

        // Verificar que el usuario existe (con contraseña para verificación)
        const usuarioActual = await UsuarioModel.obtenerPorIdConPassword(id);
        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña
        const passwordValida = await UsuarioModel.verificarPassword(usuarioActual, password);

        res.json({
            success: true,
            data: {
                valida: passwordValida
            }
        });
    } catch (error) {
        console.error('Error verificando contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar contraseña de usuario
router.put('/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Validación básica
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'La contraseña actual y la nueva contraseña son requeridas'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // Verificar que el usuario existe (con contraseña para verificación)
        const usuarioActual = await UsuarioModel.obtenerPorIdConPassword(id);
        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña actual
        const passwordValida = await UsuarioModel.verificarPassword(usuarioActual, currentPassword);
        if (!passwordValida) {
            return res.status(401).json({
                error: 'La contraseña actual es incorrecta'
            });
        }

        // Cambiar contraseña
        await UsuarioModel.cambiarPassword(id, newPassword);

        console.log('✅ Contraseña cambiada para usuario ID:', id);

        res.json({
            success: true,
            message: 'Contraseña cambiada exitosamente'
        });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar cuenta de usuario (requiere contraseña)
router.delete('/:id/delete', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        // Validación básica
        if (!password) {
            return res.status(400).json({
                error: 'La contraseña es requerida para eliminar la cuenta'
            });
        }

        // Verificar que el usuario existe (con contraseña para verificación)
        const usuarioActual = await UsuarioModel.obtenerPorIdConPassword(id);
        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Verificar contraseña
        const passwordValida = await UsuarioModel.verificarPassword(usuarioActual, password);
        if (!passwordValida) {
            return res.status(401).json({
                error: 'La contraseña es incorrecta'
            });
        }

        // Eliminar usuario (desactivar)
        await UsuarioModel.eliminarUsuario(id);

        console.log('✅ Cuenta de usuario eliminada:', id);

        res.json({
            success: true,
            message: 'Cuenta eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar usuario (desactivar) - admin
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el usuario existe
        const usuarioActual = await UsuarioModel.obtenerPorId(id);
        if (!usuarioActual) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        await UsuarioModel.eliminarUsuario(id);
        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar avatar con limpieza de archivos antiguos
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        // Obtener usuario actual para ver si tiene avatar anterior
        const usuarioActual = await UsuarioModel.obtenerPorId(id);
        if (usuarioActual && usuarioActual.foto_perfil) {
            // Si la foto anterior es local (/uploads/avatars/...), la borramos
            if (usuarioActual.foto_perfil.startsWith('/uploads/avatars/')) {
                const oldPath = path.join(__dirname, '..', usuarioActual.foto_perfil);
                if (fs.existsSync(oldPath)) {
                    try {
                        fs.unlinkSync(oldPath);
                        console.log('🗑️ Imagen de perfil antigua eliminada:', oldPath);
                    } catch (err) {
                        console.error('⚠️ Error eliminando imagen antigua:', err);
                    }
                }
            }
        }

        // Guardar nueva ruta en la base de datos
        const nuevaRuta = `/uploads/avatars/${req.file.filename}`;
        await UsuarioModel.actualizarUsuario(id, { foto_perfil: nuevaRuta });

        res.json({
            success: true,
            message: 'Avatar actualizado y limpieza completada',
            data: { foto_perfil: nuevaRuta }
        });
    } catch (error) {
        console.error('Error subiendo avatar:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estadísticas de sincronización
router.get('/estadisticas-sync', async (req, res) => {
    try {
        const stats = await UsuarioModel.obtenerEstadisticas();
        
        // Obtener última sincronización desde logs de auditoría
        const { query } = require('../database-config');
        const lastSync = await query("SELECT fecha FROM logs_auditoria WHERE accion = 'SYNC' ORDER BY fecha DESC LIMIT 1");
        
        res.json({
            success: true,
            data: {
                total: stats.total_usuarios,
                sincronizados: stats.total_usuarios, // Por ahora asumimos todos sincronizados
                pendientes: 0,
                ultima_sync: lastSync.length > 0 ? lastSync[0].fecha : null
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de sincronización:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

// Sincronizar usuarios
router.post('/sincronizar', async (req, res) => {
    try {
        // En un sistema real, aquí se sincronizaría con una base de datos externa
        // Por ahora, registramos la acción en auditoría
        const { query } = require('../database-config');
        
        await query(`
            INSERT INTO logs_auditoria (accion, tabla_afectada, detalles)
            VALUES (?, ?, ?)
        `, ['SYNC', 'usuarios', JSON.stringify({ message: 'Sincronización manual ejecutada' })]);

        res.json({
            success: true,
            message: 'Sincronización completada exitosamente'
        });
    } catch (error) {
        console.error('Error en sincronización:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;
