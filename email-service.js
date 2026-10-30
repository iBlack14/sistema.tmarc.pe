'use strict';

// Adaptador de correo HTTPS: mantiene el contrato de los módulos existentes.
class EmailService {
    obtenerConfig() {
        return { provider: 'brevo', server: 'api.brevo.com', port: 443,
            fromEmail: process.env.BREVO_FROM_EMAIL || '',
            fromName: process.env.BREVO_FROM_NAME || 'Sistema TMARC',
            activo: this.hayConfiguracionValida() };
    }
    hayConfiguracionValida() {
        return Boolean(process.env.BREVO_API_KEY && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.BREVO_FROM_EMAIL || ''));
    }
    configurar() { return { success: this.hayConfiguracionValida(), message: 'Configure BREVO_API_KEY y BREVO_FROM_EMAIL en el servidor' }; }
    guardarConfig() { return this.configurar(); }
    validarConfig() { return this.hayConfiguracionValida(); }
    setSMTPService() {}
    obtenerConfiguracionesPredefinidas() { return {}; }
    validarConfiguracion() { return { valido: this.hayConfiguracionValida(), errores: this.hayConfiguracionValida() ? [] : ['Brevo no configurado'] }; }
    async request(endpoint, body) {
        const response = await fetch(`https://api.brevo.com/v3/${endpoint}`, {
            method: body ? 'POST' : 'GET',
            headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(`Brevo rechazó la solicitud (HTTP ${response.status})`);
            error.code = `BREVO_HTTP_${response.status}`;
            // Conservar el identificador técnico, nunca el mensaje o contenido privado.
            error.providerCode = /^[a-z_]{1,48}$/i.test(data?.code || '') ? data.code : undefined;
            throw error;
        }
        return data;
    }
    async probarConexion() {
        if (!this.hayConfiguracionValida()) return { success: false, message: 'Faltan BREVO_API_KEY o BREVO_FROM_EMAIL' };
        try { await this.request('account'); return { success: true, message: 'Conexión con Brevo API verificada' }; }
        catch (error) { return { success: false, message: error.message }; }
    }
    async enviarEmail(emailData = {}) {
        if (!this.hayConfiguracionValida()) return { success: false, code: 'BREVO_NOT_CONFIGURED', estado: 'pendiente_configuracion', message: 'Brevo no está configurado en el servidor' };
        const raw = emailData.to || emailData.destinatario || emailData.email || '';
        const to = (Array.isArray(raw) ? raw : String(raw).split(/[,;]/)).map(item => typeof item === 'string' ? { email: item.trim() } : item);
        if (!to.length || to.some(item => !item || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email || ''))) return { success: false, code: 'BREVO_INVALID_RECIPIENT', message: 'Destinatario inválido' };
        const baseUrl = (process.env.APP_URL || process.env.BASE_URL || 'https://sistema.tmarc.pe').replace(/\/+$/, '');
        const htmlContent = String(emailData.html || emailData.contenido || '').replaceAll('cid:logo@institucion', `${baseUrl}/assets/img/logo-cargo-2.png`);
        if (!htmlContent) return { success: false, message: 'Contenido del correo vacío' };
        try {
            const config = this.obtenerConfig();
            const result = await this.request('smtp/email', {
                sender: { email: config.fromEmail, name: config.fromName }, to,
                subject: String(emailData.subject || emailData.asunto || 'Mensaje del sistema'), htmlContent
            });
            if (!result.messageId) return { success: false, code: 'BREVO_NO_CONFIRMATION', estado: 'error', message: 'Brevo no confirmó la aceptación del correo' };
            return { success: true, estado: 'enviado', provider: 'brevo', messageId: result.messageId, message: 'Correo aceptado por Brevo' };
        } catch (error) {
            const code = /^BREVO_HTTP_\d{3}$/.test(error.code || '') ? error.code : error.name === 'TimeoutError' || error.name === 'AbortError' ? 'BREVO_TIMEOUT' : 'BREVO_NETWORK';
            return { success: false, estado: 'error', code, providerCode: error.providerCode, message: code === 'BREVO_NETWORK' ? 'No se pudo conectar con la API de Brevo' : error.message };
        }
    }
}
module.exports = new EmailService();
