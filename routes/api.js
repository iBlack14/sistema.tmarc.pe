const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../database-config'); // Importar función query
const ExpedienteModel = require('../models/expediente-model'); // MySQL
const UsuarioModel = require('../models/usuario-model'); // MySQL
const smtpConfigManager = require('../smtp-config-manager');

// Función auxiliar para registrar auditoría
async function registrarAuditoria(tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos) {
    try {
        const sql = `
            INSERT INTO logs_auditoria (tabla_afectada, registro_id, accion, usuario_id, detalles, ip_direccion)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const detalles = {
            anteriores: datos_anteriores,
            nuevos: datos_nuevos
        };

        await query(sql, [tabla, registro_id, accion, usuario_id, JSON.stringify(detalles), null]);
    } catch (error) {
        console.error('Error registrando auditoría:', error);
        // No lanzar error para no interrumpir la operación principal
    }
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');

        console.log('🔧 [MULTER] Intentando guardar archivo en:', uploadDir);
        console.log('🔧 [MULTER] __dirname:', __dirname);
        console.log('🔧 [MULTER] Directorio existe:', fs.existsSync(uploadDir));

        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            console.log('🔧 [MULTER] Creando directorio...');
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
                console.log('✅ [MULTER] Directorio creado exitosamente');
            } catch (error) {
                console.error('❌ [MULTER] Error creando directorio:', error.message);
                return cb(error);
            }
        }

        // Verificar permisos de escritura
        try {
            fs.accessSync(uploadDir, fs.constants.W_OK);
            console.log('✅ [MULTER] Directorio tiene permisos de escritura');
        } catch (error) {
            console.error('❌ [MULTER] Sin permisos de escritura:', error.message);
            return cb(new Error('Sin permisos de escritura en ' + uploadDir));
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generar nombre único para el archivo
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro para archivos (PDF, Word e imágenes)
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/jpg'
    ];
    if (tiposPermitidos.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos PDF, Word e imágenes (JPG, PNG)'), false);
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

// Importar rutas modulares
const authRoutes = require('./auth');
const usuariosRoutes = require('./usuarios');
const expedientesRoutes = require('./expedientes');
const solicitudesRoutes = require('./solicitudes');
const documentosRoutes = require('./documentos');
const mesaPartesRoutes = require('./mesa-partes');
const casillaElectronicaRoutes = require('./casilla-electronica');
const estadisticasRoutes = require('./estadisticas');
const configuracionRoutes = require('./configuracion');
const actosRoutes = require('./actos-procesales');
const timelineRoutes = require('./timeline');

// Usar rutas modulares
router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/expedientes', expedientesRoutes);
router.use('/solicitudes', solicitudesRoutes);
router.use('/documentos', documentosRoutes);
router.use('/mesa-partes', mesaPartesRoutes);
router.use('/casilla-electronica', casillaElectronicaRoutes);
router.use('/estadisticas', estadisticasRoutes);
router.use('/configuracion', configuracionRoutes);

// Rutas de seguimiento unificado y actos procesales
// GET  /api/seguimiento/:codigo   → búsqueda completa en expedientes/mesa_partes/solicitudes
// GET  /api/expedientes/:id/actos → timeline de actos
// POST /api/expedientes/:id/actos → crear acto
// PUT  /api/actos/:id             → editar acto
// DELETE /api/actos/:id           → eliminar acto
// GET/POST /api/expedientes/:id/notificaciones-procesales
// PUT/DELETE /api/notificaciones-procesales/:id
router.use('/', actosRoutes);

// Rutas de timeline universal (Expedientes + Mesa de Partes + Solicitudes)
// GET/POST /api/{expedientes|mesa-partes|solicitudes}/:id/timeline
// PUT/DELETE /api/timeline/:id
// GET /api/seguimiento-completo/:codigo
router.use('/', timelineRoutes);

// ========== MESA DE PARTES (ADMIN UPDATE) ==========
// Se coloca aquí para asegurar visibilidad y evitar conflictos de ruteo
router.post('/mesa-partes/admin/actualizar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const datos = req.body;
        const MesaPartesModel = require('../models/mesa-partes-model');

        console.log(`🔄 [API-DIRECT] Solicitud de actualización para presentación: ${id}`);
        console.log('📦 Datos recibidos:', JSON.stringify(datos));

        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ success: false, error: 'ID de presentación no válido' });
        }

        const resultado = await MesaPartesModel.actualizarDatos(id, datos);

        if (resultado.affectedRows === 0) {
            console.warn(`⚠️ No se encontró la presentación con ID: ${id}`);
            return res.status(404).json({ success: false, error: 'Presentación no encontrada' });
        }

        console.log(`✅ Presentación ${id} actualizada correctamente`);
        res.json({ success: true, message: 'Datos actualizados correctamente' });

    } catch (error) {
        console.error('❌ Error en POST /api/mesa-partes/admin/actualizar/:id:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor', details: error.message });
    }
});

// ========== ENDPOINTS DE EXPEDIENTES ==========

// Obtener todos los expedientes con filtros opcionales
router.get('/expedientes', async (req, res) => {
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
router.get('/expedientes/:id', async (req, res) => {
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

// Crear nuevo expediente
router.post('/expedientes', async (req, res) => {
    try {
        const datosExpediente = req.body;

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

        const resultado = await ExpedienteModel.crearExpediente(datosExpediente);

        // Obtener el expediente creado
        const expedienteCreado = await ExpedienteModel.obtenerPorId(resultado.insertId);

        res.status(201).json({
            success: true,
            message: 'Expediente creado exitosamente',
            data: expedienteCreado
        });
    } catch (error) {
        console.error('Error creando expediente:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar expediente
router.put('/expedientes/:id', async (req, res) => {
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
router.delete('/expedientes/:id', async (req, res) => {
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
router.post('/expedientes/:id/partes', async (req, res) => {
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

// ========== ENDPOINTS DE SOLICITUDES ==========

router.get('/solicitudes', async (req, res) => {
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
router.get('/solicitudes/usuario/:usuario_id', async (req, res) => {
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
router.get('/solicitudes/:id', async (req, res) => {
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

// Crear nueva solicitud con archivos
router.post('/solicitudes', upload.fields([
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
        if (!nombre || !email || !dni || !tipo || !asunto || !descripcion) {
            return res.status(400).json({
                error: 'Los campos nombre, email, dni, tipo, asunto y descripcion son requeridos'
            });
        }

        // Generar ID único
        const id = 'SOL-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');

        // Procesar archivos subidos
        const documentos = [];

        // Documentos principales
        if (req.files && req.files.documentos_principales) {
            req.files.documentos_principales.forEach(file => {
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

// ========== ENDPOINTS DE USUARIOS ==========

// Obtener todos los usuarios
router.get('/usuarios', async (req, res) => {
    try {
        const filtros = {
            tipo: req.query.tipo,
            activo: req.query.activo !== undefined ? req.query.activo === 'true' : undefined,
            busqueda: req.query.busqueda,
            limite: req.query.limite ? parseInt(req.query.limite) : null
        };

        const usuarios = await UsuarioModel.obtenerTodos(filtros);
        res.json({ success: true, data: usuarios });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener usuario por ID
router.get('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await UsuarioModel.obtenerPorId(parseInt(id));

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ success: true, data: usuario });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar si usuario existe por email
router.get('/usuarios/existe/:email', async (req, res) => {
    try {
        const { email } = req.params;

        // Buscar en MySQL
        const usuarios = await UsuarioModel.obtenerTodos({ busqueda: email });
        const existeEnMySQL = usuarios.some(u => u.email === email);

        res.json({
            success: true,
            data: {
                existe: existeEnMySQL,
                id: existeEnMySQL ? usuarios.find(u => u.email === email).id : null,
                enMySQL: existeEnMySQL,
                enLocalStorage: false,
                detalles: {
                    mysql: existeEnMySQL ? usuarios.find(u => u.email === email) : null,
                    localStorage: null
                }
            }
        });
    } catch (error) {
        console.error('Error verificando existencia de usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// User creation is handled by the dedicated usuarios routes module

// ========== ENDPOINTS DE ESTADÍSTICAS ==========

// Obtener estadísticas generales
router.get('/estadisticas', async (req, res) => {
    try {
        const [estadisticasExpedientes, estadisticasUsuarios] = await Promise.all([
            ExpedienteModel.obtenerEstadisticas(),
            UsuarioModel.obtenerEstadisticas()
        ]);

        res.json({
            success: true,
            data: {
                expedientes: estadisticasExpedientes,
                usuarios: estadisticasUsuarios
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estadísticas en tiempo real para dashboards
router.get('/estadisticas/dashboard', async (req, res) => {
    try {
        // Obtener estadísticas de notificaciones (simuladas por ahora)
        const estadisticasNotificaciones = {
            nuevas: Math.floor(Math.random() * 10) + 1, // Simulado
            leidas: Math.floor(Math.random() * 30) + 10, // Simulado
            total_mes: Math.floor(Math.random() * 50) + 20 // Simulado
        };

        res.json({
            success: true,
            data: {
                solicitudes: {
                    total: parseInt(solicitudesRows.total_solicitudes) || 0,
                    pendientes: parseInt(solicitudesRows.solicitudes_pendientes) || 0,
                    aprobadas: parseInt(solicitudesRows.solicitudes_aprobadas) || 0,
                    rechazadas: parseInt(solicitudesRows.solicitudes_rechazadas) || 0
                },
                expedientes: {
                    total: parseInt(expedientesRows.total_expedientes) || 0,
                    nuevos: parseInt(expedientesRows.expedientes_nuevos) || 0,
                    en_tramite: parseInt(expedientesRows.expedientes_tramite) || 0,
                    finalizados: parseInt(expedientesRows.expedientes_finalizados) || 0,
                    activos: parseInt(expedientesRows.expedientes_activos) || 0
                },
                usuarios: {
                    total: parseInt(usuariosRows.total_usuarios) || 0,
                    activos: parseInt(usuariosRows.usuarios_activos) || 0,
                    inactivos: parseInt(usuariosRows.usuarios_inactivos) || 0,
                    nuevos_esta_semana: parseInt(usuariosRows.nuevos_esta_semana) || 0
                },
                notificaciones: estadisticasNotificaciones,
                tasa_completitud: expedientesRows.total_expedientes > 0 ?
                    Math.round((expedientesRows.expedientes_finalizados / expedientesRows.total_expedientes) * 100) : 0
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas del dashboard:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========== ENDPOINTS DE SMTP ==========

// Obtener estado del servicio SMTP
router.get('/smtp/estado', (req, res) => {
    try {
        const configuracion = smtpConfigManager.obtenerConfig() || null;
        const conectado = smtpConfigManager.smtpService?.transporter ? true : false;

        res.json({
            success: true,
            data: {
                configurado: !!configuracion,
                conectado: conectado,
                configuracion: configuracion ? {
                    server: configuracion.server,
                    port: configuracion.port,
                    ssl: configuracion.ssl,
                    fromEmail: configuracion.fromEmail,
                    fromName: configuracion.fromName
                } : null
            }
        });
    } catch (error) {
        console.error('Error obteniendo estado SMTP:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Configurar SMTP
router.post('/smtp/configurar', async (req, res) => {
    try {
        const config = req.body;

        // Validar configuración
        const validacion = smtpConfigManager.validarConfiguracion ? smtpConfigManager.validarConfiguracion(config) : { valido: false, errores: ['Servicio no disponible'] };
        if (!validacion.valido) {
            return res.status(400).json({
                success: false,
                message: 'Configuración inválida',
                errores: validacion.errores
            });
        }

        // Configurar transporter
        const resultado = smtpConfigManager.smtpService?.configurar ? smtpConfigManager.smtpService.configurar(config) : { success: false, message: 'Servicio no disponible' };

        if (resultado.success) {
            res.json({
                success: true,
                message: 'Configuración SMTP aplicada exitosamente'
            });
        } else {
            res.status(500).json({
                success: false,
                message: resultado.message
            });
        }
    } catch (error) {
        console.error('Error configurando SMTP:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Probar conexión SMTP
router.post('/smtp/probar', async (req, res) => {
    try {
        const config = req.body;

        // Configurar temporalmente para prueba
        const resultadoConfig = smtpConfigManager.smtpService?.configurar ? smtpConfigManager.smtpService.configurar(config) : { success: false, message: 'Servicio no disponible' };

        if (!resultadoConfig.success) {
            return res.status(400).json({
                success: false,
                message: resultadoConfig.message
            });
        }

        // Probar conexión
        const resultado = smtpConfigManager.smtpService?.probarConexion ? await smtpConfigManager.smtpService.probarConexion() : { success: false, message: 'Servicio no disponible' };

        res.json(resultado);
    } catch (error) {
        console.error('Error probando SMTP:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Enviar email real
router.post('/smtp/enviar', async (req, res) => {
    try {
        const { destinatario, asunto, contenido, tipo } = req.body;

        if (!destinatario || !asunto || !contenido) {
            return res.status(400).json({
                success: false,
                message: 'Destinatario, asunto y contenido son requeridos'
            });
        }

        const emailData = {
            destinatario,
            asunto,
            contenido,
            tipo: tipo || 'general'
        };

        const resultado = await smtpConfigManager.enviarEmail(emailData);
        res.json(resultado);
    } catch (error) {
        console.error('Error enviando email:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Enviar email de prueba
router.post('/smtp/enviar-prueba', async (req, res) => {
    try {
        const { destinatario, asunto, mensaje } = req.body;

        if (!destinatario || !asunto || !mensaje) {
            return res.status(400).json({
                success: false,
                message: 'Destinatario, asunto y mensaje son requeridos'
            });
        }

        const emailData = {
            destinatario,
            asunto,
            contenido: mensaje
        };

        const resultado = await smtpConfigManager.enviarEmail(emailData);
        res.json(resultado);
    } catch (error) {
        console.error('Error enviando email de prueba:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener configuraciones SMTP predefinidas
router.get('/smtp/configuraciones-predefinidas', (req, res) => {
    try {
        const configuraciones = smtpConfigManager.obtenerConfiguracionesPredefinidas ? smtpConfigManager.obtenerConfiguracionesPredefinidas() : [];
        res.json({
            success: true,
            data: configuraciones
        });
    } catch (error) {
        console.error('Error obteniendo configuraciones predefinidas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener TODAS las notificaciones (vista admin)
router.get('/notificaciones/admin-todas', async (req, res) => {
    try {
        const notificaciones = await query(`
            SELECT
                n.*,
                u.nombre AS usuario_nombre,
                u.email AS usuario_email
            FROM notificaciones n
            LEFT JOIN usuarios u ON n.usuario_id = u.id
            ORDER BY n.fecha DESC
            LIMIT 100
        `);

        const [stats] = await query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) AS no_leidas
            FROM notificaciones
        `);

        res.json({
            success: true,
            data: notificaciones,
            total: parseInt(stats.total) || 0,
            no_leidas: parseInt(stats.no_leidas) || 0
        });
    } catch (error) {
        console.error('Error obteniendo notificaciones admin:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener notificaciones del usuario actual
router.get('/notificaciones', async (req, res) => {
    try {
        // Obtener usuario_id desde el token o sesión
        // Por simplicidad, asumimos que viene en query param o header
        const usuarioId = req.query.usuario_id || req.headers['x-usuario-id'];

        if (!usuarioId) {
            return res.status(400).json({ error: 'Usuario ID requerido' });
        }

        const notificaciones = await query(`
            SELECT
                n.*,
                u.nombre as administrador_nombre
            FROM notificaciones n
            LEFT JOIN usuarios u ON n.usuario_id = u.id
            WHERE n.usuario_id = ?
            ORDER BY n.fecha DESC
        `, [usuarioId]);

        // Obtener estadísticas
        const [stats] = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas,
                SUM(CASE WHEN tipo = 'urgente' AND leida = 0 THEN 1 ELSE 0 END) as urgentes
            FROM notificaciones
            WHERE usuario_id = ?
        `, [usuarioId]);

        res.json({
            success: true,
            data: notificaciones,
            estadisticas: {
                total: parseInt(stats.total) || 0,
                no_leidas: parseInt(stats.no_leidas) || 0,
                urgentes: parseInt(stats.urgentes) || 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nueva notificación (desde admin) - con soporte para archivos y multi-canal
router.post('/notificaciones', upload.single('archivo'), async (req, res) => {
    try {
        const {
            usuario_id,
            tipo = 'sistema',
            titulo,
            mensaje,
            expediente_id,
            solicitud_id,
            referencia_tipo,
            referencia_id,
            enviar_casilla = true, // Por defecto true si viene de la casilla
            enviar_email = false
        } = req.body;

        // Validación
        if (!usuario_id || !titulo || !mensaje) {
            return res.status(400).json({
                error: 'usuario_id, titulo y mensaje son requeridos'
            });
        }

        const id = 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
        let results = { casilla: false, email: false };

        // 1. Enviar por CASILLA (Base de Datos)
        if (enviar_casilla === 'true' || enviar_casilla === true) {
            let archivoAdjunto = null;
            if (req.file) {
                archivoAdjunto = JSON.stringify({
                    nombre: req.file.originalname,
                    ruta: req.file.path,
                    tipo: req.file.mimetype,
                    tamano: req.file.size
                });
            }

            await query(`
                INSERT INTO notificaciones
                (id, usuario_id, tipo, titulo, mensaje, expediente_id, solicitud_id, archivo_adjunto, leida, fecha)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())
            `, [
                id,
                usuario_id,
                tipo,
                titulo,
                mensaje,
                expediente_id || referencia_id || null,
                solicitud_id || null,
                archivoAdjunto
            ]);
            results.casilla = true;
        }

        // 2. Enviar por EMAIL
        if (enviar_email === 'true' || enviar_email === true) {
            // Obtener email del usuario
            const [user] = await query('SELECT email, nombre FROM usuarios WHERE id = ?', [usuario_id]);
            if (user && user.email) {
                const emailSent = await smtpConfigManager.enviarEmail({
                    to: user.email,
                    subject: `TMARC | ${titulo}`,
                    html: `
                        <div style="font-family: 'Outfit', Arial, sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #D4AF37;">Notificación de Sistema</h2>
                            <p>Estimado/a <strong>${user.nombre}</strong>,</p>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 5px solid #D4AF37; margin: 20px 0;">
                                <h3 style="margin-top: 0;">${titulo}</h3>
                                <p style="line-height: 1.6;">${mensaje}</p>
                            </div>
                            <p style="font-size: 12px; color: #888;">Puede ver más detalles ingresando a su Casilla Electrónica en el portal TMARC.</p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                            <p style="font-size: 11px; color: #aaa; text-align: center;">Este es un mensaje automático, por favor no responda a este correo.</p>
                        </div>
                    `
                });
                results.email = emailSent.success;
            }
        }

        // Registrar en auditoría
        await registrarAuditoria('notificaciones', id, 'INSERT', req.body.usuario_admin_id || null, null, {
            usuario_id, tipo, titulo, mensaje, results
        });

        res.status(201).json({
            success: true,
            message: 'Comunicación procesada correctamente',
            data: { id, results }
        });
    } catch (error) {
        console.error('Error creando notificación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Marcar todas las notificaciones como leídas
router.put('/notificaciones/leida-todas', async (req, res) => {
    try {
        const { usuario_id } = req.body;
        if (!usuario_id) {
            return res.status(400).json({ error: 'Usuario ID requerido' });
        }

        // Marcar todas como leídas para este usuario
        await query(
            'UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0',
            [usuario_id]
        );

        res.json({
            success: true,
            message: 'Todas las notificaciones marcadas como leídas'
        });
    } catch (error) {
        console.error('Error marcando todas las notificaciones como leídas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Marcar notificación como leída
router.put('/notificaciones/:id/leida', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario_id } = req.body;

        // Verificar que la notificación pertenece al usuario
        const [notificacion] = await query(
            'SELECT * FROM notificaciones WHERE id = ? AND usuario_id = ?',
            [id, usuario_id]
        );

        if (!notificacion) {
            return res.status(404).json({ error: 'Notificación no encontrada' });
        }

        // Marcar como leída
        await query(
            'UPDATE notificaciones SET leida = 1 WHERE id = ?',
            [id]
        );

        // Registrar en auditoría
        await registrarAuditoria('notificaciones', id, 'UPDATE', usuario_id, { leida: notificacion.leida }, { leida: 1 });

        res.json({
            success: true,
            message: 'Notificación marcada como leída'
        });
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener estadísticas de notificaciones
router.get('/notificaciones/estadisticas', async (req, res) => {
    try {
        const usuarioId = req.query.usuario_id || req.headers['x-usuario-id'];

        if (!usuarioId) {
            return res.status(400).json({ error: 'Usuario ID requerido' });
        }

        const [stats] = await query(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN leida = 0 THEN 1 ELSE 0 END) as no_leidas,
                SUM(CASE WHEN tipo = 'urgente' AND leida = 0 THEN 1 ELSE 0 END) as urgentes,
                SUM(CASE WHEN DATE(fecha) = CURDATE() THEN 1 ELSE 0 END) as hoy
            FROM notificaciones
            WHERE usuario_id = ?
        `, [usuarioId]);

        res.json({
            success: true,
            data: {
                total: parseInt(stats.total) || 0,
                no_leidas: parseInt(stats.no_leidas) || 0,
                urgentes: parseInt(stats.urgentes) || 0,
                hoy: parseInt(stats.hoy) || 0
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas de notificaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========== ENDPOINTS DE USUARIOS ACTIVOS ==========

// Obtener usuarios activos
router.get('/usuarios-activos', (req, res) => {
    try {
        const usuarios = usuariosActivos.obtenerUsuariosActivos();
        const estadisticas = usuariosActivos.obtenerEstadisticas();

        res.json({
            success: true,
            data: {
                usuarios: usuarios,
                estadisticas: estadisticas,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error obteniendo usuarios activos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


router.post('/email/send', async (req, res) => {
    try {
        const { to, subject, html } = req.body;
        if (!to || !subject || !html) return res.status(400).json({ success: false, message: 'Faltan campos' });

        const r = await smtpConfigManager.enviarEmail({ to, subject, html }); // usa tu función real
        return res.json(r);
    } catch (e) {
        console.error('email/send:', e);
        return res.status(500).json({ success: false, message: e.message || 'Error enviando email' });
    }
});





// POST /api/email/credenciales
router.post('/email/credenciales', async (req, res) => {
    try {
        // Acepta ambos formatos: destinatario/asunto/contenido o to/subject/html
        const toAddr = (req.body?.destinatario || req.body?.to || req.body?.email || '').toString().trim();
        const subject = (req.body?.asunto || req.body?.subject || 'Credenciales de Acceso').toString();
        const html = (req.body?.contenido || req.body?.html || '').toString();
        const tipo = req.body?.tipo || 'credenciales_usuario';

        if (!toAddr) {
            return res.status(400).json({ success: false, message: 'No recipients defined' });
        }

        // Enviar con tu servicio SMTP
        const r = await smtpConfigManager.enviarEmail({ to: toAddr, subject, html, tipo });

        if (r?.success) {
            return res.json({ success: true, message: r.message || 'Email enviado exitosamente', ...r });
        }
        return res.status(500).json({ success: false, message: r?.message || 'Error enviando email' });
    } catch (e) {
        console.error('[/api/email/credenciales] error:', e, 'body:', req.body);
        return res.status(500).json({ success: false, message: 'Error enviando email: ' + (e.message || e) });
    }
});


// /api/expedientes/numero/:numero  (robusto + debug)
router.get('/expedientes/numero/:numero', async (req, res) => {
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
            expediente_numero: await col('expediente_numero'), // esquema “nuevo”
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
        //    y NO filtramos por tipo_documento para no perder nada.
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


// ================================================
// GET de depuración: ver anexos por id o número
// /api/expedientes/:id/documentos
// ================================================
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










// Sube anexos del expediente. Campo de archivos: 'anexos'
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
        try { metas = JSON.parse(req.body.metadatos || '[]'); } catch { }

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
                    `/uploads/${f.filename}`,
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













// Obtener usuarios activos por tipo
router.get('/usuarios-activos/tipo/:tipo', (req, res) => {
    try {
        const { tipo } = req.params;
        const usuarios = usuariosActivos.obtenerUsuariosActivosPorTipo(tipo);

        res.json({
            success: true,
            data: usuarios,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error obteniendo usuarios activos por tipo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========== ENDPOINT DE AUTENTICACIÓN ==========

// Obtener información del usuario actual
router.get('/auth/me', async (req, res) => {
    try {
        const usuarioId = req.query.usuario_id || req.headers['x-user-id'];

        if (!usuarioId) {
            return res.status(401).json({
                error: 'Usuario no autenticado'
            });
        }

        // Obtener usuario por ID
        const usuario = await UsuarioModel.obtenerPorId(parseInt(usuarioId));

        if (!usuario) {
            return res.status(404).json({
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(401).json({
                error: 'Usuario inactivo'
            });
        }

        res.json({
            success: true,
            data: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email,
                nombre: usuario.nombre,
                tipo: usuario.tipo,
                activo: usuario.activo,
                fecha_registro: usuario.fecha_registro,
                ultimo_acceso: usuario.ultimo_acceso
            }
        });
    } catch (error) {
        console.error('Error obteniendo información del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Logout de usuario
router.post('/auth/logout', async (req, res) => {
    try {
        // En este caso, como usamos tokens básicos, solo confirmamos el logout
        // En un sistema con JWT, aquí invalidaríamos el token en una blacklist
        res.json({
            success: true,
            message: 'Logout exitoso'
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login de usuario
router.post('/auth/login', async (req, res) => {
    try {
        const { usernameOEmail, password } = req.body;

        if (!usernameOEmail || !password) {
            return res.status(400).json({
                error: 'Usuario/email y contraseña son requeridos'
            });
        }

        // Obtener usuario
        const usuario = await UsuarioModel.obtenerPorUsernameOEmail(usernameOEmail);
        if (!usuario) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Verificar si el usuario está activo
        if (!usuario.activo) {
            return res.status(401).json({
                error: 'Usuario inactivo. Contacte al administrador.'
            });
        }

        // Verificar contraseña (ahora soporta tanto hash bcrypt como texto plano legacy)
        const passwordValida = await UsuarioModel.verificarPassword(usuario, password);
        if (!passwordValida) {
            return res.status(401).json({
                error: 'Credenciales inválidas'
            });
        }

        // Actualizar último acceso
        await UsuarioModel.actualizarUltimoAcceso(usuario.id);

        // Crear token básico (en producción usar JWT)
        const token = Buffer.from(`${usuario.id}:${Date.now()}`).toString('base64');

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                usuario: {
                    id: usuario.id,
                    username: usuario.username,
                    email: usuario.email,
                    nombre: usuario.nombre,
                    tipo: usuario.tipo
                },
                token: token
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ========== ENDPOINTS DE ACTIVIDADES RECIENTES ==========

// Obtener actividades recientes del sistema
router.get('/actividades-recientes', async (req, res) => {
    try {
        const limite = req.query.limite ? parseInt(req.query.limite) : 50;
        const horas = req.query.horas ? parseInt(req.query.horas) : 48; // Últimas 48 horas por defecto

        const sql = `
            SELECT
                la.*,
                u.nombre as nombre_usuario,
                u.tipo as tipo_usuario
            FROM logs_auditoria la
            LEFT JOIN usuarios u ON la.usuario_id = u.id
            WHERE la.fecha >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY la.fecha DESC
            LIMIT ?
        `;

        const actividades = await query(sql, [horas, limite]);

        // Formatear actividades para display
        const actividadesFormateadas = actividades.map(actividad => {
            let descripcionAccion = '';
            let estado = 'Completado';

            switch (actividad.accion) {
                case 'INSERT':
                    switch (actividad.tabla_afectada) {
                        case 'expedientes':
                            descripcionAccion = 'Creó expediente';
                            break;
                        case 'usuarios':
                            descripcionAccion = 'Creó usuario';
                            break;
                        case 'notificaciones':
                            descripcionAccion = 'Envió notificación';
                            break;
                        default:
                            descripcionAccion = `Creó registro en ${actividad.tabla_afectada}`;
                    }
                    break;
                case 'UPDATE':
                    switch (actividad.tabla_afectada) {
                        case 'expedientes':
                            descripcionAccion = 'Actualizó expediente';
                            break;
                        case 'usuarios':
                            descripcionAccion = 'Actualizó usuario';
                            break;
                        default:
                            descripcionAccion = `Actualizó registro en ${actividad.tabla_afectada}`;
                    }
                    break;
                case 'DELETE':
                    switch (actividad.tabla_afectada) {
                        case 'expedientes':
                            descripcionAccion = 'Eliminó expediente';
                            break;
                        case 'usuarios':
                            descripcionAccion = 'Eliminó usuario';
                            break;
                        default:
                            descripcionAccion = `Eliminó registro de ${actividad.tabla_afectada}`;
                    }
                    break;
                case 'LOGIN':
                    descripcionAccion = 'Inició sesión';
                    break;
                case 'LOGOUT':
                    descripcionAccion = 'Cerró sesión';
                    break;
                default:
                    descripcionAccion = actividad.accion;
            }

            // Obtener detalles adicionales si existen
            let detalles = actividad.registro_id || '';
            if (actividad.detalles) {
                try {
                    const detallesJson = JSON.parse(actividad.detalles);
                    if (detallesJson.nuevos && detallesJson.nuevos.numero) {
                        detalles = detallesJson.nuevos.numero;
                    } else if (detallesJson.nuevos && detallesJson.nuevos.nombre) {
                        detalles = detallesJson.nuevos.nombre;
                    }
                } catch (e) {
                    // Si no se puede parsear, usar registro_id
                }
            }

            return {
                usuario: actividad.nombre_usuario || 'Sistema',
                tipo_usuario: actividad.tipo_usuario || 'sistema',
                accion: descripcionAccion,
                detalles: detalles,
                fecha: actividad.fecha,
                estado: estado
            };
        });

        res.json({
            success: true,
            data: actividadesFormateadas,
            metadata: {
                total: actividadesFormateadas.length,
                horas: horas,
                limite: limite
            }
        });
    } catch (error) {
        console.error('Error obteniendo actividades recientes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;






























