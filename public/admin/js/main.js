
// Función para mostrar/ocultar secciones
function showSection(sectionId, el) {
    // Ocultar y mostrar secciones
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    // Marcar item activo en el menú
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    // Cargas perezosas por sección
    if (sectionId === 'solicitudes') {
        if (typeof window.refreshSolicitudesTable === 'function') window.refreshSolicitudesTable();
    } else if (sectionId === 'casilla') {
        if (typeof dataManager?.refreshCasillaElectronica === 'function') dataManager.refreshCasillaElectronica();
    }
}

// Puente global (si ya tienes dataManager.refreshSolicitudesTable)
window.refreshSolicitudesTable = async function() {
    if (typeof dataManager?.refreshSolicitudesTable === 'function') {
        await dataManager.refreshSolicitudesTable();
    }
};

// Función para alternar menú de usuario
function toggleUserMenu() {
    console.log('Menú de usuario toggle');
    // Aquí podrías implementar un menú desplegable
}

// Función para actualizar contadores del dashboard
async function actualizarContadores() {
    try {
        const res = await fetch('/api/estadisticas');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data.success) {
            const stats = data.data;
            document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = stats.usuarios.total_usuarios || 0;
            document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = stats.expedientes.nuevos || 0;
            document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = stats.expedientes.total_expedientes || 0;

            const badge = document.querySelector('.notification-badge');
            if (badge) badge.textContent = stats.expedientes.nuevos || 0;
        }
    } catch (error) {
        console.warn('No se pudieron cargar las estadísticas:', error);
    }
}

// Función para obtener clase de estado de usuario
function getStatusClassUsuario(estado) {
    switch(estado) {
        case 'Activo': return 'status-active';
        case 'Suspendido': return 'status-pending';
        case 'Inactivo': return 'status-inactive';
        default: return 'status-active';
    }
}

// Función para cargar expedientes en la tabla
async function cargarExpedientesTabla() {
    try {
        console.log('📂 Cargando expedientes desde main.js...');
        const response = await fetch('/api/expedientes');
        const data = await response.json();

        console.log('📦 Respuesta de expedientes:', data);

        if (data.success) {
            const tbody = document.querySelector('#expedientes table tbody');
            console.log('📋 Tbody encontrado:', !!tbody);
            console.log('📊 Total expedientes:', data.data?.length || 0);
            
            if (!tbody) {
                console.error('❌ No se encontró tbody. Intentando selector alternativo...');
                const tbodyAlt = document.querySelector('#expedientes tbody');
                console.log('📋 Tbody alternativo:', !!tbodyAlt);
            }
            
            if (tbody) {
                if (data.data && data.data.length > 0) {
                    tbody.innerHTML = data.data.map(expediente => `
                        <tr>
                            <td>${expediente.numero || expediente.id}</td>
                            <td>${expediente.presentante || 'N/A'}</td>
                            <td>${expediente.materia || 'N/A'}</td>
                            <td>${expediente.fecha_creacion ? new Date(expediente.fecha_creacion).toLocaleDateString('es-ES') : 'N/A'}</td>
                            <td><span class="status-badge ${getStatusClass(expediente.estado)}">${expediente.estado || 'Nuevo'}</span></td>
                            <td>${expediente.fecha_actualizacion ? new Date(expediente.fecha_actualizacion).toLocaleDateString('es-ES') : new Date(expediente.fecha_creacion).toLocaleDateString('es-ES')}</td>
                            <td>
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="verDetalleExpediente('${expediente.id || expediente.numero}')" title="Ver detalles">👁️ Ver</button>
                            </td>
                        </tr>
                    `).join('');
                    console.log('✅ Expedientes cargados en la tabla');
                } else {
                    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">No hay expedientes registrados</td></tr>';
                    console.log('⚠️ No hay expedientes para mostrar');
                }
            } else {
                console.error('❌ No se encontró el tbody de expedientes');
            }
            return data.data;
        } else {
            console.error('❌ Error cargando expedientes:', data.error);
            return [];
        }
    } catch (error) {
        console.error('❌ Error en cargarExpedientesTabla:', error);
        return [];
    }
}

// Función global para refrescar tabla de solicitudes
// Dentro de class DataManager

