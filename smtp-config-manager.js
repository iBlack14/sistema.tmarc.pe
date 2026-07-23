// Gestor unificado de configuración SMTP
class SMTPConfigManager {
    constructor() {
        this.configKey = 'smtpConfig';

        // Verificar si estamos en Node.js (servidor) o navegador
        const isNodeJS = typeof process !== 'undefined' && process.env;

        this.defaultConfig = {
            server: (isNodeJS ? process.env.SMTP_HOST : '') || '',
            port: (isNodeJS ? parseInt(process.env.SMTP_PORT) : 465) || 465,
            user: (isNodeJS ? process.env.SMTP_USER : '') || '',
            password: (isNodeJS ? process.env.SMTP_PASSWORD : '') || '',
            ssl_enabled: (isNodeJS ? process.env.SMTP_SSL_ENABLED === 'true' : false),
            use_auth: (isNodeJS ? process.env.SMTP_USE_AUTH !== 'false' : true),
            require_tls: (isNodeJS ? process.env.SMTP_REQUIRE_TLS !== 'false' : true),
            fromEmail: (isNodeJS ? process.env.SMTP_FROM_EMAIL : '') || '',
            fromName: (isNodeJS ? process.env.SMTP_FROM_NAME : 'Sistema Mesa de Partes Virtual') || 'Sistema Mesa de Partes Virtual',
            activo: isNodeJS ? !!(process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL) : false
        };
        this.config = this.cargarConfig();
        this.smtpService = null; // Se configurará cuando esté disponible
    }

    // Cargar configuración desde localStorage (navegador) o archivo (servidor)
    cargarConfig() {
        try {
            // Verificar si estamos en el navegador
            if (typeof window !== 'undefined' && window.localStorage) {
                const configGuardada = localStorage.getItem(this.configKey);
                if (configGuardada) {
                    const config = JSON.parse(configGuardada);
                    return { ...this.defaultConfig, ...config };
                }
            } else {
                // En servidor, usar configuración por defecto
                console.log('📡 Ejecutando en servidor - usando configuración por defecto');
            }
        } catch (error) {
            console.error('Error cargando configuración SMTP:', error);
        }
        return { ...this.defaultConfig };
    }

    // Establecer servicio SMTP (se llama desde el servidor)
    setSMTPService(smtpService) {
        this.smtpService = smtpService;
    }

