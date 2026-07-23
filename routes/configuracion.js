const express = require('express');
const router = express.Router();
const { query } = require('../database-config');

/**
 * GET /api/configuracion
 * Obtener toda la configuración del sistema
 */
router.get('/', async (req, res) => {
    try {
        const { categoria } = req.query;
        
        let sql = 'SELECT * FROM configuracion_sistema';
        let params = [];
        
        if (categoria) {
            sql += ' WHERE categoria = ?';
            params.push(categoria);
        }
        
        sql += ' ORDER BY categoria, clave';
        
        const configuraciones = await query(sql);
        
        // Convertir array a objeto
        const config = {};
        configuraciones.forEach(item => {
            let valor = item.valor;
            if (item.tipo === 'boolean') valor = valor === 'true' || valor === '1';
            else if (item.tipo === 'numero') valor = parseFloat(valor);
            
            config[item.clave] = {
                valor: valor,
                tipo: item.tipo,
                descripcion: item.descripcion,
                categoria: item.categoria
            };
        });
        
        // Mapear valores por defecto desde .env si no existen en la DB
        const defaults = {
            'nombre_sistema': {
                valor: process.env.SMTP_FROM_NAME || 'TMARC',
                tipo: 'texto',
                descripcion: 'Nombre de la institución',
                categoria: 'general'
            },
            'correo_soporte': {
                valor: process.env.SMTP_FROM_EMAIL || 'soporte@tmarc.org',
                tipo: 'texto',
                descripcion: 'Email de contacto',
                categoria: 'general'
            },
            'logo_url': {
                valor: '/img/logo.png',
                tipo: 'texto',
                descripcion: 'URL del logo',
                categoria: 'general'
            },
            'mantenimiento': {
                valor: false,
                tipo: 'boolean',
                descripcion: 'Estado de mantenimiento',
                categoria: 'sistema'
            }
        };

        // Mezclar con prioridades
        for (const [clave, def] of Object.entries(defaults)) {
            if (!config[clave] && (!categoria || def.categoria === categoria)) {
                config[clave] = def;
            }
        }
        
        res.json({
            success: true,
            data: config
        });
        
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * PUT /api/configuracion/:clave
 * Actualizar una configuración específica
 */
router.put('/:clave', async (req, res) => {
    try {
        const { clave } = req.params;
        const { valor } = req.body;
        
        if (valor === undefined) {
            return res.status(400).json({
                success: false,
                error: 'El campo valor es requerido'
            });
        }
        
        // Verificar si la configuración existe
        const existing = await query(
            'SELECT * FROM configuracion_sistema WHERE clave = ?',
            [clave]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Configuración no encontrada'
            });
        }
        
        // Convertir el valor según el tipo
        let valorFinal = valor;
        if (existing[0].tipo === 'boolean') {
            valorFinal = valor ? 'true' : 'false';
        } else if (existing[0].tipo === 'json') {
            valorFinal = JSON.stringify(valor);
        } else {
            valorFinal = String(valor);
        }
        
        // Actualizar
        await query(
            'UPDATE configuracion_sistema SET valor = ? WHERE clave = ?',
            [valorFinal, clave]
        );
        
        res.json({
            success: true,
            message: 'Configuración actualizada correctamente'
        });
        
    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST /api/configuracion/batch
 * Actualizar múltiples configuraciones a la vez
 */
router.post('/batch', async (req, res) => {
    try {
        const { configuraciones } = req.body;
        
        if (!configuraciones || typeof configuraciones !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'El campo configuraciones es requerido y debe ser un objeto'
            });
        }
        
        // Actualizar o insertar cada configuración
        const updates = [];
        for (const [clave, valor] of Object.entries(configuraciones)) {
            let valorFinal = valor;
            let tipo = 'texto';
            let categoria = 'general';

            // Determinar tipo y categoría por la clave para nuevas entradas
            if (clave === 'mantenimiento') {
                tipo = 'boolean';
                categoria = 'sistema';
                valorFinal = valor ? 'true' : 'false';
            } else if (typeof valor === 'boolean') {
                tipo = 'boolean';
                valorFinal = valor ? 'true' : 'false';
            }

            updates.push(
                query(`
                    INSERT INTO configuracion_sistema (clave, valor, tipo, categoria) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
                `, [clave, valorFinal, tipo, categoria])
            );
        }
        
        await Promise.all(updates);
        
        res.json({
            success: true,
            message: `${updates.length} configuraciones actualizadas correctamente`
        });
        
    } catch (error) {
        console.error('Error actualizando configuraciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/configuracion/smtp
 * Obtener configuración SMTP (From Email)
 */
router.get('/smtp', async (req, res) => {
    try {
        const smtpConfigManager = require('../smtp-config-manager');
        const config = smtpConfigManager.obtenerConfig();
        
        // Retornar el email configurado en el .env (vía el manager)
        res.json({
            success: true,
            data: {
                fromEmail: config.fromEmail || process.env.SMTP_FROM_EMAIL || ''
            }
        });
    } catch (error) {
        console.error('Error obteniendo config SMTP:', error);
        res.status(500).json({ success: false, error: 'Error interno' });
    }
});

module.exports = router;