/*async refreshSolicitudesTable() {
  const tbody = document.getElementById('solicitudes-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Cargando…</td></tr>`;

  try {
    // Trae todas y filtra pendientes para esta sección
    const todas = await this.getSolicitudes();
    const pendientes = todas.filter(s => (s.estado || '').toLowerCase() === 'pendiente');

    const fmt = v => v
      ? new Date(v).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
      : '-';

    if (!pendientes.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hay solicitudes pendientes</td></tr>`;
    } else {
      tbody.innerHTML = pendientes.map(s => `
        <tr>
          <td>${s.id}</td>
          <td>${s.nombre || s.usuario || '-'}</td>
          <td>${s.tipo || s.asunto || 'General'}</td>
          <td>${fmt(s.fecha)}</td>
          <td><span class="status-badge ${this.getStatusClass(s.estado)}">${s.estado || 'Pendiente'}</span></td>
          <td>
            <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:5px;"
              onclick="verDetalleSolicitud('${String(s.id).replace(/'/g, '\\\'')}')" title="Ver detalles">👁️</button>
            <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:5px;"
              onclick="aprobarSolicitud('${String(s.id).replace(/'/g, '\\\'')}')" title="Aprobar">✅</button>
            <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;"
              onclick="rechazarSolicitud('${String(s.id).replace(/'/g, '\\\'')}')" title="Rechazar">❌</button>
          </td>
        </tr>
      `).join('');
    }

    // Actualiza los contadores SOLO dentro de la sección "Solicitudes"
    actualizarContadoresSolicitudes(todas);
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#f44336;">Error cargando solicitudes</td></tr>`;
  }
} */

function actualizarContadoresSolicitudes(todas) {
    const pendientes = todas.filter(s => (s.estado || '').toLowerCase() === 'pendiente').length;
    const aprobadas  = todas.filter(s => (s.estado || '').toLowerCase() === 'aprobado').length;
    const rechazadas = todas.filter(s => (s.estado || '').toLowerCase() === 'rechazado').length;

    const cards = document.querySelectorAll('#solicitudes .stat-card .stat-value');
    if (cards[0]) cards[0].textContent = pendientes;
    if (cards[1]) cards[1].textContent = aprobadas;
    if (cards[2]) cards[2].textContent = rechazadas;
}

// Función para actualizar contadores de usuarios
function actualizarContadoresUsuarios(usuarios) {
    const usuariosActivos = usuarios.filter(u => u.activo).length;
    const usuariosInactivos = usuarios.filter(u => !u.activo).length;

    // Actualizar contadores en la sección de usuarios
    const userCards = document.querySelectorAll('#usuarios .stat-card .stat-value');
    if (userCards.length >= 2) {
        userCards[0].textContent = usuariosActivos;
        userCards[1].textContent = usuariosInactivos;
    }
}

// Función para actualizar notificaciones
function actualizarNotificaciones() {
    // Simular nueva notificación
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const currentCount = parseInt(badge.textContent) || 0;
        if (Math.random() > 0.7) { // 30% de probabilidad de nueva notificación
            badge.textContent = currentCount + 1;

            // Efecto visual
            badge.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                badge.style.animation = '';
            }, 500);
        }
    }
}

// Función para verificar nuevas solicitudes desde la API
async function verificarNuevasSolicitudes() {
    try {
        // Obtener solicitudes actuales desde la API
        const response = await fetch('/api/solicitudes');
        const data = await response.json();

        if (data.success) {
            const solicitudesAPI = data.data;

            // Obtener el último ID conocido desde sessionStorage
            let ultimoIdConocido = sessionStorage.getItem('ultimoIdSolicitud');
            const maxIdActual = Math.max(...solicitudesAPI.map(s => parseInt(s.id) || 0), 0);

            // Si no hay último ID conocido, inicializarlo con el máximo actual para evitar notificaciones de solicitudes existentes
            if (ultimoIdConocido === null) {
                sessionStorage.setItem('ultimoIdSolicitud', maxIdActual.toString());
                ultimoIdConocido = maxIdActual;
                console.log('🔄 Inicializando último ID de solicitud:', maxIdActual);
            } else {
                ultimoIdConocido = parseInt(ultimoIdConocido);
            }

            console.log(`🔍 Verificando solicitudes - API: ${solicitudesAPI.length}, Último ID conocido: ${ultimoIdConocido}`);

            // Verificar si hay nuevas solicitudes
            if (maxIdActual > ultimoIdConocido) {
                const nuevasSolicitudes = solicitudesAPI.filter(s => parseInt(s.id) > ultimoIdConocido);

                if (nuevasSolicitudes.length > 0) {
                    console.log('📢 Nuevas solicitudes detectadas!', {
                        nuevas: nuevasSolicitudes.length,
                        total: solicitudesAPI.length
                    });

                    // Actualizar último ID conocido
                    sessionStorage.setItem('ultimoIdSolicitud', maxIdActual.toString());

                    // Refrescar tabla de solicitudes
                    await dataManager.refreshSolicitudesTable();

                    // Actualizar contadores
                    await actualizarContadores();

                    // Mostrar notificación visual
                    mostrarNotificacionNuevaSolicitud(nuevasSolicitudes.length);

                    // Actualizar badge de notificaciones
                    actualizarBadgeNotificaciones();
                }
            }

            // Verificar cambios en estado de solicitudes existentes
            const solicitudesPrevias = JSON.parse(sessionStorage.getItem('solicitudesPrevias') || '[]');
            const cambiosDetectados = solicitudesAPI.some((solicitudAPI) => {
                const solicitudPrevia = solicitudesPrevias.find(s => s.id === solicitudAPI.id);
                return solicitudPrevia && solicitudAPI.estado !== solicitudPrevia.estado;
            });

            if (cambiosDetectados) {
                console.log('🔄 Cambios en estado de solicitudes detectados');
                await dataManager.refreshSolicitudesTable();
                await actualizarContadores();
            }

            // Guardar estado actual para próxima comparación
            sessionStorage.setItem('solicitudesPrevias', JSON.stringify(solicitudesAPI.map(s => ({ id: s.id, estado: s.estado }))));
        } else {
            console.error('Error en respuesta de API de solicitudes:', data);
        }
    } catch (error) {
        console.error('Error verificando nuevas solicitudes:', error);
    }

    // Refrescar casilla electrónica
    dataManager.refreshCasillaElectronica();
}

