const express = require('express');
const router = express.Router();
const { query } = require('../database-config');

/**
 * GET /api/casilla-electronica
 * Obtener inbox unificado para admin
 * Incluye: Usuarios nuevos, Mesa de Partes, Expedientes, Solicitudes
 */
router.get('/', async (req, res) => {
    try {
        const { tipo, estado, fecha_desde, fecha_hasta, limite = 50 } = req.query;

        let items = [];

        // 1. USUARIOS NUEVOS (últimos 30 días)
        if (!tipo || tipo === 'registro') {
            const usuariosNuevos = await query(`
                SELECT 
                    u.id,
                    'registro' as tipo,
                    u.nombre as titulo,
                    u.email as subtitulo,
                    u.fecha_registro as fecha,
                    'Nuevo' as estado,
                    u.id as referencia_id,
                    JSON_OBJECT(
                        'usuario_id', u.id,
                        'nombre', u.nombre,
                        'email', u.email,
                        'telefono', u.telefono,
                        'tipo', u.tipo,
                        'activo', u.activo
                    ) as datos
                FROM usuarios u
                WHERE u.fecha_registro >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY u.fecha_registro DESC
                LIMIT ?
            `, [parseInt(limite)]);

            items = items.concat(usuariosNuevos);
        }

        // 2. MESA DE PARTES
        if (!tipo || tipo === 'mesa_partes') {
            try {
                const mesaPartes = await query(`
                    SELECT 
                        mp.id,
                        'mesa_partes' as tipo,
                        mp.numero_registro as titulo,
                        CONCAT(mp.tipo_presentacion, ' - ', mp.materia) as subtitulo,
                        mp.fecha_presentacion as fecha,
                        mp.estado,
                        mp.id as referencia_id,
                        JSON_OBJECT(
                            'numero_registro', mp.numero_registro,
                            'usuario_id', mp.usuario_id,
                            'tipo_presentacion', mp.tipo_presentacion,
                            'materia', mp.materia,
                            'demandante', mp.demandante,
                            'demandado', mp.demandado,
                            'documentos', mp.documentos
                        ) as datos
                    FROM mesa_partes mp
                    ${estado ? 'WHERE mp.estado = ?' : ''}
                    ORDER BY mp.fecha_presentacion DESC
                    LIMIT ?
                `, estado ? [estado, parseInt(limite)] : [parseInt(limite)]);

                items = items.concat(mesaPartes);
            } catch (error) {
                console.warn('⚠️ Tabla mesa_partes no existe o error:', error.message);
            }
        }

        // 3. EXPEDIENTES
        if (!tipo || tipo === 'expediente') {
            try {
                const expedientes = await query(`
                    SELECT 
                        e.id,
                        'expediente' as tipo,
                        e.numero as titulo,
                        CONCAT(e.sede, ' - ', e.especialidad) as subtitulo,
                        e.fecha_creacion as fecha,
                        e.estado,
                        e.id as referencia_id,
                        JSON_OBJECT(
                            'numero', e.numero,
                            'usuario_id', e.usuario_id,
                            'sede', e.sede,
                            'especialidad', e.especialidad,
                            'proceso', e.proceso,
                            'materia', e.materia
                        ) as datos
                    FROM expedientes e
                    ${estado ? 'WHERE e.estado = ?' : ''}
                    ORDER BY e.fecha_creacion DESC
                    LIMIT ?
                `, estado ? [estado, parseInt(limite)] : [parseInt(limite)]);

                items = items.concat(expedientes);
            } catch (error) {
                console.warn('⚠️ Tabla expedientes no existe o error:', error.message);
            }
        }

        // 4. SOLICITUDES
        if (!tipo || tipo === 'solicitud') {
            try {
                const solicitudes = await query(`
                    SELECT 
                        s.id,
                        'solicitud' as tipo,
                        s.asunto as titulo,
                        s.tipo as subtitulo,
                        s.fecha as fecha,
                        s.estado,
                        s.id as referencia_id,
                        JSON_OBJECT(
                            'id', s.id,
                            'usuario_id', s.usuario_id,
                            'nombre', s.nombre,
                            'email', s.email,
                            'tipo', s.tipo,
                            'asunto', s.asunto,
                            'descripcion', s.descripcion
                        ) as datos
                    FROM solicitudes s
                    ${estado ? 'WHERE s.estado = ?' : ''}
                    ORDER BY s.fecha DESC
                    LIMIT ?
                `, estado ? [estado, parseInt(limite)] : [parseInt(limite)]);

                items = items.concat(solicitudes);
            } catch (error) {
                console.warn('⚠️ Tabla solicitudes no existe o error:', error.message);
            }
        }

        // Ordenar todos los items por fecha (más reciente primero)
        items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Aplicar límite final
        items = items.slice(0, parseInt(limite));

        // Parsear JSON en datos
        items = items.map(item => ({
            ...item,
            datos: typeof item.datos === 'string' ? JSON.parse(item.datos) : item.datos
        }));

        // Obtener estadísticas
        const stats = {
            total: items.length,
            por_tipo: {
                registro: items.filter(i => i.tipo === 'registro').length,
                mesa_partes: items.filter(i => i.tipo === 'mesa_partes').length,
                expediente: items.filter(i => i.tipo === 'expediente').length,
                solicitud: items.filter(i => i.tipo === 'solicitud').length
            },
            por_estado: {
                pendiente: items.filter(i => i.estado === 'Pendiente').length,
                en_revision: items.filter(i => i.estado === 'En Revisión').length,
                aprobado: items.filter(i => i.estado === 'Aprobado').length,
                rechazado: items.filter(i => i.estado === 'Rechazado').length
            }
        };

        res.json({
            success: true,
            data: items,
            estadisticas: stats,
            total: items.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo casilla electrónica:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/casilla-electronica/:tipo/:id
 * Obtener detalle de un item específico
 */
router.get('/:tipo/:id', async (req, res) => {
    try {
        const { tipo, id } = req.params;
        let item = null;

        switch (tipo) {
            case 'registro':
                try {
                    const usuarios = await query(`
                        SELECT u.*, 
                            (SELECT COUNT(*) FROM mesa_partes WHERE usuario_id = u.id) as presentaciones_count,
                            (SELECT COUNT(*) FROM expedientes WHERE usuario_id = u.id) as expedientes_count
                        FROM usuarios u 
                        WHERE u.id = ?
                    `, [id]);
                    item = usuarios[0];
                } catch (error) {
                    // Si falla el subquery, intentar sin contadores
                    const usuarios = await query(`SELECT * FROM usuarios WHERE id = ?`, [id]);
                    item = usuarios[0];
                    if (item) {
                        item.presentaciones_count = 0;
                        item.expedientes_count = 0;
                    }
                }
                break;

            case 'mesa_partes':
                try {
                    const mesaPartes = await query(`
                        SELECT mp.*, u.nombre as usuario_nombre, u.email as usuario_email
                        FROM mesa_partes mp
                        LEFT JOIN usuarios u ON mp.usuario_id = u.id
                        WHERE mp.id = ?
                    `, [id]);
                    item = mesaPartes[0];
                    if (item) {
                        // Parsear JSON solo si es string
                        if (item.demandante && typeof item.demandante === 'string') {
                            try { item.demandante = JSON.parse(item.demandante); } catch (e) {}
                        }
                        if (item.demandado && typeof item.demandado === 'string') {
                            try { item.demandado = JSON.parse(item.demandado); } catch (e) {}
                        }
                        if (item.documentos && typeof item.documentos === 'string') {
                            try { item.documentos = JSON.parse(item.documentos); } catch (e) {}
                        }
                    }
                } catch (error) {
                    console.error('Error obteniendo mesa_partes:', error.message);
                    return res.status(404).json({
                        success: false,
                        error: 'Tabla mesa_partes no existe o item no encontrado'
                    });
                }
                break;

            case 'expediente':
                try {
                    const expedientes = await query(`
                        SELECT e.*, u.nombre as usuario_nombre, u.email as usuario_email
                        FROM expedientes e
                        LEFT JOIN usuarios u ON e.usuario_id = u.id
                        WHERE e.id = ?
                    `, [id]);
                    item = expedientes[0];
                    // Agregar numero_expediente como alias para compatibilidad
                    if (item && item.numero) {
                        item.numero_expediente = item.numero;
                    }
                } catch (error) {
                    console.error('Error obteniendo expediente:', error.message);
                    return res.status(404).json({
                        success: false,
                        error: 'Tabla expedientes no existe o item no encontrado'
                    });
                }
                break;

            case 'solicitud':
                try {
                    // Intentar buscar por id numérico o por asunto (que puede contener el código)
                    const solicitudes = await query(`
                        SELECT s.*, u.nombre as usuario_nombre
                        FROM solicitudes s
                        LEFT JOIN usuarios u ON s.usuario_id = u.id
                        WHERE s.id = ? OR s.asunto LIKE ?
                        LIMIT 1
                    `, [id, `%${id}%`]);
                    item = solicitudes[0];
                    if (item && item.documentos) {
                        try {
                            item.documentos = JSON.parse(item.documentos);
                        } catch (e) {
                            item.documentos = [];
                        }
                    }
                } catch (error) {
                    console.error('Error obteniendo solicitud:', error.message);
                    return res.status(404).json({
                        success: false,
                        error: 'Tabla solicitudes no existe o item no encontrado'
                    });
                }
                break;

            default:
                return res.status(400).json({
                    success: false,
                    error: 'Tipo no válido'
                });
        }

        if (!item) {
            return res.status(404).json({
                success: false,
                error: 'Item no encontrado'
            });
        }

        res.json({
            success: true,
            data: item,
            tipo: tipo
        });

    } catch (error) {
        console.error('❌ Error obteniendo detalle:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

module.exports = router;