    // Guardar configuración en localStorage (navegador) o memoria (servidor)
    guardarConfig(config) {
        try {
            // Validar configuración básica
            if (!this.validarConfig(config)) {
                return { success: false, message: 'Configuración SMTP inválida' };
            }

            this.config = { ...this.defaultConfig, ...config, activo: true };

            // Si estamos en el navegador, guardar en localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem(this.configKey, JSON.stringify(this.config));
            }

            console.log('✅ Configuración SMTP guardada exitosamente');
            return { success: true, message: 'Configuración SMTP guardada exitosamente' };
        } catch (error) {
            console.error('Error guardando configuración SMTP:', error);
            return { success: false, message: 'Error al guardar configuración' };
        }
    }

    // Obtener configuración actual
    obtenerConfig() {
        return this.config;
    }

    // Validar configuración SMTP
    validarConfig(config) {
        const useAuth = config?.use_auth !== false;

        return (
            config &&
            config.server &&
            config.server.includes('.') &&
            config.fromEmail &&
            config.fromEmail.includes('@') &&
            (!useAuth || (
                config.user &&
                config.user.includes('@') &&
                config.password
            ))
        );
    }

    // Verificar si hay configuración válida
    hayConfiguracionValida() {
        return this.validarConfig(this.config) && this.config.activo;
    }

    // Probar conexión SMTP
    async probarConexion(config = null) {
        const configPrueba = config || this.config;

        // Validación básica
        if (!this.validarConfig(configPrueba)) {
            return {
                success: false,
                message: 'Configuración SMTP incompleta o inválida'
            };
        }

        try {
            // Usar el servicio SMTP real si está disponible
            if (this.smtpService) {
                const resultadoConfig = this.smtpService.configurar(configPrueba);
                if (!resultadoConfig.success) {
                    return resultadoConfig;
                }

                const resultado = await this.smtpService.probarConexion();
                return resultado;
            }

            // Fallback: simulación si no hay servicio disponible
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        success: true,
                        message: 'Simulación de conexión SMTP exitosa (configure SMTP real)',
                        detalles: {
                            servidor: configPrueba.server,
                            puerto: configPrueba.port,
                            ssl_enabled: configPrueba.ssl_enabled,
                            remitente: configPrueba.fromEmail
                        }
                    });
                }, 2000);
            });

        } catch (error) {
            console.error('Error probando conexión SMTP:', error);
            return {
                success: false,
                message: 'Error probando conexión: ' + error.message
            };
        }
    }

    // Enviar email usando configuración SMTP
    async enviarEmail(emailData) {
        if (!this.hayConfiguracionValida()) {
            return {
                success: false,
                message: 'Configuración SMTP no encontrada. Email guardado localmente.',
                estado: 'pendiente_smtp'
            };
        }

        try {
            // Usar el servicio SMTP real si está disponible
            if (this.smtpService) {
                const resultado = await this.smtpService.enviarEmail(emailData);
                return resultado;
            }

            // Fallback: simulación si no hay servicio disponible
            console.log('📧 Simulando envío de email (SMTP real no disponible):', {
                servidor: this.config.server,
                puerto: this.config.port,
                usuario: this.config.user,
                ssl_enabled: this.config.ssl_enabled,
                remitente: this.config.fromEmail,
                destinatario: emailData.destinatario,
                asunto: emailData.asunto
            });

            // Simular delay de envío
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                success: true,
                message: 'Email simulado exitosamente (configure SMTP real)',
                estado: 'simulado',
                smtpConfig: this.config
            };

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return {
                success: false,
                message: 'Error al enviar email: ' + error.message,
                estado: 'error',
                error: error.message
            };
        }
    }

    // Obtener estadísticas de emails
    obtenerEstadisticasEmails() {
        try {
            // Solo obtener estadísticas si estamos en el navegador
            if (typeof window !== 'undefined' && window.localStorage) {
                const emailsEnviados = JSON.parse(localStorage.getItem('emailsEnviados') || '[]');
                const respuestasEnviadas = JSON.parse(localStorage.getItem('respuestasEnviadas') || '[]');

                const total = emailsEnviados.length + respuestasEnviadas.length;
                const enviados = emailsEnviados.filter(e => e.estado === 'enviado').length +
                               respuestasEnviadas.filter(e => e.estado === 'enviado').length;
                const pendientes = emailsEnviados.filter(e => e.estado === 'pendiente_smtp').length +
                                 respuestasEnviadas.filter(e => e.estado === 'pendiente_smtp').length;
                const errores = emailsEnviados.filter(e => e.estado === 'error').length +
                              respuestasEnviadas.filter(e => e.estado === 'error').length;

                return {
                    total,
                    enviados,
                    pendientes,
                    errores,
                    configuracion_activa: this.hayConfiguracionValida()
                };
            } else {
                // En servidor, devolver estadísticas vacías
                return { total: 0, enviados: 0, pendientes: 0, errores: 0, configuracion_activa: this.hayConfiguracionValida() };
            }
        } catch (error) {
            console.error('Error obteniendo estadísticas de emails:', error);
            return { total: 0, enviados: 0, pendientes: 0, errores: 0, configuracion_activa: false };
        }
    }

    // Limpiar configuración
    limpiarConfiguracion() {
        this.config = { ...this.defaultConfig };
        // Solo limpiar localStorage si estamos en el navegador
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(this.configKey);
        }
        return { success: true, message: 'Configuración SMTP eliminada' };
    }

    // Exportar configuración para respaldo
    exportarConfiguracion() {
        return {
            config: this.config,
            fechaExportacion: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Importar configuración desde respaldo
    importarConfiguracion(configData) {
        if (configData && configData.config) {
            return this.guardarConfig(configData.config);
        }
        return { success: false, message: 'Datos de configuración inválidos' };
    }
}

// Crear instancia global
const smtpConfigManager = new SMTPConfigManager();

// Hacer disponible globalmente (solo en navegador)
if (typeof window !== 'undefined') {
    window.SMTPConfigManager = SMTPConfigManager;
    window.smtpConfigManager = smtpConfigManager;

    // Función auxiliar para mostrar notificaciones sobre SMTP
    window.mostrarNotificacionSMTP = function(mensaje, tipo = 'info') {
        if (window.conexionDatos && window.conexionDatos.mostrarNotificacion) {
            window.conexionDatos.mostrarNotificacion(mensaje, tipo);
        } else {
            // Fallback si no está disponible conexionDatos
            console.log(`SMTP ${tipo}: ${mensaje}`);
        }
    };
}

// Exportar para Node.js
module.exports = smtpConfigManager;
