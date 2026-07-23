    const nodemailer = require('nodemailer');

// Servicio SMTP para envío de emails reales
class SMTPService {
    constructor() {
        this.transporter = null;
        this.config = null;
    }

    // Configurar transporter con la configuración SMTP
    configurar(config) {
        try {
            this.config = config;
            const useAuth = config.use_auth !== false;

            const transportConfig = {
                host: config.server,
                port: config.port,
                secure: config.ssl_enabled, // true para 465, false para otros puertos
                name: 'tmarc.pe', // Identificación EHLO para Google Workspace
                // Configuraciones TLS mejoradas
                tls: {
                    rejectUnauthorized: false,
                    minVersion: 'TLSv1.2' // Usar TLS 1.2 o superior
                },
                // Configuraciones anti-spam
                pool: true, // Usar pool de conexiones
                maxConnections: 5,
                maxMessages: 100,
                rateDelta: 1000, // 1 segundo entre emails
                rateLimit: 5 // Máximo 5 emails por segundo
            };

            // Para SMTP relay por IP, la autenticación puede estar desactivada.
            if (useAuth) {
                transportConfig.auth = {
                    user: config.user,
                    pass: config.password
                };
            }

            // En relay TLS por 587 conviene exigir STARTTLS si no se usa SSL implícito.
            if (!config.ssl_enabled && config.require_tls !== false) {
                transportConfig.requireTLS = true;
            }

            // Crear transporter con la configuración optimizada anti-spam
            this.transporter = nodemailer.createTransport(transportConfig);

            console.log('✅ Transporter SMTP configurado');
            return { success: true, message: 'Transporter SMTP configurado exitosamente' };

        } catch (error) {
            console.error('❌ Error configurando transporter SMTP:', error);
            return { success: false, message: 'Error configurando SMTP: ' + error.message };
        }
    }

    // Probar conexión SMTP
    async probarConexion() {
        if (!this.transporter) {
            return { success: false, message: 'Transporter no configurado' };
        }

        try {
            // Verificar conexión
            await this.transporter.verify();
            console.log('✅ Conexión SMTP verificada exitosamente');
            return { success: true, message: 'Conexión SMTP exitosa' };

        } catch (error) {
            console.error('❌ Error verificando conexión SMTP:', error);
            return {
                success: false,
                message: 'Error de conexión SMTP: ' + error.message,
                details: error.code
            };
        }
    }

// Enviar email (acepta destinatario/asunto/contenido o to/subject/html)
async enviarEmail(emailData = {}) {
  if (!this.transporter) {
    return { success: false, message: 'Transporter SMTP no configurado' };
  }

        try {
            // Normalización de campos
            const to = (emailData.to || emailData.destinatario || emailData.email || '').toString().trim();
            const subject = (emailData.subject || emailData.asunto || 'Mensaje del sistema').toString();
            const html = (emailData.html || emailData.contenido || '').toString();

            // Validaciones claras (evita "No recipients defined")
            if (!to)   return { success: false, message: 'No recipients defined' };
            if (!html) return { success: false, message: 'Contenido del email vacío' };

            const fromName  = this.config.fromName  || process.env.SMTP_FROM_NAME  || 'Sistema Mesa de Partes Virtual';
            const fromEmail = this.config.fromEmail || process.env.SMTP_FROM_EMAIL || this.config.user;

            console.log('📧 [SMTP-SERVICE] Intentando enviar email:', { 
                to, 
                subject, 
                host: this.config.server,
                auth: this.config.use_auth ? 'SI' : 'NO'
            });

            const info = await this.transporter.sendMail({
                from: { name: fromName, address: fromEmail },
                to,
                subject,
                html,
                // Forzar el sobre (envelope) para que coincida con el dominio remitente
                envelope: {
                    from: fromEmail,
                    to: to
                },
                headers: {
                    'X-Mailer': 'Sistema Mesa de Partes Virtual v1.0',
                    'X-Priority': '3',
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'Reply-To': fromEmail,
                    'Return-Path': fromEmail,
                    'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
                    'X-Entity-Ref-ID': Date.now().toString(36)
                },
                text: this.htmlToText(html),
                encoding: 'utf-8',
                textEncoding: 'base64',
                attachments: [{
                    filename: 'logo.png',
                    path: './assets/img/logo-cargo-2.png',
                    cid: 'logo@institucion'
                }]
            });

            console.log('✅ [SMTP-SERVICE] Éxito al enviar:', { 
                messageId: info.messageId, 
                response: info.response 
            });

            return {
                success: true,
                message: 'Email enviado exitosamente',
                messageId: info.messageId,
                response: info.response,
                accepted: info.accepted,
                rejected: info.rejected
            };

  } catch (error) {
    console.error('❌ [SMTP-SERVICE] ERROR CRÍTICO enviando email:', {
        mensaje: error.message,
        codigo: error.code,
        comando: error.command,
        respuesta: error.response
    });
    return {
      success: false,
      message: 'Error enviando email: ' + (error.message || error),
      code: error.code,
      response: error.response
    };
  }
}

