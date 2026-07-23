// routes/timeline.js
// CRUD universal para seguimiento timeline (Expedientes, Mesa de Partes, Solicitudes)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database-config');
const { verificarAuth } = require('../middleware/auth');

// Fix encoding de nombres de archivo (multer recibe Latin-1, necesitamos UTF-8)
function fixNombre(originalname) {
    try {
        return Buffer.from(originalname, 'latin1').toString('utf8');
    } catch (e) {
        return originalname;
    }
}

// ─── Multer para documentos del timeline ─────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        file.originalname = fixNombre(file.originalname);
        const dir = path.join(__dirname, '../uploads/timeline');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'TL-' + unique + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB máximo
    fileFilter: (req, file, cb) => {
        const ok = /pdf|doc|docx|jpg|jpeg|png/i.test(path.extname(file.originalname));
        ok ? cb(null, true) : cb(new Error('Solo se permiten archivos PDF, DOC, DOCX, JPG, PNG'));
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registrarAuditoria(tabla, registro_id, accion, usuario_id, datos) {
    try {
        await query(
            `INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, usuario_id, detalles)
             VALUES (?, ?, ?, ?, ?)`,
            [tabla, String(registro_id), accion, usuario_id, JSON.stringify(datos)]
        );
    } catch (_) { /* no interrumpir la operación principal */ }
}

// Verificar que exista un registro en la fuente indicada
async function verificarFuente(fuente, id) {
    let rows;
    switch (fuente) {
        case 'expedientes':
            rows = await query('SELECT id FROM expedientes WHERE id = ? OR numero = ? LIMIT 1', [id, id]);
            return rows[0] || null;
        case 'mesa-partes':
            rows = await query('SELECT id FROM mesa_partes WHERE id = ? OR numero_registro = ? LIMIT 1', [id, id]);
            return rows[0] || null;
        case 'solicitudes':
            rows = await query('SELECT id FROM solicitudes WHERE id = ? LIMIT 1', [id]);
            return rows[0] || null;
        default:
            return null;
    }
}

// Construir WHERE según fuente
function buildForeignKey(fuente) {
    switch (fuente) {
        case 'expedientes': return 'expediente_id';
        case 'mesa-partes': return 'mesa_partes_id';
        case 'solicitudes': return 'solicitud_id';
        default: return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/expedientes/:id/timeline
//  GET /api/mesa-partes/:id/timeline
//  GET /api/solicitudes/:id/timeline
//  Obtener timeline completo de cualquier fuente
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/resumen-actividad
//  Obtener los últimos movimientos registrados en todo el sistema
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/resumen-actividad', verificarAuth, async (req, res) => {
    try {
        const movimientos = await query(`
            SELECT 
                st.*, 
                u.nombre AS creado_por_nombre,
                COALESCE(e.numero, mp.numero_registro, s.id) AS codigo_referencia,
                CASE 
                    WHEN st.expediente_id IS NOT NULL THEN 'expediente'
                    WHEN st.mesa_partes_id IS NOT NULL THEN 'mesa_partes'
                    WHEN st.solicitud_id IS NOT NULL THEN 'solicitud'
                END AS fuente_tipo
            FROM seguimiento_timeline st
            LEFT JOIN usuarios u ON st.creado_por = u.id
            LEFT JOIN expedientes e ON st.expediente_id = e.id
            LEFT JOIN mesa_partes mp ON st.mesa_partes_id = mp.id
            LEFT JOIN solicitudes s ON st.solicitud_id = s.id
            ORDER BY st.id DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: movimientos
        });
    } catch (err) {
        console.error('Error GET resumen-actividad:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/:fuente/:id/timeline', async (req, res) => {
    try {
        const { fuente, id } = req.params;
        const fk = buildForeignKey(fuente);
        if (!fk) return res.status(400).json({ success: false, error: 'Fuente inválida. Use: expedientes, mesa-partes, solicitudes' });

        const registro = await verificarFuente(fuente, id);
        if (!registro) return res.status(404).json({ success: false, error: 'Registro no encontrado' });

        const movimientos = await query(`
            SELECT st.*, u.nombre AS creado_por_nombre
            FROM seguimiento_timeline st
            LEFT JOIN usuarios u ON st.creado_por = u.id
            WHERE st.${fk} = ?
            ORDER BY st.fecha_documento ASC, st.id ASC
        `, [registro.id]);

        res.json({
            success: true,
            fuente,
            registro_id: registro.id,
            data: movimientos,
            total: movimientos.length
        });
    } catch (err) {
        console.error('Error GET timeline:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  POST /api/expedientes/:id/timeline
//  POST /api/mesa-partes/:id/timeline
//  POST /api/solicitudes/:id/timeline
//  Crear nuevo movimiento en el timeline (con archivo opcional)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/:fuente/:id/timeline', upload.single('documento'), async (req, res) => {
    try {
        const { fuente, id } = req.params;
        const fk = buildForeignKey(fuente);
        if (!fk) return res.status(400).json({ success: false, error: 'Fuente inválida' });

        const registro = await verificarFuente(fuente, id);
        if (!registro) return res.status(404).json({ success: false, error: 'Registro no encontrado' });

        const {
            fecha_documento, fecha_presentacion, fecha_emision,
            tipo_documento, numero_documento, asunto, sumilla,
            presentado_por, tipo_parte,
            fecha_notificacion_virtual, fecha_notificacion_fisica,
            forma_entrega, destinatario_notificacion,
            observaciones, creado_por
        } = req.body;

        if (!fecha_documento || !tipo_documento) {
            return res.status(400).json({ success: false, error: 'fecha_documento y tipo_documento son requeridos' });
        }

        // Documento adjunto
        let tiene_documento = 0, documento_nombre = null, documento_archivo = null, documento_ruta = null;
        if (req.file) {
            tiene_documento = 1;
            documento_nombre = req.file.originalname;
            documento_archivo = req.file.filename;
            documento_ruta = `/uploads/timeline/${req.file.filename}`;
        }

        const result = await query(`
            INSERT INTO seguimiento_timeline (
                ${fk},
                fecha_documento, fecha_presentacion, fecha_emision,
                tipo_documento, numero_documento, asunto, sumilla,
                presentado_por, tipo_parte,
                fecha_notificacion_virtual, fecha_notificacion_fisica,
                forma_entrega, destinatario_notificacion,
                tiene_documento, documento_nombre, documento_archivo, documento_ruta,
                observaciones, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            registro.id,
            fecha_documento, fecha_presentacion || null, fecha_emision || null,
            tipo_documento, numero_documento || null, asunto || null, sumilla || null,
            presentado_por || null, tipo_parte || null,
            fecha_notificacion_virtual || null, fecha_notificacion_fisica || null,
            forma_entrega || null, destinatario_notificacion || null,
            tiene_documento, documento_nombre, documento_archivo, documento_ruta,
            observaciones || null, creado_por || null
        ]);

        await registrarAuditoria('seguimiento_timeline', result.insertId, 'INSERT', creado_por, req.body);

        res.status(201).json({
            success: true,
            message: 'Movimiento agregado al timeline exitosamente',
            data: { id: result.insertId }
        });
    } catch (err) {
        console.error('Error POST timeline:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PUT /api/timeline/:id
//  Editar un movimiento existente (con reemplazo de archivo opcional)
// ═══════════════════════════════════════════════════════════════════════════════

router.put('/timeline/:id', upload.single('documento'), async (req, res) => {
    try {
        const { id } = req.params;
        const existente = await query('SELECT * FROM seguimiento_timeline WHERE id = ?', [id]);
        if (!existente.length) return res.status(404).json({ success: false, error: 'Movimiento no encontrado' });

        const actual = existente[0];
        const {
            fecha_documento, fecha_presentacion, fecha_emision,
            tipo_documento, numero_documento, asunto, sumilla,
            presentado_por, tipo_parte,
            fecha_notificacion_virtual, fecha_notificacion_fisica,
            forma_entrega, destinatario_notificacion,
            observaciones, actualizado_por
        } = req.body;

        let tiene_documento = actual.tiene_documento;
        let documento_nombre = actual.documento_nombre;
        let documento_archivo = actual.documento_archivo;
        let documento_ruta = actual.documento_ruta;

        // Si se sube un nuevo archivo, reemplazar el anterior
        if (req.file) {
            if (actual.documento_archivo) {
                const rutaAnterior = path.join(__dirname, '../uploads/timeline', actual.documento_archivo);
                if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
            }
            tiene_documento = 1;
            documento_nombre = req.file.originalname;
            documento_archivo = req.file.filename;
            documento_ruta = `/uploads/timeline/${req.file.filename}`;
        }

        await query(`
            UPDATE seguimiento_timeline SET
                fecha_documento = COALESCE(?, fecha_documento),
                fecha_presentacion = ?,
                fecha_emision = ?,
                tipo_documento = COALESCE(?, tipo_documento),
                numero_documento = ?,
                asunto = ?,
                sumilla = ?,
                presentado_por = ?,
                tipo_parte = ?,
                fecha_notificacion_virtual = ?,
                fecha_notificacion_fisica = ?,
                forma_entrega = ?,
                destinatario_notificacion = ?,
                tiene_documento = ?,
                documento_nombre = ?,
                documento_archivo = ?,
                documento_ruta = ?,
                observaciones = ?,
                actualizado_por = ?
            WHERE id = ?
        `, [
            fecha_documento || null,
            fecha_presentacion !== undefined ? fecha_presentacion || null : actual.fecha_presentacion,
            fecha_emision !== undefined ? fecha_emision || null : actual.fecha_emision,
            tipo_documento || null,
            numero_documento !== undefined ? numero_documento || null : actual.numero_documento,
            asunto !== undefined ? asunto || null : actual.asunto,
            sumilla !== undefined ? sumilla || null : actual.sumilla,
            presentado_por !== undefined ? presentado_por || null : actual.presentado_por,
            tipo_parte !== undefined ? tipo_parte || null : actual.tipo_parte,
            fecha_notificacion_virtual !== undefined ? fecha_notificacion_virtual || null : actual.fecha_notificacion_virtual,
            fecha_notificacion_fisica !== undefined ? fecha_notificacion_fisica || null : actual.fecha_notificacion_fisica,
            forma_entrega !== undefined ? forma_entrega || null : actual.forma_entrega,
            destinatario_notificacion !== undefined ? destinatario_notificacion || null : actual.destinatario_notificacion,
            tiene_documento, documento_nombre, documento_archivo, documento_ruta,
            observaciones !== undefined ? observaciones || null : actual.observaciones,
            actualizado_por || null,
            id
        ]);

        await registrarAuditoria('seguimiento_timeline', id, 'UPDATE', actualizado_por, req.body);

        res.json({ success: true, message: 'Movimiento actualizado exitosamente' });
    } catch (err) {
        console.error('Error PUT timeline:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DELETE /api/timeline/:id
//  Eliminar un movimiento del timeline
// ═══════════════════════════════════════════════════════════════════════════════

router.delete('/timeline/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const rows = await query('SELECT * FROM seguimiento_timeline WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ success: false, error: 'Movimiento no encontrado' });

        const mov = rows[0];

        // Eliminar archivo físico si existe
        if (mov.documento_archivo) {
            const ruta = path.join(__dirname, '../uploads/timeline', mov.documento_archivo);
            if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
        }

        await query('DELETE FROM seguimiento_timeline WHERE id = ?', [id]);
        await registrarAuditoria('seguimiento_timeline', id, 'DELETE', req.body.usuario_id, mov);

        res.json({ success: true, message: 'Movimiento eliminado exitosamente' });
    } catch (err) {
        console.error('Error DELETE timeline:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /api/seguimiento-completo/:codigo
//  Endpoint mejorado: busca en las 3 fuentes + devuelve timeline unificado
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/seguimiento-completo/:codigo', verificarAuth, async (req, res) => {
    try {
        const codigo = decodeURIComponent(req.params.codigo || '').trim();
        if (!codigo) return res.status(400).json({ success: false, error: 'Código requerido' });

        const userId = req.usuario.id;
        const isAdmin = req.usuario.tipo === 'admin';

        const upper = codigo.toUpperCase();

        // ── 1. Buscar en expedientes ──
        let rows = await query(`
            SELECT e.*, u.nombre AS nombre_usuario
            FROM expedientes e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            WHERE UPPER(e.id) = ? OR UPPER(e.numero) = ? OR UPPER(e.numero) LIKE ?
            LIMIT 1
        `, [upper, upper, `%${upper}%`]);

        if (rows && rows.length > 0) {
            const exp = rows[0];

            // SEGURIDAD: Solo el dueño o un admin pueden ver
            if (!isAdmin && exp.usuario_id !== userId) {
                return res.status(403).json({ success: false, error: 'Acceso denegado: Este expediente no le pertenece.' });
            }

            // Partes procesales (usar datos del expediente directamente)
            const partes = [];
            if (exp.demandante_nombre) {
                partes.push({
                    tipo_parte: 'demandante',
                    nombre_completo: exp.demandante_nombre,
                    documento_identidad: exp.demandante_dni,
                    telefono: exp.demandante_telefono,
                    correo: exp.demandante_correo,
                    domicilio: exp.demandante_domicilio
                });
            }
            if (exp.demandado_nombre) {
                partes.push({
                    tipo_parte: 'demandado',
                    nombre_completo: exp.demandado_nombre,
                    documento_identidad: exp.demandado_dni,
                    telefono: exp.demandado_telefono,
                    correo: exp.demandado_correo,
                    domicilio: exp.demandado_domicilio
                });
            }

            // Timeline unificado (nueva tabla)
            const timeline = await query(`
                SELECT st.*, u.nombre AS creado_por_nombre
                FROM seguimiento_timeline st
                LEFT JOIN usuarios u ON st.creado_por = u.id
                WHERE st.expediente_id = ?
                ORDER BY st.fecha_documento ASC, st.id ASC
            `, [exp.id]);

            // Documentos adjuntos (desde tabla documentos + campo JSON del expediente)
            let documentos = await query(
                'SELECT * FROM documentos WHERE expediente_id = ? ORDER BY fecha_subida DESC',
                [exp.id]
            );

            // También incluir documentos del campo JSON del expediente
            if (exp.documentos) {
                try {
                    const docsFromJson = typeof exp.documentos === 'string' ? JSON.parse(exp.documentos) : exp.documentos;
                    if (Array.isArray(docsFromJson) && docsFromJson.length > 0) {
                        documentos = [...documentos, ...docsFromJson];
                    }
                } catch (e) {
                    console.error('Error parseando documentos JSON del expediente:', e);
                }
            }

            return res.json({
                success: true,
                fuente: 'expediente',
                datos_generales: {
                    id: exp.id,
                    numero: exp.numero,
                    estado: exp.estado || 'Nuevo',
                    sede: exp.sede,
                    especialidad: exp.especialidad,
                    materia: exp.materia,
                    organo_jurisdiccional: exp.organo_jurisdiccional,
                    juez: exp.juez,
                    especialista_legal: exp.especialista_legal,
                    etapa_procesal: exp.etapa_procesal,
                    cuantia: exp.cuantia,
                    moneda: exp.moneda,
                    sumilla: exp.sumilla,
                    presentante: exp.presentante,
                    fecha_creacion: exp.fecha_creacion,
                    fecha_inicio: exp.fecha_inicio,
                    nombre_usuario: exp.nombre_usuario,
                    observaciones: exp.observaciones
                },
                partes_procesales: partes,
                timeline: timeline,
                documentos: documentos,
                total_movimientos: timeline.length
            });
        }

        // ── 2. Buscar en mesa_partes ──
        const mpRows = await query(`
            SELECT mp.*, u.nombre AS nombre_usuario
            FROM mesa_partes mp
            LEFT JOIN usuarios u ON mp.usuario_id = u.id
            WHERE UPPER(mp.numero_registro) = ? OR mp.id = ?
            LIMIT 1
        `, [upper, isNaN(codigo) ? -1 : parseInt(codigo)]);

        if (mpRows && mpRows.length > 0) {
            const mp = mpRows[0];

            // SEGURIDAD: Solo el dueño o un admin pueden ver
            if (!isAdmin && mp.usuario_id !== userId) {
                return res.status(403).json({ success: false, error: 'Acceso denegado: Esta presentación no le pertenece.' });
            }

            // Parsear JSON
            ['demandante', 'demandado', 'documentos'].forEach(k => {
                if (mp[k] && typeof mp[k] === 'string') {
                    try { mp[k] = JSON.parse(mp[k]); } catch (_) {}
                }
            });

            // Partes desde JSON (mapear campos para que coincidan con el frontend)
            const partes = [];
            if (mp.demandante) {
                partes.push({
                    tipo_parte: 'demandante',
                    nombre_completo: mp.demandante.nombre || mp.demandante.razon_social,
                    documento_identidad: mp.demandante.dni || mp.demandante.ruc || mp.demandante.documento || mp.demandante.documento_numero,
                    telefono: mp.demandante.telefono,
                    correo: mp.demandante.correo,
                    domicilio: mp.demandante.domicilio
                });
            }
            if (mp.demandado) {
                partes.push({
                    tipo_parte: 'demandado',
                    nombre_completo: mp.demandado.nombre || mp.demandado.razon_social,
                    documento_identidad: mp.demandado.dni || mp.demandado.ruc || mp.demandado.documento || mp.demandado.documento_numero,
                    telefono: mp.demandado.telefono,
                    correo: mp.demandado.correo,
                    domicilio: mp.demandado.domicilio
                });
            }

            // Timeline
            const timeline = await query(`
                SELECT st.*, u.nombre AS creado_por_nombre
                FROM seguimiento_timeline st
                LEFT JOIN usuarios u ON st.creado_por = u.id
                WHERE st.mesa_partes_id = ?
                ORDER BY st.fecha_documento ASC, st.id ASC
            `, [mp.id]);

            return res.json({
                success: true,
                fuente: 'mesa_partes',
                datos_generales: {
                    id: mp.id,
                    numero: mp.numero_registro,
                    numero_expediente_externo: mp.numero_expediente_externo,
                    estado: mp.estado || 'Pendiente',
                    tipo_servicio: mp.tipo_servicio || 'Arbitraje',
                    tipo_presentacion: mp.tipo_presentacion,
                    sede: mp.sede,
                    responsable: mp.responsable,
                    materia: mp.materia,
                    cuantia: mp.cuantia,
                    sumilla: mp.sumilla,
                    fecha_creacion: mp.fecha_presentacion,
                    nombre_usuario: mp.nombre_usuario,
                    observaciones: mp.observaciones
                },
                partes_procesales: partes,
                timeline: timeline,
                documentos: mp.documentos || [],
                total_movimientos: timeline.length
            });
        }

        // ── 3. Buscar en solicitudes ──
        const solRows = await query(`
            SELECT s.*, u.nombre AS nombre_usuario
            FROM solicitudes s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            WHERE UPPER(s.id) = ?
            LIMIT 1
        `, [upper]);

        if (solRows && solRows.length > 0) {
            const sol = solRows[0];

            // SEGURIDAD: Solo el dueño o un admin pueden ver
            if (!isAdmin && sol.usuario_id !== userId) {
                return res.status(403).json({ success: false, error: 'Acceso denegado: Esta solicitud no le pertenece.' });
            }

            // Parsear documentos
            let docsArr = [];
            if (sol.documentos) {
                try { docsArr = typeof sol.documentos === 'string' ? JSON.parse(sol.documentos) : sol.documentos; } catch (_) {}
            }

            // Timeline
            const timeline = await query(`
                SELECT st.*, u.nombre AS creado_por_nombre
                FROM seguimiento_timeline st
                LEFT JOIN usuarios u ON st.creado_por = u.id
                WHERE st.solicitud_id = ?
                ORDER BY st.fecha_documento ASC, st.id ASC
            `, [sol.id]);

            return res.json({
                success: true,
                fuente: 'solicitud',
                datos_generales: {
                    id: sol.id,
                    numero: sol.id,
                    estado: sol.estado || 'Pendiente',
                    tipo: sol.tipo,
                    asunto: sol.asunto,
                    sumilla: sol.descripcion,
                    prioridad: sol.prioridad,
                    sede: sol.sede,
                    responsable: sol.responsable,
                    presentante: sol.nombre,
                    correo: sol.email,
                    telefono: sol.telefono,
                    dni: sol.dni,
                    fecha_creacion: sol.fecha,
                    nombre_usuario: sol.nombre_usuario,
                    observaciones: sol.observaciones
                },
                partes_procesales: [
                    { tipo_parte: 'solicitante', nombre_completo: sol.nombre, correo: sol.email, documento_identidad: sol.dni, telefono: sol.telefono },
                    ...(sol.demandado_nombre ? [{ tipo_parte: 'demandado', nombre_completo: sol.demandado_nombre, correo: sol.demandado_email, documento_identidad: sol.demandado_dni }] : [])
                ],
                timeline: timeline,
                documentos: docsArr,
                total_movimientos: timeline.length
            });
        }

        return res.status(404).json({ success: false, error: 'No se encontró ningún registro con ese código' });
    } catch (err) {
        console.error('Error GET seguimiento-completo:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