// Función para mostrar notificación de nueva solicitud
function mostrarNotificacionNuevaSolicitud(cantidad) {
    const mensaje = cantidad === 1 ?
        'Nueva solicitud recibida!' :
        `${cantidad} nuevas solicitudes recibidas!`;

    // Crear notificación flotante
    const notif = document.createElement('div');
    notif.className = 'notificacion-nueva-solicitud';
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">📋</span>
            <span>${mensaje}</span>
        </div>
    `;

    // Estilos para la notificación
    Object.assign(notif.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '10000',
        fontWeight: '600',
        animation: 'slideInRight 0.5s ease-out',
        cursor: 'pointer',
        maxWidth: '300px'
    });

    // Agregar animación CSS si no existe
    if (!document.querySelector('#notif-nueva-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notif-nueva-styles';
        styles.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }

    // Hacer clic para ir a la sección de solicitudes
    notif.onclick = () => {
        showSection('solicitudes');
        notif.remove();
    };

    document.body.appendChild(notif);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notif.parentNode) {
            notif.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => notif.remove(), 500);
        }
    }, 5000);
}

// Función para actualizar badge de notificaciones
function actualizarBadgeNotificaciones() {
    // Esta función actualiza el badge rojo con el número de solicitudes pendientes
    // Ya está implementada en actualizarContadores()
}

// Función para manejar envío del formulario de respuesta
async function manejarEnvioRespuesta(event) {
    event.preventDefault();

    const expedienteId = document.getElementById('responderModal').dataset.expedienteId;
    const asunto = document.getElementById('responder-asunto').value.trim();
    const mensaje = document.getElementById('responder-mensaje').value.trim();
    const enviarNotificacion = document.getElementById('responder-notificacion').checked;

    // Validación
    if (!asunto || !mensaje) {
        alert('Por favor, complete el asunto y el mensaje.');
        return;
    }

    try {
        // Enviar respuesta usando la API del servidor
        const emailData = {
            destinatario: document.getElementById('responder-email').textContent,
            asunto: asunto,
            contenido: mensaje,
            expedienteId: expedienteId,
            tipo: 'respuesta_admin'
        };

        const response = await fetch('/api/smtp/enviar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
        });

        const data = await response.json();
        const resultado = data.success ? {
            success: true,
            message: data.message || 'Email enviado exitosamente'
        } : {
            success: false,
            message: data.message || 'Error enviando email'
        };

        if (resultado.success) {
            alert('✅ Respuesta enviada exitosamente');

            // Enviar notificación al dashboard del usuario si está marcado
            if (enviarNotificacion) {
                try {
                    // Obtener información del expediente para identificar al usuario
                    const expedienteResponse = await fetch(`/api/expedientes/${expedienteId}`);
                    const expedienteData = await expedienteResponse.json();

                    if (expedienteData.success && expedienteData.data.usuario_id) {
                        // Crear notificación en la base de datos
                        const notificacionResponse = await fetch('/api/notificaciones', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                usuario_id: expedienteData.data.usuario_id,
                                tipo: 'respuesta_admin',
                                titulo: `Respuesta del Administrador - ${asunto}`,
                                mensaje: mensaje,
                                expediente_id: expedienteId
                            })
                        });

                        const notifResult = await notificacionResponse.json();
                        if (notifResult.success) {
                            console.log('✅ Notificación guardada en base de datos');
                        }
                    }
                } catch (error) {
                    console.warn('⚠️ Error guardando notificación:', error);
                }
            }

            // Cerrar modal
            cerrarModalResponder();

            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Respuesta enviada al usuario', 'success');
            }
        } else {
            alert('❌ Error enviando respuesta: ' + resultado.message);
        }
    } catch (error) {
        console.error('Error enviando respuesta:', error);
        alert('Error enviando respuesta');
    }
}

// Función para manejar envío del formulario de edición de usuario
async function manejarEnvioEditarUsuario(event) {
    event.preventDefault();

    const id = document.getElementById('editar-id').value;
    const datosActualizados = {
        nombre: document.getElementById('editar-nombre').value.trim(),
        email: document.getElementById('editar-email').value.trim(),
        tipo: document.getElementById('editar-rol').value,
        activo: document.getElementById('editar-estado').value === 'Activo'
    };

    // Validación
    if (!datosActualizados.nombre || !datosActualizados.email) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(datosActualizados.email)) {
        alert('Por favor, ingrese un correo electrónico válido.');
        return;
    }

    try {
        // Actualizar usuario en MySQL
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosActualizados)
        });

        const data = await response.json();

        if (data.success) {
            alert('Usuario actualizado exitosamente');
            cerrarModalEditarUsuario();

            // Recargar usuarios
            await cargarUsuariosDesdeMySQL();

            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Usuario actualizado correctamente', 'success');
            }
        } else {
            alert('Error al actualizar el usuario: ' + data.error);
        }
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        alert('Error al actualizar el usuario');
    }
}

// Función para cargar usuarios desde MySQL
async function cargarUsuariosDesdeMySQL() {
    try {
        const response = await fetch('/api/usuarios');
        const data = await response.json();

        if (data.success) {
            // Actualizar tabla con usuarios de MySQL
            const tbody = document.querySelector('#usuarios-tbody');
            if (tbody) {
                tbody.innerHTML = data.data.map(usuario => `
                    <tr>
                        <td>${usuario.id}</td>
                        <td>${usuario.nombre}</td>
                        <td>${usuario.email}</td>
                        <td>${usuario.tipo}</td>
                        <td><span class="status-badge ${getStatusClassUsuario(usuario.activo ? 'Activo' : 'Inactivo')}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
                        <td>
                            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; margin-right: 5px;" onclick="editarUsuario('${usuario.id}')">Editar</button>
                            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="eliminarUsuario('${usuario.id}')">Eliminar</button>
                        </td>
                    </tr>
                `).join('');
            }

            // Actualizar contadores de usuarios
            actualizarContadoresUsuarios(data.data);

            return data.data;

            // Actualizar contadores
            const usuariosActivos = data.data.filter(u => u.activo).length;
            const usuariosInactivos = data.data.filter(u => !u.activo).length;

            document.querySelector('#usuarios .stat-card:nth-child(1) .stat-value').textContent = usuariosActivos;
            document.querySelector('#usuarios .stat-card:nth-child(2) .stat-value').textContent = usuariosInactivos;

            return data.data;
        } else {
            throw new Error(data.error || 'Error cargando usuarios');
        }
    } catch (error) {
        console.error('Error cargando usuarios desde MySQL:', error);
        throw error;
    }
}

// Función para forzar sincronización manual
async function forzarSincronizacionUsuarios() {
    if (window.userSyncManager) {
        try {
            const resultado = await window.userSyncManager.forzarSincronizacion();
            mostrarNotificacion('✅ ' + resultado.message, 'success');

            // Recargar usuarios desde MySQL después de sincronización
            await cargarUsuariosDesdeMySQL();

            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Sincronización completada', 'success');
            }
        } catch (error) {
            mostrarNotificacion('❌ Error en sincronización: ' + error.message, 'error');
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Error en sincronización', 'error');
            }
        }
    } else {
        mostrarNotificacion('Gestor de sincronización no disponible', 'error');
    }
}

// Función para guardar configuración SMTP
async function guardarConfigSMTP() {
    const config = {
        server: document.getElementById('smtp-server').value.trim(),
        port: parseInt(document.getElementById('smtp-port').value) || 587,
        user: document.getElementById('smtp-user').value.trim(),
        password: document.getElementById('smtp-password').value,
        ssl: document.getElementById('smtp-ssl').checked,
        fromEmail: document.getElementById('smtp-from-email').value.trim(),
        fromName: document.getElementById('smtp-from-name').value.trim()
    };

    // Validación básica
    if (!config.server || !config.user || !config.password || !config.fromEmail) {
        mostrarNotificacion('Por favor, complete todos los campos obligatorios.', 'error');
        return;
    }

    try {
        // Configurar SMTP en el servidor
        const response = await fetch('/api/smtp/configurar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            // Guardar también en localStorage para acceso rápido
            window.smtpConfigManager.guardarConfig(config);

            mostrarNotificacion('✅ ' + data.message, 'success');

            // Mostrar notificación en el sistema
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Configuración SMTP guardada', 'success');
            }
        } else {
            mostrarNotificacion('❌ Error: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error configurando SMTP:', error);
        mostrarNotificacion('Error configurando SMTP', 'error');
    }
}

// Función para probar configuración SMTP
async function probarConfigSMTP() {
    const config = {
        server: document.getElementById('smtp-server').value.trim(),
        port: parseInt(document.getElementById('smtp-port').value) || 587,
        user: document.getElementById('smtp-user').value.trim(),
        password: document.getElementById('smtp-password').value,
        ssl: document.getElementById('smtp-ssl').checked,
        fromEmail: document.getElementById('smtp-from-email').value.trim(),
        fromName: document.getElementById('smtp-from-name').value.trim()
    };

    mostrarNotificacion('Probando conexión SMTP...', 'info');

    try {
        // Probar configuración en el servidor
        const response = await fetch('/api/smtp/probar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.success) {
            mostrarNotificacion('✅ ' + data.message, 'success');
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Conexión SMTP exitosa', 'success');
            }
        } else {
            mostrarNotificacion('❌ ' + data.message, 'error');
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('Error en conexión SMTP', 'error');
            }
        }
    } catch (error) {
        mostrarNotificacion('❌ Error al probar conexión: ' + error.message, 'error');
        if (window.conexionDatos) {
            window.conexionDatos.mostrarNotificacion('Error al probar conexión SMTP', 'error');
        }
    }
}

// Función para cargar configuración SMTP en los campos
function cargarConfigSMTP() {
    // Usar el gestor unificado de SMTP
    if (!window.smtpConfigManager) {
        console.warn('SMTP Config Manager no disponible, usando configuración por defecto');
        return;
    }
    const config = window.smtpConfigManager.obtenerConfig();

    document.getElementById('smtp-server').value = config.server || '';
    document.getElementById('smtp-port').value = config.port || 587;
    document.getElementById('smtp-user').value = config.user || '';
    document.getElementById('smtp-password').value = config.password || '';
    document.getElementById('smtp-ssl').checked = config.ssl !== false;
    document.getElementById('smtp-from-email').value = config.fromEmail || '';
    document.getElementById('smtp-from-name').value = config.fromName || '';
}

// Inicializar al cargar la página
document.addEventListener('DOMContentLoaded', async function() {
    try {

        // Cargar casilla electrónica admin
        cargarCasillaElectronicaAdmin();

        // Cargar datos iniciales desde la API
        try {
            // Cargar solicitudes
            const solicitudesResponse = await fetch('/api/solicitudes');
            const solicitudesData = await solicitudesResponse.json();
            if (solicitudesData.success) {
                console.log('📦 Solicitudes cargadas desde API');
            }

            // Cargar expedientes
            const expedientesResponse = await fetch('/api/expedientes');
            const expedientesData = await expedientesResponse.json();
            if (expedientesData.success) {
                console.log('📦 Expedientes cargados desde API');
            }
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
        }

        // Cargar usuarios desde MySQL
        await cargarUsuariosDesdeMySQL();

        // Cargar otros datos
        await actualizarContadores();
        await refreshSolicitudesTable();
        await cargarExpedientesTabla();

        // Cargar actividades recientes
        await cargarActividadesRecientes();

        // Cargar casilla electrónica inicial
        dataManager.refreshCasillaElectronica();

        // Cargar configuración SMTP
        cargarConfigSMTP();

        // Optimización de Polling: Solo actualizar cuando la pestaña es visible
        // o cada 5 minutos (evita saturación del servidor)
        let lastUpdate = Date.now();
        const REFRESH_INTERVAL = 300000; // 5 minutos

        async function refreshDashboardData() {
            console.log('🔄 Actualizando datos del dashboard (Optimizado)...');
            await actualizarContadores();
            await refreshSolicitudesTable();
            await cargarExpedientesTabla();
            if (window.conexionDatos) await window.conexionDatos.actualizarContadores();
            lastUpdate = Date.now();
        }

        // Actualizar al enfocar la pestaña si ha pasado tiempo suficiente
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                const timeSinceLastUpdate = Date.now() - lastUpdate;
                if (timeSinceLastUpdate > 60000) { // Al menos 1 minuto desde la última
                    refreshDashboardData();
                }
            }
        });

        // Intervalo de seguridad largo
        setInterval(refreshDashboardData, REFRESH_INTERVAL);

        // Notificaciones simuladas (solo visual)
        setInterval(actualizarNotificaciones, 120000); 

        console.log('✅ Admin dashboard inicializado con estrategia de ahorro de recursos');

        console.log('✅ Admin dashboard inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando admin dashboard:', error);
        if (window.conexionDatos) {
            window.conexionDatos.mostrarNotificacion('Error cargando datos del dashboard', 'error');
        }
    }

    // Configurar formularios
    const formResponder = document.getElementById('formResponder');
    if (formResponder) {
        formResponder.addEventListener('submit', manejarEnvioRespuesta);
    }

    const formAgregarUsuario = document.getElementById('formAgregarUsuario');
    if (formAgregarUsuario) {
        formAgregarUsuario.addEventListener('submit', manejarEnvioAgregarUsuario);
    }

    const formEditarUsuario = document.getElementById('formEditarUsuario');
    if (formEditarUsuario) {
        formEditarUsuario.addEventListener('submit', manejarEnvioEditarUsuario);
    }

    const formEnviarNotificacion = document.getElementById('formEnviarNotificacion');
    if (formEnviarNotificacion) {
        formEnviarNotificacion.addEventListener('submit', manejarEnvioNotificacion);
    }

    // Configurar listener para notificaciones de otras pestañas
    configurarListenerNotificaciones();
});

// Función para agregar expediente a la casilla electrónica (ahora usa API)
async function agregarExpedienteACasilla(expediente) {
    try {
        // Enviar expediente a la API del backend
        const response = await fetch('/api/expedientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(expediente)
        });

        const result = await response.json();

        if (result.success) {
            console.log('📬 Expediente agregado a casilla electrónica vía API:', result.data);
            // Refrescar la vista de casilla electrónica
            dataManager.refreshCasillaElectronica();
            // Actualizar contadores
            await actualizarContadores();
        } else {
            console.error('Error agregando expediente:', result.error);
        }
    } catch (error) {
        console.error('Error agregando expediente a casilla:', error);
    }
}

// Función para mostrar notificación de nuevo expediente
function mostrarNotificacionNuevoExpediente(cantidad) {
    const mensaje = cantidad === 1 ?
        'Nuevo expediente recibido en casilla electrónica!' :
        `${cantidad} nuevos expedientes recibidos en casilla electrónica!`;

    // Crear notificación flotante
    const notif = document.createElement('div');
    notif.className = 'notificacion-nuevo-expediente';
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">📬</span>
            <span>${mensaje}</span>
        </div>
    `;

    // Estilos para la notificación
    Object.assign(notif.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '10000',
        fontWeight: '600',
        animation: 'slideInRight 0.5s ease-out',
        cursor: 'pointer',
        maxWidth: '350px'
    });

    // Hacer clic para ir a la sección de casilla electrónica
    notif.onclick = () => {
        showSection('casilla');
        notif.remove();
    };

    document.body.appendChild(notif);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notif.parentNode) {
            notif.style.animation = 'slideOutRight 0.5s ease-in';
            setTimeout(() => notif.remove(), 500);
        }
    }, 5000);
}

