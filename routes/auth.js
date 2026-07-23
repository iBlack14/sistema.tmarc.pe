const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const UsuarioModel = require('../models/usuario-model');
const { verificarAuth } = require('../middleware/auth');
const { query } = require('../database-config');
const smtpConfigManager = require('../smtp-config-manager');

const CODE_TTL_MINUTES = Math.max(1, parseInt(process.env.FIRST_LOGIN_CODE_TTL_MINUTES || '', 10) || 10);
const MAX_CODE_ATTEMPTS = Math.max(1, parseInt(process.env.FIRST_LOGIN_MAX_ATTEMPTS || '', 10) || 5);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function obtenerJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('JWT_SECRET debe estar configurado en el entorno y tener al menos 32 caracteres');
    }
    return secret;
}

function generarCodigo() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hash(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function crearToken(usuario) {
    return jwt.sign(
        { id: usuario.id, username: usuario.username, tipo: usuario.tipo },
        obtenerJwtSecret(),
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function usuarioPublico(usuario) {
    return {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        nombre: usuario.nombre,
        tipo: usuario.tipo
    };
}

function ocultarCorreo(email) {
    const [local, domain] = String(email).split('@');
    if (!domain) return email;
    return `${local.slice(0, 2)}${'*'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

function emailCodigo(usuario, codigo) {
    return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f4f4;font-family:Arial,sans-serif;color:#1a1a1a">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,.12)">
<tr><td align="center" style="background:#1a1a1a;padding:28px;border-bottom:5px solid #d4af37">
<img src="cid:logo@institucion" alt="TMARC" width="190" style="display:block;max-width:70%">
</td></tr>
<tr><td style="padding:38px 42px;text-align:center">
<h1 style="font-size:25px;margin:0 0 12px">Código de acceso</h1>
<p style="color:#666;line-height:1.55;margin:0 0 26px">Hola <strong>${String(usuario.nombre).replace(/[<>&"]/g, '')}</strong>, usa este código para verificar el primer ingreso a tu cuenta TMARC.</p>
<div style="display:inline-block;background:#d4af37;color:#1a1a1a;border-radius:12px;padding:17px 24px;font:700 34px monospace;letter-spacing:9px">${codigo}</div>
<p style="color:#666;font-size:14px;margin:26px 0 0">El código vence en <strong>${CODE_TTL_MINUTES} minutos</strong> y solo puede usarse una vez.</p>
<p style="color:#999;font-size:12px;margin:22px 0 0">Si no intentaste ingresar, no compartas este código y cambia tu contraseña.</p>
</td></tr>
<tr><td style="background:#f8f9fa;text-align:center;padding:20px;color:#777;font-size:12px">TMARC · Arbitraje &amp; Dispute Boards</td></tr>
</table></td></tr></table></body></html>`;
}

async function emitirCodigo(usuario) {
    const codigo = generarCodigo();
    const challengeId = crypto.randomBytes(32).toString('hex');

    await query('DELETE FROM codigos_primer_ingreso WHERE usuario_id = ? OR expira_en < NOW()', [usuario.id]);
    await query(
        `INSERT INTO codigos_primer_ingreso
            (challenge_id, usuario_id, codigo_hash, expira_en)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [challengeId, usuario.id, hash(codigo), CODE_TTL_MINUTES]
    );

    const envio = await smtpConfigManager.enviarEmail({
        destinatario: usuario.email,
        asunto: 'Código de acceso a tu cuenta TMARC',
        contenido: emailCodigo(usuario, codigo),
        tipo: 'primer_ingreso'
    });

    if (!envio.success || envio.estado === 'simulado' || envio.estado === 'pendiente_smtp') {
        await query('DELETE FROM codigos_primer_ingreso WHERE challenge_id = ?', [challengeId]);
        throw new Error(envio.message || 'No fue posible enviar el código');
    }

    return { challengeId, maskedEmail: ocultarCorreo(usuario.email) };
}

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

        if (usuario.tipo !== 'admin' && !Number(usuario.primer_ingreso_verificado)) {
            try {
                const challenge = await emitirCodigo(usuario);
                return res.json({
                    success: true,
                    requiresVerification: true,
                    message: 'Enviamos un código de acceso a tu correo',
                    data: challenge
                });
            } catch (emailError) {
                console.error('Error enviando código de primer ingreso:', emailError);
                return res.status(503).json({
                    success: false,
                    error: 'Tus credenciales son correctas, pero no pudimos enviar el código. Verifica la configuración de correo o inténtalo nuevamente.'
                });
            }
        }

        await UsuarioModel.actualizarUltimoAcceso(usuario.id);
        const token = crearToken(usuario);

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                usuario: usuarioPublico(usuario),
                token: token
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/verify-first-login', async (req, res) => {
    try {
        const { challengeId, code } = req.body;
        if (!/^[a-f0-9]{64}$/.test(String(challengeId || '')) || !/^\d{6}$/.test(String(code || ''))) {
            return res.status(400).json({ success: false, error: 'Código o solicitud inválidos' });
        }

        const rows = await query(
            `SELECT c.challenge_id, c.usuario_id, c.codigo_hash, c.intentos, c.expira_en,
                    CASE WHEN c.expira_en < NOW() THEN 1 ELSE 0 END AS expirado,
                    u.id, u.username, u.email, u.nombre, u.tipo, u.activo
             FROM codigos_primer_ingreso c
             INNER JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.challenge_id = ? LIMIT 1`,
            [challengeId]
        );
        const record = rows[0];
        // Comparar la expiración en MySQL evita falsos vencimientos por diferencias
        // entre la zona horaria de Node.js, el driver y el servidor de base de datos.
        if (!record || Number(record.expirado) === 1) {
            if (record) await query('DELETE FROM codigos_primer_ingreso WHERE challenge_id = ?', [challengeId]);
            return res.status(400).json({ success: false, error: 'El código venció. Solicita uno nuevo.' });
        }
        if (record.intentos >= MAX_CODE_ATTEMPTS) {
            await query('DELETE FROM codigos_primer_ingreso WHERE challenge_id = ?', [challengeId]);
            return res.status(429).json({ success: false, error: 'Superaste el límite de intentos. Inicia sesión nuevamente.' });
        }
        if (record.codigo_hash !== hash(code)) {
            await query('UPDATE codigos_primer_ingreso SET intentos = intentos + 1 WHERE challenge_id = ?', [challengeId]);
            return res.status(400).json({
                success: false,
                error: `Código incorrecto. Te quedan ${MAX_CODE_ATTEMPTS - record.intentos - 1} intentos.`
            });
        }

        await query('UPDATE usuarios SET primer_ingreso_verificado = 1, ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?', [record.usuario_id]);
        await query('DELETE FROM codigos_primer_ingreso WHERE usuario_id = ?', [record.usuario_id]);

        const usuario = usuarioPublico(record);
        return res.json({
            success: true,
            message: 'Correo verificado correctamente',
            data: { usuario, token: crearToken(record) }
        });
    } catch (error) {
        console.error('Error verificando primer ingreso:', error);
        res.status(500).json({ success: false, error: 'No se pudo verificar el código' });
    }
});

router.post('/resend-first-login', async (req, res) => {
    try {
        const { challengeId } = req.body;
        const rows = await query(
            `SELECT u.* FROM codigos_primer_ingreso c
             INNER JOIN usuarios u ON u.id = c.usuario_id
             WHERE c.challenge_id = ? LIMIT 1`,
            [challengeId]
        );
        if (!rows[0]) return res.status(400).json({ success: false, error: 'La solicitud venció. Inicia sesión nuevamente.' });
        const challenge = await emitirCodigo(rows[0]);
        res.json({ success: true, message: 'Enviamos un código nuevo', data: challenge });
    } catch (error) {
        console.error('Error reenviando código:', error);
        res.status(503).json({ success: false, error: 'No pudimos reenviar el código en este momento.' });
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

module.exports = router;
