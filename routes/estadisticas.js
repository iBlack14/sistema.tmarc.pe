const express = require('express');
const router = express.Router();
const { query } = require('../database-config');

/**
 * GET /api/estadisticas/dashboard
 * Obtener estadísticas para el dashboard del admin
 */
router.get('/dashboard', async (req, res) => {
    try {
        const stats = {};

        // 1. USUARIOS ACTIVOS
        try {
            const usuarios = await query(`
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
                       SUM(CASE WHEN fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as nuevos_semana
                FROM usuarios
            `);
            stats.usuarios = {
                total: usuarios[0].total || 0,
                activos: usuarios[0].activos || 0,
                nuevos_semana: usuarios[0].nuevos_semana || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo usuarios:', error.message);
            stats.usuarios = { total: 0, activos: 0, nuevos_semana: 0 };
        }

        // 2. SOLICITUDES PENDIENTES
        try {
            const solicitudes = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
                       SUM(CASE WHEN estado = 'Aprobado' THEN 1 ELSE 0 END) as aprobadas,
                       SUM(CASE WHEN estado = 'Rechazado' THEN 1 ELSE 0 END) as rechazadas
                FROM solicitudes
            `);
            stats.solicitudes = {
                total: solicitudes[0].total || 0,
                pendientes: solicitudes[0].pendientes || 0,
                aprobadas: solicitudes[0].aprobadas || 0,
                rechazadas: solicitudes[0].rechazadas || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo solicitudes:', error.message);
            stats.solicitudes = { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0 };
        }

        // 3. EXPEDIENTES
        try {
            const expedientes = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'Activo' OR estado = 'Nuevo' THEN 1 ELSE 0 END) as activos,
                       SUM(CASE WHEN estado = 'Finalizado' THEN 1 ELSE 0 END) as finalizados
                FROM expedientes
            `);
            stats.expedientes = {
                total: expedientes[0].total || 0,
                activos: expedientes[0].activos || 0,
                finalizados: expedientes[0].finalizados || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo expedientes:', error.message);
            stats.expedientes = { total: 0, activos: 0, finalizados: 0 };
        }

        // 4. MESA DE PARTES
        try {
            const mesaPartes = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
                       SUM(CASE WHEN estado = 'Aprobado' THEN 1 ELSE 0 END) as aprobados,
                       SUM(CASE WHEN estado = 'Rechazado' THEN 1 ELSE 0 END) as rechazados
                FROM mesa_partes
            `);
            stats.mesa_partes = {
                total: mesaPartes[0].total || 0,
                pendientes: mesaPartes[0].pendientes || 0,
                aprobados: mesaPartes[0].aprobados || 0,
                rechazados: mesaPartes[0].rechazados || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo mesa_partes:', error.message);
            stats.mesa_partes = { total: 0, pendientes: 0, aprobados: 0, rechazados: 0 };
        }

        // 5. NOTIFICACIONES
        try {
            const notificaciones = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas
                FROM notificaciones
            `);
            stats.notificaciones = {
                total: notificaciones[0].total || 0,
                no_leidas: notificaciones[0].no_leidas || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo notificaciones:', error.message);
            stats.notificaciones = { total: 0, no_leidas: 0 };
        }

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/estadisticas/actividades-recientes
 * Obtener últimas actividades del sistema
 */
router.get('/actividades-recientes', async (req, res) => {
    try {
        const { limite = 10 } = req.query;
        let actividades = [];

        // 1. Usuarios nuevos
        try {
            const usuarios = await query(`
                SELECT 
                    'registro' as tipo,
                    u.nombre as usuario,
                    'Nuevo registro de usuario' as accion,
                    u.fecha_registro as fecha,
                    'Completado' as estado
                FROM usuarios u
                WHERE u.fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                ORDER BY u.fecha_registro DESC
                LIMIT ?
            `, [parseInt(limite)]);
            actividades = actividades.concat(usuarios);
        } catch (error) {
            console.warn('⚠️ Error obteniendo usuarios recientes:', error.message);
        }

        // 2. Solicitudes recientes
        try {
            const solicitudes = await query(`
                SELECT 
                    'solicitud' as tipo,
                    s.nombre as usuario,
                    CONCAT('Solicitud: ', s.asunto) as accion,
                    s.fecha as fecha,
                    s.estado
                FROM solicitudes s
                ORDER BY s.fecha DESC
                LIMIT ?
            `, [parseInt(limite)]);
            actividades = actividades.concat(solicitudes);
        } catch (error) {
            console.warn('⚠️ Error obteniendo solicitudes recientes:', error.message);
        }

        // 3. Mesa de Partes (Omitido por redundancia con solicitudes)
        /* try {
            const mesaPartes = await query(`
                SELECT 
                    'mesa_partes' as tipo,
                    u.nombre as usuario,
                    CONCAT('Presentación: ', mp.numero_registro) as accion,
                    mp.fecha_presentacion as fecha,
                    mp.estado
                FROM mesa_partes mp
                LEFT JOIN usuarios u ON mp.usuario_id = u.id
                ORDER BY mp.fecha_presentacion DESC
                LIMIT ?
            `, [parseInt(limite)]);
            actividades = actividades.concat(mesaPartes);
        } catch (error) {
            console.warn('⚠️ Error obteniendo mesa_partes recientes:', error.message);
        } */

        // Ordenar por fecha y limitar
        actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        actividades = actividades.slice(0, parseInt(limite));

        res.json({
            success: true,
            data: actividades
        });

    } catch (error) {
        console.error('❌ Error obteniendo actividades:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/estadisticas/usuario/:id
 * Obtener estadísticas para el dashboard del usuario
 */
router.get('/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = {};

        // 1. SOLICITUDES DEL USUARIO
        try {
            const solicitudes = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
                       SUM(CASE WHEN estado = 'Aprobado' THEN 1 ELSE 0 END) as aprobadas
                FROM solicitudes
                WHERE usuario_id = ?
            `, [id]);
            stats.solicitudes = {
                total: solicitudes[0].total || 0,
                pendientes: solicitudes[0].pendientes || 0,
                aprobadas: solicitudes[0].aprobadas || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo solicitudes del usuario:', error.message);
            stats.solicitudes = { total: 0, pendientes: 0, aprobadas: 0 };
        }

        // 2. EXPEDIENTES DEL USUARIO
        try {
            const expedientes = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'Activo' OR estado = 'Nuevo' THEN 1 ELSE 0 END) as activos
                FROM expedientes
                WHERE usuario_id = ?
            `, [id]);
            stats.expedientes = {
                total: expedientes[0].total || 0,
                activos: expedientes[0].activos || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo expedientes del usuario:', error.message);
            stats.expedientes = { total: 0, activos: 0 };
        }

        // 3. MESA DE PARTES DEL USUARIO (Vinculado a solicitudes)
        stats.mesa_partes = {
            total: stats.solicitudes.total,
            pendientes: stats.solicitudes.pendientes
        };

        // 4. NOTIFICACIONES DEL USUARIO
        try {
            const notificaciones = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas
                FROM notificaciones
                WHERE usuario_id = ?
            `, [id]);
            stats.notificaciones = {
                total: notificaciones[0].total || 0,
                no_leidas: notificaciones[0].no_leidas || 0
            };
        } catch (error) {
            console.warn('⚠️ Error obteniendo notificaciones del usuario:', error.message);
            stats.notificaciones = { total: 0, no_leidas: 0 };
        }

        // 5. DOCUMENTOS TOTALES (suma de todo)
        stats.documentos = {
            total: stats.solicitudes.total + stats.expedientes.total + stats.mesa_partes.total
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas del usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/estadisticas/usuario/:id/actividades
 * Obtener actividades recientes del usuario específico
 */
router.get('/usuario/:id/actividades', async (req, res) => {
    try {
        const { id } = req.params;
        const { limite = 10 } = req.query;
        let actividades = [];

        // 1. Solicitudes del usuario
        try {
            const solicitudes = await query(`
                SELECT 
                    'solicitud' as tipo,
                    CONCAT('Presentaste solicitud: ', s.asunto) as actividad,
                    s.fecha as fecha,
                    s.estado
                FROM solicitudes s
                WHERE s.usuario_id = ?
                ORDER BY s.fecha DESC
                LIMIT ?
            `, [id, parseInt(limite)]);
            actividades = actividades.concat(solicitudes);
        } catch (error) {
            console.warn('⚠️ Error obteniendo solicitudes:', error.message);
        }

        // 2. Expedientes del usuario
        try {
            const expedientes = await query(`
                SELECT 
                    'expediente' as tipo,
                    CONCAT('Creaste expediente: ', e.numero) as actividad,
                    e.fecha_creacion as fecha,
                    e.estado
                FROM expedientes e
                WHERE e.usuario_id = ?
                ORDER BY e.fecha_creacion DESC
                LIMIT ?
            `, [id, parseInt(limite)]);
            actividades = actividades.concat(expedientes);
        } catch (error) {
            console.warn('⚠️ Error obteniendo expedientes:', error.message);
        }

        // 3. Mesa de Partes del usuario (Omitido por redundancia)
        /* try {
            const mesaPartes = await query(`
                SELECT 
                    'mesa_partes' as tipo,
                    CONCAT('Presentaste documento: ', mp.numero_registro) as actividad,
                    mp.fecha_presentacion as fecha,
                    mp.estado
                FROM mesa_partes mp
                WHERE mp.usuario_id = ?
                ORDER BY mp.fecha_presentacion DESC
                LIMIT ?
            `, [id, parseInt(limite)]);
            actividades = actividades.concat(mesaPartes);
        } catch (error) {
            console.warn('⚠️ Error obteniendo mesa_partes:', error.message);
        } */

        // 4. Notificaciones del usuario
        try {
            const notificaciones = await query(`
                SELECT 
                    'notificacion' as tipo,
                    CONCAT('Recibiste: ', n.titulo) as actividad,
                    n.fecha as fecha,
                    CASE WHEN n.leida = 1 THEN 'Leída' ELSE 'No leída' END as estado
                FROM notificaciones n
                WHERE n.usuario_id = ?
                ORDER BY n.fecha DESC
                LIMIT ?
            `, [id, parseInt(limite)]);
            actividades = actividades.concat(notificaciones);
        } catch (error) {
            console.warn('⚠️ Error obteniendo notificaciones:', error.message);
        }

        // Ordenar por fecha y limitar
        actividades.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        actividades = actividades.slice(0, parseInt(limite));

        res.json({
            success: true,
            data: actividades
        });

    } catch (error) {
        console.error('❌ Error obteniendo actividades del usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;
