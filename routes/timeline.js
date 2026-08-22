// routes/timeline.js
// CRUD universal para seguimiento timeline (Expedientes, Mesa de Partes, Solicitudes)
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database-config');
const { verificarAuth } = require('../middleware/auth');
const smtpConfigManager = require('../smtp-config-manager');

function escaparHtml(valor) {
    return String(valor || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}

function correoRecepcionMovimiento(datos) {
    const baseUrl = (process.env.APP_URL || process.env.BASE_URL || 'https://sistema.tmarc.pe').replace(/\/+$/, '');
    return `<!doctype html><html lang="es"><body style="margin:0;background:#f2f3f5;font-family:Arial,sans-serif"><table width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px"><tr><td align="center"><table width="100%" cellspacing="0" cellpadding="0" style="max-width:610px;background:#fff;border-radius:17px;overflow:hidden;border:1px solid #ddd7c4"><tr><td style="background:#111;padding:25px 29px;border-bottom:4px solid #d4af37;color:#fff;font-family:Georgia,serif;font-size:27px;font-weight:bold">Tmarc</td></tr><tr><td style="padding:31px"><div style="color:#16794c;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px">Recepción confirmada</div><h1 style="font-size:23px;margin:8px 0 12px;color:#171717">Información adicional recibida</h1><p style="font-size:14px;color:#666;line-height:1.6">Confirmamos la recepción del siguiente movimiento incorporado a su presentación.</p><div style="background:#fff9e8;border:1px solid #ead486;border-radius:11px;padding:17px;margin:21px 0"><p style="margin:0 0 7px"><b>Presentación:</b> ${escaparHtml(datos.codigo)}</p><p style="margin:0 0 7px"><b>Tipo:</b> ${escaparHtml(datos.tipo_documento)}</p><p style="margin:0 0 7px"><b>Documento:</b> ${escaparHtml(datos.numero_documento || 'Sin número')}</p><p style="margin:0"><b>Asunto:</b> ${escaparHtml(datos.asunto || datos.sumilla || 'Información adicional')}</p></div><div style="text-align:center"><a href="${baseUrl}/dashboard-modular.html#expedientes" style="display:inline-block;padding:13px 24px;background:#d4af37;color:#111;text-decoration:none;border-radius:9px;font-size:13px;font-weight:bold">Ver seguimiento →</a></div><p style="margin-top:23px;font-size:11px;color:#888">Esta confirmación corresponde únicamente al movimiento señalado.</p></td></tr><tr><td style="background:#111;padding:18px;text-align:center;color:#aaa;font-size:10px"><b style="color:#d4af37">SISTEMA TMARC</b><br>Notificación institucional automática</td></tr></table></td></tr></table></body></html>`;
}

function plantillaNuevoMovimientoAdmin(fuente, codigo, movimiento, documentosCount) {
    const baseUrl = (process.env.APP_URL || process.env.BASE_URL || 'https://sistema.tmarc.pe').replace(/\/+$/, '');
    const refCodigo = escaparHtml(codigo);
    const solicitante = escaparHtml(movimiento.presentado_por || 'Usuario TMARC');
    const tipoDoc = escaparHtml(movimiento.tipo_documento || 'N/A');
    const asunto = escaparHtml(movimiento.asunto || movimiento.sumilla || 'Sin asunto');
    const fecha = new Date().toLocaleString('es-PE');
    
    return `<!doctype html><html lang="es"><body style="margin:0;background:#f1f2f4;font-family:Arial,Helvetica,sans-serif;color:#222"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#f1f2f4"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #dfd8c2"><tr><td style="background:#111;padding:26px 30px;border-bottom:4px solid #d4af37"><div style="font-family:Georgia,serif;color:#fff;font-size:28px;font-weight:bold">Tmarc</div><div style="color:#d4af37;font-size:10px;letter-spacing:1.5px;text-transform:uppercase">Notificación de Administración</div></td></tr><tr><td style="padding:32px"><div style="color:#b22222;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1.2px">Nueva Información Presentada</div><h1 style="font-size:22px;margin:8px 0 12px">Adición de Documentos / Escritos</h1><p style="font-size:14px;line-height:1.6;color:#333">Un usuario ha agregado nuevos documentos o información a un expediente existente.</p><div style="padding:16px;background:#f7f7f7;border-left:4px solid #d4af37;border-radius:6px;font-size:13px;line-height:1.6;margin:15px 0"><strong>Detalles de la presentación:</strong><br><ul style="margin:8px 0;padding-left:20px"><li><strong>Expediente/Mesa de partes:</strong> ${refCodigo}</li><li><strong>Presentado por:</strong> ${solicitante}</li><li><strong>Tipo de documento:</strong> ${tipoDoc}</li><li><strong>Asunto:</strong> ${asunto}</li><li><strong>Archivos adjuntos:</strong> ${documentosCount}</li><li><strong>Fecha y hora:</strong> ${fecha}</li></ul></div><div style="text-align:center;margin-top:26px"><a href="${baseUrl}/public/admin/solicitudes.html" style="display:inline-block;background:#d4af37;color:#111;text-decoration:none;padding:13px 25px;border-radius:9px;font-size:13px;font-weight:bold">Ver en Panel Administrador</a></div></td></tr><tr><td style="background:#111;padding:19px;text-align:center;color:#aaa;font-size:10px"><strong style="color:#d4af37">SISTEMA TMARC</strong><br>Notificación automática institucional</td></tr></table></td></tr></table></body></html>`;
}

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
        case 'mesa-partes':
            rows = await query('SELECT id FROM mesa_partes WHERE id = ? OR numero_registro = ? LIMIT 1', [id, id]);
            return rows[0] || null;
        default:
            return null;
    }
}

