/**
 * Servicio de Email - Versión Optimizada
 * Maneja el envío de emails con templates profesionales
 */

const EmailService = {
    /**
     * Configuración centralizada
     */
    config: {
        emailSoporte: 'arbitraje@tmarc.pe o disputeboards@tmarc.pe ',
        telefonoSoporte: '(044) - 538899 | Celular: +51 968 183 889 - 967 735 960',
        direccionInstitucion: 'Av. Jose Pardo N° 510 DPTO 203 URB. SANTA CRUZ, Lima - Lima - Miraflores',
        urlBase: window.location.origin
    },

    /**
     * Cargar template desde archivo externo
     */
    async cargarTemplate(nombreTemplate) {
        try {
            const response = await fetch(`/templates/${nombreTemplate}.html`);
            if (!response.ok) {
                throw new Error(`Template ${nombreTemplate} no encontrado`);
            }
            return await response.text();
        } catch (error) {
            console.error('❌ Error cargando template:', error);
            throw error; // Propagar error en lugar de usar fallback obsoleto
        }
    },

    /**
     * Reemplazar variables en el template
     */
    reemplazarVariables(template, variables) {
        let resultado = template;
        
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            resultado = resultado.replace(regex, value || '');
        }
        
        return resultado;
    },

    /**
     * Obtener fechas formateadas
     */
    obtenerFechas() {
        const ahora = new Date();
        return {
            fecha: ahora.toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }),
            fechaHora: ahora.toLocaleString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            año: ahora.getFullYear()
        };
    },

    /**
     * Generar HTML del email de credenciales
     */
    async generarEmailCredenciales(datos) {
        const template = await this.cargarTemplate('email-credenciales');
        const fechas = this.obtenerFechas();
        
        const variables = {
            // Datos del usuario
            NOMBRE_COMPLETO: datos.nombre || 'Usuario',
            USERNAME: datos.username,
            PASSWORD: datos.password,
            
            // Datos del registro
            NUMERO_REGISTRO: datos.numeroRegistro || datos.numeroExpediente || 'N/A',
            NUMERO_EXPEDIENTE: datos.numeroExpediente || 'N/A',
            ID_USUARIO: datos.idUsuario || 'N/A',
            
            // Fechas
            FECHA_REGISTRO: fechas.fecha,
            FECHA_CREACION: fechas.fechaHora,
            
            // URLs
            URL_LOGIN: datos.urlLogin || `${this.config.urlBase}/login.html`,
            
            // Datos de contacto
            EMAIL_SOPORTE: this.config.emailSoporte,
            TELEFONO_SOPORTE: this.config.telefonoSoporte,
            DIRECCION_INSTITUCION: this.config.direccionInstitucion
        };
        
        return this.reemplazarVariables(template, variables);
    },

    /**
     * Generar HTML del email de recuperación de contraseña
     */
    async generarEmailRecuperacion(datos) {
        const template = await this.cargarTemplate('email-recuperacion');
        const fechas = this.obtenerFechas();
        
        const variables = {
            NOMBRE_COMPLETO: datos.nombre || 'Usuario',
            CODIGO_RECUPERACION: datos.codigo,
            TIEMPO_EXPIRACION: '10 minutos',
            EMAIL_SOPORTE: this.config.emailSoporte,
            TELEFONO_SOPORTE: this.config.telefonoSoporte,
            AÑO_ACTUAL: fechas.año
        };
        
        return this.reemplazarVariables(template, variables);
    },

    /**
     * Enviar email genérico
     */
    async enviarEmail(payload) {
        try {
            // Intentar endpoint principal
            let response = await fetch('/api/email/credenciales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Fallback a endpoint alternativo
            if (!response.ok) {
                console.warn('⚠️ Endpoint /credenciales falló, usando /test...');
                const fallback = {
                    to: payload.destinatario || payload.to,
                    subject: payload.asunto || payload.subject,
                    html: payload.contenido || payload.html
                };
                response = await fetch('/api/email/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(fallback)
                });
            }

            const data = await response.json();

            if (response.ok && data.success) {
                return { success: true, message: 'Email enviado correctamente' };
            } else {
                throw new Error(data.error || 'Error enviando email');
            }
        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return {
                success: false,
                message: 'Error al enviar email: ' + error.message
            };
        }
    },

    /**
     * Enviar código de recuperación de contraseña
     */
    async enviarCodigoRecuperacion(datos) {
        try {
            console.log('📧 Preparando email de recuperación...');
            
            const htmlContent = await this.generarEmailRecuperacion(datos);

            const payload = {
                to: datos.email,
                subject: '🔐 Código de Recuperación de Contraseña',
                html: htmlContent
            };

            console.log('📤 Enviando código a:', datos.email);

            const resultado = await this.enviarEmail(payload);
            
            if (resultado.success) {
                console.log('✅ Código enviado exitosamente');
            }
            
            return resultado;

        } catch (error) {
            console.error('❌ Error enviando código:', error);
            throw error;
        }
    },

    /**
     * Enviar email de credenciales
     */
    async enviarCredenciales(credenciales, datosAdicionales = {}) {
        try {
            console.log('📧 Preparando email de credenciales...');
            
            const htmlContent = await this.generarEmailCredenciales({
                nombre: credenciales.nombre,
                username: credenciales.username,
                password: credenciales.password,
                numeroRegistro: datosAdicionales.numeroRegistro || datosAdicionales.numero_registro,
                numeroExpediente: datosAdicionales.numeroExpediente,
                idUsuario: datosAdicionales.idUsuario,
                urlLogin: datosAdicionales.urlLogin
            });

            const payload = {
                destinatario: credenciales.email,
                asunto: '🔐 Credenciales de Acceso - Sistema de Mesa de Partes',
                contenido: htmlContent
            };

            console.log('📤 Enviando email a:', credenciales.email);

            const resultado = await this.enviarEmail(payload);
            
            if (resultado.success) {
                console.log('✅ Email enviado exitosamente');
            }
            
            return resultado;

        } catch (error) {
            console.error('❌ Error enviando email:', error);
            return {
                success: false,
                message: 'Error al enviar email: ' + error.message
            };
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EmailService = EmailService;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailService;
}
