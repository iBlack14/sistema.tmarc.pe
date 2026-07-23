const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database-config');

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para archivos (solo PDFs)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB máximo
        files: 10 // Máximo 10 archivos
    }
});

// ========== ENDPOINTS DE DOCUMENTOS ==========

// Obtener documentos de un expediente
router.get('/expedientes/:id/documentos', async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.id || '').trim();
        if (!raw) return res.status(400).json({ success: false, message: 'id_requerido' });

        const upper = raw.toUpperCase();
        const limpio = upper.replace(/^EXP-/, '').replace(/-EL$/, '').replace(/-UI$/, '');

        // 1) Prioridad: id exacto -> número exacto; si no, modo "limpio"
        let rows = await query(`
            SELECT e.id, e.numero
            FROM expedientes e
            WHERE UPPER(e.id) = ? OR UPPER(e.numero) = ?
            ORDER BY CASE
                WHEN UPPER(e.id)     = ? THEN 1
                WHEN UPPER(e.numero) = ? THEN 2
                ELSE 3
            END
            LIMIT 1
        `, [upper, upper, upper, upper]);

        if (!rows.length) {
            rows = await query(`
                SELECT e.id, e.numero
                FROM expedientes e
                WHERE REPLACE(REPLACE(UPPER(e.id),'EXP-',''),'-EL','') = ?
                    OR REPLACE(REPLACE(UPPER(e.id),'EXP-',''),'-UI','') = ?
                    OR REPLACE(REPLACE(UPPER(e.numero),'EXP-',''),'-EL','') = ?
                LIMIT 1
            `, [limpio, limpio, limpio]);
        }

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'expediente_no_encontrado' });
        }
        const exp = rows[0];

        // 2) Descubre columnas presentes
        const hasCol = async (c) => {
            const r = await query(`
                SELECT 1 FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME='documentos'
                    AND COLUMN_NAME=?
                LIMIT 1
            `, [c]);
            return !!r.length;
        };
        const has = {
            expediente_numero: await hasCol('expediente_numero'),
            nombre: await hasCol('nombre'),
            nombre_original: await hasCol('nombre_original'),
            size: await hasCol('size'),
            tamano: await hasCol('tamano'),
            type: await hasCol('type'),
            tipo: await hasCol('tipo'),
            created_at: await hasCol('created_at'),
            fecha_subida: await hasCol('fecha_subida'),
            nombre_archivo: await hasCol('nombre_archivo'),
            ruta: await hasCol('ruta'),
        };

        const SELECT_nombre = has.nombre ? 'nombre'
            : has.nombre_original ? 'nombre_original AS nombre'
            : "'Archivo' AS nombre";
        const SELECT_size = has.size ? 'size'
            : has.tamano ? 'tamano AS size'
            : 'NULL AS size';
        const SELECT_type = has.type ? 'type'
            : has.tipo ? 'tipo AS type'
            : 'NULL AS type';
        const SELECT_fecha = has.created_at ? 'created_at'
            : has.fecha_subida ? 'fecha_subida AS created_at'
            : 'NULL AS created_at';
        const SELECT_url = has.ruta
            ? (has.nombre_archivo ? "COALESCE(ruta, CONCAT('/uploads/', nombre_archivo)) AS url"
                : "ruta AS url")
            : (has.nombre_archivo ? "CONCAT('/uploads/', nombre_archivo) AS url"
                : "NULL AS url");

        // 3) WHERE correcto
        const where = ['expediente_id = ?'];
        const params = [exp.id || ''];
        if (has.expediente_numero) { where.push('expediente_numero = ?'); params.push(exp.numero || ''); }

        const sqlDocs = `
            SELECT id, ${SELECT_nombre}, ${SELECT_size}, ${SELECT_type}, ${SELECT_fecha}, ${SELECT_url}
            FROM documentos
            WHERE ${where.join(' OR ')}
            ORDER BY ${has.fecha_subida ? 'fecha_subida' : has.created_at ? 'created_at' : 'id'} DESC, id DESC
        `;

        const documentos = await query(sqlDocs, params) || [];

        if (req.query.debug === '1') {
            return res.json({
                success: true,
                expediente: { id: exp.id, numero: exp.numero },
                documentos,
                __debug: { sqlDocs, params, hasColumns: has }
            });
        }

        return res.json({ success: true, expediente: { id: exp.id, numero: exp.numero }, documentos });
    } catch (e) {
        console.error('GET /expedientes/:id/documentos error:', e);
        return res.status(500).json({ success: false, message: 'server_error' });
    }
});

