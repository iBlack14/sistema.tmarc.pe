/**
 * Módulo de Autenticación
 * Maneja la autenticación y autorización del administrador
 */

// Sistema de autenticación para admin usando backend
class AdminAuthCheck {
    constructor() {
        this.usuarioActual = null;
        this.checkAuthentication();
    }

    async checkAuthentication() {
        console.log('🔐 [AUTH] Iniciando verificación de sesión...');
        
        const token = await getSecureItem('authToken');
        const userData = await getSecureItem('userData');

        console.log('🔐 [AUTH] Token recuperado:', token ? '✅ (' + typeof token + ', ' + String(token).substring(0, 20) + '...)' : '❌ null');
        console.log('🔐 [AUTH] UserData recuperado:', userData ? '✅ (' + typeof userData + ')' : '❌ null');
        if (userData) console.log('🔐 [AUTH] UserData contenido:', JSON.stringify(userData));

        if (!token || !userData) {
            console.warn('🔐 [AUTH] Sesión vacía - redirigiendo a login');
            this.redirectToLogin();
            return;
        }

        try {
            const user = (typeof userData === 'string') ? JSON.parse(userData) : userData;
            
            if (!user || typeof user !== 'object' || !user.id) {
                console.warn('🔐 [AUTH] Datos inválidos:', {type: typeof user, hasId: user?.id, user});
                this.logout();
                return;
            }

            console.log('🔐 [AUTH] Verificando con backend: /api/usuarios/' + user.id);
            
            // Verificar token con el backend
            const response = await fetch('/api/usuarios/' + user.id, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            console.log('🔐 [AUTH] Respuesta del backend:', response.status, response.ok);

            if (!response.ok) {
                console.warn('🔐 [AUTH] Backend rechazó token - status:', response.status);
                this.logout();
                return;
            }

            // Verificar que sea admin
            if (user.tipo !== 'admin') {
                window.location.href = 'dashboard-modular.html';
                return;
            }

            this.usuarioActual = user;
            console.log('🔐 [AUTH] ✅ Autenticación exitosa para:', user.nombre);
            this.mostrarInfoUsuario();
            this.cargarDatosDashboard();

        } catch (error) {
            console.error('🔐 [AUTH] Error verificando autenticación:', error);
            this.logout();
        }
    }

    mostrarInfoUsuario() {
        // Actualizar nombre de usuario en la interfaz
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement && this.usuarioActual) {
            userNameElement.textContent = this.usuarioActual.nombre || 'Administrador del Sistema';
        }
    }

    logout() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('userData');
        this.redirectToLogin();
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    async cargarDatosDashboard() {
        try {
            const token = await getSecureItem('authToken');

            // Cargar estadísticas del dashboard
            const response = await fetch('/api/estadisticas/dashboard', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.actualizarEstadisticas(data.data);
                }
            }

            // Cargar actividades recientes
            await this.cargarActividadesRecientes();
        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
        }
    }

    actualizarEstadisticas(data) {
        // Actualizar estadísticas en la interfaz
        const statValues = document.querySelectorAll('#dashboard .stat-value');
        if (statValues.length >= 4 && data) {
            statValues[0].textContent = data.usuarios?.total || 0;
            statValues[1].textContent = data.solicitudes?.pendientes || 0;
            statValues[2].textContent = data.expedientes?.total || 0;
            statValues[3].textContent = (data.tasa_completitud || 0) + '%';
        }
    }

    async cargarActividadesRecientes() {
        try {
            const token = await getSecureItem('authToken');
            const response = await fetch('/api/estadisticas/actividades-recientes?limite=5', {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.mostrarActividadesRecientes(data.data);
                }
            }
        } catch (error) {
            console.error('Error cargando actividades recientes:', error);
        }
    }

    mostrarActividadesRecientes(actividades) {
        const tbody = document.querySelector('#actividades-recientes');
        if (!tbody) return;

        if (!actividades || actividades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay actividades recientes</td></tr>';
            return;
        }

        tbody.innerHTML = actividades.map(actividad => `
            <tr>
                <td>${actividad.usuario || 'Sistema'}</td>
                <td>${actividad.accion || 'N/A'}</td>
                <td>${actividad.fecha ? new Date(actividad.fecha).toLocaleString('es-ES') : 'N/A'}</td>
                <td><span class="status-badge ${getStatusClass(actividad.estado)}">${actividad.estado || 'Completado'}</span></td>
            </tr>
        `).join('');
    }

    async getToken() {
        return await getSecureItem('authToken');
    }

    getUsuario() {
        return this.usuarioActual;
    }

    isAuthenticated() {
        return !!this.usuarioActual;
    }

    isAdmin() {
        return this.usuarioActual?.tipo === 'admin';
    }
}

// Función auxiliar para verificar permisos
function verificarPermiso(permiso) {
    if (!window.adminAuth || !window.adminAuth.isAuthenticated()) {
        if (window.showError) window.showError('Debe iniciar sesión para realizar esta acción');
        else alert('Debe iniciar sesión para realizar esta acción');
        return false;
    }

    if (!window.adminAuth.isAdmin()) {
        if (window.showError) window.showError('No tiene permisos para realizar esta acción');
        else alert('No tiene permisos para realizar esta acción');
        return false;
    }

    return true;
}

// Función auxiliar para obtener headers con autenticación
async function getAuthHeaders() {
    const token = await getSecureItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Inicializar autenticación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear instancia global de autenticación
    window.adminAuth = new AdminAuthCheck();
});

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.AdminAuthCheck = AdminAuthCheck;
    window.verificarPermiso = verificarPermiso;
    window.getAuthHeaders = getAuthHeaders;
}
