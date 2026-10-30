const router = require('express').Router();
const email = require('../email-service');

router.get(['/email/status', '/smtp/estado', '/smtp/status'], (_req, res) => {
    const config = email.obtenerConfig();
    res.json({ success: true, data: { ...config, configurado: config.activo, conectado: false, configuracion: config }, configuracion_activa: config.activo, ...config });
});
router.post(['/email/verify', '/smtp/test', '/smtp/probar'], async (_req, res) => {
    const result = await email.probarConexion();
    res.status(result.success ? 200 : 503).json(result);
});
router.post('/smtp/configurar', (_req, res) => {
    res.status(409).json({ success: false, message: 'El correo usa Brevo API. Configure BREVO_API_KEY, BREVO_FROM_EMAIL y BREVO_FROM_NAME en el servidor.' });
});
module.exports = router;
