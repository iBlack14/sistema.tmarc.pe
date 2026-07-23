/**
 * 🏛️ DASHBOARD CORE ENGINE (UI-UX-PRO-MAX)
 * Central logic for the TMARC institutional portal
 */

class DashboardApp {
    constructor() {
        this.currentSection = 'inicio';
        this.user = null;
        this.modules = {};
        this.init();
    }

    async init() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return;
        }

        this.generateSections();
        this.loadModules();
        this.setupEventListeners();
        await this.loadUserData();
        
        // Final UI polish
        this.handleRouting();
        this.startHeartbeat();
        console.log('🏛️ TMARC Core Engine Initialized');
    }

    isAuthenticated() {
        return sessionStorage.getItem('userId') && sessionStorage.getItem('authToken');
    }

    getCurrentUserId() {
        return sessionStorage.getItem('userId');
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    loadModules() {
        const moduleMap = {
            'solicitudes': typeof SolicitudesModule !== 'undefined' ? SolicitudesModule : null,
            'notificaciones': typeof NotificacionesModule !== 'undefined' ? NotificacionesModule : null,
            'expedientes': typeof ExpedientesModule !== 'undefined' ? ExpedientesModule : null,
            'configuracion': typeof ConfiguracionModule !== 'undefined' ? ConfiguracionModule : null,
            'mesaPartes': typeof MesaPartesModule !== 'undefined' ? MesaPartesModule : null
        };

        for (const [key, ModuleClass] of Object.entries(moduleMap)) {
            if (ModuleClass) {
                this.modules[key] = new ModuleClass(this);
                window[`${key}Module`] = this.modules[key];
            }
        }
    }

    generateSections() {
        if (typeof DashboardSections !== 'undefined') {
            this.sectionsGenerator = new DashboardSections(this);
            this.sectionsGenerator.generateSections();
        }
    }

    setupEventListeners() {
        // Sidebar Toggle
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }

        // Browser Routing Support
        window.addEventListener('popstate', () => this.handleRouting());

        // Bell Notification Toggle
        const bellBtn = document.getElementById('btn-notification-bell');
        if (bellBtn) {
            bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationDropdown();
            });
        }

        // Global click and key listeners
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) this.closeAllModals();
            
            // Close notification dropdown when clicking outside
            const dropdown = document.getElementById('notification-dropdown');
            const bell = document.getElementById('btn-notification-bell');
            if (dropdown && dropdown.style.display !== 'none' && !dropdown.contains(e.target) && bell && !bell.contains(e.target)) {
                this.closeNotificationDropdown();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                this.closeNotificationDropdown();
            }
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        }
    }

    showSection(sectionId, event) {
        if (event) event.preventDefault();
        
        // Mapeo de títulos Pro
        const titles = {
            'inicio': 'Panel Principal',
            'solicitudes': 'Gestión de Solicitudes',
            'casilla': 'Casilla Electrónica',
            'expedientes': 'Seguimiento de Expedientes',
            'mesa': 'Mesa de Partes Virtual',
            'configuracion': 'Configuración del Sistema'
        };

        this.currentSection = sectionId;
        
        // Actualizar URL sin recargar
        window.location.hash = sectionId;
        
        // Actualizar Título de Navegador
        document.title = `TMARC | ${titles[sectionId] || 'Dashboard'}`;

        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
        });

        // Hide/Show Sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('active', section.id === sectionId);
        });

        this.loadSectionData(sectionId);
    }

    handleRouting() {
        const hash = window.location.hash.replace('#', '') || 'inicio';
        this.showSection(hash);
    }

    async loadUserData() {
        try {
            const userId = this.getCurrentUserId();
            
            // Intento 1: Usar datos de sesión para carga instantánea
            const cachedName = sessionStorage.getItem('userName');
            if (cachedName) {
                const nameEl = document.getElementById('userName');
                if (nameEl) nameEl.textContent = cachedName;
            }

            // Intento 2: Sincronizar con la BD para datos frescos
            const response = await fetch(`/api/usuarios/${userId}`);
            const data = await response.json();

            if (data.success) {
                this.user = data.data;
                this.updateUserProfile();
                
                // Actualizar caché de sesión
                if (this.user.nombre) sessionStorage.setItem('userName', this.user.nombre);
            }
        } catch (error) {
            console.error('⚠️ Error sincronizando datos de perfil:', error);
        }
    }

    updateUserProfile() {
        if (!this.user) return;
        
        // Update Name
        const nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = this.user.nombre || 'Usuario';
        
        // Update Photo
        const photoImg = document.getElementById('userPhoto');
        const defaultAvatar = document.getElementById('userDefaultAvatar');
        const avatarContainer = document.getElementById('userAvatar');
        
        if (this.user.foto_perfil && photoImg && defaultAvatar) {
            // Agregar timestamp para evitar caché del navegador
            const fotoUrl = this.user.foto_perfil + '?t=' + Date.now();
            photoImg.src = fotoUrl;
            photoImg.style.cssText = 'width:100%;height:100%;border-radius:16px;object-fit:cover;display:block;';
            defaultAvatar.style.display = 'none';
            if (avatarContainer) avatarContainer.classList.add('has-photo');
            
            // Si la imagen falla, volver al avatar por defecto
            photoImg.onerror = () => {
                photoImg.style.display = 'none';
                defaultAvatar.style.display = 'block';
                if (avatarContainer) avatarContainer.classList.remove('has-photo');
            };
        } else if (photoImg && defaultAvatar) {
            photoImg.style.display = 'none';
            defaultAvatar.style.display = 'block';
            if (avatarContainer) avatarContainer.classList.remove('has-photo');
        }
    }

    async loadSectionData(sectionId) {
        const module = this.modules[sectionId === 'casilla' ? 'notificaciones' : sectionId === 'mesa' ? 'mesaPartes' : sectionId];
        
        // Carga inteligente bajo demanda (Lazy Loading)
        if (module) {
            // Solo sincronizar si han pasado más de 30 segundos o si nunca se ha cargado
            const now = Date.now();
            if (!module.lastSync || (now - module.lastSync > 30000)) {
                
                // Mapear el nombre de la función de carga según el módulo
                const loadFn = module.loadSolicitudesUsuario || 
                             module.loadNotificacionesUsuario || 
                             module.loadExpedientesUsuario || 
                             module.loadMesaPartesData;

                if (typeof loadFn === 'function') {
                    await loadFn.call(module);
                    module.lastSync = now;
                }
            }
        } else if (sectionId === 'inicio') {
            await this.loadDashboardStats();
            await this.loadRecentActivity();
        }
    }

    showLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    hideLoading() {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    async loadRecentActivity() {
        console.log('🏛️ Sincronizando actividad reciente...');
        const tbody = document.getElementById('actividades-tbody');
        if (!tbody) return;

        try {
            const usuarioId = this.getCurrentUserId();
            const response = await fetch(`/api/estadisticas/usuario/${usuarioId}/actividades?limite=5`);
            const data = await response.json();

            if (data.success && data.data && data.data.length > 0) {
                tbody.innerHTML = data.data.map(act => {
                    const date = new Date(act.fecha).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    let badgeClass = 'badge-info';
                    const estado = (act.estado || '').toLowerCase();
                    if (estado.includes('pendiente')) badgeClass = 'badge-warning';
                    if (estado.includes('aprobado') || estado.includes('leída')) badgeClass = 'badge-success';
                    if (estado.includes('rechazado')) badgeClass = 'badge-error';

                    return `
                        <tr>
                            <td>${date}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div class="activity-icon" style="background: rgba(212,175,55,0.1); color: var(--color-primary); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                                        ${this.getActivityIcon(act.tipo)}
                                    </div>
                                    <span style="font-weight: 500;">${act.actividad || act.accion}</span>
                                </div>
                            </td>
                            <td><span class="badge ${badgeClass}">${act.estado || 'Procesado'}</span></td>
                        </tr>
                    `;
                }).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay actividad reciente registrada.</td></tr>';
            }
        } catch (error) {
            console.warn('⚠️ Error sincronizando actividad reciente:', error);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-error">Error al sincronizar actividad.</td></tr>';
        }
    }

    getActivityIcon(tipo) {
        const icons = {
            'solicitud': '📜',
            'expediente': '📂',
            'notificacion': '🔔',
            'registro': '👤'
        };
        return icons[tipo] || '⚡';
    }

    async loadDashboardStats() {
        console.log('🏛️ Sincronizando estadísticas globales...');
        try {
            const usuarioId = this.getCurrentUserId();
            
            // Cargar estadísticas básicas en paralelo para mayor velocidad
            const [solResp, expResp, notifResp] = await Promise.all([
                fetch(`/api/solicitudes/usuario/${usuarioId}`),
                fetch(`/api/expedientes?usuario_id=${usuarioId}`),
                fetch(`/api/notificaciones?usuario_id=${usuarioId}`)
            ]);

            const solData = await solResp.json();
            const expData = await expResp.json();
            const notifData = await notifResp.json();

            // Actualizar contadores en la UI (Inicio)
            const elSol = document.getElementById('inicio-solicitudes');
            const elExp = document.getElementById('inicio-expedientes');
            const elDoc = document.getElementById('inicio-documentos');

            if (elSol) elSol.textContent = solData.data?.length || 0;
            if (elExp) elExp.textContent = expData.data?.length || 0;
            if (elDoc) elDoc.textContent = notifData.estadisticas?.no_leidas || 0;

        } catch (error) {
            console.warn('⚠️ Error sincronizando estadísticas rápidas:', error);
        }
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '🔔'}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('active'), 10);

        // Remove after 5s
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    openModal(title, contentHtml) {
        const modal = document.getElementById('modalGeneral');
        const titleEl = document.getElementById('modalTitle');
        const bodyEl = document.getElementById('modalBody');

        if (modal && titleEl && bodyEl) {
            titleEl.textContent = title;
            bodyEl.innerHTML = contentHtml;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }



    startHeartbeat() {
        this.checkRealTimeUpdates();
        // Latido ultra-ligero cada 45 segundos
        this.heartbeatTimer = setInterval(() => this.checkRealTimeUpdates(), 45000);
    }

    async checkRealTimeUpdates() {
        try {
            const usuarioId = this.getCurrentUserId();
            const response = await fetch(`/api/notificaciones?usuario_id=${usuarioId}`);
            const data = await response.json();

            if (data.success) {
                this.recentNotifications = data.data || [];
                const stats = data.estadisticas || { no_leidas: 0 };
                const newUnread = stats.no_leidas || 0;
                
                // Si hay cambios reales, disparar actualización
                if (this.lastUnreadCount !== undefined && newUnread > this.lastUnreadCount) {
                    console.log('🔔 ¡Nueva notificación detectada! Sincronizando...');
                    this.notifyUser('Nueva Notificación', 'Ha recibido una nueva notificación institucional.');
                    
                    // Si el usuario está en la sección de notificaciones, recargarla
                    if (this.currentSection === 'casilla') {
                        this.modules.notificaciones?.loadNotificacionesUsuario();
                    }
                    
                    // Actualizar estadísticas de inicio si es necesario
                    if (this.currentSection === 'inicio') {
                        this.loadDashboardStats();
                    }
                }
                
                this.lastUnreadCount = newUnread;
                this.updateNotificationBadge(newUnread);

                // Refrescar el dropdown de notificaciones si está visible
                if (this.isNotificationDropdownOpen()) {
                    this.populateNotificationDropdown();
                }
            }
        } catch (error) {
            console.warn('⚠️ Fallo en el latido de tiempo real');
        }
    }

    updateNotificationBadge(count) {
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    isNotificationDropdownOpen() {
        const dropdown = document.getElementById('notification-dropdown');
        return dropdown && dropdown.style.display === 'flex';
    }

    toggleNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown) return;

        if (dropdown.style.display === 'none') {
            this.populateNotificationDropdown();
            dropdown.style.display = 'flex';
        } else {
            dropdown.style.display = 'none';
        }
    }

    closeNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    populateNotificationDropdown() {
        const listContainer = document.getElementById('dropdown-list');
        if (!listContainer) return;

        const notifications = this.recentNotifications || [];
        if (notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="dropdown-empty">
                    <div class="dropdown-empty-icon">✉️</div>
                    <div>No tiene notificaciones</div>
                </div>
            `;
            return;
        }

        // Mostrar las últimas 5 notificaciones
        const lastFive = notifications.slice(0, 5);
        listContainer.innerHTML = lastFive.map(notif => {
            const fecha = new Date(notif.fecha).toLocaleDateString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
            const unreadClass = !notif.leida ? 'unread' : '';
            const isUrl = notif.archivo_adjunto ? '📎' : '✉️';
            
            return `
                <div class="dropdown-item ${unreadClass}" onclick="window.dashboardApp.handleDropdownItemClick('${notif.id}', event)">
                    <div class="dropdown-item-title" style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${isUrl} ${notif.titulo || 'Sin asunto'}</span>
                        ${!notif.leida ? '<span style="width: 8px; height: 8px; background: var(--color-primary); border-radius: 50%; display: inline-block;"></span>' : ''}
                    </div>
                    <div class="dropdown-item-desc">${notif.mensaje || ''}</div>
                    <div class="dropdown-item-meta">
                        <span>De: TMARC</span>
                        <span>${fecha}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleDropdownItemClick(notifId, event) {
        event.stopPropagation();
        this.closeNotificationDropdown();
        
        if (window.notificacionesModule) {
            if (window.notificacionesModule.notificaciones && window.notificacionesModule.notificaciones.length > 0) {
                const exists = window.notificacionesModule.notificaciones.some(n => n.id === notifId);
                if (exists) {
                    window.notificacionesModule.verDetalleNotificacion(notifId);
                    return;
                }
            }
        }
        
        const notif = (this.recentNotifications || []).find(n => n.id === notifId);
        if (!notif) return;

        // Crear modal de detalle temporal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modalDetalleNotificacion';

        const estadoClass = notif.leida ? 'status-approved' : 'status-pending';
        const estadoText = notif.leida ? 'Leído' : 'No Leído';
        const emailRemitente = window.notificacionesModule?.getRemitente(notif.tipo) || 'soporte@tmarc.pe';

        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width: 700px; border: 1px solid var(--glass-border-gold);">
                <div class="modal-header">
                    <span style="color: var(--color-primary); font-family: var(--font-header); font-weight: 700;">📧 Detalle de Notificación</span>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = '';">&times;</button>
                </div>
                <div class="modal-body" style="color: var(--color-text);">
                    <div style="display: grid; gap: 20px;">
                        <div class="info-section">
                            <h3 style="color: var(--color-primary); margin-bottom: 15px; font-family: var(--font-header);">${notif.titulo}</h3>
                            <div class="info-grid" style="display: grid; gap: 10px; font-size: 14px;">
                                <div><strong>De:</strong> ${emailRemitente}</div>
                                <div><strong>Fecha:</strong> ${new Date(notif.fecha).toLocaleString('es-ES')}</div>
                                <div><strong>Tipo:</strong> ${notif.tipo}</div>
                                <div><strong>Estado:</strong> <span class="status-badge ${estadoClass}">${estadoText}</span></div>
                            </div>
                        </div>
                        <div class="info-section">
                            <h4 style="color: var(--color-silver-muted); margin-bottom: 10px; font-size: 13px; text-transform: uppercase;">Mensaje:</h4>
                            <div style="padding: 15px; background: var(--color-surface-soft); border-radius: 8px; border-left: 4px solid var(--color-primary); color: var(--color-text);">
                                ${notif.mensaje}
                            </div>
                        </div>
                        ${window.notificacionesModule ? window.notificacionesModule.renderArchivoAdjunto(notif) : ''}
                    </div>
                </div>
                <div class="modal-footer" style="text-align: right; padding: 15px; border-top: 1px solid var(--glass-border);">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = '';">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        if (!notif.leida) {
            try {
                const usuarioId = this.getCurrentUserId();
                const response = await fetch(`/api/notificaciones/${notifId}/leida`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario_id: usuarioId })
                });
                const data = await response.json();
                if (data.success) {
                    notif.leida = true;
                    this.checkRealTimeUpdates();
                }
            } catch (e) {
                console.error('Error marcando leída desde dropdown:', e);
            }
        }
    }

    async markAllNotificationsRead(event) {
        if (event) event.stopPropagation();
        try {
            const usuarioId = this.getCurrentUserId();
            const response = await fetch('/api/notificaciones/leida-todas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: usuarioId })
            });
            const data = await response.json();
            if (data.success) {
                this.showSuccess('Todas las notificaciones marcadas como leídas');
                
                if (this.recentNotifications) {
                    this.recentNotifications.forEach(n => n.leida = true);
                }
                this.updateNotificationBadge(0);
                this.populateNotificationDropdown();
                
                if (this.currentSection === 'casilla' && window.notificacionesModule) {
                    window.notificacionesModule.loadNotificacionesUsuario();
                }
                if (this.currentSection === 'inicio') {
                    this.loadDashboardStats();
                }
            }
        } catch (e) {
            console.error('Error al marcar todas como leídas:', e);
            this.showError('Error al procesar la solicitud');
        }
    }

    notifyUser(title, text) {
        Swal.fire({
            title: title,
            text: text,
            icon: 'info',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            background: 'var(--color-surface)',
            color: 'var(--color-text)'
        });
    }

    async logout() {
        const result = await Swal.fire({
            title: '<span style="color: var(--color-primary); font-family: \'Outfit\', sans-serif; font-weight: 700; letter-spacing: -0.5px;">SEGURIDAD INSTITUCIONAL</span>',
            html: `
                <div style="margin: 20px 0; color: rgba(255,255,255,0.7); font-size: 15px;">
                    ¿Está seguro que desea finalizar su sesión en el portal <b>TMARC</b>?
                    <p style="font-size: 12px; margin-top: 10px; color: var(--color-silver-muted);">Se cerrarán todos los accesos activos de forma segura.</p>
                </div>
            `,
            icon: 'question',
            iconColor: '#D4AF37',
            showCancelButton: true,
            confirmButtonText: 'SALIR DEL SISTEMA',
            cancelButtonText: 'MANTENER SESIÓN',
            background: '#1a1a1a',
            color: '#ffffff',
            reverseButtons: true,
            customClass: {
                popup: 'premium-swal-popup',
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-secondary'
            },
            showClass: {
                popup: 'animate__animated animate__fadeInUp animate__faster'
            },
            hideClass: {
                popup: 'animate__animated animate__fadeOutDown animate__faster'
            }
        });

        if (result.isConfirmed) {
            // Animación de despedida
            Swal.fire({
                title: 'Finalizando Sesión...',
                timer: 1000,
                showConfirmButton: false,
                willOpen: () => { Swal.showLoading(); },
                background: '#1a1a1a',
                color: '#ffffff'
            });

            setTimeout(() => {
                sessionStorage.clear();
                window.location.href = 'login.html';
            }, 1000);
        }
    }
}

// Export for window scope
window.DashboardApp = DashboardApp;