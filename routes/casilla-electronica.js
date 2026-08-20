const express = require('express');
const router = express.Router();
const { query } = require('../database-config');

router.get('/', async (req, res) => {
    try {
        const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 50, 1), 100);
        const items = [];
        if (!req.query.tipo || req.query.tipo === 'registro') {
            items.push(...await query(`SELECT u.id,'registro' tipo,u.nombre titulo,u.email subtitulo,
                u.fecha_registro fecha,'Nuevo' estado,u.id referencia_id,
                JSON_OBJECT('usuario_id',u.id,'nombre',u.nombre,'email',u.email,'telefono',u.telefono,'tipo',u.tipo,'activo',u.activo) datos
                FROM usuarios u WHERE u.fecha_registro>=DATE_SUB(NOW(),INTERVAL 30 DAY)
                ORDER BY u.fecha_registro DESC LIMIT ?`, [limite]));
        }
        if (!req.query.tipo || req.query.tipo === 'mesa_partes') {
            const params = [];
            let where = '';
            if (req.query.estado) { where = ' WHERE mp.estado=?'; params.push(req.query.estado); }
            params.push(limite);
            items.push(...await query(`SELECT mp.id,'mesa_partes' tipo,mp.numero_registro titulo,
                CONCAT(mp.tipo_presentacion,' - ',mp.materia) subtitulo,mp.fecha_presentacion fecha,mp.estado,
                mp.id referencia_id,JSON_OBJECT('numero_registro',mp.numero_registro,'usuario_id',mp.usuario_id,
                'tipo_presentacion',mp.tipo_presentacion,'materia',mp.materia,'demandante',mp.demandante,
                'demandado',mp.demandado,'documentos',mp.documentos) datos
                FROM mesa_partes mp${where} ORDER BY mp.fecha_presentacion DESC LIMIT ?`, params));
        }
        items.sort((a,b) => new Date(b.fecha)-new Date(a.fecha));
        const data = items.slice(0, limite).map(item => ({ ...item, datos: typeof item.datos === 'string' ? JSON.parse(item.datos) : item.datos }));
        res.json({ success:true, data, total:data.length, estadisticas:{ total:data.length,
            por_tipo:{ registro:data.filter(i=>i.tipo==='registro').length, mesa_partes:data.filter(i=>i.tipo==='mesa_partes').length },
            por_estado:{ pendiente:data.filter(i=>i.estado==='Pendiente').length, aprobado:data.filter(i=>i.estado==='Aprobado').length,
            rechazado:data.filter(i=>i.estado==='Rechazado').length } } });
    } catch (error) {
        res.status(500).json({ success:false, error:'Error interno del servidor', details:error.message });
    }
});

router.get('/:tipo/:id', async (req, res) => {
    try {
        let rows;
        if (req.params.tipo === 'registro') {
            rows = await query(`SELECT u.*,(SELECT COUNT(*) FROM mesa_partes WHERE usuario_id=u.id) presentaciones_count
                FROM usuarios u WHERE u.id=?`, [req.params.id]);
        } else if (req.params.tipo === 'mesa_partes') {
            rows = await query(`SELECT mp.*,u.nombre usuario_nombre,u.email usuario_email FROM mesa_partes mp
                LEFT JOIN usuarios u ON u.id=mp.usuario_id WHERE mp.id=? OR mp.numero_registro=? LIMIT 1`, [req.params.id, req.params.id]);
        } else {
            return res.status(410).json({ success:false, error:'Tipo retirado; use mesa_partes' });
        }
        const item = rows[0];
        if (!item) return res.status(404).json({ success:false, error:'Item no encontrado' });
        for (const campo of ['demandante','demandado','documentos']) {
            if (typeof item[campo] === 'string') { try { item[campo] = JSON.parse(item[campo]); } catch (_) {} }
        }
        res.json({ success:true, data:item, tipo:req.params.tipo });
    } catch (error) {
        res.status(500).json({ success:false, error:'Error interno del servidor', details:error.message });
    }
});

module.exports = router;