// Función para agregar solicitud a la casilla electrónica (ahora usa API)
async function agregarSolicitudACasilla(solicitud) {
    try {
        // La solicitud ya se guarda en la base de datos vía API
        // Solo necesitamos refrescar la vista
        console.log('📬 Solicitud procesada en casilla electrónica admin:', solicitud.id);

        // Refrescar la vista de casilla electrónica
        await cargarCasillaElectronicaAdmin();

        // Actualizar contadores
        await actualizarContadores();
    } catch (error) {
        console.error('Error procesando solicitud en casilla electrónica:', error);
    }
}

// Función para cargar actividades recientes
async function cargarActividadesRecientes() {
    try {
        const response = await fetch('/api/actividades-recientes?limite=20&horas=48');
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById('actividades-recientes');
            if (tbody) {
                if (data.data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #b0b0b0;">No hay actividades recientes</td></tr>';
                    return;
                }

                tbody.innerHTML = data.data.map(actividad => {
                    // Determinar clase de estado
                    let estadoClass = 'status-active';
                    if (actividad.estado === 'Pendiente' || actividad.estado === 'En Proceso') {
                        estadoClass = 'status-pending';
                    } else if (actividad.estado === 'Error' || actividad.estado === 'Fallido') {
                        estadoClass = 'status-inactive';
                    }

                    // Formatear fecha
                    const fecha = new Date(actividad.fecha);
                    const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return `
                        <tr>
                            <td>${actividad.usuario}</td>
                            <td>${actividad.accion}${actividad.detalles ? ` - ${actividad.detalles}` : ''}</td>
                            <td>${fechaFormateada}</td>
                            <td><span class="status-badge ${estadoClass}">${actividad.estado}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        } else {
            console.error('Error cargando actividades recientes:', data.error);
            const tbody = document.getElementById('actividades-recientes');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #f44336;">Error cargando actividades</td></tr>';
            }
        }
    } catch (error) {
        console.error('Error en cargarActividadesRecientes:', error);
        const tbody = document.getElementById('actividades-recientes');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #f44336;">Error de conexión</td></tr>';
        }
    }
}

function getStatusClass(estado) {   //1
    const e = (estado || '').toLowerCase();
    if (e.includes('pend')) return 'status-pending';
    if (e.includes('tram') || e.includes('apro') || e.includes('act') || e.includes('nuevo')) return 'status-active';
    if (e.includes('rech') || e.includes('arch')) return 'status-rejected';
    return 'status-default';
}

function setNumber(sel, n) {     //1
    const el = document.querySelector(sel);
    if (el) el.textContent = String(n);
}
function actualizarIndicadoresCasilla(list) {  //1
    const total = list.length;
    const nuevas = list.filter(x => (x.estado || '').toLowerCase() === 'nuevo').length;
    const leidas = Math.max(0, total - nuevas);
    // Ajusta estos selectores si tus KPIs tienen otros IDs
    setNumber('#kpi-nuevas', nuevas);
    setNumber('#kpi-leidas', leidas);
    setNumber('#kpi-total-mes', total);
}

// Función para cargar solicitudes y expedientes en casilla electrónica desde API
async function cargarCasillaElectronicaAdmin() {
    // Abarcamos los dos posibles tbodys
    const tbody =
      document.getElementById('casilla-electronica-tbody') ||
      document.querySelector('#casilla tbody');

    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Cargando…</td></tr>`;

    try {
      const res = await fetch('/api/expedientes', { cache: 'no-store' });
      const json = await res.json();
      // Aceptamos tanto {success,data} como [] directamente
      const data = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

      console.log('[CASILLA] /api/expedientes ->', data);

      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No hay expedientes en la casilla electrónica</td></tr>`;
        actualizarIndicadoresCasilla([]);
        return;
      }

      // Map flexible: usa el campo que exista
      const rows = data.map((e, idx) => {
        const numero       = e.numero || e.nro || e.n_expediente || e.id || '-';
        const presentante  = e.presentante || e.solicitante || e.usuario || e.usuario_nombre || '-';
        const proceso      = e.proceso || e.tipo || '-';
        const materia      = e.materia || '';
        const sumilla      = e.sumilla || '';
        const sede         = e.sede || '';
        const especialidad = e.especialidad || e.tipo_materia || '';
        const cuantia      = e.cuantia || '';
        const moneda       = e.moneda || 'PEN';
        const estado       = e.estado || 'Nuevo';
        const fCreacion    = e.fecha_creacion || e.fecha_inicio || e.fecha || e.actualizado;

        const fecha = fCreacion
          ? new Date(fCreacion).toLocaleDateString('es-ES')
          : '-';
        const hora  = fCreacion
          ? new Date(fCreacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '';

        return `
          <tr>
            <td>${idx + 1}</td>
            <td style="text-align:center;color:#d4af37;font-weight:bold;">${numero}</td>
            <td>
              <div style="font-weight:bold;color:#ffffff;">${presentante}</div>
              ${e.colegiatura ? `<div style="font-size:12px;color:#b0b0b0;">Colegiatura: ${e.colegiatura}</div>` : ''}
              ${e.correo ? `<div style="font-size:12px;color:#b0b0b0;">${e.correo}</div>` : ''}
            </td>
            <td>
              ${proceso ? `<div style="font-weight:bold;color:#d4af37;">${proceso}</div>` : ''}
              ${materia ? `<div style="font-size:12px;color:#b0b0b0;">Materia: ${materia}</div>` : ''}
              ${e.motivo_ingreso ? `<div style="font-size:12px;color:#b0b0b0;">Motivo: ${e.motivo_ingreso}</div>` : ''}
            </td>
            <td>${sumilla ? `<div style="font-size:13px;line-height:1.3;">${sumilla}</div>` : '—'}</td>
            <td>
              <div style="font-size:12px;">
                ${sede ? `<div><strong>Sede:</strong> ${sede}</div>` : ''}
                ${especialidad ? `<div><strong>Especialidad:</strong> ${especialidad}</div>` : ''}
                ${cuantia ? `<div><strong>Cuantía:</strong> ${moneda} ${cuantia}</div>` : ''}
                <div><strong>Estado:</strong> <span class="status-badge ${getStatusClass(estado)}">${estado}</span></div>
              </div>
            </td>
            <td style="text-align:center;">
              <div style="font-size:12px;margin-bottom:8px;">
                <div style="color:#d4af37;font-weight:bold;">${fecha}</div>
                <div style="color:#b0b0b0;">${hora}</div>
              </div>
              <div style="display:flex;gap:5px;justify-content:center;">
                <button class="btn btn-primary"  style="padding:4px 6px;font-size:12px;" onclick="verExpediente('${e.id || numero || ''}')">👁️</button>
                <button class="btn btn-secondary" style="padding:4px 6px;font-size:12px;" onclick="accionesExpediente('${e.id || numero || ''}')">⚡</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rows;
      actualizarIndicadoresCasilla(data);
    } catch (err) {
      console.error('[CASILLA] Error:', err);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f44336;">Error cargando datos</td></tr>`;
      actualizarIndicadoresCasilla([]);
    }
}

// Exponer funciones globalmente
window.cargarCasillaElectronicaAdmin = cargarCasillaElectronicaAdmin;
window.cargarExpedientesTabla = cargarExpedientesTabla;

console.log('📦 main.js cargado - cargarExpedientesTabla disponible:', typeof window.cargarExpedientesTabla);

// Si tienes showSection, garantiza la llamada:
(function patchShowSection(){
    const prev = window.showSection;
    window.showSection = function(sectionId, el){
      if (typeof prev === 'function') prev(sectionId, el);
      // Si prev no existe, activamos visualmente igual:
      if (!prev) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if (el) el.classList.add('active');
      }
      if (sectionId === 'casilla') window.cargarCasillaElectronicaAdmin?.();
    };
})();

// También cargar si "Casilla" ya está activa al abrir la página
document.addEventListener('DOMContentLoaded', () => {
    const casilla = document.getElementById('casilla');
    if (casilla && casilla.classList.contains('active')) {
        window.cargarCasillaElectronicaAdmin();
    }
});

// Función para configurar listener de notificaciones entre pestañas
function configurarListenerNotificaciones() {
    window.addEventListener('storage', function(event) {
        if (event.key === 'notificaciones_admin') {
            try {
                const notificaciones = JSON.parse(event.newValue || '[]');
                console.log('📨 Notificaciones recibidas desde otra pestaña:', notificaciones.length);

                // Procesar notificaciones no leídas
                const noLeidas = notificaciones.filter(n => !n.leida);

                if (noLeidas.length > 0) {
                    // Procesar cada tipo de notificación
                    noLeidas.forEach(notif => {
                        switch(notif.tipo) {
                            case 'nueva_solicitud':
                                // Verificar destino de la solicitud
                                if (notif.solicitud && notif.solicitud.destino === 'casilla_electronica_admin') {
                                    // Agregar solicitud a la casilla electrónica
                                    agregarSolicitudACasilla(notif.solicitud);
                                    // Actualizar contadores
                                    actualizarContadores();
                                } else {
                                    // Agregar solicitud a la sección de solicitudes
                                    // Forzar verificación inmediata de nuevas solicitudes
                                    verificarNuevasSolicitudes();
                                }
                                break;
                            case 'nuevo_expediente':
                                // Agregar expediente a la casilla electrónica
                                agregarExpedienteACasilla(notif.expediente);
                                // Actualizar contadores
                                actualizarContadores();
                                break;
                        }
                    });

                    // Mostrar notificación visual con el conteo total
                    mostrarNotificacionNuevaSolicitud(noLeidas.length);

                    // Actualizar badge de notificaciones
                    actualizarBadgeNotificaciones(noLeidas.length);
                }
            } catch (error) {
                console.error('Error procesando notificaciones:', error);
            }
        }
    });

    console.log('👂 Listener de notificaciones configurado');
}

// Función para actualizar el badge de notificaciones
function actualizarBadgeNotificaciones(cantidad) {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        if (cantidad > 0) {
            badge.textContent = cantidad > 99 ? '99+' : cantidad;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Función para ver archivos de una solicitud
