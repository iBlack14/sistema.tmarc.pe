const { query } = require('../database-config');

class MesaPartesModel {

    /**
     * Crear una nueva presentación en mesa de partes
     */
    static async crearPresentacion(datosPresentacion) {
        try {
            const {
                usuario_id,
                tipo_presentacion = 'Arbitraje',
                demandante,
                demandado,
                materia,
                cuantia,
                sumilla,
                documentos
            } = datosPresentacion;

            // Generar número de registro único
            const numero_registro = await this.generarNumeroRegistro();

            const sql = `
                INSERT INTO mesa_partes (
                    numero_registro, usuario_id, tipo_presentacion,
                    demandante, demandado, materia, cuantia, sumilla,
                    documentos, estado
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')
            `;

            const params = [
                numero_registro,
                usuario_id,
                tipo_presentacion,
                JSON.stringify(demandante),
                JSON.stringify(demandado),
                materia,
                cuantia,
                sumilla,
                documentos ? JSON.stringify(documentos) : null
            ];

            const resultado = await query(sql, params);

            console.log('✅ Presentación creada:', numero_registro);

            return {
                success: true,
                insertId: resultado.insertId,
                numero_registro: numero_registro
            };
        } catch (error) {
            console.error('❌ Error creando presentación:', error);
            throw error;
        }
    }

    /**
     * Generar número de registro único (TMARC-0001-2025)
     */
    static async generarNumeroRegistro() {
        const año = new Date().getFullYear();
        const prefijo = `TMARC-`;

        // Obtener el último número
        const sql = `
            SELECT numero_registro 
            FROM mesa_partes 
            WHERE numero_registro LIKE ? 
            ORDER BY id DESC 
            LIMIT 1
        `;

        const resultados = await query(sql, [`${prefijo}%`]);

        let nuevoNumero = 1;
        if (resultados.length > 0) {
            const ultimoNumero = resultados[0].numero_registro;
            // Extraer el número del formato TMARC-0001-2025
            const match = ultimoNumero.match(/TMARC-(\d+)-/);
            if (match) {
                nuevoNumero = parseInt(match[1]) + 1;
            }
        }

        return `${prefijo}${String(nuevoNumero).padStart(4, '0')}-${año}`;
    }

    /**
     * Obtener presentación por ID
     */
    static async obtenerPorId(id) {
        try {
            const sql = `
                SELECT mp.*, u.nombre as nombre_usuario, u.email
                FROM mesa_partes mp
                LEFT JOIN usuarios u ON mp.usuario_id = u.id
                WHERE mp.id = ?
            `;

            const resultados = await query(sql, [id]);
            
            if (resultados.length === 0) {
                return null;
            }

            const presentacion = resultados[0];

            // Mapear fecha_presentacion a fecha_registro para compatibilidad
            if (presentacion.fecha_presentacion && !presentacion.fecha_registro) {
                presentacion.fecha_registro = presentacion.fecha_presentacion;
            }

            // Parsear JSON
            if (presentacion.demandante && typeof presentacion.demandante === 'string') {
                presentacion.demandante = JSON.parse(presentacion.demandante);
            }
            if (presentacion.demandado && typeof presentacion.demandado === 'string') {
                presentacion.demandado = JSON.parse(presentacion.demandado);
            }
            if (presentacion.documentos && typeof presentacion.documentos === 'string') {
                presentacion.documentos = JSON.parse(presentacion.documentos);
            }

            return presentacion;
        } catch (error) {
            console.error('❌ Error obteniendo presentación:', error);
            throw error;
        }
    }

