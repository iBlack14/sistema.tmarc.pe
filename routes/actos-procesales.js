// routes/actos-procesales.js
// CRUD completo para actos procesales y notificaciones procesales
const express = require('express');
const router = express.Router({ mergeParams: true });
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database-config');

// ─── Multer para documentos de actos ─────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../uploads/actos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'ACTO-' + unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = /pdf|doc|docx|jpg|jpeg|png/i.test(path.extname(file.originalname));
        ok ? cb(null, true) : cb(new Error('Tipo de archivo no permitido'));
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function expedienteExiste(id) {
    // Busca en expedientes (por id interno o número visible)
    const rows = await query(
        `SELECT id FROM expedientes WHERE id = ? OR numero = ? LIMIT 1`,
        [id, id]
    );
    return rows[0] || null;
}

async function registrarAuditoria(tabla, registro_id, accion, usuario_id, datos) {
    try {
        await query(
            `INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, usuario_id, detalles)
             VALUES (?, ?, ?, ?, ?)`,
            [tabla, String(registro_id), accion, usuario_id, JSON.stringify(datos)]
        );
    } catch (_) { /* no interrumpir la op principal */ }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ACTOS PROCESALES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/expedientes/:expedienteId/actos
 * Timeline completo: actos + sus notificaciones anidadas
 */
router.get('/:expedienteId/actos', async (req, res) => {
    try {
        const { expedienteId } = req.params;

        // Aceptar id interno o número de expediente
        const exp = await expedienteExiste(expedienteId);
        if (!exp) return res.status(404).json({ success: false, error: 'Expediente no encontrado' });

        const actos = await query(`
            SELECT ap.*,
                   u.nombre AS creado_por_nombre
            FROM actos_procesales ap
            LEFT JOIN usuarios u ON ap.creado_por = u.id
            WHERE ap.expediente_id = ?
            ORDER BY ap.fecha_ingreso ASC, ap.id ASC
        `, [exp.id]);

        // Obtener notificaciones anidadas para cada acto
        const actosConNotif = await Promise.all(actos.map(async acto => {
            const notifs = await query(`
                SELECT * FROM notificaciones_procesales
                WHERE acto_procesal_id = ?
                ORDER BY fecha_envio ASC, id ASC
            `, [acto.id]);
            return { ...acto, notificaciones: notifs };
        }));

        res.json({ success: true, data: actosConNotif, total: actosConNotif.length });
    } catch (err) {
        console.error('Error GET actos:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/expedientes/:expedienteId/actos
 * Crear nuevo acto procesal (con archivo opcional) — Admin
 */
router.post('/:expedienteId/actos', upload.single('documento'), async (req, res) => {
    try {
        const { expedienteId } = req.params;
        const exp = await expedienteExiste(expedienteId);
        if (!exp) return res.status(404).json({ success: false, error: 'Expediente no encontrado' });

        const {
            fecha_ingreso, resolucion, tipo_acto = 'NOTA',
            folios = 0, fojas = 0, fecha_proveido,
            tipo_notificacion, sumilla, descripcion_usuario,
            creado_por
        } = req.body;

        if (!fecha_ingreso) {
            return res.status(400).json({ success: false, error: 'fecha_ingreso es requerida' });
        }

        // Datos del documento adjunto
        let tiene_documento = 0;
        let documento_nombre = null;
        let documento_archivo = null;
        let documento_ruta = null;

        if (req.file) {
            tiene_documento = 1;
            documento_nombre = req.file.originalname;
            documento_archivo = req.file.filename;
            documento_ruta = `/uploads/actos/${req.file.filename}`;
        }

        const result = await query(`
            INSERT INTO actos_procesales (
                expediente_id, fecha_ingreso, resolucion, tipo_acto,
                folios, fojas, fecha_proveido, tipo_notificacion,
                sumilla, descripcion_usuario,
                tiene_documento, documento_nombre, documento_archivo, documento_ruta,
                creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            exp.id, fecha_ingreso, resolucion || null, tipo_acto,
            parseInt(folios) || 0, parseInt(fojas) || 0,
            fecha_proveido || null, tipo_notificacion || null,
            sumilla || null, descripcion_usuario || null,
            tiene_documento, documento_nombre, documento_archivo, documento_ruta,
            creado_por || null
        ]);

        await registrarAuditoria('actos_procesales', result.insertId, 'INSERT', creado_por, req.body);

        res.status(201).json({
            success: true,
            message: 'Acto procesal creado exitosamente',
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error POST acto:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/actos/:id
 * Editar acto procesal existente (con reemplazo de archivo opcional) — Admin
 */
router.put('/actos/:id', upload.single('documento'), async (req, res) => {
    try {
        const { id } = req.params;
        const existente = await query('SELECT * FROM actos_procesales WHERE id = ?', [id]);
        if (!existente.length) return res.status(404).json({ success: false, error: 'Acto no encontrado' });

        const actual = existente[0];
        const {
            fecha_ingreso, resolucion, tipo_acto,
            folios, fojas, fecha_proveido,
            tipo_notificacion, sumilla, descripcion_usuario,
            usuario_id
        } = req.body;

        let tiene_documento = actual.tiene_documento;
        let documento_nombre = actual.documento_nombre;
        let documento_archivo = actual.documento_archivo;
        let documento_ruta = actual.documento_ruta;

        // Si se sube un nuevo archivo, reemplazar
        if (req.file) {
            // Eliminar archivo anterior si existe
            if (actual.documento_archivo) {
                const rutaAnterior = path.join(__dirname, '../uploads/actos', actual.documento_archivo);
                if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
            }
            tiene_documento = 1;
            documento_nombre = req.file.originalname;
            documento_archivo = req.file.filename;
            documento_ruta = `/uploads/actos/${req.file.filename}`;
        }

        await query(`
            UPDATE actos_procesales SET
                fecha_ingreso = COALESCE(?, fecha_ingreso),
                resolucion = COALESCE(?, resolucion),
                tipo_acto = COALESCE(?, tipo_acto),
                folios = COALESCE(?, folios),
                fojas = COALESCE(?, fojas),
                fecha_proveido = ?,
                tipo_notificacion = COALESCE(?, tipo_notificacion),
                sumilla = COALESCE(?, sumilla),
                descripcion_usuario = COALESCE(?, descripcion_usuario),
                tiene_documento = ?,
                documento_nombre = ?,
                documento_archivo = ?,
                documento_ruta = ?
            WHERE id = ?
        `, [
            fecha_ingreso || null,
            resolucion !== undefined ? resolucion : null,
            tipo_acto || null,
            folios !== undefined ? parseInt(folios) : null,
            fojas !== undefined ? parseInt(fojas) : null,
            fecha_proveido || null,
            tipo_notificacion || null,
            sumilla || null,
            descripcion_usuario || null,
            tiene_documento, documento_nombre, documento_archivo, documento_ruta,
            id
        ]);

        await registrarAuditoria('actos_procesales', id, 'UPDATE', usuario_id, req.body);

        res.json({ success: true, message: 'Acto actualizado exitosamente' });
    } catch (err) {
        console.error('Error PUT acto:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/actos/:id
 * Eliminar acto procesal — Admin
 */
router.delete('/actos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await query('SELECT * FROM actos_procesales WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Acto no encontrado' });

        const acto = rows[0];

        // Eliminar archivo físico si existe
        if (acto.documento_archivo) {
            const ruta = path.join(__dirname, '../uploads/actos', acto.documento_archivo);
            if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
        }

        await query('DELETE FROM actos_procesales WHERE id = ?', [id]);
        await registrarAuditoria('actos_procesales', id, 'DELETE', req.body.usuario_id, acto);

        res.json({ success: true, message: 'Acto eliminado exitosamente' });
    } catch (err) {
        console.error('Error DELETE acto:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NOTIFICACIONES PROCESALES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/expedientes/:expedienteId/notificaciones-procesales
 */
router.get('/:expedienteId/notificaciones-procesales', async (req, res) => {
    try {
        const { expedienteId } = req.params;
        const exp = await expedienteExiste(expedienteId);
        if (!exp) return res.status(404).json({ success: false, error: 'Expediente no encontrado' });

        const rows = await query(`
            SELECT np.*, u.nombre AS creado_por_nombre
            FROM notificaciones_procesales np
            LEFT JOIN usuarios u ON np.creado_por = u.id
            WHERE np.expediente_id = ?
            ORDER BY np.fecha_envio ASC, np.id ASC
        `, [exp.id]);

        res.json({ success: true, data: rows, total: rows.length });
    } catch (err) {
        console.error('Error GET notificaciones-procesales:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * POST /api/expedientes/:expedienteId/notificaciones-procesales
 * Crear nueva notificación procesal — Admin
 */
router.post('/:expedienteId/notificaciones-procesales', async (req, res) => {
    try {
        const { expedienteId } = req.params;
        const exp = await expedienteExiste(expedienteId);
        if (!exp) return res.status(404).json({ success: false, error: 'Expediente no encontrado' });

        const {
            acto_procesal_id, numero_notificacion, destinatario,
            anexos, forma_entrega, fecha_envio, estado = 'Enviada',
            observaciones, creado_por
        } = req.body;

        if (!destinatario || !fecha_envio) {
            return res.status(400).json({ success: false, error: 'destinatario y fecha_envio son requeridos' });
        }

        const result = await query(`
            INSERT INTO notificaciones_procesales (
                expediente_id, acto_procesal_id, numero_notificacion,
                destinatario, anexos, forma_entrega, fecha_envio,
                estado, observaciones, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            exp.id, acto_procesal_id || null, numero_notificacion || null,
            destinatario, anexos || null, forma_entrega || null, fecha_envio,
            estado, observaciones || null, creado_por || null
        ]);

        await registrarAuditoria('notificaciones_procesales', result.insertId, 'INSERT', creado_por, req.body);

        res.status(201).json({
            success: true,
            message: 'Notificación procesal creada exitosamente',
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error POST notificación procesal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * PUT /api/notificaciones-procesales/:id
 * Editar notificación procesal — Admin
 */
router.put('/notificaciones-procesales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await query('SELECT id FROM notificaciones_procesales WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Notificación no encontrada' });

        const {
            numero_notificacion, destinatario, anexos,
            forma_entrega, fecha_envio, estado, observaciones,
            acto_procesal_id, usuario_id
        } = req.body;

        await query(`
            UPDATE notificaciones_procesales SET
                numero_notificacion = COALESCE(?, numero_notificacion),
                destinatario = COALESCE(?, destinatario),
                anexos = COALESCE(?, anexos),
                forma_entrega = COALESCE(?, forma_entrega),
                fecha_envio = COALESCE(?, fecha_envio),
                estado = COALESCE(?, estado),
                observaciones = COALESCE(?, observaciones),
                acto_procesal_id = COALESCE(?, acto_procesal_id)
            WHERE id = ?
        `, [
            numero_notificacion || null, destinatario || null, anexos || null,
            forma_entrega || null, fecha_envio || null, estado || null,
            observaciones || null, acto_procesal_id || null,
            id
        ]);

        await registrarAuditoria('notificaciones_procesales', id, 'UPDATE', usuario_id, req.body);
        res.json({ success: true, message: 'Notificación actualizada exitosamente' });
    } catch (err) {
        console.error('Error PUT notificación procesal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * DELETE /api/notificaciones-procesales/:id
 * Eliminar notificación procesal — Admin
 */
router.delete('/notificaciones-procesales/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await query('SELECT id FROM notificaciones_procesales WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Notificación no encontrada' });

        await query('DELETE FROM notificaciones_procesales WHERE id = ?', [id]);
        await registrarAuditoria('notificaciones_procesales', id, 'DELETE', req.body.usuario_id, {});
        res.json({ success: true, message: 'Notificación eliminada exitosamente' });
    } catch (err) {
        console.error('Error DELETE notificación procesal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ENDPOINT UNIFICADO DE SEGUIMIENTO (búsqueda por código)
//  GET /api/seguimiento/:codigo
//  Retorna expediente completo: datos + partes + actos + notificaciones
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/seguimiento/:codigo', async (req, res) => {
    try {
        const codigo = decodeURIComponent(req.params.codigo || '').trim();
        if (!codigo) return res.status(400).json({ success: false, error: 'codigo requerido' });

        const upper = codigo.toUpperCase();

        // 1. Buscar en expedientes
        let rows = await query(`
            SELECT e.*, u.nombre AS nombre_usuario
            FROM expedientes e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            WHERE UPPER(e.id) = ?
               OR UPPER(e.numero) = ?
               OR UPPER(e.numero) LIKE ?
            LIMIT 1
        `, [upper, upper, `%${upper}%`]);

        if (rows && rows.length > 0) {
            const exp = rows[0];

            // Partes procesales
            const partes = await query(
                'SELECT * FROM partes_procesales WHERE expediente_id = ? ORDER BY tipo_parte, id',
                [exp.id]
            );

            // Actos con notificaciones anidadas
            const actos = await query(`
                SELECT ap.*, u.nombre AS creado_por_nombre
                FROM actos_procesales ap
                LEFT JOIN usuarios u ON ap.creado_por = u.id
                WHERE ap.expediente_id = ?
                ORDER BY ap.fecha_ingreso ASC, ap.id ASC
            `, [exp.id]);

            const actosConNotif = await Promise.all(actos.map(async acto => {
                const notifs = await query(
                    'SELECT * FROM notificaciones_procesales WHERE acto_procesal_id = ? ORDER BY fecha_envio ASC',
                    [acto.id]
                );
                return { ...acto, notificaciones: notifs };
            }));

            // Documentos adjuntos del expediente
            const documentos = await query(
                'SELECT * FROM documentos WHERE expediente_id = ? ORDER BY fecha_subida DESC',
                [exp.id]
            );

            // Parsear campo documentos JSON si existe
            let docsJson = [];
            if (exp.documentos) {
                try {
                    docsJson = typeof exp.documentos === 'string'
                        ? JSON.parse(exp.documentos)
                        : exp.documentos;
                } catch (_) {}
            }

            return res.json({
                success: true,
                fuente: 'expediente',
                datos_generales: exp,
                partes_procesales: partes,
                actos_procesales: actosConNotif,
                documentos: documentos.length > 0 ? documentos : docsJson,
                total_actos: actosConNotif.length
            });
        }

        // 2. Buscar en mesa_partes
        const mpRows = await query(`
            SELECT mp.*, u.nombre AS nombre_usuario
            FROM mesa_partes mp
            LEFT JOIN usuarios u ON mp.usuario_id = u.id
            WHERE UPPER(mp.numero_registro) = ?
            LIMIT 1
        `, [upper]);

        if (mpRows && mpRows.length > 0) {
            const mp = mpRows[0];

            // Parsear JSON
            ['demandante', 'demandado', 'documentos'].forEach(k => {
                if (mp[k] && typeof mp[k] === 'string') {
                    try { mp[k] = JSON.parse(mp[k]); } catch (_) {}
                }
            });

            // Construir partes desde demandante/demandado
            const partes = [];
            if (mp.demandante) {
                partes.push({ tipo_parte: 'demandante', ...mp.demandante });
            }
            if (mp.demandado) {
                partes.push({ tipo_parte: 'demandado', ...mp.demandado });
            }

            return res.json({
                success: true,
                fuente: 'mesa_partes',
                datos_generales: {
                    id: mp.id,
                    numero: mp.numero_registro,
                    estado: mp.estado || 'Pendiente',
                    fecha_creacion: mp.fecha_presentacion,
                    sumilla: mp.sumilla,
                    materia: mp.materia,
                    sede: mp.tipo_presentacion,
                    cuantia: mp.cuantia,
                    presentante: mp.demandante?.nombre || mp.demandante?.razon_social || null,
                    nombre_usuario: mp.nombre_usuario
                },
                partes_procesales: partes,
                actos_procesales: [],   // mesa de partes no tiene actos procesales
                documentos: mp.documentos || [],
                total_actos: 0
            });
        }

        // 3. Buscar en solicitudes como último recurso
        const solRows = await query(`
            SELECT s.*, u.nombre AS nombre_usuario
            FROM solicitudes s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            WHERE UPPER(s.id) = ?
            LIMIT 1
        `, [upper]);

        if (solRows && solRows.length > 0) {
            const sol = solRows[0];
            let docsArr = [];
            if (sol.documentos) {
                try { docsArr = JSON.parse(sol.documentos); } catch (_) {}
            }
            return res.json({
                success: true,
                fuente: 'solicitud',
                datos_generales: {
                    id: sol.id,
                    numero: sol.id,
                    estado: sol.estado || 'Pendiente',
                    fecha_creacion: sol.fecha,
                    sumilla: sol.descripcion,
                    materia: sol.tipo,
                    presentante: sol.nombre,
                    correo: sol.email,
                    telefono: sol.telefono,
                    observaciones: sol.observaciones
                },
                partes_procesales: [{ tipo_parte: 'demandante', nombre_completo: sol.nombre, correo: sol.email }],
                actos_procesales: [],
                documentos: docsArr,
                total_actos: 0
            });
        }

        return res.status(404).json({ success: false, error: 'No se encontró ningún expediente con ese código' });
    } catch (err) {
        console.error('Error GET seguimiento:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
