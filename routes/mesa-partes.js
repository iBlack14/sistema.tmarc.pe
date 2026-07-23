const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const MesaPartesModel = require('../models/mesa-partes-model');
const { query } = require('../database-config');

// Middleware de depuración para este router
router.use((req, res, next) => {
    console.log(`[DEBUG-ROUTER] MesaPartes: ${req.method} ${req.path}`);
    next();
});

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
        const uploadDir = path.join(__dirname, '../uploads/mesa-partes');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'MP-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB máximo
        files: 20 // Máximo 20 archivos
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF, DOC, DOCX, JPG, PNG'));
        }
    }
});

/**
 * POST /api/mesa-partes
 * Crear nueva presentación en mesa de partes
 */
router.post('/', upload.array('documentos', 20), async (req, res) => {
    try {
        console.log('📥 Nueva presentación en Mesa de Partes');
        console.log('📦 Archivos recibidos:', req.files?.length || 0);
        console.log('📋 Datos:', req.body);

        const datosPresentacion = req.body;

        // Validaciones básicas
        if (!datosPresentacion.usuario_id) {
            return res.status(400).json({
                success: false,
                error: 'usuario_id es requerido'
            });
        }

        // Procesar archivos adjuntos
        const documentos = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                console.log('📄 Archivo:', file.originalname);
                documentos.push({
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

        // Parsear JSON si vienen como strings
        if (typeof datosPresentacion.demandante === 'string') {
            datosPresentacion.demandante = JSON.parse(datosPresentacion.demandante);
        }
        if (typeof datosPresentacion.demandado === 'string') {
            datosPresentacion.demandado = JSON.parse(datosPresentacion.demandado);
        }

        // Agregar documentos
        datosPresentacion.documentos = documentos;

        // Crear presentación
        const resultado = await MesaPartesModel.crearPresentacion(datosPresentacion);

        // Obtener la presentación creada
        const presentacionCreada = await MesaPartesModel.obtenerPorNumero(resultado.numero_registro);

        console.log('✅ Presentación creada:', resultado.numero_registro);
        
        // Generar URL de seguimiento para QR (sin token)
        const baseUrl = process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://sistema.tmarc.pe' : 'http://localhost:3002');
        const urlSeguimiento = `${baseUrl}/seguimiento.html?codigo=${resultado.numero_registro}`;

        res.status(201).json({
            success: true,
            message: 'Presentación registrada exitosamente',
            data: presentacionCreada,
            numero_registro: resultado.numero_registro,
            url_seguimiento: urlSeguimiento, // URL para el QR (sin token)
            archivos_subidos: documentos.length
        });

    } catch (error) {
        console.error('❌ Error creando presentación:', error);

        // Eliminar archivos subidos en caso de error
        if (req.files) {
            req.files.forEach(file => {
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (unlinkError) {
                    console.error('Error eliminando archivo:', unlinkError);
                }
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * GET /api/mesa-partes
 * Obtener todas las presentaciones (con filtros)
 */
router.get('/', async (req, res) => {
    try {
        console.log('📋 Obteniendo presentaciones de Mesa de Partes');

        const filtros = {
            usuario_id: req.query.usuario_id,
            estado: req.query.estado,
            tipo_presentacion: req.query.tipo,
            fecha_desde: req.query.fecha_desde,
            fecha_hasta: req.query.fecha_hasta,
            limite: req.query.limite
        };

        const presentaciones = await MesaPartesModel.obtenerTodas(filtros);

        console.log(`✅ ${presentaciones.length} presentaciones encontradas`);

        res.json({
            success: true,
            data: presentaciones,
            count: presentaciones.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo presentaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/mesa-partes/:id
 * Obtener presentación por ID o número de registro
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔍 Obteniendo presentación:', id);

        let presentacion;

        // Intentar por número de registro primero
        if (id.startsWith('TMARC-')) {
            presentacion = await MesaPartesModel.obtenerPorNumero(id);
        } else {
            // Intentar por ID numérico
            presentacion = await MesaPartesModel.obtenerPorId(id);
        }

        if (!presentacion) {
            return res.status(404).json({
                success: false,
                error: 'Presentación no encontrada'
            });
        }

        console.log('✅ Presentación encontrada:', presentacion.numero_registro);

        res.json({
            success: true,
            data: presentacion
        });

    } catch (error) {
        console.error('❌ Error obteniendo presentación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/mesa-partes/:id/archivos
 * Obtener archivos de una presentación
 */
router.get('/:id/archivos', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('📂 Obteniendo archivos de presentación:', id);

        let presentacion;
        if (id.startsWith('TMARC-')) {
            presentacion = await MesaPartesModel.obtenerPorNumero(id);
        } else {
            presentacion = await MesaPartesModel.obtenerPorId(id);
        }

        if (!presentacion) {
            return res.status(404).json({
                success: false,
                error: 'Presentación no encontrada'
            });
        }

        const documentos = presentacion.documentos || [];

        console.log(`✅ ${documentos.length} archivos encontrados`);

        res.json({
            success: true,
            data: documentos,
            count: documentos.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo archivos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * PUT /api/mesa-partes/:id/estado
 * Actualizar estado de presentación (Admin)
 */
router.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, observaciones, revisado_por } = req.body;

        console.log(`🔄 Actualizando estado de presentación ${id} a: ${estado}`);

        // Validar estado
        const estadosValidos = ['Pendiente', 'En Revisión', 'Aprobado', 'Rechazado'];
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido'
            });
        }

        const resultado = await MesaPartesModel.actualizarEstado(
            id,
            estado,
            observaciones,
            revisado_por
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Presentación no encontrada'
            });
        }

        console.log('✅ Estado actualizado correctamente');

        res.json({
            success: true,
            message: 'Estado actualizado correctamente'
        });

    } catch (error) {
        console.error('❌ Error actualizando estado:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Route moved to api.js to avoid conflicts


/**
 * GET /api/mesa-partes/seguimiento/:codigo
 * Obtener seguimiento de expediente por código (busca en mesa de partes Y solicitudes)
 * PROTEGIDO: Requiere autenticación
 */
router.get('/seguimiento/:codigo', async (req, res) => {
    try {
        const codigo = req.params.codigo;
        console.log('🔍 Buscando expediente:', codigo);
        
        // Verificar autenticación (token en header)
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida. Inicia sesión para ver tu expediente.'
            });
        }
        
        // Verificar token y obtener usuario
        const jwt = require('jsonwebtoken');
        let usuarioId, usuarioTipo;
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Token de sesión normal
            usuarioId = decoded.id;
            usuarioTipo = decoded.tipo;
            console.log('👤 Token de sesión para usuario:', usuarioId, 'Tipo:', usuarioTipo);
        } catch (error) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido o expirado'
            });
        }

        // Buscar primero en mesa de partes
        let expediente = await MesaPartesModel.obtenerPorNumero(codigo);

        // Si no se encuentra, buscar en solicitudes
        if (!expediente) {
            const sqlSolicitud = `
                SELECT 
                    s.*,
                    e.numero_expediente,
                    e.estado as estado_expediente,
                    e.fecha_registro as fecha_expediente
                FROM solicitudes s
                LEFT JOIN expedientes e ON s.expediente_id = e.id
                WHERE s.numero_solicitud = ?
                   OR e.numero_expediente = ?
            `;
            
            const resultados = await query(sqlSolicitud, [codigo, codigo]);
            
            if (resultados && resultados.length > 0) {
                expediente = {
                    numero_registro: resultados[0].numero_solicitud || resultados[0].numero_expediente,
                    fecha_registro: resultados[0].fecha_solicitud || resultados[0].fecha_expediente,
                    tipo_presentacion: resultados[0].tipo_solicitud || 'Solicitud',
                    estado: resultados[0].estado || resultados[0].estado_expediente || 'registrado',
                    demandante: {
                        nombre: resultados[0].solicitante_nombre || 'No especificado'
                    },
                    sumilla: resultados[0].descripcion || resultados[0].asunto,
                    documentos: [],
                    tipo: 'solicitud' // Identificar que viene de solicitudes
                };
            }
        } else {
            expediente.tipo = 'mesa_partes'; // Identificar que viene de mesa de partes
        }

        if (!expediente) {
            return res.status(404).json({
                success: false,
                error: 'Expediente no encontrado'
            });
        }
        
        // VERIFICAR PERMISOS: Usuario solo puede ver sus propios expedientes
        if (usuarioTipo !== 'admin') {
            // Verificar que el expediente pertenece al usuario
            if (expediente.usuario_id && expediente.usuario_id !== usuarioId) {
                return res.status(403).json({
                    success: false,
                    error: 'No tienes permiso para ver este expediente'
                });
            }
        }

        res.json({
            success: true,
            ...expediente
        });

    } catch (error) {
        console.error('❌ Error buscando expediente:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/mesa-partes/buscar?razon=nombre
 * Buscar expedientes por razón social o nombre (busca en mesa de partes Y solicitudes)
 */
router.get('/buscar', async (req, res) => {
    try {
        const razon = req.query.razon;
        
        if (!razon) {
            return res.status(400).json({
                success: false,
                error: 'Parámetro razon es requerido'
            });
        }

        console.log('🔍 Buscando expedientes por razón:', razon);

        const searchTerm = `%${razon}%`;
        let expedientes = [];

        // 1. Buscar en mesa de partes
        const sqlMesaPartes = `
            SELECT 
                id,
                numero_registro,
                fecha_presentacion as fecha_registro,
                tipo_presentacion,
                estado,
                demandante,
                demandado,
                sumilla,
                'mesa_partes' as tipo
            FROM mesa_partes
            WHERE JSON_EXTRACT(demandante, '$.nombre') LIKE ?
               OR JSON_EXTRACT(demandante, '$.razon_social') LIKE ?
            ORDER BY fecha_presentacion DESC
            LIMIT 10
        `;

        const resultadosMesaPartes = await query(sqlMesaPartes, [searchTerm, searchTerm]);

        // Parsear JSON de mesa de partes
        const expedientesMesaPartes = resultadosMesaPartes.map(exp => ({
            ...exp,
            demandante: typeof exp.demandante === 'string' ? JSON.parse(exp.demandante) : exp.demandante,
            demandado: typeof exp.demandado === 'string' ? JSON.parse(exp.demandado) : exp.demandado
        }));

        expedientes = [...expedientesMesaPartes];

        // 2. Buscar en solicitudes
        const sqlSolicitudes = `
            SELECT 
                s.id,
                COALESCE(s.numero_solicitud, e.numero_expediente) as numero_registro,
                COALESCE(s.fecha_solicitud, e.fecha_registro) as fecha_registro,
                COALESCE(s.tipo_solicitud, 'Solicitud') as tipo_presentacion,
                COALESCE(s.estado, e.estado, 'registrado') as estado,
                s.solicitante_nombre,
                s.descripcion as sumilla,
                'solicitud' as tipo
            FROM solicitudes s
            LEFT JOIN expedientes e ON s.expediente_id = e.id
            WHERE s.solicitante_nombre LIKE ?
            ORDER BY fecha_registro DESC
            LIMIT 10
        `;

        const resultadosSolicitudes = await query(sqlSolicitudes, [searchTerm]);

        // Formatear solicitudes
        const expedientesSolicitudes = resultadosSolicitudes.map(sol => ({
            ...sol,
            demandante: {
                nombre: sol.solicitante_nombre || 'No especificado'
            },
            demandado: null
        }));

        expedientes = [...expedientes, ...expedientesSolicitudes];

        // Ordenar por fecha (más recientes primero)
        expedientes.sort((a, b) => new Date(b.fecha_registro) - new Date(a.fecha_registro));

        // Limitar a 10 resultados
        expedientes = expedientes.slice(0, 10);

        res.json(expedientes);

    } catch (error) {
        console.error('❌ Error buscando expedientes:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * GET /api/mesa-partes/estadisticas
 * Obtener estadísticas de mesa de partes
 */
router.get('/estadisticas/general', async (req, res) => {
    try {
        const usuario_id = req.query.usuario_id;

        console.log('📊 Obteniendo estadísticas de Mesa de Partes');

        const estadisticas = await MesaPartesModel.obtenerEstadisticas(usuario_id);

        res.json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;
