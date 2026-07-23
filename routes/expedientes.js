const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ExpedienteModel = require('../models/expediente-model');
const { query } = require('../database-config');

// Fix encoding de nombres de archivo (multer recibe Latin-1, necesitamos UTF-8)
function fixNombre(originalname) {
    try {
        return Buffer.from(originalname, 'latin1').toString('utf8');
    } catch (e) {
        return originalname;
    }
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        file.originalname = fixNombre(file.originalname);
        const uploadDir = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
        
        console.log('📂 Directorio de subida (expedientes):', uploadDir);
        
        if (!fs.existsSync(uploadDir)) {
            console.log('📁 Creando directorio:', uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB máximo
        files: 10
    }
});

// Función auxiliar para registrar auditoría
async function registrarAuditoria(tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos) {
    try {
        const sql = `
            INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, usuario_id, detalles, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const detalles = {
            anteriores: datos_anteriores,
            nuevos: datos_nuevos
        };

        await query(sql, [tabla, registro_id, accion, usuario_id, JSON.stringify(detalles), null, null]);
    } catch (error) {
        console.error('Error registrando auditoría:', error);
        // No lanzar error para no interrumpir la operación principal
    }
}

// ========== ENDPOINTS DE EXPEDIENTES ==========

// Obtener todos los expedientes con filtros opcionales
router.get('/', async (req, res) => {
    try {
        const filtros = {
            estado: req.query.estado,
            usuario_id: req.query.usuario_id,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            sede: req.query.sede,
            especialidad: req.query.especialidad,
            busqueda: req.query.busqueda,
            limite: req.query.limite ? parseInt(req.query.limite) : null,
            offset: req.query.offset ? parseInt(req.query.offset) : null
        };

        const expedientes = await ExpedienteModel.obtenerTodos(filtros);
        res.json({ success: true, data: expedientes });
    } catch (error) {
        console.error('Error obteniendo expedientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener expediente por ID
router.get('/:id', async (req, res) => {
    try {
        const expediente = await ExpedienteModel.obtenerPorId(req.params.id);

        if (!expediente) {
            return res.status(404).json({ error: 'Expediente no encontrado' });
        }

        // Obtener partes procesales
        const partesProcesales = await ExpedienteModel.obtenerPartesProcesales(req.params.id);

        res.json({
            success: true,
            data: expediente,
            partes_procesales: partesProcesales
        });
    } catch (error) {
        console.error('Error obteniendo expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener archivos de un expediente
router.get('/:id/archivos', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📂 Obteniendo archivos para expediente:', id);
        
        // 1. Verificar que el expediente existe y obtener campo documentos
        const expedientes = await query('SELECT id, numero, documentos FROM expedientes WHERE id = ? OR numero = ?', [id, id]);

        if (expedientes.length === 0) {
            console.log('❌ Expediente no encontrado:', id);
            return res.status(404).json({ 
                success: false,
                error: 'Expediente no encontrado' 
            });
        }

        const expediente = expedientes[0];
        console.log('✅ Expediente encontrado:', expediente.id, '/', expediente.numero);

        let archivosFormateados = [];

        // 2. PRIORIDAD 1: Buscar en campo JSON expedientes.documentos
        if (expediente.documentos) {
            try {
                let documentosJSON = typeof expediente.documentos === 'string' 
                    ? JSON.parse(expediente.documentos) 
                    : expediente.documentos;
                
                if (Array.isArray(documentosJSON) && documentosJSON.length > 0) {
                    console.log('✅ Archivos encontrados en campo JSON:', documentosJSON.length);
                    
                    archivosFormateados = documentosJSON.map(doc => ({
                        nombre_original: doc.nombre_original,
                        nombre_archivo: doc.nombre_archivo,
                        tamano: doc.tamano,
                        tipo_mime: doc.mimetype || doc.tipo_mime,
                        fecha_subida: doc.fecha_subida,
                        url: `/uploads/${doc.nombre_archivo}`,
                        download_url: `/api/download/archivo/${doc.nombre_archivo}`,
                        tipo_documento: doc.tipo || 'anexo',
                        ruta: doc.ruta
                    }));
                }
            } catch (e) {
                console.error('❌ Error parseando documentos JSON:', e.message);
            }
        }

        // 3. PRIORIDAD 2: Si no hay archivos en JSON, buscar en tabla documentos
        if (archivosFormateados.length === 0) {
            console.log('🔍 No hay archivos en JSON, buscando en tabla documentos...');
            
            // Detectar esquema de la tabla documentos
            const hasExpNumero = await query(`
                SELECT 1 FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'documentos'
                    AND COLUMN_NAME = 'expediente_numero'
                LIMIT 1
            `);
            const esquemaNuevo = !!hasExpNumero.length;
            console.log('📋 Esquema de tabla documentos:', esquemaNuevo ? 'NUEVO (con expediente_numero)' : 'ANTIGUO (sin expediente_numero)');

            let documentos = [];
            
            if (esquemaNuevo) {
                // Esquema nuevo: tiene expediente_numero
                documentos = await query(`
                    SELECT 
                        id,
                        nombre as nombre_original,
                        nombre_archivo,
                        size as tamano,
                        type as tipo_mime,
                        created_at as fecha_subida,
                        pagina_fin,
                        descripcion,
                        folios
                    FROM documentos
                    WHERE expediente_id = ? OR expediente_numero = ?
                    ORDER BY created_at DESC
                `, [expediente.id, expediente.numero]);
            } else {
                // Esquema antiguo: solo tiene expediente_id
                documentos = await query(`
                    SELECT 
                        id,
                        nombre_original,
                        nombre_archivo,
                        tamano,
                        tipo as tipo_mime,
                        fecha_subida,
                        tipo_documento
                    FROM documentos
                    WHERE expediente_id = ?
                    ORDER BY fecha_subida DESC
                `, [expediente.id]);
            }

            console.log('📊 Archivos encontrados en tabla:', documentos.length);

            archivosFormateados = documentos.map(doc => ({
                id: doc.id,
                nombre_original: doc.nombre_original,
                nombre_archivo: doc.nombre_archivo,
                tamano: doc.tamano,
                tipo_mime: doc.tipo_mime,
                fecha_subida: doc.fecha_subida,
                url: `/uploads/${doc.nombre_archivo}`,
                tipo_documento: doc.tipo_documento || 'anexo',
                // Campos adicionales del esquema nuevo
                pagina_fin: doc.pagina_fin || null,
                descripcion: doc.descripcion || null,
                folios: doc.folios || null
            }));
        }

        console.log('📦 Total archivos a devolver:', archivosFormateados.length);

        res.json({
            success: true,
            data: archivosFormateados,
            count: archivosFormateados.length,
            expediente: {
                id: expediente.id,
                numero: expediente.numero
            }
        });
    } catch (error) {
        console.error('❌ Error obteniendo archivos de expediente:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Obtener expediente por número (robusto + debug)
router.get('/numero/:numero', async (req, res) => {
    try {
        const raw = decodeURIComponent(req.params.numero || '').trim();
        if (!raw) return res.status(400).json({ error: 'numero_requerido' });

        const upper = raw.toUpperCase();
        const limpio = upper.replace(/^EXP-/, '').replace(/-EL$/, '').replace(/-UI$/, '');

        // 1) Trae el expediente por id visible o número
        const rows = await query(`
            SELECT e.*
            FROM expedientes e
            WHERE UPPER(e.id) = ?
                OR UPPER(e.numero) = ?
                OR REPLACE(REPLACE(UPPER(e.id),'EXP-',''),'-EL','') = ?
                OR REPLACE(REPLACE(UPPER(e.id),'EXP-',''),'-UI','') = ?
                OR REPLACE(REPLACE(UPPER(e.numero),'EXP-',''),'-EL','') = ?
            LIMIT 1
        `, [upper, upper, limpio, limpio, limpio]);

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'not_found' });
        }
        const exp = rows[0];
        exp.fecha_registro = exp.fecha_registro || exp.fecha || exp.created_at || exp.fecha_creacion || null;

        // Helpers para inspeccionar columnas reales de la tabla documentos
        const col = async (name) => {
            const r = await query(`
                SELECT 1 FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='documentos' AND COLUMN_NAME=?
                LIMIT 1`, [name]);
            return !!(r && r.length);
        };
        const has = {
            expediente_numero: await col('expediente_numero'),
            nombre: await col('nombre'),
            nombre_original: await col('nombre_original'),
            size: await col('size'),
            tamano: await col('tamano'),
            type: await col('type'),
            tipo: await col('tipo'),
            created_at: await col('created_at'),
            fecha_subida: await col('fecha_subida'),
            nombre_archivo: await col('nombre_archivo'),
            ruta: await col('ruta'),
            tipo_documento: await col('tipo_documento')
        };

        // 2) Build del SELECT compatible con cualquiera de los dos esquemas
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

        // 3) WHERE robusto: intenta por expediente_id y (si existe) por expediente_numero
        const where = [];
        const params = [];

        where.push('expediente_id = ?'); params.push(exp.id || '');
        if (has.expediente_numero) { where.push('expediente_numero = ?'); params.push(exp.numero || ''); }

        const sqlDocs = `
            SELECT id, ${SELECT_nombre}, ${SELECT_size}, ${SELECT_type}, ${SELECT_fecha}, ${SELECT_url}
            FROM documentos
            WHERE (${where.join(' OR ')})
            ORDER BY id ASC
        `;

        let documentos = await query(sqlDocs, params);
        documentos = Array.isArray(documentos) ? documentos : [];

        // ====== MODO DEBUG opcional ======
        if (req.query.debug === '1') {
            return res.json({
                ...exp,
                documentos,
                __debug: {
                    sqlDocs,
                    params,
                    hasColumns: has
                }
            });
        }

        return res.json({ ...exp, documentos });
    } catch (err) {
        console.error('GET /expedientes/numero error:', err);
        return res.status(500).json({ error: 'server_error', message: err?.message });
    }
});

// Crear nuevo expediente con archivos
router.post('/', upload.fields([
    { name: 'documentos_principales', maxCount: 5 },
    { name: 'anexos', maxCount: 5 }
]), async (req, res) => {
    try {
        const datosExpediente = req.body;

        console.log('📦 Archivos recibidos:', {
            documentos_principales: req.files?.documentos_principales?.length || 0,
            anexos: req.files?.anexos?.length || 0
        });

        // Validación básica
        if (!datosExpediente.numero_expediente || !datosExpediente.sede || !datosExpediente.especialidad) {
            return res.status(400).json({
                error: 'Los campos numero_expediente, sede y especialidad son requeridos'
            });
        }

        // Verificar si el número de expediente ya existe
        const expedienteExistente = await ExpedienteModel.obtenerPorNumero(datosExpediente.numero_expediente);
        if (expedienteExistente) {
            return res.status(409).json({
                error: 'Ya existe un expediente con ese número'
            });
        }

        // Procesar archivos subidos
        const documentos = [];

        if (req.files && req.files.documentos_principales) {
            req.files.documentos_principales.forEach(file => {
                console.log('📄 Documento principal:', file.originalname);
                documentos.push({
                    tipo: 'principal',
                    nombre_original: file.originalname,
                    nombre_archivo: file.filename,
                    ruta: file.path,
                    ruta_archivo: `/uploads/${file.filename}`, // URL accesible
                    tamano: file.size,
                    mimetype: file.mimetype,
                    fecha_subida: new Date().toISOString()
                });
            });
        }

        if (req.files && req.files.anexos) {
            req.files.anexos.forEach(file => {
                console.log('📎 Anexo:', file.originalname);
                documentos.push({
                    tipo: 'anexo',
                    nombre_original: file.originalname,
                    nombre_archivo: file.filename,
                    ruta: file.path,
                    ruta_archivo: `/uploads/${file.filename}`, // URL accesible
                    tamano: file.size,
                    mimetype: file.mimetype,
                    fecha_subida: new Date().toISOString()
                });
            });
        }

        console.log('📊 Total documentos procesados:', documentos.length);

        // Agregar documentos al expediente
        if (documentos.length > 0) {
            datosExpediente.documentos = JSON.stringify(documentos);
        }

        const resultado = await ExpedienteModel.crearExpediente(datosExpediente);

        // Obtener el expediente creado
        const expedienteCreado = await ExpedienteModel.obtenerPorId(resultado.insertId);

        console.log('✅ Expediente creado:', {
            id: expedienteCreado?.id || resultado.insertId,
            numero: expedienteCreado?.numero || datosExpediente.numero_expediente,
            archivos: documentos.length
        });

        res.status(201).json({
            success: true,
            message: 'Expediente creado exitosamente',
            data: expedienteCreado || { id: resultado.insertId, numero: datosExpediente.numero_expediente },
            archivos_subidos: documentos.length
        });
    } catch (error) {
        console.error('Error creando expediente:', error);
        
        // Si hay error, eliminar archivos subidos
        if (req.files) {
            Object.values(req.files).forEach(fileArray => {
                fileArray.forEach(file => {
                    try {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    } catch (unlinkError) {
                        console.error('Error eliminando archivo:', unlinkError);
                    }
                });
            });
        }
        
        res.status(500).json({ 
            error: 'Error interno del servidor', 
            details: error.sqlMessage || error.message 
        });
    }
});

// Actualizar expediente
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datosExpediente = req.body;

        // Verificar que el expediente existe
        const expedienteExistente = await ExpedienteModel.obtenerPorId(id);
        if (!expedienteExistente) {
            return res.status(404).json({ error: 'Expediente no encontrado' });
        }

        // Si se está cambiando el número de expediente, verificar que no exista
        if (datosExpediente.numero_expediente && datosExpediente.numero_expediente !== expedienteExistente.numero_expediente) {
            const expedienteConMismoNumero = await ExpedienteModel.obtenerPorNumero(datosExpediente.numero_expediente);
            if (expedienteConMismoNumero) {
                return res.status(409).json({
                    error: 'Ya existe otro expediente con ese número'
                });
            }
        }

        const resultado = await ExpedienteModel.actualizarExpediente(id, datosExpediente, datosExpediente.usuario_id);

        // Obtener expediente actualizado
        const expedienteActualizado = await ExpedienteModel.obtenerPorId(id);

        res.json({
            success: true,
            message: 'Expediente actualizado exitosamente',
            data: expedienteActualizado
        });
    } catch (error) {
        console.error('Error actualizando expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar expediente
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que el expediente existe
        const expedienteExistente = await ExpedienteModel.obtenerPorId(id);
        if (!expedienteExistente) {
            return res.status(404).json({ error: 'Expediente no encontrado' });
        }

        await ExpedienteModel.eliminarExpediente(id, req.body.usuario_id);
        res.json({
            success: true,
            message: 'Expediente eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Agregar parte procesal a expediente
router.post('/:id/partes', async (req, res) => {
    try {
        const { id } = req.params;
        const datosParte = req.body;

        // Verificar que el expediente existe
        const expedienteExistente = await ExpedienteModel.obtenerPorId(id);
        if (!expedienteExistente) {
            return res.status(404).json({ error: 'Expediente no encontrado' });
        }

        const resultado = await ExpedienteModel.agregarParteProcesal(id, datosParte);

        res.status(201).json({
            success: true,
            message: 'Parte procesal agregada exitosamente',
            data: { id: resultado.insertId }
        });
    } catch (error) {
        console.error('Error agregando parte procesal:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;