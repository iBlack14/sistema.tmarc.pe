/**
 * Módulo de Gestión de Solicitudes
 * Maneja todas las funciones relacionadas con solicitudes
 */

// Función para mostrar pestañas de la solicitud
function mostrarTabSolicitud(tabName, event) {
    // Si se llama desde un click, extraer el tabName del data-tab
    if (event && event.currentTarget) {
        tabName = event.currentTarget.dataset.tab;
    }
    if (!tabName) return;

    // Ocultar todos los contenidos de pestañas del modal de solicitud
    document.querySelectorAll('#solicitudModal .expediente-tab-content')
        .forEach(c => c.classList.remove('active'));

    // Desactivar todas las pestañas
    document.querySelectorAll('#solicitudModal .expediente-tab')
        .forEach(t => t.classList.remove('active'));

    // Mostrar contenido seleccionado (el id del panel es el valor de data-tab)
    const targetContent = document.getElementById(tabName);
    if (targetContent) targetContent.classList.add('active');

    // Activar el botón correspondiente
    const targetTab = document.querySelector(`#solicitudModal .expediente-tab[data-tab="${tabName}"]`);
    if (targetTab) targetTab.classList.add('active');
}

// Función para cerrar modal de solicitud
function cerrarModalSolicitud() {
    const modal = document.getElementById('solicitudModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Función para ver detalle de solicitud
async function verDetalleSolicitud(id) {
    try {
        const response = await fetch(`/api/solicitudes/${id}`);
        const data = await response.json();

        if (data.success) {
            const solicitud = data.data;

            // Helper para setear texto de forma segura
            const setText = (elId, value) => {
                const el = document.getElementById(elId);
                if (el) el.textContent = value;
            };

            // Llenar modal con datos de la solicitud
            setText('solicitudModalTitle', `Solicitud: ${solicitud.id}`);

            // Llenar datos básicos
            setText('solicitud-id', solicitud.id);
            setText('solicitud-tipo', solicitud.tipo || 'No especificado');
            setText('solicitud-asunto', solicitud.asunto || 'No especificado');
            setText('solicitud-estado', solicitud.estado || 'Pendiente');
            setText('solicitud-fecha', new Date(solicitud.fecha).toLocaleDateString('es-ES'));
            setText('solicitud-prioridad', solicitud.prioridad || 'Normal');
            setText('solicitud-descripcion', solicitud.descripcion || 'Sin descripción');

            // Llenar datos del solicitante
            setText('solicitud-nombre', solicitud.nombre || 'No especificado');
            setText('solicitud-dni', solicitud.dni || 'No especificado');
            setText('solicitud-email', solicitud.email || 'No especificado');
            setText('solicitud-telefono', solicitud.telefono || 'No especificado');

            // Llenar datos del demandado
            setText('solicitud-demandado-nombre', solicitud.demandado_nombre || 'No especificado');
            setText('solicitud-demandado-dni',    solicitud.demandado_dni    || 'No especificado');
            setText('solicitud-demandado-email',  solicitud.demandado_email  || 'No especificado');

            // Cargar archivos de la solicitud
            cargarArchivosSolicitud(solicitud);

            // Mostrar modal
            const modal = document.getElementById('solicitudModal');
            if (!modal) {
                console.error('No se encontró el modal solicitudModal en el DOM');
                return;
            }
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
            mostrarTabSolicitud('solicitud-informacion');
        } else {
            if (window.showError) window.showError('Error obteniendo datos de la solicitud');
        }
    } catch (error) {
        console.error('Error obteniendo solicitud:', error);
        if (window.showError) window.showError('Error obteniendo datos de la solicitud');
    }
}

// Función para cargar archivos de la solicitud
async function cargarArchivosSolicitud(solicitud) {
    const archivosContainer = document.getElementById('solicitud-archivos-lista');
    
    if (!archivosContainer) {
        console.warn('No se encontró el contenedor de archivos');
        return;
    }

    archivosContainer.innerHTML = '<div style="text-align:center;padding:20px;">Cargando archivos...</div>';

    try {
        // Obtener archivos desde la API
        const response = await fetch(`/api/solicitudes/${solicitud.id}/archivos`);
        const data = await response.json();

        let archivos = [];

        if (data.success && data.data && data.data.length > 0) {
            // Archivos reales desde la base de datos
            archivos = data.data.map(doc => ({
                id: doc.id,
                nombre: doc.nombre_original || doc.nombre_archivo,
                tipo: doc.tipo_mime || 'application/pdf',
                size: doc.tamano || 0,
                url: `/uploads/${doc.nombre_archivo}`,
                tipo_documento: doc.tipo || 'anexo',
                fecha: doc.fecha_subida,
                simulado: false
            }));
        } else {
            // Intentar parsear desde el campo documentos de la solicitud
            if (solicitud.documentos) {
                try {
                    const docsParseados = typeof solicitud.documentos === 'string' 
                        ? JSON.parse(solicitud.documentos) 
                        : solicitud.documentos;
                    
                    if (Array.isArray(docsParseados) && docsParseados.length > 0) {
                        archivos = docsParseados.map(doc => ({
                            nombre: doc.nombre_original || doc.nombre,
                            tipo: doc.tipo_mime || 'application/pdf',
                            size: doc.tamano || doc.size || 0,
                            url: `/uploads/${doc.nombre_archivo}`,
                            tipo_documento: doc.tipo || 'anexo',
                            simulado: false
                        }));
                    }
                } catch (e) {
                    console.warn('Error parseando documentos:', e);
                }
            }
        }

        if (archivos.length === 0) {
            archivosContainer.innerHTML = '<div class="no-documentos">No se encontraron archivos adjuntos</div>';
            return;
        }

        archivosContainer.innerHTML = archivos.map(archivo => {
            const iconoArchivo = obtenerIconoArchivo(archivo.tipo);
            const tipoArchivo = obtenerTipoArchivo(archivo.tipo);
            const tamanoArchivo = formatearTamano(archivo.size);
            const tipoDoc = archivo.tipo_documento === 'principal' ? '📄 Principal' : '📎 Anexo';

            return `
                <div class="documento-card" onclick="descargarArchivoSolicitud('${archivo.url}', '${archivo.nombre}')">
                    <span class="documento-icon">${iconoArchivo}</span>
                    <div class="documento-nombre">${archivo.nombre}</div>
                    <div class="documento-tipo">${tipoDoc} - ${tipoArchivo}</div>
                    <div class="documento-tipo">${tamanoArchivo}</div>
                    ${archivo.fecha ? `<div style="color: #666; font-size: 10px; margin-top: 5px;">${new Date(archivo.fecha).toLocaleDateString('es-ES')}</div>` : ''}
                </div>
            `;
        }).join('');

        console.log(`✅ ${archivos.length} archivos cargados para solicitud ${solicitud.id}`);

    } catch (error) {
        console.error('Error cargando archivos:', error);
        archivosContainer.innerHTML = '<div class="no-documentos" style="color:#f44336;">Error cargando archivos adjuntos</div>';
    }
}

// Función para descargar archivo de solicitud
function descargarArchivoSolicitud(url, nombreOriginal) {
    if (!url) {
        if (window.showError) window.showError('URL del archivo no disponible');
        return;
    }

    // Extraer nombre de archivo de la URL
    const filename = url.split('/').pop();
    
    // Usar la nueva ruta de descarga segura
    const downloadUrl = `/api/download/archivo/${filename}`;
    
    // Crear enlace temporal para descarga
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = nombreOriginal || 'archivo';
    link.target = '_blank';
    
    // Agregar al DOM, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📥 Descargando archivo: ${nombreOriginal} desde ${downloadUrl}`);
}

// Función para abrir archivo de solicitud (legacy - mantener por compatibilidad)
function abrirArchivoSolicitud(nombre, tipo, esSimulado) {
    if (esSimulado) {
        alert(`📎 Archivo de ejemplo: ${nombre}\n\n` +
              `Tipo: ${obtenerTipoArchivo(tipo)}\n` +
              `En un sistema real, aquí se abriría el visor de documentos\n` +
              `o se descargaría el archivo.`);
        return;
    }

    // Redirigir a la función de descarga
    descargarArchivoSolicitud(`/uploads/${nombre}`, nombre);
}

// Función para aprobar solicitud
async function aprobarSolicitud(id) {
    if (typeof Swal === 'undefined') {
        if (!confirm('¿Está seguro de aprobar esta solicitud?')) return;
        return procesarAprobacion(id);
    }

    Swal.fire({
        title: '¿Aprobar solicitud?',
        text: "Esta acción marcará la solicitud como aprobada.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4CAF50',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, aprobar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            procesarAprobacion(id);
        }
    });
}

async function procesarAprobacion(id) {
    try {
        if (window.showLoading) window.showLoading('Aprobando solicitud...');
        
        const response = await fetch(`/api/solicitudes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Aprobado' })
        });
        const data = await response.json();
        
        if (window.hideLoading) window.hideLoading();
        
        if (data.success) {
            if (window.showSuccess) window.showSuccess('Solicitud aprobada exitosamente');
            
            // Refrescar tabla
            if (window.dataManager && typeof window.dataManager.refreshSolicitudesTable === 'function') {
                await window.dataManager.refreshSolicitudesTable();
            }
            // Enviar notificación al usuario
            enviarNotificacionUsuario(id, 'Su solicitud ha sido aprobada');
        } else {
            if (window.showError) window.showError('Error aprobando solicitud: ' + data.error);
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error aprobando solicitud:', error);
        if (window.showError) window.showError('Error aprobando solicitud');
    }
}

// Función para rechazar solicitud
async function rechazarSolicitud(id) {
    if (typeof Swal === 'undefined') {
        const motivo = prompt('Ingrese el motivo del rechazo:');
        if (motivo) procesarRechazo(id, motivo);
        return;
    }

    Swal.fire({
        title: 'Rechazar Solicitud',
        text: 'Por favor, ingrese el motivo del rechazo:',
        input: 'textarea',
        inputPlaceholder: 'Escriba el motivo aquí...',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Rechazar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) return 'El motivo es obligatorio';
        }
    }).then((result) => {
        if (result.isConfirmed) {
            procesarRechazo(id, result.value);
        }
    });
}

async function procesarRechazo(id, motivo) {
    try {
        if (window.showLoading) window.showLoading('Rechazando solicitud...');
        
        const response = await fetch(`/api/solicitudes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Rechazado', motivo_rechazo: motivo })
        });
        const data = await response.json();
        
        if (window.hideLoading) window.hideLoading();
        
        if (data.success) {
            if (window.showSuccess) window.showSuccess('Solicitud rechazada exitosamente');
            
            // Refrescar tabla
            if (window.dataManager && typeof window.dataManager.refreshSolicitudesTable === 'function') {
                await window.dataManager.refreshSolicitudesTable();
            }
            // Enviar notificación al usuario
            enviarNotificacionUsuario(id, `Su solicitud ha sido rechazada. Motivo: ${motivo}`);
        } else {
            if (window.showError) window.showError('Error rechazando solicitud: ' + data.error);
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error rechazando solicitud:', error);
        if (window.showError) window.showError('Error rechazando solicitud');
    }
}

// Función para responder solicitud
async function responderSolicitud(id) {
    try {
        // Obtener datos de la solicitud
        const response = await fetch(`/api/solicitudes/${id}`);
        const data = await response.json();

        if (!data.success) {
            if (window.showError) window.showError('Error obteniendo datos de la solicitud');
            return;
        }

        const solicitud = data.data;

        // Crear modal de respuesta
        const modalHTML = `
            <div id="modalResponderSolicitud" style="display:block;position:fixed;z-index:30000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.7);">
                <div style="background:#fff;margin:5% auto;padding:30px;width:90%;max-width:600px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">
                        <h2 style="margin:0;color:#000;font-size:22px;">💬 Responder Solicitud #${id}</h2>
                        <button onclick="cerrarModalResponderSolicitud()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#666;">&times;</button>
                    </div>
                    
                    <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:20px;">
                        <p style="margin:5px 0;color:#333;"><strong>Solicitante:</strong> ${solicitud.nombre || 'No especificado'}</p>
                        <p style="margin:5px 0;color:#333;"><strong>Email:</strong> ${solicitud.email || 'No especificado'}</p>
                        <p style="margin:5px 0;color:#333;"><strong>Asunto:</strong> ${solicitud.asunto || 'No especificado'}</p>
                    </div>

                    <form id="formResponderSolicitud" onsubmit="enviarRespuestaSolicitud(event, '${id}', '${solicitud.usuario_id}')">
                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;">Asunto de la respuesta:</label>
                            <input type="text" id="respuesta-asunto" required 
                                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;"
                                placeholder="Ej: Respuesta a su solicitud #${id}">
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;">Mensaje:</label>
                            <textarea id="respuesta-mensaje" required rows="6"
                                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;"
                                placeholder="Escriba su respuesta aquí..."></textarea>
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;">📎 Adjuntar archivo (opcional):</label>
                            <input type="file" id="respuesta-archivo" 
                                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                            <small style="color:#666;font-size:12px;">Formatos permitidos: PDF, Word, Imágenes (máx. 10MB)</small>
                        </div>

                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button type="button" onclick="cerrarModalResponderSolicitud()" 
                                style="padding:12px 24px;background:#6c757d;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">
                                Cancelar
                            </button>
                            <button type="submit" 
                                style="padding:12px 24px;background:#4CAF50;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;">
                                📤 Enviar Respuesta
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Ocultar el modal de detalle mientras se responde
        const solicitudModal = document.getElementById('solicitudModal');
        if (solicitudModal) solicitudModal.style.display = 'none';

        // Agregar modal al body
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv);

    } catch (error) {
        console.error('Error abriendo modal de respuesta:', error);
        if (window.showError) window.showError('Error al abrir el formulario de respuesta');
    }
}

// Función para cerrar modal de respuesta
function cerrarModalResponderSolicitud() {
    const modal = document.getElementById('modalResponderSolicitud');
    if (modal) {
        modal.parentElement.remove();
    }
    // Restaurar modal de detalle si existe
    const solicitudModal = document.getElementById('solicitudModal');
    if (solicitudModal) solicitudModal.style.display = 'block';
}

// Función para enviar respuesta de solicitud
async function enviarRespuestaSolicitud(event, solicitudId, usuarioId) {
    event.preventDefault();

    const asunto = document.getElementById('respuesta-asunto').value;
    const mensaje = document.getElementById('respuesta-mensaje').value;
    const archivoInput = document.getElementById('respuesta-archivo');
    const archivo = archivoInput?.files[0];

    if (!asunto || !mensaje) {
        if (window.showError) window.showError('Por favor, complete todos los campos obligatorios');
        return;
    }

    // Validar tamaño del archivo (10MB máximo)
    if (archivo && archivo.size > 10 * 1024 * 1024) {
        if (window.showError) window.showError('El archivo es demasiado grande. Máximo 10MB.');
        return;
    }

    try {
        console.log('📤 Enviando respuesta a solicitud:', solicitudId);

        const formData = new FormData();
        formData.append('usuario_id', usuarioId);
        formData.append('tipo', 'respuesta_admin');
        formData.append('titulo', asunto);
        formData.append('mensaje', mensaje);
        formData.append('referencia_tipo', 'solicitud');
        formData.append('referencia_id', solicitudId);
        
        // Agregar archivo si existe
        if (archivo) {
            formData.append('archivo', archivo);
            console.log('📎 Archivo adjunto:', archivo.name);
        }

        // Crear notificación con archivo en la casilla del usuario
        const response = await fetch('/api/notificaciones', {
            method: 'POST',
            body: formData // Usar FormData en lugar de JSON para enviar archivo
        });

        const data = await response.json();

        if (data.success) {
            const mensajeExito = archivo 
                ? 'Respuesta enviada correctamente con archivo adjunto. El usuario la verá en su Casilla Electrónica.'
                : 'Respuesta enviada correctamente. El usuario la verá en su Casilla Electrónica.';
            
            if (window.showSuccess) window.showSuccess(mensajeExito);
            cerrarModalResponderSolicitud();
            
            // Refrescar tabla
            if (typeof cargarTablaSolicitudes === 'function') {
                await cargarTablaSolicitudes();
            }
        } else {
            throw new Error(data.error || 'Error enviando respuesta');
        }
    } catch (error) {
        console.error('❌ Error enviando respuesta:', error);
        if (window.showError) window.showError('Error al enviar la respuesta: ' + error.message);
    }
}

// Función auxiliar para enviar notificación al usuario
async function enviarNotificacionUsuario(solicitudId, mensaje) {
    try {
        await fetch('/api/notificaciones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                solicitud_id: solicitudId,
                mensaje: mensaje,
                tipo: 'solicitud'
            })
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}

// Función para cargar tabla de solicitudes
async function cargarTablaSolicitudes() {
    const tbody = document.getElementById('solicitudes-table-body');
    if (!tbody) {
        console.warn('No se encontró el tbody de solicitudes');
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Cargando solicitudes...</td></tr>';

    try {
        const response = await fetch('/api/solicitudes');
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay solicitudes pendientes</td></tr>';
            return;
        }

        // Filtrar solo pendientes
        const pendientes = data.data.filter(s => 
            (s.estado || '').toLowerCase() === 'pendiente'
        );

        if (pendientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay solicitudes pendientes</td></tr>';
            return;
        }

        tbody.innerHTML = pendientes.map(s => {
            const fecha = s.fecha ? new Date(s.fecha).toLocaleString('es-ES', {
                dateStyle: 'short',
                timeStyle: 'short'
            }) : '-';

            return `
                <tr>
                    <td>${s.id}</td>
                    <td>${s.nombre || s.usuario || '-'}</td>
                    <td>${s.tipo || s.asunto || 'General'}</td>
                    <td>${fecha}</td>
                    <td><span class="status-badge status-pending">${s.estado || 'Pendiente'}</span></td>
                    <td>
                        <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:5px;"
                            onclick="verDetalleSolicitud('${s.id}')" title="Ver detalles">👁️</button>
                        <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:5px;background:linear-gradient(135deg,#d4af37,#f1d582);color:#1a1a1a;"
                            onclick="TimelineManager.abrir('solicitudes','${s.id}','Solicitud: ${s.id}')" title="Ver Timeline">📋</button>
                        <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:5px;background:#4CAF50;"
                            onclick="responderSolicitud('${s.id}')" title="Responder">💬</button>
                        <button class="btn btn-primary" style="padding:4px 8px;font-size:12px;margin-right:5px;"
                            onclick="aprobarSolicitud('${s.id}')" title="Aprobar">✅</button>
                        <button class="btn btn-secondary" style="padding:4px 8px;font-size:12px;"
                            onclick="rechazarSolicitud('${s.id}')" title="Rechazar">❌</button>
                    </td>
                </tr>
            `;
        }).join('');

        console.log(`✅ ${pendientes.length} solicitudes cargadas`);

    } catch (error) {
        console.error('Error cargando solicitudes:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#f44336;">Error cargando solicitudes</td></tr>';
    }
}

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.mostrarTabSolicitud = mostrarTabSolicitud;
    window.cerrarModalSolicitud = cerrarModalSolicitud;
    window.verDetalleSolicitud = verDetalleSolicitud;
    window.cargarArchivosSolicitud = cargarArchivosSolicitud;
    window.abrirArchivoSolicitud = abrirArchivoSolicitud;
    window.descargarArchivoSolicitud = descargarArchivoSolicitud;
    window.aprobarSolicitud = aprobarSolicitud;
    window.rechazarSolicitud = rechazarSolicitud;
    window.responderSolicitud = responderSolicitud;
    window.cerrarModalResponderSolicitud = cerrarModalResponderSolicitud;
    window.enviarRespuestaSolicitud = enviarRespuestaSolicitud;
    window.cargarTablaSolicitudes = cargarTablaSolicitudes;
    window.refreshSolicitudesTable = cargarTablaSolicitudes; // Alias para compatibilidad
}

// Enlazar clicks de pestañas del modal de solicitud
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#solicitudModal .expediente-tab').forEach(btn => {
        btn.addEventListener('click', (e) => mostrarTabSolicitud(null, e));
    });
});

console.log('✅ Módulo de solicitudes cargado');
