const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para archivos (PDF, Word, Excel, Imágenes)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/jpg'
    ];
    
    // También permitir por extensión en caso de que el mimetype no sea correcto
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF, Word, Excel o Imágenes'), false);
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

// ========== ENDPOINTS DE SOLICITUDES ==========

router.get('/', async (req, res) => {
    try {
        const params = [];
        let where = '1=1';
        if (req.query.estado) { where += ' AND LOWER(estado) = LOWER(?)'; params.push(req.query.estado); }
        if (req.query.usuario_id) { where += ' AND usuario_id = ?'; params.push(req.query.usuario_id); }

        const rows = await query(
            `
            SELECT
                id,
                usuario_id,
                nombre,           -- nombre de quien registró (lo usaremos como "Usuario")
                tipo,
                estado,
                fecha AS fecha_presentacion
            FROM solicitudes
            WHERE ${where}
            ORDER BY fecha DESC
            `,
            params
        );

        // Devuelve ambas claves por compatibilidad con el front
        res.json({ success: true, data: rows, solicitudes: rows });
    } catch (e) {
        console.error('Error obteniendo solicitudes:', e);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener solicitudes del usuario específico
router.get('/usuario/:usuario_id', async (req, res) => {
    try {
        const { usuario_id } = req.params;

        if (!usuario_id) {
            return res.status(400).json({ error: 'Usuario ID requerido' });
        }

        const solicitudes = await query(`
            SELECT id, tipo, asunto, estado, fecha, fecha_actualizacion
            FROM solicitudes
            WHERE usuario_id = ?
            ORDER BY fecha DESC
        `, [usuario_id]);

        res.json({ success: true, data: solicitudes });
    } catch (error) {
        console.error('Error obteniendo solicitudes del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener solicitud por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const solicitudes = await query('SELECT * FROM solicitudes WHERE id = ?', [id]);

        if (solicitudes.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        res.json({ success: true, data: solicitudes[0] });
    } catch (error) {
        console.error('Error obteniendo solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener archivos de una solicitud
router.get('/:id/archivos', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('📂 Obteniendo archivos para solicitud:', id);
        
        // Obtener la solicitud
        const solicitudes = await query('SELECT documentos FROM solicitudes WHERE id = ?', [id]);

        if (solicitudes.length === 0) {
            console.log('❌ Solicitud no encontrada:', id);
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const documentosRaw = solicitudes[0].documentos;
        console.log('📄 Campo documentos (raw):', documentosRaw);
        console.log('📄 Tipo de documentos:', typeof documentosRaw);

        // Parsear los documentos
        let documentos = [];
        if (documentosRaw) {
            try {
                // Si ya es un objeto/array, usarlo directamente
                if (typeof documentosRaw === 'object') {
                    documentos = Array.isArray(documentosRaw) ? documentosRaw : [documentosRaw];
                    console.log('✅ Documentos ya parseados:', documentos.length);
                } 
                // Si es string, intentar parsear
                else if (typeof documentosRaw === 'string') {
                    // Verificar si es "[object Object]" (error común)
                    if (documentosRaw === '[object Object]' || documentosRaw.includes('[object Object]')) {
                        console.warn('⚠️ Campo documentos contiene "[object Object]" - datos corruptos');
                        documentos = [];
                    } else {
                        documentos = JSON.parse(documentosRaw);
                        console.log('✅ Documentos parseados correctamente:', documentos.length);
                    }
                }
            } catch (e) {
                console.error('❌ Error parseando documentos:', e.message);
                console.error('   Contenido:', documentosRaw?.substring(0, 100));
                documentos = [];
            }
        } else {
            console.log('ℹ️ No hay documentos para esta solicitud');
        }

        console.log('📊 Total archivos a devolver:', documentos.length);

        res.json({
            success: true,
            data: documentos,
            count: documentos.length
        });
    } catch (error) {
        console.error('❌ Error obteniendo archivos de solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nueva solicitud con archivos
router.post('/', upload.fields([
    { name: 'documentos_principales', maxCount: 5 },
    { name: 'anexos', maxCount: 5 }
]), async (req, res) => {
    try {
        const {
            nombre, email, telefono, dni, tipo, asunto, descripcion, prioridad,
            casilla_electronica, numero_expediente, sede, especialidad, motivo_ingreso,
            proceso, materia, sumilla, tipo_presentante, colegio_abogados,
            casilla_fisica, oficina_casilla, usuario_id,
            demandado_nombre, demandado_dni, demandado_email
        } = req.body;

        // Validación básica
        if (!nombre || !email || !dni || !tipo || !asunto) {
            return res.status(400).json({
                error: 'Los campos nombre, email, dni, tipo y asunto son requeridos'
            });
        }

        // Generar ID único
        const id = 'SOL-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');

        // Procesar archivos subidos
        const documentos = [];

        console.log('📦 Archivos recibidos:', {
            files: req.files,
            documentos_principales: req.files?.documentos_principales?.length || 0,
            anexos: req.files?.anexos?.length || 0
        });

        // Documentos principales
        if (req.files && req.files.documentos_principales) {
            req.files.documentos_principales.forEach(file => {
                console.log('📄 Documento principal:', file.originalname);
                documentos.push({
                    tipo: 'principal',
                    nombre_original: file.originalname,
                    nombre_archivo: file.filename,
                    ruta: file.path,
                    tamano: file.size,
                    mimetype: file.mimetype,
                    fecha_subida: new Date().toISOString()
                });
            });
        }

        // Anexos
        if (req.files && req.files.anexos) {
            req.files.anexos.forEach(file => {
                console.log('📎 Anexo:', file.originalname);
                documentos.push({
                    tipo: 'anexo',
                    nombre_original: file.originalname,
                    nombre_archivo: file.filename,
                    ruta: file.path,
                    tamano: file.size,
                    mimetype: file.mimetype,
                    fecha_subida: new Date().toISOString()
                });
            });
        }

        console.log('📊 Total documentos procesados:', documentos.length);

        // Crear objeto completo de la solicitud
        const solicitudCompleta = {
            id,
            nombre,
            email,
            telefono: telefono || null,
            dni,
            tipo,
            asunto,
            descripcion,
            prioridad: prioridad || 'normal',
            casilla_electronica: casilla_electronica || null,
            documentos: documentos,
            demandado_nombre: demandado_nombre || null,
            demandado_dni:    demandado_dni    || null,
            demandado_email:  demandado_email  || null,
            // Datos adicionales del expediente
            numero_expediente: numero_expediente || null,
            sede: sede || null,
            especialidad: especialidad || null,
            motivo_ingreso: motivo_ingreso || null,
            proceso: proceso || null,
            materia: materia || null,
            sumilla: sumilla || null,
            tipo_presentante: tipo_presentante || null,
            colegio_abogados: colegio_abogados || null,
            casilla_fisica: casilla_fisica || null,
            oficina_casilla: oficina_casilla || null,
            fecha_creacion: new Date().toISOString(),
            estado: 'Pendiente'
        };

        const sql = `
            INSERT INTO solicitudes (id, usuario_id, nombre, email, telefono, dni, tipo, asunto, descripcion, prioridad, documentos, casilla_electronica, demandado_nombre, demandado_dni, demandado_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const documentosJson = JSON.stringify(documentos);

        const resultado = await query(sql, [
            id, usuario_id || null, nombre, email, telefono || null, dni, tipo, asunto, descripcion,
            prioridad || 'normal', documentosJson, casilla_electronica || null,
            demandado_nombre || null, demandado_dni || null, demandado_email || null
        ]);

        console.log('✅ Solicitud creada con archivos:', {
            id,
            archivos: documentos.length,
            documentos_principales: req.files?.documentos_principales?.length || 0,
            anexos: req.files?.anexos?.length || 0
        });

        res.status(201).json({
            success: true,
            message: 'Solicitud creada exitosamente',
            data: {
                id: id,
                archivos_subidos: documentos.length,
                solicitud: solicitudCompleta
            }
        });
    } catch (error) {
        console.error('Error creando solicitud:', error);

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

        res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
});

module.exports = router;