/**
 * Password Recovery Routes
 * Maneja la recuperación de contraseñas mediante código de verificación
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../database-config');

// Almacenamiento temporal de códigos (en producción usar Redis)
const verificationCodes = new Map();

// Tiempo de expiración del código (10 minutos)
const CODE_EXPIRATION = 10 * 60 * 1000;

/**
 * Generar código de verificación de 6 dígitos
 */
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/forgot-password
 * Solicitar código de recuperación
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        console.log('🔐 Solicitud de recuperación para:', email);

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email es requerido' 
            });
        }

        // Verificar si el usuario existe
        const usuarios = await query(
            'SELECT id, nombre, email FROM usuarios WHERE email = ?',
            [email]
        );

        if (usuarios.length === 0) {
            // Por seguridad, no revelar si el email existe o no
            console.log('⚠️ Email no encontrado:', email);
            return res.json({ 
                success: true, 
                message: 'Si el correo existe, recibirás un código de verificación' 
            });
        }

        const usuario = usuarios[0];

        // Generar código de verificación
        const code = generateVerificationCode();
        const expiresAt = Date.now() + CODE_EXPIRATION;

        // Guardar código en memoria
        verificationCodes.set(email, {
            code,
            expiresAt,
            attempts: 0,
            userId: usuario.id
        });

        console.log('✅ Código generado:', code, 'para', email);

        // Enviar email con el código
        try {
            const smtpConfigManager = require('../smtp-config-manager');
            
            const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%); padding: 30px; text-align: center; border-bottom: 4px solid #d4af37;">
                            <div style="font-size: 48px; margin-bottom: 10px;">🔐</div>
                            <h1 style="color: #C0C0C0; margin: 0; font-size: 24px; font-weight: 600;">Recuperación de Contraseña</h1>
                            <p style="color: #A0A0A0; margin: 10px 0 0 0; font-size: 14px;">Mesa de Partes Virtual</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Hola <strong>${usuario.nombre}</strong>,
                            </p>
                            <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                                Recibimos una solicitud para restablecer la contraseña de tu cuenta. 
                                Usa el siguiente código de verificación:
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <div style="background: linear-gradient(135deg, #d4af37 0%, #e5c158 100%); 
                                                    padding: 20px 40px; 
                                                    border-radius: 10px; 
                                                    display: inline-block;
                                                    box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                                            <span style="color: #000; 
                                                         font-size: 36px; 
                                                         font-weight: 700; 
                                                         letter-spacing: 8px;
                                                         font-family: 'Courier New', monospace;">
                                                ${code}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 30px 0 20px 0; text-align: center;">
                                Este código expirará en <strong style="color: #d4af37;">10 minutos</strong>
                            </p>
                            <div style="background: #fff3cd; 
                                        border-left: 4px solid #ffc107; 
                                        padding: 15px; 
                                        border-radius: 5px; 
                                        margin: 30px 0;">
                                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
                                    <strong>⚠️ Importante:</strong> Si no solicitaste este cambio, 
                                    ignora este correo. Tu contraseña permanecerá sin cambios.
                                </p>
                            </div>
                            <p style="color: #999; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
                                Por seguridad, nunca compartas este código con nadie.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 30px; border-top: 1px solid #e0e0e0;">
                            <p style="color: #666; font-size: 13px; margin: 0 0 10px 0; text-align: center;">
                                <strong>Soporte Técnico</strong><br>
                                📧 ${process.env.EMAIL_FROM || 'sistema@tmarc.pe'}<br>
                                📞 (044) - 538899 | Celular: +51 968 183 889
                            </p>
                            <p style="color: #999; font-size: 12px; margin: 15px 0 0 0; text-align: center;">
                                © ${new Date().getFullYear()} Mesa de Partes Virtual. Todos los derechos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `;

            console.log('📧 [AUTH-RECOVERY] Solicitando envío de email a:', usuario.email);
            await smtpConfigManager.enviarEmail({
                destinatario: usuario.email,
                asunto: '🔐 Código de Recuperación de Contraseña',
                contenido: htmlContent,
                tipo: 'recuperacion_password'
            });

            console.log('✨ [AUTH-RECOVERY] Email enviado exitosamente a:', usuario.email);
        } catch (emailError) {
            console.error('❌ [AUTH-RECOVERY] Error enviando email de recuperación:', emailError.message);
            // Continuar aunque falle el email (para desarrollo)
        }

        // Limpiar códigos expirados
        cleanExpiredCodes();

        res.json({ 
            success: true, 
            message: 'Código de verificación enviado a tu correo',
            // Solo para desarrollo - ELIMINAR EN PRODUCCIÓN
            debug: process.env.NODE_ENV === 'development' ? { code } : undefined
        });

    } catch (error) {
        console.error('❌ Error en forgot-password:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * POST /api/auth/verify-code
 * Verificar código de recuperación
 */
router.post('/verify-code', async (req, res) => {
    try {
        const { email, code } = req.body;

        console.log('🔍 Verificando código para:', email);

        if (!email || !code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email y código son requeridos' 
            });
        }

        // Obtener código almacenado
        const storedData = verificationCodes.get(email);

        if (!storedData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Código no encontrado o expirado. Solicita uno nuevo.' 
            });
        }

        // Verificar si el código ha expirado
        if (Date.now() > storedData.expiresAt) {
            verificationCodes.delete(email);
            return res.status(400).json({ 
                success: false, 
                error: 'El código ha expirado. Solicita uno nuevo.' 
            });
        }

        // Incrementar intentos
        storedData.attempts++;

        // Limitar intentos (máximo 3)
        if (storedData.attempts > 3) {
            verificationCodes.delete(email);
            return res.status(400).json({ 
                success: false, 
                error: 'Demasiados intentos fallidos. Solicita un nuevo código.' 
            });
        }

        // Verificar código
        if (storedData.code !== code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Código incorrecto. Intentos restantes: ' + (3 - storedData.attempts) 
            });
        }

        console.log('✅ Código verificado correctamente');

        // Marcar como verificado
        storedData.verified = true;
        verificationCodes.set(email, storedData);

        res.json({ 
            success: true, 
            message: 'Código verificado correctamente' 
        });

    } catch (error) {
        console.error('❌ Error en verify-code:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Cambiar contraseña con código verificado
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        console.log('🔐 Cambiando contraseña para:', email);

        if (!email || !code || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Todos los campos son requeridos' 
            });
        }

        // Validar contraseña
        if (newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'La contraseña debe tener al menos 8 caracteres' 
            });
        }

        // Obtener código almacenado
        const storedData = verificationCodes.get(email);

        if (!storedData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Sesión expirada. Inicia el proceso nuevamente.' 
            });
        }

        // Verificar que el código fue verificado previamente
        if (!storedData.verified || storedData.code !== code) {
            return res.status(400).json({ 
                success: false, 
                error: 'Código no verificado o incorrecto' 
            });
        }

        // Verificar expiración
        if (Date.now() > storedData.expiresAt) {
            verificationCodes.delete(email);
            return res.status(400).json({ 
                success: false, 
                error: 'El código ha expirado. Inicia el proceso nuevamente.' 
            });
        }

        // Hash de la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Actualizar contraseña en la base de datos
        const result = await query(
            'UPDATE usuarios SET password = ?, updated_at = NOW() WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Usuario no encontrado' 
            });
        }

        // Eliminar código usado
        verificationCodes.delete(email);

        console.log('✅ Contraseña actualizada correctamente para:', email);

        // Registrar cambio de contraseña en tabla de auditoría
        await query(
            'INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, usuario_id, detalles, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['usuarios', storedData.userId, 'password_reset', storedData.userId, JSON.stringify({ detalle: 'Contraseña restablecida mediante código de verificación' }), req.ip || null, req.headers['user-agent'] || null]
        ).catch(err => console.error('Error registrando log de auditoría:', err));

        res.json({ 
            success: true, 
            message: 'Contraseña actualizada correctamente' 
        });

    } catch (error) {
        console.error('❌ Error en reset-password:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

/**
 * Limpiar códigos expirados
 */
function cleanExpiredCodes() {
    const now = Date.now();
    for (const [email, data] of verificationCodes.entries()) {
        if (now > data.expiresAt) {
            verificationCodes.delete(email);
            console.log('🧹 Código expirado eliminado:', email);
        }
    }
}

// Limpiar códigos expirados cada 5 minutos
setInterval(cleanExpiredCodes, 5 * 60 * 1000);

module.exports = router;
