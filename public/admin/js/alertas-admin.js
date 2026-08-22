const AlertasAdmin = {
    alertas: [],

    async init() {
        console.log('🔔 Inicializando Alertas de Administración...');
        await this.cargarAlertas();
    },

    async cargarAlertas() {
        const tbody = document.getElementById('alertas-admin-tbody');
        if (!tbody) return;

        try {
            // Obtener el ID del administrador de la sesión
            const adminId = sessionStorage.getItem('userId') || sessionStorage.getItem('adminId');
            if (!adminId) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">Error: Sesión de administrador no válida.</td></tr>';
                return;
            }

            const response = await fetch(`/api/notificaciones?usuario_id=${adminId}`);
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Error cargando alertas');

            this.alertas = Array.isArray(result.data) ? result.data : [];
            this.renderAlertas();
            this.updateBadgeCount();
        } catch (error) {
            console.error('Error cargando alertas de administración:', error);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: red;">No se pudieron cargar las alertas: ${error.message}</td></tr>`;
        }
    },

    updateBadgeCount() {
        const unreadCount = this.alertas.filter(n => n.leida === 0).length;
        const badges = document.querySelectorAll('.alertas-admin-badge');
        badges.forEach(badge => {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        });
    },

    renderAlertas() {
        const tbody = document.getElementById('alertas-admin-tbody');
        if (!tbody) return;

        if (this.alertas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #888;">No tienes alertas o notificaciones de entrada.</td></tr>';
            return;
        }

        tbody.innerHTML = this.alertas.map((notif, index) => {
            const fecha = new Date(notif.fecha).toLocaleDateString('es-PE');
            const hora = new Date(notif.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            const estadoIcono = notif.leida === 1 
                ? '<span style="color:#27ae60; font-size: 15px;" title="Leído">🟢</span>' 
                : '<span style="color:#e74c3c; font-size: 15px;" title="No leído">🔴</span>';

            const filaStyle = notif.leida === 0 
                ? 'background: rgba(212,175,55,0.04); font-weight: 700;' 
                : '';

            return `
                <tr style="${filaStyle} transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
                    <td data-label="Estado" style="text-align: center;">${estadoIcono}</td>
                    <td data-label="Asunto / Alerta">
                        <div style="font-size: 13px; color: #111;">${this.escaparHTML(notif.titulo)}</div>
                        <small style="font-size: 11px; color: #666; font-weight: normal;">${this.escaparHTML((notif.mensaje || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())}</small>
                    </td>
                    <td data-label="Expediente">
                        <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #d4af37;">${this.escaparHTML(notif.expediente_id || notif.solicitud_id || 'N/A')}</span>
                    </td>
                    <td data-label="Fecha/Hora">
                        <span style="font-size: 11px; color: #888;">${fecha} · ${hora}</span>
                    </td>
                    <td data-label="Acciones" style="text-align: right;">
                        <div style="display: flex; gap: 5px; justify-content: flex-end;">
                            <button class="btn btn-secondary btn-sm" onclick="AlertasAdmin.verExpediente('${notif.expediente_id || notif.solicitud_id}')" style="padding: 4px 8px; font-size: 11px;">🔍 Ver</button>
                            ${notif.leida === 0 ? `<button class="btn btn-primary btn-sm" onclick="AlertasAdmin.marcarComoLeida('${notif.id}')" style="padding: 4px 8px; font-size: 11px; background: #27ae60; color:#fff;">✓ Leído</button>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async marcarComoLeida(notifId) {
        try {
            const adminId = sessionStorage.getItem('userId') || sessionStorage.getItem('adminId');
            const response = await fetch(`/api/notificaciones/${notifId}/leida`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: adminId })
            });

            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo marcar como leída');

            await this.cargarAlertas();
        } catch (error) {
            console.error('Error al marcar alerta como leída:', error);
            Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#D4AF37' });
        }
    },

    async marcarTodasComoLeidas() {
        const decision = await Swal.fire({
            title: '¿Marcar todas como leídas?',
            text: 'Todas las notificaciones de administración se marcarán como leídas.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, marcar todas',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#D4AF37'
        });
        if (!decision.isConfirmed) return;

        try {
            const adminId = sessionStorage.getItem('userId') || sessionStorage.getItem('adminId');
            const response = await fetch('/api/notificaciones/leida-todas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario_id: adminId })
            });

            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo marcar todas como leídas');

            await this.cargarAlertas();
        } catch (error) {
            console.error('Error al marcar todas las alertas como leídas:', error);
            Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#D4AF37' });
        }
    },

    verExpediente(expedienteId) {
        if (!expedienteId || expedienteId === 'N/A') return;
        // Abrir el modal del expediente en el Buzón Único / Casilla
        showSection('casilla');
        const casillaSearch = document.getElementById('casilla-search');
        if (casillaSearch) {
            casillaSearch.value = expedienteId;
            casillaSearch.dispatchEvent(new Event('input'));
        }
    },

    escaparHTML(str) {
        return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }
};
