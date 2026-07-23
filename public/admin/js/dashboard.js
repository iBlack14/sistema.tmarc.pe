/**
 * Dashboard Module - Admin
 * Maneja estadísticas y actividades recientes
 */

const DashboardModule = {
    /**
     * Cargar estadísticas del dashboard
     */
    async cargarEstadisticas() {
        try {
            console.log('📊 Cargando estadísticas del dashboard...');

            const response = await fetch('/api/estadisticas/dashboard');
            const data = await response.json();

            if (data.success) {
                this.actualizarEstadisticas(data.data);
            } else {
                console.error('❌ Error cargando estadísticas:', data.error);
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    },

    /**
     * Actualizar tarjetas de estadísticas
     */
    actualizarEstadisticas(stats) {
        // Usuarios
        if (stats.usuarios) {
            document.getElementById('stat-usuarios').textContent = stats.usuarios.activos;
            document.getElementById('stat-usuarios-nuevos').textContent = 
                `${stats.usuarios.nuevos_semana} nuevos esta semana`;
        }

        // Solicitudes
        if (stats.solicitudes) {
            document.getElementById('stat-solicitudes').textContent = stats.solicitudes.pendientes;
            document.getElementById('stat-solicitudes-total').textContent = 
                `${stats.solicitudes.total} total`;
        }

        // Expedientes
        if (stats.expedientes) {
            document.getElementById('stat-expedientes').textContent = stats.expedientes.activos;
            document.getElementById('stat-expedientes-total').textContent = 
                `${stats.expedientes.total} total`;
        }

        // Mesa de Partes
        if (stats.mesa_partes) {
            document.getElementById('stat-mesa-partes').textContent = stats.mesa_partes.total;
            document.getElementById('stat-mesa-partes-pendientes').textContent = 
                `${stats.mesa_partes.pendientes} pendientes`;
        }

        console.log('✅ Estadísticas actualizadas');
    },

    /**
     * Cargar actividades recientes
     */
    async cargarActividades() {
        try {
            console.log('📋 Cargando actividades recientes...');

            const response = await fetch('/api/estadisticas/actividades-recientes?limite=10');
            const data = await response.json();

            if (data.success) {
                this.mostrarActividades(data.data);
            } else {
                console.error('❌ Error cargando actividades:', data.error);
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    },

    /**
     * Mostrar actividades en la tabla
     */
    mostrarActividades(actividades) {
        const tbody = document.getElementById('actividades-recientes');
        if (!tbody) return;

        if (!actividades || actividades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                        No hay actividades recientes
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = actividades.map(act => {
            const fecha = new Date(act.fecha).toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            const estadoClass = this.getEstadoClass(act.estado);
            const tipoIcon = this.getTipoIcon(act.tipo);

            return `
                <tr>
                    <td>${tipoIcon} ${act.usuario || 'Sistema'}</td>
                    <td>${act.accion}</td>
                    <td>${fecha}</td>
                    <td><span class="status-badge ${estadoClass}">${act.estado}</span></td>
                </tr>
            `;
        }).join('');

        console.log(`✅ ${actividades.length} actividades mostradas`);
    },

    /**
     * Obtener clase de estado
     */
    getEstadoClass(estado) {
        if (!estado) return 'status-pending';
        const estadoLower = estado.toLowerCase();
        if (estadoLower.includes('completado') || estadoLower.includes('aprobado')) return 'status-approved';
        if (estadoLower.includes('rechazado')) return 'status-rejected';
        if (estadoLower.includes('pendiente')) return 'status-pending';
        return 'status-in-progress';
    },

    /**
     * Obtener icono según tipo
     */
    getTipoIcon(tipo) {
        const iconos = {
            'registro': '📝',
            'solicitud': '📋',
            'mesa_partes': '📨',
            'expediente': '📁'
        };
        return iconos[tipo] || '📄';
    },

    /**
     * Inicializar dashboard
     */
    async init() {
        await this.cargarEstadisticas();
        await this.cargarActividades();
        // El refresco ahora se maneja de forma centralizada en init.js para evitar saturación
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DashboardModule = DashboardModule;
}

console.log('✅ Módulo Dashboard cargado');
