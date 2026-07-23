const { query } = require('../database-config');

class ExpedienteModel {

    // Crear un nuevo expediente
    static async crearExpediente(datosExpediente) {
        try {
            const {
                numero_expediente,
                usuario_id,
                sede,
                especialidad,
                motivo_ingreso,
                proceso,
                materia,
                cuantia,
                moneda,
                indeterminado,
                sumilla,
                tipo_presentante,
                presentante,
                documento_identidad,
                correo,
                telefono,
                domicilio,
                colegiatura,
                colegio_abogados,
                casilla_fisica,
                oficina_casilla,
                casilla_electronica,
                // Demandante
                demandante_nombre,
                demandante_dni,
                demandante_correo,
                demandante_telefono,
                demandante_domicilio,
                // Demandado
                demandado_nombre,
                demandado_dni,
                demandado_correo,
                demandado_telefono,
                demandado_domicilio,
                estado = 'Nuevo',
                observaciones = ''
            } = datosExpediente;

            const sql = `
                INSERT INTO expedientes (
                    id, numero, usuario_id, sede, especialidad, motivo_ingreso,
                    proceso, materia, cuantia, moneda, indeterminado, sumilla,
                    tipo_presentante, presentante, documento, correo, telefono, domicilio,
                    colegiatura, colegio_abogados, casilla_fisica, oficina_casilla,
                    casilla_electronica,
                    demandante_nombre, demandante_dni, demandante_correo, demandante_telefono, demandante_domicilio,
                    demandado_nombre, demandado_dni, demandado_correo, demandado_telefono, demandado_domicilio,
                    estado, observaciones, documentos
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            // Generar ID único para el expediente — máx 20 chars (VARCHAR(20) en BD)
            // Formato: EXP-YYYYMMDD-XXXXX = 18 chars
            const now = new Date();
            const fecha = now.getFullYear().toString() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0');
            const rand = Math.random().toString(36).substr(2, 5).toUpperCase();
            const id = `EXP-${fecha}-${rand}`; // ej: EXP-20260526-A3K9F = 18 chars

            const params = [
                id,
                numero_expediente,
                usuario_id || null,
                sede || null,
                especialidad || null,
                motivo_ingreso || null,
                proceso || null,
                materia || null,
                cuantia || 0,
                moneda || 'PEN',
                indeterminado ? 1 : 0,
                sumilla || null,
                tipo_presentante || null,
                presentante || null,
                documento_identidad || null,   // columna "documento" en BD
                correo || null,
                telefono || null,
                domicilio || null,
                colegiatura || null,
                colegio_abogados || null,
                casilla_fisica || null,
                oficina_casilla || null,
                casilla_electronica || null,
                // Demandante
                demandante_nombre || null,
                demandante_dni || null,
                demandante_correo || null,
                demandante_telefono || null,
                demandante_domicilio || null,
                // Demandado
                demandado_nombre || null,
                demandado_dni || null,
                demandado_correo || null,
                demandado_telefono || null,
                demandado_domicilio || null,
                estado,
                observaciones,
                datosExpediente.documentos || null
            ];

            const resultado = await query(sql, params);

            // Registrar en auditoría (no bloquea si falla)
            await this.registrarAuditoria('expedientes', id, 'INSERT', usuario_id, null, datosExpediente);

            return { insertId: id, ...resultado };
        } catch (error) {
            console.error('Error creando expediente — mensaje:', error.message);
            console.error('Error creando expediente — SQL:', error.sql || '(no sql)');
            console.error('Error creando expediente — sqlMessage:', error.sqlMessage || '(no sqlMessage)');
            throw error;
        }
    }

    // Obtener expediente por ID
    static async obtenerPorId(id) {
        try {
            const sql = `
                SELECT e.*, u.nombre as nombre_usuario
                FROM expedientes e
                LEFT JOIN usuarios u ON e.usuario_id = u.id
                WHERE e.id = ?
            `;
            const expedientes = await query(sql, [id]);
            return expedientes[0] || null;
        } catch (error) {
            console.error('Error obteniendo expediente por ID:', error);
            throw error;
        }
    }

    // Obtener expediente por número
    static async obtenerPorNumero(numero_expediente) {
        try {
            const sql = `
                SELECT e.*, u.nombre as nombre_usuario
                FROM expedientes e
                LEFT JOIN usuarios u ON e.usuario_id = u.id
                WHERE e.numero = ?
            `;
            const expedientes = await query(sql, [numero_expediente]);
            return expedientes[0] || null;
        } catch (error) {
            console.error('Error obteniendo expediente por número:', error);
            throw error;
        }
    }

    // Obtener todos los expedientes con filtros
    static async obtenerTodos(filtros = {}) {
        try {
            let sql = `
                SELECT e.*, u.nombre as nombre_usuario
                FROM expedientes e
                LEFT JOIN usuarios u ON e.usuario_id = u.id
            `;
            let params = [];
            let condiciones = [];

            // Aplicar filtros
            if (filtros.estado) {
                condiciones.push('e.estado = ?');
                params.push(filtros.estado);
            }

            if (filtros.usuario_id) {
                condiciones.push('e.usuario_id = ?');
                params.push(filtros.usuario_id);
            }

            if (filtros.fecha_desde) {
                condiciones.push('DATE(e.fecha_creacion) >= ?');
                params.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                condiciones.push('DATE(e.fecha_creacion) <= ?');
                params.push(filtros.fecha_hasta);
            }

            if (filtros.sede) {
                condiciones.push('e.sede = ?');
                params.push(filtros.sede);
            }

            if (filtros.especialidad) {
                condiciones.push('e.especialidad = ?');
                params.push(filtros.especialidad);
            }

            if (filtros.busqueda) {
                condiciones.push('(e.numero LIKE ? OR e.presentante LIKE ? OR e.sumilla LIKE ?)');
                const termino = `%${filtros.busqueda}%`;
                params.push(termino, termino, termino);
            }

            if (condiciones.length > 0) {
                sql += ' WHERE ' + condiciones.join(' AND ');
            }

            // Ordenar por fecha de creación descendente
            sql += ' ORDER BY e.fecha_creacion DESC';

            // Aplicar límite si se especifica
            if (filtros.limite) {
                sql += ' LIMIT ?';
                params.push(filtros.limite);
            }

            if (filtros.offset) {
                sql += ' OFFSET ?';
                params.push(filtros.offset);
            }

            return await query(sql, params);
        } catch (error) {
            console.error('Error obteniendo expedientes:', error);
            throw error;
        }
    }

    // Actualizar expediente
    static async actualizarExpediente(id, datosExpediente, usuario_id) {
        try {
            // Obtener datos actuales para auditoría
            const expedienteActual = await this.obtenerPorId(id);

            const camposPermitidos = [
                'sede', 'especialidad', 'motivo_ingreso', 'proceso', 'materia',
                'cuantia', 'moneda', 'sumilla', 'tipo_presentante', 'presentante',
                'documento_identidad', 'correo', 'telefono', 'domicilio',
                'colegiatura', 'colegio_abogados', 'casilla_electronica',
                'estado', 'observaciones',
                // Demandante
                'demandante_nombre', 'demandante_dni', 'demandante_correo',
                'demandante_telefono', 'demandante_domicilio',
                // Demandado
                'demandado_nombre', 'demandado_dni', 'demandado_correo',
                'demandado_telefono', 'demandado_domicilio',
                // Campos CEJ (ya existen en la tabla BD)
                'organo_jurisdiccional', 'distrito_judicial', 'juez',
                'especialista_legal', 'etapa_procesal', 'ubicacion',
                'fecha_inicio', 'fecha_conclusion', 'motivo_conclusion',
                'casilla_fisica', 'oficina_casilla', 'indeterminado'
            ];


            let sql = 'UPDATE expedientes SET ';
            let params = [];
            let campos = [];

            camposPermitidos.forEach(campo => {
                if (datosExpediente.hasOwnProperty(campo)) {
                    campos.push(`${campo} = ?`);
                    params.push(datosExpediente[campo]);
                }
            });

            if (campos.length === 0) {
                throw new Error('No hay campos para actualizar');
            }

            sql += campos.join(', ');
            sql += ', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?';
            params.push(id);

            const resultado = await query(sql, params);

            // Registrar en auditoría
            await this.registrarAuditoria('expedientes', id, 'UPDATE', usuario_id, expedienteActual, datosExpediente);

            return resultado;
        } catch (error) {
            console.error('Error actualizando expediente:', error);
            throw error;
        }
    }

    // Eliminar expediente
    static async eliminarExpediente(id, usuario_id) {
        try {
            // Obtener datos actuales para auditoría
            const expedienteActual = await this.obtenerPorId(id);

            const resultado = await query('DELETE FROM expedientes WHERE id = ?', [id]);

            // Registrar en auditoría
            await this.registrarAuditoria('expedientes', id, 'DELETE', usuario_id, expedienteActual, null);

            return resultado;
        } catch (error) {
            console.error('Error eliminando expediente:', error);
            throw error;
        }
    }

    // Obtener estadísticas de expedientes
    static async obtenerEstadisticas() {
        try {
            const sql = `
                SELECT
                    COUNT(*) as total_expedientes,
                    COUNT(CASE WHEN estado = 'Nuevo' THEN 1 END) as nuevos,
                    COUNT(CASE WHEN estado = 'En Proceso' THEN 1 END) as en_proceso,
                    COUNT(CASE WHEN estado = 'Completado' THEN 1 END) as completados,
                    COUNT(CASE WHEN estado = 'Archivado' THEN 1 END) as archivados,
                    COUNT(CASE WHEN fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as ultimos_30_dias
                FROM expedientes
            `;

            const estadisticas = await query(sql);
            return estadisticas[0];
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    // Agregar parte procesal a expediente
    static async agregarParteProcesal(expediente_id, datosParte) {
        try {
            const {
                tipo_parte,
                tipo_persona,
                nombre_completo,
                documento_identidad,
                telefono,
                correo,
                domicilio,
                representante_legal
            } = datosParte;

            const sql = `
                INSERT INTO partes_procesales (
                    expediente_id, tipo_parte, tipo_persona, nombre_completo,
                    documento_identidad, telefono, correo, domicilio, representante_legal
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                expediente_id, tipo_parte, tipo_persona, nombre_completo,
                documento_identidad, telefono, correo, domicilio, representante_legal
            ];

            return await query(sql, params);
        } catch (error) {
            console.error('Error agregando parte procesal:', error);
            throw error;
        }
    }

    // Obtener partes procesales de un expediente
    static async obtenerPartesProcesales(expediente_id) {
        try {
            const sql = 'SELECT * FROM partes_procesales WHERE expediente_id = ? ORDER BY tipo_parte, nombre_completo';
            return await query(sql, [expediente_id]);
        } catch (error) {
            console.error('Error obteniendo partes procesales:', error);
            throw error;
        }
    }

    // Función auxiliar para registrar auditoría
    static async registrarAuditoria(tabla, registro_id, accion, usuario_id, datos_anteriores, datos_nuevos) {
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
}

module.exports = ExpedienteModel;