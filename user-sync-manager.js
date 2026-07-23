// Gestor de sincronización de usuarios entre localStorage y MySQL
class UserSyncManager {
    constructor() {
        this.syncInProgress = false;

        // Obtener lastSync dependiendo del contexto
        if (typeof window !== 'undefined' && window.localStorage) {
            this.lastSync = localStorage.getItem('lastUserSync') || null;
            this.init(); // Solo inicializar en navegador
        } else {
            this.lastSync = null;
            // No inicializar en servidor
        }
    }

    init() {
        // SOLO ejecutar en el navegador, NO en el servidor
        if (typeof window === 'undefined') {
            console.log('⚠️ UserSyncManager: Ejecutando en servidor - NO inicializar intervalos');
            return;
        }

        // Sincronizar al cargar la página (solo navegador)
        this.syncUsers();

        // Configurar sincronización automática cada 30 segundos (solo navegador)
        this.syncInterval = setInterval(() => {
            this.syncUsers();
        }, 30000);

        console.log('✅ UserSyncManager: Inicializado en navegador');
    }

    // Sincronizar usuarios de localStorage a MySQL
    async syncUsers() {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        try {
            // Obtener usuarios de localStorage
            const usuariosLocalStorage = this.getUsuariosLocalStorage();

            if (usuariosLocalStorage.length === 0) {
                this.syncInProgress = false;
                return;
            }

            // Verificar si necesitamos sincronizar
            const necesitaSync = this.needsSync(usuariosLocalStorage);

            if (!necesitaSync) {
                this.syncInProgress = false;
                return;
            }

            console.log('🔄 Sincronizando usuarios con MySQL...');

            // Sincronizar usuarios uno por uno
            for (const usuario of usuariosLocalStorage) {
                await this.syncUsuario(usuario);
            }

            // Actualizar timestamp de última sincronización
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('lastUserSync', new Date().toISOString());
            }

            console.log('✅ Sincronización de usuarios completada');

        } catch (error) {
            console.error('❌ Error sincronizando usuarios:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    // Obtener usuarios de localStorage (navegador) o archivo (servidor)
    getUsuariosLocalStorage() {
        try {
            // Verificar si estamos en el navegador
            if (typeof window !== 'undefined' && window.localStorage) {
                const usuarios = localStorage.getItem('usuariosRegistrados');
                return usuarios ? JSON.parse(usuarios) : [];
            } else {
                // En servidor, leer del archivo JSON
                const fs = require('fs');
                const path = require('path');
                const usuariosFile = path.join(__dirname, 'data', 'usuarios.json');

                if (fs.existsSync(usuariosFile)) {
                    const data = fs.readFileSync(usuariosFile, 'utf8');
                    return JSON.parse(data);
                }
                return [];
            }
        } catch (error) {
            console.error('Error leyendo usuarios:', error);
            return [];
        }
    }

    // Verificar si necesita sincronización
    needsSync(usuariosLocalStorage) {
        // Si no hay última sincronización, sincronizar
        if (!this.lastSync) return true;

        // Verificar si algún usuario fue creado después de la última sincronización
        const lastSyncDate = new Date(this.lastSync);
        return usuariosLocalStorage.some(usuario => {
            const usuarioDate = new Date(usuario.fechaRegistro);
            return usuarioDate > lastSyncDate;
        });
    }

    // Sincronizar un usuario individual
    async syncUsuario(usuario) {
        try {
            // Solo sincronizar si estamos en el navegador
            if (typeof window === 'undefined') {
                console.log('📡 Ejecutando en servidor - omitiendo sincronización de usuario');
                return;
            }

            // Verificar si el usuario ya existe en MySQL
            const existeResponse = await fetch('/api/usuarios?email=' + encodeURIComponent(usuario.email));
            const existeData = await existeResponse.json();

            if (existeData.success && existeData.data.length > 0) {
                console.log(`ℹ️ Usuario ${usuario.email} ya existe en MySQL`);
                return;
            }

            // Crear usuario en MySQL
            const usuarioData = {
                username: usuario.username,
                email: usuario.email,
                password: usuario.password, // Nota: Ya está hasheada
                nombre: usuario.nombre,
                tipo: usuario.tipo || 'usuario',
                activo: usuario.activo !== false
            };

            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(usuarioData)
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✅ Usuario ${usuario.email} sincronizado con MySQL`);
            } else {
                console.error(`❌ Error sincronizando usuario ${usuario.email}:`, result.error);
            }

        } catch (error) {
            console.error(`❌ Error sincronizando usuario ${usuario.email}:`, error);
        }
    }

    // Agregar usuario a localStorage y sincronizar inmediatamente
    async agregarUsuarioSincronizado(usuarioData) {
        try {
            // Agregar a localStorage (navegador) o archivo (servidor)
            const usuarios = this.getUsuariosLocalStorage();
            const nuevoUsuario = {
                id: Date.now(),
                username: usuarioData.username,
                email: usuarioData.email,
                password: usuarioData.password,
                nombre: usuarioData.nombre,
                tipo: usuarioData.tipo || 'usuario',
                activo: true,
                fechaRegistro: new Date().toISOString(),
                temporal: usuarioData.temporal || false,
                fechaExpiracion: usuarioData.fechaExpiracion || null
            };

            usuarios.push(nuevoUsuario);

            // Guardar en localStorage (navegador) o archivo (servidor)
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('usuariosRegistrados', JSON.stringify(usuarios));
            } else {
                // En servidor, guardar en archivo
                const fs = require('fs');
                const path = require('path');
                const usuariosFile = path.join(__dirname, 'data', 'usuarios.json');
                fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2));
            }

            // Sincronizar inmediatamente con MySQL
            await this.syncUsuario(nuevoUsuario);

            return { success: true, usuario: nuevoUsuario };

        } catch (error) {
            console.error('Error agregando usuario sincronizado:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener estadísticas de sincronización
    obtenerEstadisticas() {
        const usuariosLocalStorage = this.getUsuariosLocalStorage();
        const lastSync = this.lastSync;

        return {
            usuariosEnLocalStorage: usuariosLocalStorage.length,
            usuariosTemporales: usuariosLocalStorage.filter(u => u.temporal).length,
            usuariosPermanentes: usuariosLocalStorage.filter(u => !u.temporal).length,
            ultimaSincronizacion: lastSync,
            necesitaSincronizacion: this.needsSync(usuariosLocalStorage)
        };
    }

    // Forzar sincronización manual
    async forzarSincronizacion() {
        console.log('🔄 Forzando sincronización manual...');
        await this.syncUsers();
        return { success: true, message: 'Sincronización forzada completada' };
    }

    // Limpiar usuarios sincronizados (después de exitosa sincronización)
    limpiarUsuariosSincronizados() {
        try {
            // Solo mantener usuarios que no se pudieron sincronizar
            const usuarios = this.getUsuariosLocalStorage();
            const usuariosProblematicos = usuarios.filter(u => u.syncError);

            // Guardar en localStorage (navegador) o archivo (servidor)
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('usuariosRegistrados', JSON.stringify(usuariosProblematicos));
                localStorage.setItem('lastUserSync', new Date().toISOString());
            } else {
                // En servidor, guardar en archivo
                const fs = require('fs');
                const path = require('path');
                const usuariosFile = path.join(__dirname, 'data', 'usuarios.json');
                fs.writeFileSync(usuariosFile, JSON.stringify(usuariosProblematicos, null, 2));
            }

            return {
                success: true,
                eliminados: usuarios.length - usuariosProblematicos.length,
                restantes: usuariosProblematicos.length
            };
        } catch (error) {
            console.error('Error limpiando usuarios sincronizados:', error);
            return { success: false, error: error.message };
        }
    }
}

// Crear instancia global
const userSyncManager = new UserSyncManager();

// Hacer disponible globalmente (solo en navegador)
if (typeof window !== 'undefined') {
    window.UserSyncManager = UserSyncManager;
    window.userSyncManager = userSyncManager;

    // Función auxiliar para mostrar estadísticas de sincronización
    window.mostrarEstadisticasSincronizacion = function() {
        const stats = window.userSyncManager.obtenerEstadisticas();
        console.log('📊 Estadísticas de sincronización:', stats);

        if (window.conexionDatos && window.conexionDatos.mostrarNotificacion) {
            let mensaje = `Usuarios en localStorage: ${stats.usuariosEnLocalStorage}`;
            if (stats.necesitaSincronizacion) {
                mensaje += ' (Necesita sincronización)';
            }

            window.conexionDatos.mostrarNotificacion(mensaje, 'info');
        }
    };
}