// Construir WHERE según fuente
function buildForeignKey(fuente) {
    switch (fuente) {
        case 'mesa-partes': return 'mesa_partes_id';
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
                mp.numero_registro AS codigo_referencia,
                'mesa_partes' AS fuente_tipo
            FROM seguimiento_timeline st
            LEFT JOIN usuarios u ON st.creado_por = u.id
            LEFT JOIN mesa_partes mp ON st.mesa_partes_id = mp.id
            WHERE st.mesa_partes_id IS NOT NULL
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

// Bandeja administrativa: cada información adicional de Mesa de Partes es un
// ingreso independiente y conserva el vínculo con su presentación principal.
router.get('/timeline/presentaciones', async (_req, res) => {
    try {
        const movimientos = await query(`
            SELECT st.id, st.mesa_partes_id, st.fecha_documento, st.fecha_creacion,
                   st.tipo_documento, st.numero_documento, st.asunto, st.sumilla,
                   st.presentado_por, st.recepcion_confirmada, st.fecha_recepcion,
                   mp.numero_registro, mp.usuario_id, mp.tipo_presentacion,
                   mp.demandante, u.nombre AS nombre_usuario
            FROM seguimiento_timeline st
            INNER JOIN mesa_partes mp ON mp.id = st.mesa_partes_id
            LEFT JOIN usuarios u ON u.id = mp.usuario_id
            ORDER BY st.fecha_creacion DESC, st.id DESC
        `);
        res.json({ success: true, data: movimientos });
    } catch (error) {
        console.error('Error cargando ingresos adicionales:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

router.get('/:fuente/:id/timeline', async (req, res) => {
    try {
        const { fuente, id } = req.params;
        const fk = buildForeignKey(fuente);
        if (!fk) return res.status(410).json({ success: false, error: 'Fuente retirada. Use: mesa-partes' });

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

router.post('/:fuente/:id/timeline', upload.any(), async (req, res) => {
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
            observaciones, creado_por, documentos_metadata
        } = req.body;

        if (!fecha_documento || !tipo_documento) {
            return res.status(400).json({ success: false, error: 'fecha_documento y tipo_documento son requeridos' });
        }

        // Documentos adjuntos (soporta múltiples archivos)
        let tiene_documento = 0, documento_nombre = null, documento_archivo = null, documento_ruta = null, documentos = null;
        if (req.files && req.files.length > 0) {
            tiene_documento = 1;
            // Para compatibilidad hacia atrás: guardar el primer archivo en los campos individuales
            documento_nombre = req.files[0].originalname;
            documento_archivo = req.files[0].filename;
            documento_ruta = `/uploads/timeline/${req.files[0].filename}`;

            // Guardar todos los archivos con su respectivo metadato en la columna documentos JSON
            const metadatos = documentos_metadata ? JSON.parse(documentos_metadata) : [];
            const archivos = req.files.map((file, idx) => {
                const meta = metadatos[idx] || {};
                return {
                    nombre: file.originalname,
                    ruta: file.path,
                    filename: file.filename,
                    tipo: file.mimetype,
                    tamano: file.size,
                    pagina_fin: Number(meta.pagina_fin) || 0,
                    descripcion: meta.descripcion || '',
                    folios: Number(meta.folios) || 0
                };
            });
            documentos = JSON.stringify(archivos);
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
                documentos, observaciones, creado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            registro.id,
            fecha_documento, fecha_presentacion || null, fecha_emision || null,
            tipo_documento, numero_documento || null, asunto || null, sumilla || null,
            presentado_por || null, tipo_parte || null,
            fecha_notificacion_virtual || null, fecha_notificacion_fisica || null,
            forma_entrega || null, destinatario_notificacion || null,
            tiene_documento, documento_nombre, documento_archivo, documento_ruta,
            documentos, observaciones || null, creado_por || null
        ]);

        await registrarAuditoria('seguimiento_timeline', result.insertId, 'INSERT', creado_por, req.body);

        // Verificar tipo de usuario creador
        const actorId = /^\d+$/.test(String(creado_por || '')) ? Number(creado_por) : null;
        const [actor] = actorId ? await query('SELECT tipo FROM usuarios WHERE id = ? LIMIT 1', [actorId]) : [];
        const isClient = !actor || actor.tipo !== 'admin';

        let notificacionSistema = false;
        if (fuente === 'mesa-partes' && registro.id) {
            const [destino] = await query('SELECT numero_registro, usuario_id FROM mesa_partes WHERE id = ? LIMIT 1', [registro.id]);
            
            // Si el creador es un administrador, avisar al titular en su Casilla electrónica
            if (!isClient && destino?.usuario_id && Number(destino.usuario_id) !== actorId) {
                const notifId = `NOTIF-TL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const linea = (etiqueta, valor) => valor ? `<div style="margin:0 0 7px"><b>${etiqueta}:</b> ${escaparHtml(valor)}</div>` : '';
                const detalle = `
                    <div style="line-height:1.55">
                        ${linea('Presentación', destino.numero_registro)}
                        ${linea('Tipo de documento', tipo_documento)}
                        ${linea('Número / referencia', numero_documento)}
                        ${linea('Asunto procesal', asunto)}
                        ${linea('Fecha del documento', fecha_documento)}
                        ${linea('Fecha de presentación', fecha_presentacion)}
                        ${linea('Fecha de emisión', fecha_emision)}
                        ${linea('Presentado por', presentado_por)}
                        ${linea('Tipo de parte', tipo_parte)}
                        ${linea('Notificación virtual', fecha_notificacion_virtual)}
                        ${linea('Notificación física', fecha_notificacion_fisica)}
                        ${linea('Forma de entrega', forma_entrega)}
                        ${linea('Destinatario', destinatario_notificacion)}
                        ${linea('Resumen / sumilla', sumilla)}
                    </div>`;
                const archivoNotificacion = req.file ? JSON.stringify({
                    nombre: documento_nombre,
                    archivo: documento_archivo,
                    ruta: documento_ruta,
                    tipo: req.file.mimetype,
                    tamano: req.file.size
                }) : null;
                await query(
                    `INSERT INTO notificaciones (id, usuario_id, tipo, titulo, mensaje, expediente_id, archivo_adjunto, leida, fecha)
                     VALUES (?, ?, 'sistema', ?, ?, ?, ?, 0, NOW())`,
                    [
                        notifId,
                        destino.usuario_id,
                        `Nuevo movimiento en ${destino.numero_registro}`,
                        detalle,
                        destino.numero_registro,
                        archivoNotificacion
                    ]
                );
                notificacionSistema = true;
            }
            
            // Si el creador es un cliente, notificar al administrador por correo y base de datos
            if (isClient) {
                const refCodigo = destino?.numero_registro || id;
                const docCount = req.files ? req.files.length : 0;
                const presentanteNombre = presentado_por || actor?.nombre || 'Usuario Cliente';
                const fakeMovimiento = {
                    presentado_por: presentanteNombre,
                    tipo_documento,
                    asunto,
                    sumilla
                };

                const correoAdmin = process.env.ADMIN_EMAIL;
                if (correoAdmin) {
                    try {
                        console.log(`✉️ Enviando notificación de nuevo movimiento al administrador (${correoAdmin})`);
                        await smtpConfigManager.enviarEmail({
                            destinatario: correoAdmin,
                            asunto: `[Nueva Información] Registro: ${refCodigo}`,
                            contenido: plantillaNuevoMovimientoAdmin(fuente, refCodigo, fakeMovimiento, docCount),
                            tipo: 'notificacion_nuevo_movimiento_admin'
                        });
                        console.log('✅ Notificación de nuevo movimiento enviada al administrador exitosamente');
                    } catch (adminEmailError) {
                        console.error('❌ Falló la notificación de nuevo movimiento al administrador:', adminEmailError.message);
                    }
                } else {
                    console.warn('⚠️ No se pudo enviar notificación de nuevo movimiento: ADMIN_EMAIL no está configurado');
                }

                // Notificación en base de datos para administradores (Casilla Admin)
                try {
                    const admins = await query("SELECT id FROM usuarios WHERE tipo = 'admin'");
                    for (const adm of admins) {
                        const notifId = `NOTIF-ADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                        await query(`
                            INSERT INTO notificaciones (id, usuario_id, tipo, titulo, mensaje, expediente_id, leida, fecha)
                            VALUES (?, ?, 'sistema', ?, ?, ?, 0, NOW())
                        `, [
                            notifId,
                            adm.id,
                            `[Nueva Información] Registro: ${refCodigo}`,
                            `El usuario ${presentanteNombre} ha agregado información (${tipo_documento}) en la Mesa de Partes.`,
                            refCodigo
                        ]);
                    }
                    console.log(`✅ Notificación de nuevo movimiento insertada en base de datos para ${admins.length} administradores`);
                } catch (dbNotifError) {
                    console.error('❌ Error guardando notificación de nuevo movimiento en base de datos:', dbNotifError.message);
                }
            }
        }

        res.status(201).json({
            success: true,
            message: 'Movimiento agregado al timeline exitosamente',
            data: { id: result.insertId },
            notificacion_sistema: notificacionSistema
        });
    } catch (err) {
        console.error('Error POST timeline:', err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) {}
        res.status(500).json({ success: false, error: err.message });
    }
});

// Confirmar de manera independiente la recepción de un movimiento
router.post('/timeline/:id/confirmar-recepcion', async (req, res) => {
    try {
        const { id } = req.params;
        const confirmadoPorRaw = req.body.confirmado_por;
        const confirmadoPor = /^\d+$/.test(String(confirmadoPorRaw || ''))
            ? Number(confirmadoPorRaw)
            : null;
        const [movimiento] = await query('SELECT * FROM seguimiento_timeline WHERE id = ?', [id]);
        if (!movimiento) return res.status(404).json({ success:false, error:'Movimiento no encontrado' });

        let referencia;
        if (movimiento.mesa_partes_id) {
            [referencia] = await query(`SELECT mp.numero_registro AS codigo, mp.usuario_id, u.nombre, u.email FROM mesa_partes mp LEFT JOIN usuarios u ON u.id=mp.usuario_id WHERE mp.id=?`, [movimiento.mesa_partes_id]);
        }
        if (!referencia) return res.status(404).json({ success:false, error:'No se encontró la presentación relacionada' });

        await query('UPDATE seguimiento_timeline SET recepcion_confirmada=1, fecha_recepcion=NOW(), confirmado_por=? WHERE id=?', [confirmadoPor, id]);

        let notificacionSistema = false;
        let correoEnviado = false;
        let correoError = null;
        if (referencia.usuario_id) {
            const notifId = `NOTIF-MOV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
            await query(`INSERT INTO notificaciones (id, usuario_id, tipo, titulo, mensaje, leida, fecha) VALUES (?, ?, 'sistema', ?, ?, 0, NOW())`, [notifId, referencia.usuario_id, 'Información recibida', `Confirmamos la recepción de ${movimiento.tipo_documento || 'la información'}${movimiento.numero_documento ? ` ${movimiento.numero_documento}` : ''} en ${referencia.codigo}.`]);
            notificacionSistema = true;
        }
        if (referencia.email) {
            try {
                const envio = await smtpConfigManager.enviarEmail({ destinatario:referencia.email, asunto:`TMARC | Información recibida ${referencia.codigo}`, contenido:correoRecepcionMovimiento({ ...movimiento, codigo:referencia.codigo }), tipo:'confirmacion_recepcion_movimiento' });
                correoEnviado = Boolean(envio.success && envio.estado !== 'simulado' && envio.estado !== 'pendiente_smtp');
                if (!correoEnviado) correoError = envio.message || 'El SMTP no confirmó el envío';
            } catch (errorCorreo) {
                correoError = errorCorreo.message;
            }
        }
        await registrarAuditoria('seguimiento_timeline', id, 'CONFIRMAR_RECEPCION', confirmadoPor, { notificacionSistema, correoEnviado });
        res.json({ success:true, message:'Recepción confirmada', notificacion_sistema:notificacionSistema, correo_enviado:correoEnviado, correo_error:correoError });
    } catch (error) {
        console.error('Error confirmando recepción del movimiento:', error);
        res.status(500).json({ success:false, error:error.message });
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
        const rows = [];

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
        const solRows = [];

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
