const { query } = require('../database-config');
const bcrypt = require('bcrypt');

class UsuarioModel {

    // Crear un nuevo usuario
    static async crearUsuario(datosUsuario) {
        try {
            const {
                username,
                email,
                password,
                nombre,
                telefono = null,
                tipo = 'usuario'
            } = datosUsuario;

            // Hashear la contraseña
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);

            const sql = `
                INSERT INTO usuarios (username, email, password, nombre, telefono, tipo)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const resultado = await query(sql, [username, email, password_hash, nombre, telefono, tipo]);

            // Registrar en auditoría
            await this.registrarAuditoria('usuarios', resultado.insertId, 'INSERT', null, null, {
                username, email, nombre, tipo
            });

            return resultado;
        } catch (error) {
            console.error('Error creando usuario:', error);
            throw error;
        }
    }

    // Obtener usuario por ID
    static async obtenerPorId(id) {
        try {
            const parsedId = parseInt(id, 10);
            if (isNaN(parsedId)) {
                console.warn('obtenerPorId: ID inválido recibido:', id);
                return null;
            }
            // Primero intentar con columnas extendidas, si falla usar columnas base
            try {
                const sql = 'SELECT id, username, email, nombre, tipo, activo, fecha_registro, ultimo_acceso, foto_perfil, telefono FROM usuarios WHERE id = ?';
                const usuarios = await query(sql, [parsedId]);
                return usuarios[0] || null;
            } catch (extendedError) {
                // Las columnas foto_perfil/telefono no existen aún, usar query base
                console.warn('⚠️ Columnas extendidas no disponibles, usando query base');
                const sql = 'SELECT id, username, email, nombre, tipo, activo, fecha_registro, ultimo_acceso FROM usuarios WHERE id = ?';
                const usuarios = await query(sql, [parsedId]);
                return usuarios[0] || null;
            }
        } catch (error) {
            console.error('Error obteniendo usuario por ID:', error);
            throw error;
        }
    }

    // Obtener usuario por ID con contraseña (solo para verificación)
    static async obtenerPorIdConPassword(id) {
        try {
            const parsedId = parseInt(id, 10);
            if (isNaN(parsedId)) {
                console.warn('obtenerPorIdConPassword: ID inválido recibido:', id);
                return null;
            }
            const sql = 'SELECT id, username, email, nombre, tipo, activo, fecha_registro, ultimo_acceso, password FROM usuarios WHERE id = ?';
            const usuarios = await query(sql, [parsedId]);
            return usuarios[0] || null;
        } catch (error) {
            console.error('Error obteniendo usuario por ID con contraseña:', error);
            throw error;
        }
    }

    // Obtener usuario por username o email
    static async obtenerPorUsernameOEmail(usernameOEmail) {
        try {
            const sql = 'SELECT * FROM usuarios WHERE username = ? OR email = ?';
            const usuarios = await query(sql, [usernameOEmail, usernameOEmail]);
            return usuarios[0] || null;
        } catch (error) {
            console.error('Error obteniendo usuario por username/email:', error);
            throw error;
        }
    }

    // Verificar contraseña
    static async verificarPassword(usuario, password) {
        try {
            // Validar que el usuario tenga el campo password
            if (!usuario || !usuario.password) {
                console.error('verificarPassword: El objeto usuario no contiene el campo password');
                return false;
            }

            // Primero intentar verificar como hash bcrypt
            const esHashBcrypt = usuario.password.startsWith('$2b$') || usuario.password.startsWith('$2a$');

            if (esHashBcrypt) {
                // Es un hash bcrypt, verificar normalmente
                return await bcrypt.compare(password, usuario.password);
            } else {
                // Es una contraseña legacy sin hashear, comparar directamente
                // NOTA: Esto es temporal para usuarios legacy
                const coincide = usuario.password === password;

                // Si coincide, actualizar a hash bcrypt para futuras verificaciones
                if (coincide) {
                    console.log(`🔄 Actualizando contraseña legacy para usuario ${usuario.username}`);
                    await this.actualizarPasswordLegacy(usuario.id, password);
                }

                return coincide;
            }
        } catch (error) {
            console.error('Error verificando contraseña:', error);
            throw error;
        }
    }

    // Actualizar contraseña legacy a hash bcrypt
    static async actualizarPasswordLegacy(id, passwordPlano) {
        try {
            const hash = await bcrypt.hash(passwordPlano, 10);
            await query('UPDATE usuarios SET password = ? WHERE id = ?', [hash, id]);
            console.log(`✅ Contraseña legacy actualizada a bcrypt para usuario ID: ${id}`);
        } catch (error) {
            console.error('Error actualizando contraseña legacy:', error);
            // No lanzar error para no interrumpir el login
        }
    }

    // Actualizar último acceso
    static async actualizarUltimoAcceso(usuario_id) {
        try {
            const sql = 'UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?';
            return await query(sql, [usuario_id]);
        } catch (error) {
            console.error('Error actualizando último acceso:', error);
            throw error;
        }
    }

    // Obtener todos los usuarios
    static async obtenerTodos(filtros = {}) {
        try {
            let sql = 'SELECT id, username, email, nombre, tipo, activo, fecha_registro, ultimo_acceso FROM usuarios';
            let params = [];
            let condiciones = [];

            if (filtros.tipo) {
                condiciones.push('tipo = ?');
                params.push(filtros.tipo);
            }

            if (filtros.activo !== undefined) {
                condiciones.push('activo = ?');
                params.push(filtros.activo);
            }

            if (filtros.busqueda) {
                condiciones.push('(username LIKE ? OR email LIKE ? OR nombre LIKE ?)');
                const termino = `%${filtros.busqueda}%`;
                params.push(termino, termino, termino);
            }

            if (condiciones.length > 0) {
                sql += ' WHERE ' + condiciones.join(' AND ');
            }

            sql += ' ORDER BY fecha_registro DESC';

            if (filtros.limite) {
                sql += ' LIMIT ?';
                params.push(filtros.limite);
            }

            return await query(sql, params);
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            throw error;
        }
    }

    // Actualizar usuario
    static async actualizarUsuario(id, datosUsuario, usuario_id_admin = null) {
        try {
            // Obtener datos actuales para auditoría
            const usuarioActual = await this.obtenerPorId(id);
            if (!usuarioActual) {
                throw new Error('Usuario no encontrado');
            }

            // Si se está cambiando el email, verificar que no esté en uso por otro usuario
            if (datosUsuario.email && datosUsuario.email !== usuarioActual.email) {
                const emailExiste = await this.emailExiste(datosUsuario.email, id);
                if (emailExiste) {
                    throw new Error('El correo electrónico ya está registrado por otro usuario');
                }
            }

            // Si se está cambiando el username, verificar que no esté en uso por otro usuario
            if (datosUsuario.username && datosUsuario.username !== usuarioActual.username) {
                const usernameExiste = await this.usernameExiste(datosUsuario.username, id);
                if (usernameExiste) {
                    throw new Error('El nombre de usuario ya está en uso');
                }
            }

            const camposPermitidos = ['username', 'email', 'nombre', 'tipo', 'activo', 'foto_perfil', 'telefono'];
            let sql = 'UPDATE usuarios SET ';
            let params = [];
            let campos = [];

            camposPermitidos.forEach(campo => {
                if (datosUsuario.hasOwnProperty(campo)) {
                    campos.push(`${campo} = ?`);
                    params.push(datosUsuario[campo]);
                }
            });

            if (campos.length === 0) {
                return { affectedRows: 0 };
            }

            sql += campos.join(', ');
            sql += ' WHERE id = ?';
            params.push(id);

            const resultado = await query(sql, params);

            // Registrar en auditoría
            await this.registrarAuditoria('usuarios', id, 'UPDATE', usuario_id_admin, usuarioActual, datosUsuario);

            return resultado;
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            throw error;
        }
    }

    // Cambiar contraseña
    static async cambiarPassword(usuario_id, nuevaPassword) {
        try {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(nuevaPassword, saltRounds);

            const sql = 'UPDATE usuarios SET password = ? WHERE id = ?';
            return await query(sql, [password_hash, usuario_id]);
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            throw error;
        }
    }

    // Método auxiliar para actualizar contraseñas legacy
    static async actualizarPasswordLegacy(usuarioId, passwordPlain) {
        try {
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(passwordPlain, saltRounds);

            const sql = 'UPDATE usuarios SET password = ? WHERE id = ?';
            await query(sql, [passwordHash, usuarioId]);

            console.log(`✅ Contraseña actualizada a hash bcrypt para usuario ID ${usuarioId}`);
        } catch (error) {
            console.error('Error actualizando contraseña legacy:', error);
            // No lanzar error para no interrumpir el login
        }
    }

    // Eliminar usuario
    static async eliminarUsuario(id, usuario_id_admin = null) {
        try {
            // Obtener datos actuales para auditoría
            const usuarioActual = await this.obtenerPorId(id);

            // Eliminar físicamente de la base de datos
            const sql = 'DELETE FROM usuarios WHERE id = ?';
            const resultado = await query(sql, [id]);

            // Registrar en auditoría
            await this.registrarAuditoria('usuarios', id, 'DELETE', usuario_id_admin, usuarioActual, null);

            return resultado;
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            throw error;
        }
    }

    // Verificar si username existe
    static async usernameExiste(username, excluirId = null) {
        try {
            let sql = 'SELECT COUNT(*) as count FROM usuarios WHERE username = ?';
            let params = [username];

            if (excluirId) {
                sql += ' AND id != ?';
                params.push(excluirId);
            }

            const resultado = await query(sql, params);
            return resultado[0].count > 0;
        } catch (error) {
            console.error('Error verificando username:', error);
            throw error;
        }
    }

    // Verificar si email existe
    static async emailExiste(email, excluirId = null) {
        try {
            let sql = 'SELECT COUNT(*) as count FROM usuarios WHERE email = ?';
            let params = [email];

            if (excluirId) {
                sql += ' AND id != ?';
                params.push(excluirId);
            }

            const resultado = await query(sql, params);
            return resultado[0].count > 0;
        } catch (error) {
            console.error('Error verificando email:', error);
            throw error;
        }
    }

    // Obtener estadísticas de usuarios
    static async obtenerEstadisticas() {
        try {
            const sql = `
                SELECT
                    COUNT(*) as total_usuarios,
                    COUNT(CASE WHEN tipo = 'admin' THEN 1 END) as total_admins,
                    COUNT(CASE WHEN tipo = 'usuario' THEN 1 END) as total_usuarios_normales,
                    COUNT(CASE WHEN activo = TRUE THEN 1 END) as usuarios_activos,
                    COUNT(CASE WHEN ultimo_acceso >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as activos_ultima_semana
                FROM usuarios
            `;

            const estadisticas = await query(sql);
            return estadisticas[0];
        } catch (error) {
            console.error('Error obteniendo estadísticas de usuarios:', error);
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

module.exports = UsuarioModel;
