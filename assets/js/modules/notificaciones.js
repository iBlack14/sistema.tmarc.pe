/**
 * Notificaciones Module
 * Handles all notification-related functionality
 */

class NotificacionesModule {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.notificaciones = [];
        this.stats = {
            total: 0,
            no_leidas: 0,
            urgentes: 0
        };
        this.emailSistema = ''; // Se cargará dinámicamente desde el .env vía API

        this.init();
    }

    /**
     * Initialize notificaciones module
     */
    async init() {
        await this.cargarConfiguracionEmail();
        this.setupEventListeners();
    }

    /**
     * Cargar configuración de email del sistema (SMTP)
     */
    async cargarConfiguracionEmail() {
        try {
            const response = await fetch('/api/configuracion/smtp');
            if (!response.ok) throw new Error('Not admin or not found');
            const data = await response.json();
            
            if (data.success && data.data && data.data.fromEmail) {
                this.emailSistema = data.data.fromEmail;
            }
        } catch (error) {
            // Silencioso para usuarios normales
        }
    }

    /**
     * Setup event listeners for notificaciones
     */
    setupEventListeners() {
        // Notification click handlers are set up in mostrarNotificaciones
    }

    /**
     * Load notificaciones for current user
     */
    async loadNotificacionesUsuario() {
        try {
            this.dashboard.showLoading('notificaciones-loading');

            const usuarioId = sessionStorage.getItem('userId') || sessionStorage.getItem('usuarioActual') || '1';

            const response = await fetch(`/api/notificaciones?usuario_id=${usuarioId}`);
            const data = await response.json();

            if (data.success) {
                this.notificaciones = data.data || [];
                this.stats = data.estadisticas || { total: 0, no_leidas: 0, urgentes: 0 };
                this.mostrarNotificaciones(this.notificaciones);
                this.actualizarEstadisticasCasilla(this.stats);
            } else {
                throw new Error(data.error || 'Error loading notificaciones');
            }
        } catch (error) {
            console.error('Error loading notificaciones:', error);
            this.dashboard.showError('Error cargando notificaciones: ' + error.message, 'notificaciones-loading');
            this.mostrarNotificaciones([]);
            this.actualizarEstadisticasCasilla({ total: 0, no_leidas: 0, urgentes: 0 });
        } finally {
            this.dashboard.hideLoading('notificaciones-loading');
        }
    }

    /**
     * Display notificaciones in table
     */
    mostrarNotificaciones(notificaciones) {
        const tbody = document.getElementById('notificaciones-tbody');
        const table = document.getElementById('notificaciones-table');
        const noNotif = document.getElementById('no-notificaciones');

        // Si los elementos del DOM todavía no existen, reintentar en 500ms
        if (!tbody || !table || !noNotif) {
            setTimeout(() => this.mostrarNotificaciones(notificaciones), 500);
            return;
        }

        if (!notificaciones || notificaciones.length === 0) {
            table.style.display = 'none';
            noNotif.style.display = 'block';
            return;
        }

        // Show table and hide empty message
        table.style.display = 'table';
        noNotif.style.display = 'none';

        // Generate table rows
        tbody.innerHTML = notificaciones.map(notif => {
            const fecha = new Date(notif.fecha).toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });

            const estadoClass = notif.leida ? 'status-approved' : 'status-pending';
            const estadoText = notif.leida ? 'Leído' : 'No Leído';
            const remitente = this.getRemitente(notif.tipo);

            return `
                <tr class="${!notif.leida ? 'unread-notification' : ''}" style="cursor: pointer;">
                    <td data-label="Remitente">${remitente}</td>
                    <td data-label="Asunto">${notif.titulo || 'Sin asunto'}</td>
                    <td data-label="Fecha">${fecha}</td>
                    <td data-label="Estado"><span class="status-badge ${estadoClass}">${estadoText}</span></td>
                    <td data-label="Acciones">
                        <button onclick="event.stopPropagation(); notificacionesModule.verDetalleNotificacion('${notif.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;">👁️ Ver</button>
                        ${!notif.leida ? `<button onclick="event.stopPropagation(); notificacionesModule.marcarComoLeida('${notif.id}')" class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin-left: 5px;">✓ Marcar Leído</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Update casilla statistics
     */
    actualizarEstadisticasCasilla(estadisticas) {
        if (!estadisticas) return;

        this.stats = estadisticas;

        // Update stat cards by ID
        const unreadEl = document.getElementById('casilla-no-leidos');
        const unreadEl2 = document.getElementById('casilla-no-leidos-2');
        const totalEl = document.getElementById('casilla-total');
        
        if (unreadEl) unreadEl.textContent = estadisticas.no_leidas;
        if (unreadEl2) unreadEl2.textContent = estadisticas.no_leidas;
        if (totalEl) totalEl.textContent = estadisticas.total - estadisticas.no_leidas;

        // Fallback for query selectors
        const cards = document.querySelectorAll('#casilla .stat-card .stat-value');
        if (cards.length >= 3) {
            cards[0].textContent = estadisticas.no_leidas;
            cards[1].textContent = estadisticas.no_leidas;
            cards[2].textContent = estadisticas.total - estadisticas.no_leidas;
        }
    }

    /**
     * Get remitente based on notification type
     * Usa la configuración SMTP del sistema (dinámica)
     */
    getRemitente(tipo) {
        // Usa el email del sistema cargado desde la configuración SMTP
        // Si el admin cambia el email en SMTP, se actualizará automáticamente
        switch (tipo) {
            case 'respuesta_admin':
                return this.emailSistema; // Email dinámico desde SMTP
            case 'urgente':
                return this.emailSistema;
            case 'sistema':
            default:
                return this.emailSistema;
        }
    }

    /**
     * Mark notification as read
     */
    async marcarComoLeida(notificacionId) {
        try {
            const usuarioId = sessionStorage.getItem('userId') || '1';

            const response = await fetch(`/api/notificaciones/${notificacionId}/leida`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usuario_id: usuarioId })
            });

            const data = await response.json();

            if (data.success) {
                // Reload notificaciones to update the view
                await this.loadNotificacionesUsuario();
            } else {
                throw new Error(data.error || 'Error marcando como leída');
            }
        } catch (error) {
            console.error('Error marcando como leída:', error);
            this.dashboard.showError('Error marcando notificación como leída');
        }
    }

    /**
     * View notification detail
     */
    verDetalleNotificacion(notificacionId) {
        const notificacion = this.notificaciones.find(n => n.id === notificacionId);
        if (!notificacion) return;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modalDetalleNotificacion';

        const estadoClass = notificacion.leida ? 'status-approved' : 'status-pending';
        const estadoText = notificacion.leida ? 'Leído' : 'No Leído';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <span>📧 Detalle de Notificación</span>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = '';">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; gap: 20px;">
                        <div class="info-section">
                            <h3 style="color: #C0C0C0; margin-bottom: 15px;">${notificacion.titulo}</h3>
                            <div class="info-grid" style="display: grid; gap: 10px;">
                                <div><strong>De:</strong> ${this.getRemitente(notificacion.tipo)}</div>
                                <div><strong>Fecha:</strong> ${new Date(notificacion.fecha).toLocaleString('es-ES')}</div>
                                <div><strong>Tipo:</strong> ${notificacion.tipo}</div>
                                <div><strong>Estado:</strong> <span class="status-badge ${estadoClass}">${estadoText}</span></div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h4 style="color: #666; margin-bottom: 10px;">Mensaje:</h4>
                            <div style="padding: 15px; background: #f5f5f5; border-radius: 8px; border-left: 4px solid #C0C0C0;">
                                ${notificacion.mensaje}
                            </div>
                        </div>

                        ${this.renderArchivoAdjunto(notificacion)}

                        ${notificacion.expediente_id ? `
                        <div class="info-section">
                            <h4 style="color: #666; margin-bottom: 10px;">Relacionado con:</h4>
                            <div style="padding: 10px; background: #e8f4f8; border-radius: 5px;">
                                <strong>Expediente:</strong> ${notificacion.expediente_id}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer" style="text-align: right; padding: 15px; border-top: 1px solid #ddd;">
                    ${!notificacion.leida ? `
                    <button class="btn btn-primary" onclick="notificacionesModule.marcarComoLeida('${notificacion.id}'); this.closest('.modal-overlay').remove();">
                        ✓ Marcar como Leído
                    </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = '';">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Auto-mark as read after viewing
        if (!notificacion.leida) {
            setTimeout(() => {
                this.marcarComoLeida(notificacionId);
            }, 2000);
        }
    }

    /**
     * Render archivo adjunto if exists
     */
    renderArchivoAdjunto(notificacion) {
        if (!notificacion.archivo_adjunto) {
            return '';
        }

        try {
            const archivo = typeof notificacion.archivo_adjunto === 'string' 
                ? JSON.parse(notificacion.archivo_adjunto) 
                : notificacion.archivo_adjunto;

            if (!archivo || !archivo.nombre) {
                return '';
            }

            const tamanoMB = (archivo.tamano / (1024 * 1024)).toFixed(2);
            const icono = this.getIconoArchivo(archivo.tipo || archivo.nombre);

            return `
                <div class="info-section">
                    <h4 style="color: #666; margin-bottom: 10px;">📎 Archivo Adjunto:</h4>
                    <div style="padding: 15px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4CAF50; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600; color: #333; margin-bottom: 5px;">
                                ${icono} ${archivo.nombre}
                            </div>
                            <div style="font-size: 12px; color: #666;">
                                Tamaño: ${tamanoMB} MB
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="notificacionesModule.descargarArchivo('${archivo.ruta}', '${archivo.nombre}')" style="padding: 8px 16px;">
                            ⬇️ Descargar
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error renderizando archivo adjunto:', error);
            return '';
        }
    }

    /**
     * Get icono based on file type
     */
    getIconoArchivo(tipo) {
        if (!tipo) return '📄';
        
        if (tipo.includes('pdf')) return '📕';
        if (tipo.includes('word') || tipo.includes('doc')) return '📘';
        if (tipo.includes('image') || tipo.includes('jpg') || tipo.includes('png')) return '🖼️';
        if (tipo.includes('excel') || tipo.includes('xls')) return '📊';
        return '📄';
    }

    /**
     * Download attached file
     */
    async descargarArchivo(ruta, nombreOriginal) {
        try {
            console.log('⬇️ Descargando archivo:', nombreOriginal);
            console.log('📂 Ruta del archivo:', ruta);
            
            // Extraer el nombre del archivo físico de la ruta
            const nombreArchivo = ruta.split('/').pop();
            console.log('📝 Nombre de archivo físico:', nombreArchivo);
            
            // Usar el endpoint de descarga correcto
            const link = document.createElement('a');
            link.href = `/api/download/archivo/${nombreArchivo}`;
            link.download = nombreOriginal;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Descarga iniciada');
        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            alert('Error al descargar el archivo');
        }
    }

    /**
     * Get notificaciones statistics
     */
    getNotificacionesStats() {
        return { ...this.stats };
    }

    /**
     * Filter notificaciones by status
     */
    filterNotificaciones(leidas = null) {
        if (leidas === null) {
            this.mostrarNotificaciones(this.notificaciones);
        } else {
            const filtered = this.notificaciones.filter(n => n.leida === leidas);
            this.mostrarNotificaciones(filtered);
        }
    }

    /**
     * Search notificaciones
     */
    searchNotificaciones(query) {
        if (!query) {
            this.mostrarNotificaciones(this.notificaciones);
            return;
        }

        const filtered = this.notificaciones.filter(n =>
            n.titulo.toLowerCase().includes(query.toLowerCase()) ||
            n.mensaje.toLowerCase().includes(query.toLowerCase()) ||
            this.getRemitente(n.tipo).toLowerCase().includes(query.toLowerCase())
        );

        this.mostrarNotificaciones(filtered);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificacionesModule;
}