    // Convertir HTML a texto plano (para versión text del email)
    htmlToText(html) {
        return html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Enviar email con credenciales de usuario
    async enviarCredencialesUsuario(email, credenciales, expediente, expedienteData) {
        const emailData = {
            destinatario: email,
            asunto: 'Credenciales de Acceso - Sistema Mesa de Partes Virtual',
            contenido: this.generarContenidoEmailCredenciales(credenciales, expediente, expedienteData)
        };

        return await this.enviarEmail(emailData);
    }

    // Enviar respuesta administrativa
    async enviarRespuestaAdministrativa(email, asunto, mensaje, expedienteId) {
        const emailData = {
            destinatario: email,
            asunto: asunto,
            contenido: mensaje,
            prioridad: '1'
        };

        return await this.enviarEmail(emailData);
    }

    // Generar contenido HTML para email de credenciales
    generarContenidoEmailCredenciales(credenciales, expediente, expedienteData) {
        const fechaExpiracion = new Date(credenciales.fechaExpiracion).toLocaleDateString('es-ES');

        return `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Credenciales de Acceso</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; }
                    .header { background: linear-gradient(135deg, #d4af37 0%, #c49a2d 100%); color: #1a1a1a; padding: 30px; text-align: center; }
                    .content { background: white; padding: 30px; }
                    .credentials { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
                    .info-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; }
                    .warning { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 15px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Sistema Mesa de Partes Virtual</h1>
                        <p>Centro de Arbitraje y Conciliación</p>
                    </div>

                    <div class="content">
                        <h2>¡Bienvenido al Sistema!</h2>

                        <p>Su solicitud de arbitraje ha sido registrada exitosamente. A continuación, encontrará sus credenciales de acceso temporal:</p>

                        <div class="credentials">
                            <h3>Credenciales de Acceso</h3>
                            <p><strong>Usuario:</strong> ${credenciales.username}</p>
                            <p><strong>Contraseña:</strong> ${credenciales.password}</p>
                            <p><strong>Email:</strong> ${credenciales.email}</p>
                        </div>

                        <div class="info-box">
                            <h4>Información del Expediente</h4>
                            <p><strong>N° Expediente:</strong> ${expediente.numero || expediente.id}</p>
                            <p><strong>Tipo:</strong> Arbitraje entre Privados</p>
                            <p><strong>Presentante:</strong> ${expedienteData.presentante}</p>
                            <p><strong>Demandado:</strong> ${expedienteData.demandado}</p>
                        </div>

                        <div class="warning">
                            <h4>Importante</h4>
                            <ul>
                                <li>Estas credenciales son temporales y expiran el: <strong>${fechaExpiracion}</strong></li>
                                <li>Por seguridad, cambie su contraseña al primer inicio de sesión</li>
                                <li>Si tiene problemas de acceso, contacte al soporte técnico</li>
                            </ul>
                        </div>

                        <h3>Instrucciones de Acceso</h3>
                        <ol>
                            <li>Acceda al sistema desde: <a href="${process.env.APP_URL || 'http://localhost:3002'}/login.html">${process.env.APP_URL || 'http://localhost:3002'}/login.html</a></li>
                            <li>Use las credenciales proporcionadas arriba</li>
                            <li>Cambie su contraseña en la sección de configuración</li>
                            <li>Podrá hacer seguimiento a su expediente desde el dashboard</li>
                        </ol>
                    </div>

                    <div class="footer">
                        <p>Centro de Arbitraje y Conciliación<br>
                        consultas@regionlalibertad.gob.pe<br>
                        ${new Date().getFullYear()}</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Obtener configuraciones SMTP comunes predefinidas
    obtenerConfiguracionesPredefinidas() {
        return {
            gmail: {
                server: 'smtp.gmail.com',
                port: 587,
                ssl: false,
                descripcion: 'Gmail (requiere App Password)'
            },
            outlook: {
                server: 'smtp-mail.outlook.com',
                port: 587,
                ssl: false,
                descripcion: 'Outlook/Hotmail'
            },
            yahoo: {
                server: 'smtp.mail.yahoo.com',
                port: 587,
                ssl: false,
                descripcion: 'Yahoo Mail'
            },
            zoho: {
                server: 'smtp.zoho.com',
                port: 587,
                ssl: false,
                descripcion: 'Zoho Mail'
            },
            sendgrid: {
                server: 'smtp.sendgrid.net',
                port: 587,
                ssl: false,
                descripcion: 'SendGrid'
            }
        };
    }

    // Validar configuración SMTP
    validarConfiguracion(config) {
        const errores = [];

        if (!config.server) {
            errores.push('Servidor SMTP es requerido');
        }

        if (!config.port || config.port < 1 || config.port > 65535) {
            errores.push('Puerto debe ser un número válido (1-65535)');
        }

        if (!config.user) {
            errores.push('Usuario SMTP es requerido');
        }

        if (!config.password) {
            errores.push('Contraseña SMTP es requerida');
        }

        if (!config.fromEmail) {
            errores.push('Email remitente es requerido');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(config.fromEmail)) {
                errores.push('Email remitente no tiene formato válido');
            }
        }

        return {
            valido: errores.length === 0,
            errores: errores
        };
    }
}

// Crear instancia global
const smtpService = new SMTPService();

module.exports = smtpService;
