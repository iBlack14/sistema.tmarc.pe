const express = require('express');
const router = express.Router();
const { query } = require('../database-config');

const limiteSeguro = valor => Math.min(Math.max(parseInt(valor, 10) || 10, 1), 100);

async function resumenMesa(usuarioId = null) {
    const where = usuarioId ? ' WHERE usuario_id = ?' : '';
    const [fila = {}] = await query(`
        SELECT COUNT(*) total,
               SUM(estado = 'Pendiente') pendientes,
               SUM(estado = 'Recibido') recibidos,
               SUM(estado = 'Aprobado') aprobados,
               SUM(estado = 'Rechazado') rechazados
        FROM mesa_partes${where}
    `, usuarioId ? [usuarioId] : []);
    return {
        total: Number(fila.total || 0), pendientes: Number(fila.pendientes || 0),
        recibidos: Number(fila.recibidos || 0), aprobados: Number(fila.aprobados || 0),
        rechazados: Number(fila.rechazados || 0)
    };
}

router.get('/dashboard', async (_req, res) => {
    try {
        const [usuarios = {}] = await query(`SELECT COUNT(*) total, SUM(activo=1) activos,
            SUM(fecha_registro >= DATE_SUB(NOW(), INTERVAL 7 DAY)) nuevos_semana FROM usuarios`);
        const mesa = await resumenMesa();
        const [notificaciones = {}] = await query('SELECT COUNT(*) total, SUM(leida=0) no_leidas FROM notificaciones');
        res.json({ success: true, data: {
            usuarios: { total: Number(usuarios.total || 0), activos: Number(usuarios.activos || 0), nuevos_semana: Number(usuarios.nuevos_semana || 0) },
            mesa_partes: mesa,
            notificaciones: { total: Number(notificaciones.total || 0), no_leidas: Number(notificaciones.no_leidas || 0) }
        }});
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
    }
});

router.get('/actividades-recientes', async (req, res) => {
    try {
        const limite = limiteSeguro(req.query.limite);
        const actividades = await query(`SELECT 'mesa_partes' tipo, COALESCE(u.nombre,'Usuario') usuario,
            CONCAT('Presentación: ',mp.numero_registro) accion, mp.fecha_presentacion fecha, mp.estado
            FROM mesa_partes mp LEFT JOIN usuarios u ON u.id=mp.usuario_id
            ORDER BY mp.fecha_presentacion DESC LIMIT ?`, [limite]);
        res.json({ success: true, data: actividades });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
    }
});

router.get('/usuario/:id', async (req, res) => {
    try {
        const mesa = await resumenMesa(req.params.id);
        const [notificaciones = {}] = await query('SELECT COUNT(*) total, SUM(leida=0) no_leidas FROM notificaciones WHERE usuario_id=?', [req.params.id]);
        res.json({ success: true, data: {
            mesa_partes: mesa,
            documentos: { total: mesa.total },
            notificaciones: { total: Number(notificaciones.total || 0), no_leidas: Number(notificaciones.no_leidas || 0) }
        }});
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
    }
});

router.get('/usuario/:id/actividades', async (req, res) => {
    try {
        const limite = limiteSeguro(req.query.limite);
        const actividades = await query(`SELECT 'mesa_partes' tipo,
            CONCAT('Presentaste: ',numero_registro) actividad, fecha_presentacion fecha, estado
            FROM mesa_partes WHERE usuario_id=? ORDER BY fecha_presentacion DESC LIMIT ?`, [req.params.id, limite]);
        res.json({ success: true, data: actividades });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
    }
});

module.exports = router;