// Subir documentos a un expediente
router.post('/expedientes/:id/documentos', upload.array('anexos', 10), async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.id || '').trim();
        console.log('[UPLOAD] id param:', raw);
        if (!raw) return res.status(400).json({ success: false, where: 'route', message: 'id_requerido' });

        const upper = raw.toUpperCase();
        // fallback más robusto: acepta EL / UI / FF
        const limpio = upper.replace(/^EXP-/, '').replace(/-(EL|UI|FF)$/, '');

        // 1) PRIORIDAD: id exacto -> número exacto
        let exps = await query(`
            SELECT e.id, e.numero
            FROM expedientes e
            WHERE UPPER(e.id) = ? OR UPPER(e.numero) = ?
            ORDER BY CASE
                WHEN UPPER(e.id)     = ? THEN 1
                WHEN UPPER(e.numero) = ? THEN 2
                ELSE 3
            END
            LIMIT 1
        `, [upper, upper, upper, upper]);

        // 2) Si no hubo exacto, usa el modo "limpio" como fallback
        if (!exps.length) {
            exps = await query(`
                SELECT e.id, e.numero
                FROM expedientes e
                WHERE REPLACE(REPLACE(REPLACE(UPPER(e.id),'EXP-',''),'-EL',''),'-UI','') = ?
                    OR REPLACE(REPLACE(UPPER(e.numero),'EXP-',''),'-EL','') = ?
                LIMIT 1
            `, [limpio, limpio]);
        }

        if (!exps.length) {
            return res.status(404).json({ success: false, where: 'route', message: 'expediente_no_encontrado' });
        }

        const exp = exps[0];
        console.log('[UPLOAD] expediente resuelto ->', exp);

        // -------------------------------------------------------------
        // 🔁 Forzar uso del gemelo *-FF* si existe (canónico)
        // -------------------------------------------------------------
        try {
            // A) intenta por patrón del id resuelto
            const base = (exp.id || '').toUpperCase().replace(/^EXP-/, '').replace(/-[A-Z0-9]+$/, '');
            const idFF = `EXP-${base}-FF`;

            const ffById = await query(
                `SELECT id, numero FROM expedientes WHERE UPPER(id) = ? LIMIT 1`,
                [idFF.toUpperCase()]
            );

            if (ffById.length) {
                console.log('[UPLOAD] Usando expediente canónico -FF por id:', ffById[0]);
                exp.id = ffById[0].id;
                exp.numero = ffById[0].numero;
            } else if (exp.numero) {
                // B) si por id no hay, intenta por número buscando el que termina en -FF
                const ffByNumero = await query(
                    `SELECT id, numero
                        FROM expedientes
                        WHERE UPPER(numero) = ?
                        AND UPPER(id) LIKE '%-FF'
                        ORDER BY COALESCE(fecha_creacion, fecha_actualizacion, '1970-01-01') DESC
                        LIMIT 1`,
                    [String(exp.numero).toUpperCase()]
                );
                if (ffByNumero.length) {
                    console.log('[UPLOAD] Usando expediente canónico -FF por número:', ffByNumero[0]);
                    exp.id = ffByNumero[0].id;
                    exp.numero = ffByNumero[0].numero;
                } else {
                    console.log('[UPLOAD] No existe gemelo -FF; se mantiene:', exp.id);
                }
            }
        } catch (eFF) {
            console.warn('[UPLOAD] No se pudo resolver -FF, se mantiene:', exp.id, eFF?.message);
        }
        // -------------------------------------------------------------

        if (!req.files?.length) {
            return res.status(400).json({ success: false, where: 'route', message: 'sin_archivos' });
        }

        // Detecta esquema real de tu tabla documentos
        const tieneExpNumero = await query(`
            SELECT 1
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'documentos'
                AND COLUMN_NAME = 'expediente_numero'
            LIMIT 1
        `);
        const esquemaNuevo = !!tieneExpNumero.length;

        // Metadatos opcionales
        let metas = [];
        try { metas = JSON.parse(req.body.metadatos || '[]'); } catch {}

        const archivos = [];

        for (let i = 0; i < req.files.length; i++) {
            const f = req.files[i];
            const m = metas[i] || {};

            if (esquemaNuevo) {
                await query(`
                    INSERT INTO documentos
                    (expediente_id, expediente_numero, nombre, nombre_archivo, size, type,
                        pagina_fin, descripcion, folios, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    exp.id || null,
                    exp.numero || null,
                    f.originalname,
                    f.filename,
                    f.size,
                    f.mimetype,
                    m.pagina_fin || null,
                    m.descripcion || null,
                    m.folios || null
                ]);
            } else {
                await query(`
                    INSERT INTO documentos
                    (expediente_id, nombre_archivo, nombre_original, ruta, tamano, tipo, tipo_documento, fecha_subida)
                    VALUES (?, ?, ?, ?, ?, ?, 'anexo', NOW())
                `, [
                    exp.id || null,
                    f.filename,
                    f.originalname,
                    f.path,  // Ruta absoluta del sistema de archivos
                    f.size,
                    f.mimetype
                ]);
            }

            archivos.push({
                nombre: f.originalname,
                url: `/uploads/${f.filename}`,
                size: f.size,
                type: f.mimetype
            });
        }

        // Devuelve lo que se usó para que puedas comprobarlo en Network > Response
        return res.json({ success: true, expediente: { id: exp.id, numero: exp.numero }, archivos });
    } catch (e) {
        console.error('[UPLOAD] error final:', e);
        return res.status(500).json({
            success: false, where: 'route',
            message: e?.message || 'Error subiendo documentos',
            code: e?.code || null, errno: e?.errno || null,
            sqlState: e?.sqlState || null, sqlMessage: e?.sqlMessage || null,
            sql: e?.sql || null
        });
    }
});

module.exports = router;