    /**
     * Obtener presentación por número de registro
     */
    static async obtenerPorNumero(numero_registro) {
        try {
            const sql = `
                SELECT mp.*, u.nombre as nombre_usuario, u.email
                FROM mesa_partes mp
                LEFT JOIN usuarios u ON mp.usuario_id = u.id
                WHERE mp.numero_registro = ?
            `;

            const resultados = await query(sql, [numero_registro]);
            
            if (resultados.length === 0) {
                return null;
            }

            const presentacion = resultados[0];

            // Mapear fecha_presentacion a fecha_registro para compatibilidad
            if (presentacion.fecha_presentacion && !presentacion.fecha_registro) {
                presentacion.fecha_registro = presentacion.fecha_presentacion;
            }

            // Parsear JSON
            if (presentacion.demandante && typeof presentacion.demandante === 'string') {
                presentacion.demandante = JSON.parse(presentacion.demandante);
            }
            if (presentacion.demandado && typeof presentacion.demandado === 'string') {
                presentacion.demandado = JSON.parse(presentacion.demandado);
            }
            if (presentacion.documentos && typeof presentacion.documentos === 'string') {
                presentacion.documentos = JSON.parse(presentacion.documentos);
            }

            return presentacion;
        } catch (error) {
            console.error('❌ Error obteniendo presentación por número:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las presentaciones (con filtros)
     */
    static async obtenerTodas(filtros = {}) {
        try {
            let sql = `
                SELECT mp.*, u.nombre as nombre_usuario, u.email
                FROM mesa_partes mp
                LEFT JOIN usuarios u ON mp.usuario_id = u.id
                WHERE 1=1
            `;

            const params = [];

            // Filtrar por usuario
            if (filtros.usuario_id) {
                sql += ' AND mp.usuario_id = ?';
                params.push(filtros.usuario_id);
            }

            // Filtrar por estado
            if (filtros.estado) {
                sql += ' AND mp.estado = ?';
                params.push(filtros.estado);
            }

            // Filtrar por tipo
            if (filtros.tipo_presentacion) {
                sql += ' AND mp.tipo_presentacion = ?';
                params.push(filtros.tipo_presentacion);
            }

            // Filtrar por fecha
            if (filtros.fecha_desde) {
                sql += ' AND DATE(mp.fecha_presentacion) >= ?';
                params.push(filtros.fecha_desde);
            }

            if (filtros.fecha_hasta) {
                sql += ' AND DATE(mp.fecha_presentacion) <= ?';
                params.push(filtros.fecha_hasta);
            }

            // Ordenar
            sql += ' ORDER BY mp.fecha_presentacion DESC';

            // Límite
            if (filtros.limite) {
                sql += ' LIMIT ?';
                params.push(parseInt(filtros.limite));
            }

            const resultados = await query(sql, params);

            // Parsear JSON en cada resultado
            return resultados.map(presentacion => {
                if (presentacion.demandante && typeof presentacion.demandante === 'string') {
                    presentacion.demandante = JSON.parse(presentacion.demandante);
                }
                if (presentacion.demandado && typeof presentacion.demandado === 'string') {
                    presentacion.demandado = JSON.parse(presentacion.demandado);
                }
                if (presentacion.documentos && typeof presentacion.documentos === 'string') {
                    presentacion.documentos = JSON.parse(presentacion.documentos);
                }
                return presentacion;
            });
        } catch (error) {
            console.error('❌ Error obteniendo presentaciones:', error);
            throw error;
        }
    }

    /**
     * Actualizar estado de presentación
     */
    static async actualizarEstado(id, nuevoEstado, observaciones = null, revisado_por = null) {
        try {
            const sql = `
                UPDATE mesa_partes 
                SET estado = ?,
                    observaciones = ?,
                    revisado_por = ?,
                    fecha_revision = CURRENT_TIMESTAMP,
                    fecha_respuesta = CASE WHEN ? IN ('Aprobado', 'Rechazado') THEN CURRENT_TIMESTAMP ELSE fecha_respuesta END
                WHERE id = ?
            `;

            const params = [nuevoEstado, observaciones, revisado_por, nuevoEstado, id];
            const resultado = await query(sql, params);

            console.log(`✅ Estado actualizado a: ${nuevoEstado}`);

            return {
                success: true,
                affectedRows: resultado.affectedRows
            };
        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            throw error;
        }
    }

    /**
     * Actualizar datos de presentación (Mesa de Partes)
     */
    static async actualizarDatos(id, datos) {
        try {
            const camposPermitidos = ['fecha_presentacion', 'tipo_presentacion', 'materia', 'cuantia', 'sumilla'];
            const updates = [];
            const params = [];

            for (const campo of camposPermitidos) {
                if (datos.hasOwnProperty(campo)) {
                    updates.push(`${campo} = ?`);
                    params.push(datos[campo]);
                }
            }

            if (updates.length === 0) {
                return { success: true, affectedRows: 0 };
            }

            let sql = `UPDATE mesa_partes SET ${updates.join(', ')} WHERE `;
            if (String(id).startsWith('TMARC-')) {
                sql += 'numero_registro = ?';
            } else {
                sql += 'id = ?';
            }
            params.push(id);

            const resultado = await query(sql, params);
            
            console.log(`✅ Datos actualizados para ID/Numero: ${id}`);

            return {
                success: true,
                affectedRows: resultado.affectedRows
            };
        } catch (error) {
            console.error('❌ Error actualizando datos de mesa de partes:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas
     */
    static async obtenerEstadisticas(usuario_id = null) {
        try {
            let sql = `
                SELECT
                    COUNT(*) as total,
                    COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
                    COUNT(CASE WHEN estado = 'En Revisión' THEN 1 END) as en_revision,
                    COUNT(CASE WHEN estado = 'Aprobado' THEN 1 END) as aprobados,
                    COUNT(CASE WHEN estado = 'Rechazado' THEN 1 END) as rechazados
                FROM mesa_partes
            `;

            const params = [];

            if (usuario_id) {
                sql += ' WHERE usuario_id = ?';
                params.push(usuario_id);
            }

            const resultados = await query(sql, params);
            return resultados[0];
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw error;
        }
    }
}

module.exports = MesaPartesModel;
