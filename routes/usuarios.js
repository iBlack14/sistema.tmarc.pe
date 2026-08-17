const express = require('express');
const router = express.Router();
const UsuarioModel = require('../models/usuario-model');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const smtpConfigManager = require('../smtp-config-manager');

function escaparHtml(valor) {
    return String(valor || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function plantillaBienvenida(usuario) {
    const baseUrl = (process.env.APP_URL || process.env.BASE_URL || 'https://sistema.tmarc.pe').replace(/\/+$/, '');
    const nombre = escaparHtml(usuario.nombre);
    const username = escaparHtml(usuario.username);
    const email = escaparHtml(usuario.email);

    return `<!doctype html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f2f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f4;padding:30px 12px">
<tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 14px 38px rgba(0,0,0,.12)">
        <tr>
            <td align="center" style="background:#1a1a1a;padding:30px 24px;border-bottom:5px solid #d4af37">
                <img src="cid:logo@institucion" width="210" alt="TMARC" style="display:block;width:210px;max-width:70%;height:auto">
            </td>
        </tr>
        <tr>
            <td style="padding:42px 42px 18px;text-align:center">
                <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:16px;background:#d4af37;color:#1a1a1a;font-size:28px;font-weight:bold;margin-bottom:20px">✓</div>
                <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2;color:#1a1a1a">¡Bienvenido(a) a TMARC!</h1>
                <p style="margin:0;color:#777;font-size:14px">Mesa de Partes Virtual · Arbitraje &amp; Dispute Boards</p>
            </td>
        </tr>
        <tr>
            <td style="padding:18px 42px 36px">
                <p style="margin:0 0 18px;font-size:17px;line-height:1.6;text-align:center">Hola <strong>${nombre}</strong>,</p>
                <p style="margin:0 0 26px;color:#555;font-size:15px;line-height:1.65;text-align:center">
                    Tu cuenta fue creada correctamente. Ya puedes acceder a la plataforma y gestionar tus presentaciones y expedientes.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:1px solid #e6e1d2;border-left:5px solid #d4af37;border-radius:12px">
                    <tr><td style="padding:23px">
                        <p style="margin:0 0 17px;font-size:16px;font-weight:bold">Tus datos de acceso</p>
                        <p style="margin:0 0 7px;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.7px">Usuario</p>
                        <p style="margin:0 0 18px;font-family:monospace;font-size:17px;font-weight:bold;color:#b08b17">${username}</p>
                        <p style="margin:0 0 7px;color:#777;font-size:12px;text-transform:uppercase;letter-spacing:.7px">Correo registrado</p>
                        <p style="margin:0;font-size:15px;color:#1a1a1a">${email}</p>
                    </td></tr>
                </table>
                <p style="margin:18px 0 26px;color:#666;font-size:13px;line-height:1.55;text-align:center">
                    Usa la contraseña que creaste durante el registro. Por seguridad, nunca enviamos contraseñas por correo.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td align="center" bgcolor="#d4af37" style="border-radius:12px">
                    <a href="${baseUrl}/login.html" style="display:inline-block;padding:16px 38px;color:#1a1a1a;text-decoration:none;font-size:15px;font-weight:bold">Ingresar a mi cuenta</a>
                </td></tr></table>
                <div style="margin-top:28px;padding:17px;border-radius:10px;background:#fff8df;color:#66520f;font-size:13px;line-height:1.55;text-align:center">
                    En tu primer ingreso te enviaremos un código temporal al correo para verificar tu identidad.
                </div>
            </td>
        </tr>
        <tr>
            <td style="background:#1a1a1a;border-top:4px solid #d4af37;padding:25px;text-align:center">
                <p style="margin:0 0 6px;color:#d4af37;font-size:16px;font-weight:bold">TMARC</p>
                <p style="margin:0;color:#aaa;font-size:12px">Arbitraje &amp; Dispute Boards · Gestión segura y transparente</p>
            </td>
        </tr>
    </table>
</td></tr></table>
</body></html>`;
}

function plantillaNuevoUsuarioAdmin(usuario, usuarioId) {
    const baseUrl = (process.env.APP_URL || process.env.BASE_URL || 'https://sistema.tmarc.pe').replace(/\/+$/, '');
    const nombre = escaparHtml(usuario.nombre);
    const username = escaparHtml(usuario.username);
    const email = escaparHtml(usuario.email);
    const telefono = escaparHtml(usuario.telefono || 'No registrado');
    const fecha = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' });
    return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f1f2f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f1f2f4"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #ded8c5;box-shadow:0 12px 35px rgba(0,0,0,.1)"><tr><td style="background:#111;padding:26px 30px;border-bottom:4px solid #d4af37"><div style="font-family:Georgia,serif;color:#fff;font-size:28px;font-weight:bold">Tmarc</div><div style="color:#d4af37;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;margin-top:4px">Notificación administrativa</div></td></tr><tr><td style="padding:32px"><div style="color:#9b7413;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1.2px">Nuevo registro</div><h1 style="font-size:23px;margin:8px 0 10px;color:#171717">Se registró un nuevo usuario</h1><p style="margin:0 0 22px;color:#666;font-size:14px;line-height:1.6">Una nueva cuenta fue creada correctamente en SISTEMA TMARC.</p><div style="background:#fff9e8;border:1px solid #ead486;border-radius:11px;padding:15px;text-align:center;margin-bottom:20px"><div style="font-size:10px;color:#8a721e;text-transform:uppercase;font-weight:bold">Usuario N.°</div><div style="font-size:20px;font-weight:800;margin-top:5px">${usuarioId}</div></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #ece7d8;border-radius:10px;border-collapse:separate;overflow:hidden"><tr><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;color:#806b20;font-size:11px;font-weight:bold;width:32%">NOMBRE</td><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;font-size:13px;font-weight:600">${nombre}</td></tr><tr><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;color:#806b20;font-size:11px;font-weight:bold">USUARIO</td><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;font-size:13px">${username}</td></tr><tr><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;color:#806b20;font-size:11px;font-weight:bold">CORREO</td><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;font-size:13px">${email}</td></tr><tr><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;color:#806b20;font-size:11px;font-weight:bold">TELÉFONO</td><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;font-size:13px">${telefono}</td></tr><tr><td style="padding:11px 14px;color:#806b20;font-size:11px;font-weight:bold">FECHA</td><td style="padding:11px 14px;font-size:13px">${fecha}</td></tr></table><div style="text-align:center;margin:26px 0 8px"><a href="${baseUrl}/public/admin/index.html#usuarios" style="display:inline-block;padding:13px 25px;border-radius:9px;background:#d4af37;color:#111;text-decoration:none;font-size:13px;font-weight:bold">Revisar usuario en administración →</a></div><p style="margin:22px 0 0;padding:13px 15px;background:#f7f7f7;border-left:4px solid #d4af37;color:#666;font-size:11px;line-height:1.5">Mensaje automático de seguridad. La contraseña del usuario no se incluye ni se almacena en este correo.</p></td></tr><tr><td style="background:#111;padding:19px;text-align:center;color:#aaa;font-size:10px"><strong style="color:#d4af37">SISTEMA TMARC</strong><br>Centro de Arbitraje &amp; Dispute Boards</td></tr></table></td></tr></table></body></html>`;
}

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

        let emailBienvenidaEnviado = false;
        let emailBienvenidaError = null;
        try {
            console.log('📧 Enviando bienvenida TMARC a:', datosUsuario.email);
            const envio = await smtpConfigManager.enviarEmail({
                destinatario: datosUsuario.email,
                asunto: 'Bienvenido(a) a TMARC - Tu cuenta fue creada',
                contenido: plantillaBienvenida(datosUsuario),
                tipo: 'bienvenida_usuario'
            });
            emailBienvenidaEnviado = Boolean(envio.success && envio.estado !== 'simulado' && envio.estado !== 'pendiente_smtp');
            if (emailBienvenidaEnviado) {
                console.log('✅ Correo de bienvenida TMARC enviado:', envio.messageId || envio.message);
            } else {
                emailBienvenidaError = envio.message || 'El servicio SMTP no confirmó el envío';
                console.warn('⚠️ Cuenta creada, pero no se envió la bienvenida:', emailBienvenidaError);
            }
        } catch (emailError) {
            emailBienvenidaError = emailError.message;
            console.error('❌ Cuenta creada, pero falló el correo de bienvenida:', emailError);
        }

        let notificacionAdminEnviada = false;
        let notificacionAdminError = null;
        const correoAdmin = process.env.ADMIN_EMAIL;
        if (correoAdmin) {
            try {
                const envioAdmin = await smtpConfigManager.enviarEmail({
                    destinatario: correoAdmin,
                    asunto: `Nuevo usuario registrado: ${datosUsuario.nombre}`,
                    contenido: plantillaNuevoUsuarioAdmin(datosUsuario, resultado.insertId),
                    tipo: 'notificacion_nuevo_usuario_admin'
                });
                notificacionAdminEnviada = Boolean(envioAdmin.success && envioAdmin.estado !== 'simulado' && envioAdmin.estado !== 'pendiente_smtp');
                if (!notificacionAdminEnviada) notificacionAdminError = envioAdmin.message || 'El SMTP no confirmó el envío administrativo';
            } catch (adminEmailError) {
                notificacionAdminError = adminEmailError.message;
                console.error('❌ Usuario creado, pero falló la notificación al administrador:', adminEmailError);
            }
        } else {
            notificacionAdminError = 'ADMIN_EMAIL no está configurado';
            console.warn('⚠️ No se notificó el registro: falta ADMIN_EMAIL');
        }

        res.status(201).json({
            success: true,
            message: emailBienvenidaEnviado
                ? 'Usuario creado y correo de bienvenida enviado'
                : 'Usuario creado; el correo de bienvenida quedó pendiente',
            data: {
                id: resultado.insertId,
                emailBienvenidaEnviado,
                emailBienvenidaError,
                notificacionAdminEnviada,
                notificacionAdminError
            }
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
