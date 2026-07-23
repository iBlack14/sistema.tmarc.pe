/**
 * Módulo de Gestión de Expedientes
 * Maneja todas las funciones relacionadas con expedientes
 */

// Función para ver detalle de expediente
async function verDetalleExpediente(expedienteId) {
    try {
        const res = await fetch(`/api/expedientes/${encodeURIComponent(expedienteId)}`);
        if (!res.ok) {
            // Si el backend devolvió HTML (error), evitamos parsear JSON
            const txt = await res.text();
            throw new Error(`HTTP ${res.status} al obtener expediente: ${txt.slice(0,120)}...`);
        }
        const data = await res.json();

        if (!data?.success) {
            throw new Error(data?.message || 'Respuesta inválida del servidor');
        }

        const expediente = data.data || data; // por si tu API entrega {success, data:{...}}
        const partesProcesales = data.partes_procesales || [];

        // Helper para asignar textContent de forma segura (evita crash si el elemento no existe en el DOM)
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        // Título
        setText('expedienteModalTitle', `Expediente: ${expediente.numero || expediente.id || ''}`);

        // Información general
        setText('detalle-sede', expediente.sede || 'No especificado');
        setText('detalle-especialidad', expediente.especialidad || 'No especificado');
        setText('detalle-numero', expediente.numero || expediente.id || '—');
        setText('detalle-proceso', expediente.proceso || 'No especificado');
        setText('detalle-materia', expediente.materia || 'No especificado');
        setText('detalle-motivo', expediente.motivo_ingreso || 'No especificado');
        setText('detalle-cuantia', expediente.cuantia ? `S/ ${expediente.cuantia}` : 'No especificado');
        setText('detalle-estado', expediente.estado || 'Nuevo');
        setText('detalle-sumilla', expediente.sumilla || 'Sin sumilla');

        // Partes procesales - Demandante
        setText('detalle-demandante', expediente.demandante_nombre || 'No especificado');
        setText('detalle-demandante-dni', expediente.demandante_dni || 'No especificado');
        setText('detalle-demandante-email', expediente.demandante_correo || 'No especificado');
        setText('detalle-demandante-telefono', expediente.demandante_telefono || 'No especificado');
        setText('detalle-demandante-domicilio', expediente.demandante_domicilio || 'No especificado');
        
        // Buscar representante legal del demandante en partes_procesales
        const demandanteParte = partesProcesales.find(p => p.tipo_parte === 'demandante');
        setText('detalle-demandante-representante', demandanteParte?.representante_legal || 'No especificado');

        // Partes procesales - Demandado
        setText('detalle-demandado', expediente.demandado_nombre || 'No especificado');
        setText('detalle-demandado-dni', expediente.demandado_dni || 'No especificado');
        setText('detalle-demandado-email', expediente.demandado_correo || 'No especificado');
        setText('detalle-demandado-telefono', expediente.demandado_telefono || 'No especificado');
        setText('detalle-demandado-domicilio', expediente.demandado_domicilio || 'No especificado');
        
        // Buscar representante legal del demandado en partes_procesales
        const demandadoParte = partesProcesales.find(p => p.tipo_parte === 'demandado');
        setText('detalle-demandado-representante', demandadoParte?.representante_legal || 'No especificado');

        // Documentos
        if (typeof cargarDocumentosExpediente === 'function') {
            cargarDocumentosExpediente(expediente);
        }

        // Mostrar modal y activar primera pestaña
        const modal = document.getElementById('expedienteModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);

        mostrarTab('informacion');
    } catch (error) {
        console.error('Error obteniendo expediente:', error);
        if (window.showError) window.showError('Error obteniendo datos del expediente');
    }
}

/**
 * Mostrar pestaña.
 * - Si la llamas como manejador de click, recibe el evento y toma el destino de data-tab.
 * - Si la llamas programáticamente, pásale el nombre: mostrarTab('informacion')
 */
function mostrarTab(arg) {
    let tabName = null;
    let clickedBtn = null;

    // Llamada desde click
    if (arg && typeof arg === 'object' && (arg.target || arg.currentTarget)) {
        clickedBtn = arg.currentTarget || arg.target;
        tabName = clickedBtn?.dataset?.tab || null;
    }
    // Llamada programática: mostrarTab('informacion')
    if (typeof arg === 'string') {
        tabName = arg;
        clickedBtn = document.querySelector(`#expedienteModal .expediente-tab[data-tab="${tabName}"]`);
    }

    if (!tabName) return;

    // Scoped al expedienteModal para no interferir con otros modales
    document.querySelectorAll('#expedienteModal .expediente-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#expedienteModal .expediente-tab').forEach(el => el.classList.remove('active'));

    const panel = document.getElementById(tabName);
    if (panel) panel.classList.add('active');

    if (clickedBtn) clickedBtn.classList.add('active');
}

// Función para cerrar modal de expediente
function cerrarModalExpediente() {
    const modal = document.getElementById('expedienteModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Función para cargar documentos del expediente
async function cargarDocumentosExpediente(expediente) {
    const documentosContainer = document.getElementById('documentos-lista');
    
    if (!documentosContainer) {
        console.warn('No se encontró el contenedor de documentos');
        return;
    }

    documentosContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Cargando archivos...</div>';

    try {
        console.log('🔍 Obteniendo archivos para expediente:', expediente.id || expediente.numero);
        
        // Obtener archivos desde la API
        const response = await fetch(`/api/expedientes/${expediente.id || expediente.numero}/archivos`);
        const data = await response.json();
        
        console.log('📦 Respuesta de archivos:', data);

        let documentos = [];

        if (data.success && data.data && data.data.length > 0) {
            // Archivos reales desde la base de datos
            documentos = data.data.map(doc => ({
                nombre: doc.nombre_original || doc.nombre,
                tipo: doc.mimetype || doc.tipo_mime || 'application/pdf',
                size: doc.tamano || doc.size || 0,
                url: `/uploads/${doc.nombre_archivo}`,
                tipo_documento: doc.tipo || 'anexo',
                simulado: false
            }));
            console.log('✅ Archivos encontrados:', documentos.length);
        } else {
            console.warn('⚠️ No se encontraron archivos');
        }

        if (documentos.length === 0) {
            documentosContainer.innerHTML = '<div class="no-documentos">No se encontraron documentos adjuntos</div>';
            return;
        }

        documentosContainer.innerHTML = documentos.map(doc => {
            const iconoArchivo = obtenerIconoArchivo(doc.tipo);
            const tipoArchivo = obtenerTipoArchivo(doc.tipo);
            const tamanoArchivo = formatearTamano(doc.size);
            const tipoDoc = doc.tipo_documento === 'principal' ? '📄 Principal' : '📎 Anexo';

            return `
                <div class="documento-card" onclick="descargarDocumento('/uploads/${doc.url.split('/').pop()}', '${doc.nombre}')">
                    <span class="documento-icon">${iconoArchivo}</span>
                    <div class="documento-nombre">${doc.nombre}</div>
                    <div class="documento-tipo">${tipoDoc} - ${tipoArchivo}</div>
                    <div class="documento-tipo">${tamanoArchivo}</div>
                </div>
            `;
        }).join('');

        console.log(`✅ ${documentos.length} documentos cargados`);

    } catch (error) {
        console.error('❌ Error cargando documentos:', error);
        documentosContainer.innerHTML = '<div class="no-documentos" style="color:#f44336;">Error cargando documentos adjuntos</div>';
    }
}

// Función para descargar documento
function descargarDocumento(url, nombreOriginal) {
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
    link.download = nombreOriginal || 'documento';
    link.target = '_blank';
    
    // Agregar al DOM, hacer clic y eliminar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📥 Descargando documento: ${nombreOriginal} desde ${downloadUrl}`);
}

// Función para abrir documento (legacy - mantener por compatibilidad)
function abrirDocumento(nombre, tipo, esSimulado) {
    if (esSimulado) {
        alert(`📎 Documento de ejemplo: ${nombre}\n\n` +
              `Tipo: ${obtenerTipoArchivo(tipo)}\n` +
              `En un sistema real, aquí se abriría el visor de documentos\n` +
              `o se descargaría el archivo.`);
        return;
    }

    // Redirigir a la función de descarga
    descargarDocumento(`/uploads/${nombre}`, nombre);
}

// Función para responder expediente
async function responderExpediente(expedienteId) {
    try {
        // Obtener datos del expediente
        const response = await fetch(`/api/expedientes/${encodeURIComponent(expedienteId)}`);
        const data = await response.json();

        if (!data.success) {
            if (window.showError) window.showError('Error obteniendo datos del expediente');
            return;
        }

        const expediente = data.data;

        // Crear modal de respuesta
        const modalHTML = `
            <div id="modalResponderExpediente" style="display:block;position:fixed;z-index:10000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.7);">
                <div style="background:#fff;margin:5% auto;padding:30px;width:90%;max-width:600px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:2px solid #f0f0f0;padding-bottom:15px;">
                        <h2 style="margin:0;color:#000;font-size:22px;">💬 Responder Expediente ${expedienteId}</h2>
                        <button onclick="cerrarModalResponderExpediente()" style="background:none;border:none;font-size:28px;cursor:pointer;color:#666;">&times;</button>
                    </div>
                    
                    <div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:20px;">
                        <p style="margin:5px 0;color:#333;"><strong>Expediente:</strong> ${expediente.numero || expedienteId}</p>
                        <p style="margin:5px 0;color:#333;"><strong>Demandante:</strong> ${expediente.demandante || 'No especificado'}</p>
                        <p style="margin:5px 0;color:#333;"><strong>Materia:</strong> ${expediente.materia || 'No especificado'}</p>
                    </div>

                    <form id="formResponderExpediente" onsubmit="enviarRespuestaExpediente(event, '${expedienteId}', '${expediente.usuario_id}')">
                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;">Asunto de la respuesta:</label>
                            <input type="text" id="respuesta-exp-asunto" required 
                                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;"
                                placeholder="Ej: Actualización del expediente ${expedienteId}">
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;">Mensaje:</label>
                            <textarea id="respuesta-exp-mensaje" required rows="6"
                                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;"
                                placeholder="Escriba su respuesta aquí..."></textarea>
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;margin-bottom:8px;color:#333;font-weight:600;">📎 Adjuntar archivo (opcional):</label>
                            <input type="file" id="respuesta-exp-archivo" 
                                style="width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:14px;"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                            <small style="color:#666;font-size:12px;">Formatos permitidos: PDF, Word, Imágenes (máx. 10MB)</small>
                        </div>

                        <div style="display:flex;gap:10px;justify-content:flex-end;">
                            <button type="button" onclick="cerrarModalResponderExpediente()" 
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

        // Agregar modal al body
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv);

    } catch (error) {
        console.error('Error abriendo modal de respuesta:', error);
        if (window.showError) window.showError('Error al abrir el formulario de respuesta');
    }
}

// Función para cerrar modal de respuesta de expediente
function cerrarModalResponderExpediente() {
    const modal = document.getElementById('modalResponderExpediente');
    if (modal) {
        modal.parentElement.remove();
    }
}

// Función para enviar respuesta de expediente
async function enviarRespuestaExpediente(event, expedienteId, usuarioId) {
    event.preventDefault();

    const asunto = document.getElementById('respuesta-exp-asunto').value;
    const mensaje = document.getElementById('respuesta-exp-mensaje').value;
    const archivoInput = document.getElementById('respuesta-exp-archivo');
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
        console.log('📤 Enviando respuesta a expediente:', expedienteId);

        const formData = new FormData();
        formData.append('usuario_id', usuarioId);
        formData.append('tipo', 'respuesta_admin');
        formData.append('titulo', asunto);
        formData.append('mensaje', mensaje);
        formData.append('referencia_tipo', 'expediente');
        formData.append('referencia_id', expedienteId);
        formData.append('expediente_id', expedienteId);
        
        // Agregar archivo si existe
        if (archivo) {
            formData.append('archivo', archivo);
            console.log('📎 Archivo adjunto:', archivo.name);
        }

        // Crear notificación con archivo en la casilla del usuario
        const response = await fetch('/api/notificaciones', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            const mensajeExito = archivo 
                ? 'Respuesta enviada correctamente con archivo adjunto. El usuario la verá en su Casilla Electrónica.'
                : 'Respuesta enviada correctamente. El usuario la verá en su Casilla Electrónica.';
            
            if (window.showSuccess) window.showSuccess(mensajeExito);
            cerrarModalResponderExpediente();
            
            // Refrescar tabla si existe la función
            if (typeof cargarExpedientesTabla === 'function') {
                await cargarExpedientesTabla();
            }
        } else {
            throw new Error(data.error || 'Error enviando respuesta');
        }
    } catch (error) {
        console.error('❌ Error enviando respuesta:', error);
        if (window.showError) window.showError('Error al enviar la respuesta: ' + error.message);
    }
}

// Función para cargar expedientes en la tabla
async function cargarExpedientesTabla() {
    try {
        console.log('📂 Cargando expedientes...');
        const response = await fetch('/api/expedientes');
        const data = await response.json();

        console.log('📦 Respuesta de expedientes:', data);

        if (data.success) {
            const tbody = document.querySelector('#expedientes table tbody');
            console.log('📋 Tbody encontrado:', !!tbody);
            console.log('📊 Total expedientes:', data.data?.length || 0);
            
            if (tbody) {
                if (data.data && data.data.length > 0) {
                    tbody.innerHTML = data.data.map(expediente => `
                        <tr>
                            <td>${expediente.numero || expediente.id}</td>
                            <td>${expediente.presentante || 'N/A'}</td>
                            <td>${expediente.materia || 'N/A'}</td>
                            <td>${expediente.fecha_creacion ? new Date(expediente.fecha_creacion).toLocaleDateString('es-ES') : 'N/A'}</td>
                            <td><span class="status-badge status-${(expediente.estado || 'nuevo').toLowerCase()}">${expediente.estado || 'Nuevo'}</span></td>
                            <td>${expediente.fecha_actualizacion ? new Date(expediente.fecha_actualizacion).toLocaleDateString('es-ES') : (expediente.fecha_creacion ? new Date(expediente.fecha_creacion).toLocaleDateString('es-ES') : 'N/A')}</td>
                            <td>
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;" onclick="verDetalleExpediente('${expediente.id || expediente.numero}')" title="Ver detalles">👁️ Ver</button>
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin-right: 5px; background:linear-gradient(135deg,#2196F3,#64B5F6);color:#fff;" onclick="editarExpediente('${expediente.id}')" title="Editar">✏️ Editar</button>
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin-right: 5px; background:linear-gradient(135deg,#d4af37,#f1d582);color:#1a1a1a;" onclick="TimelineManager.abrir('expedientes','${expediente.id}','Expediente: ${expediente.numero || expediente.id}')" title="Ver Timeline">📋 Timeline</button>
                                <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; background:#4CAF50;" onclick="responderExpediente('${expediente.id || expediente.numero}')" title="Responder">💬 Responder</button>
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

// ─── EDITAR EXPEDIENTE ────────────────────────────────────────────────────────
async function editarExpediente(expedienteId) {
    try {
        const res = await fetch(`/api/expedientes/${encodeURIComponent(expedienteId)}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Error cargando expediente');
        const exp = data.data;

        // Eliminar modal anterior si existe
        const anterior = document.getElementById('modalEditarExpediente');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modalEditarExpediente';
        modal.style.cssText = 'display:block;position:fixed;z-index:10000;inset:0;background:rgba(0,0,0,0.6);overflow-y:auto;';

        modal.innerHTML = `
            <div style="background:#fff;margin:40px auto;padding:0;width:90%;max-width:680px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:20px 28px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#d4af37;margin-bottom:4px;">Panel Administrativo</div>
                        <div style="font-size:17px;font-weight:800;color:#fff;">✏️ Editar Expediente ${exp.numero || exp.id}</div>
                    </div>
                    <button onclick="document.getElementById('modalEditarExpediente').remove()" 
                        style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:8px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;">&times;</button>
                </div>

                <form id="formEditarExpediente" style="padding:24px;display:flex;flex-direction:column;gap:20px;">

                    <!-- Sección: Proceso -->
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">📂 Datos del Proceso</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Estado</label>
                                <select id="edit-estado" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;">
                                    <option value="Nuevo" ${exp.estado==='Nuevo'?'selected':''}>Nuevo</option>
                                    <option value="En Trámite" ${exp.estado==='En Trámite'?'selected':''}>En Trámite</option>
                                    <option value="En Procesamiento" ${exp.estado==='En Procesamiento'?'selected':''}>En Procesamiento</option>
                                    <option value="Completado" ${exp.estado==='Completado'?'selected':''}>Completado</option>
                                    <option value="Archivado" ${exp.estado==='Archivado'?'selected':''}>Archivado</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Sede</label>
                                <input type="text" id="edit-sede" value="${exp.sede||''}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Especialidad</label>
                                <input type="text" id="edit-especialidad" value="${exp.especialidad||''}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Materia</label>
                                <input type="text" id="edit-materia" value="${exp.materia||''}" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Etapa Procesal</label>
                                <input type="text" id="edit-etapa" value="${exp.etapa_procesal||''}" placeholder="Ej: Instalación del Tribunal" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Ubicación / Sala</label>
                                <input type="text" id="edit-ubicacion" value="${exp.ubicacion||''}" placeholder="Ej: Sala 1 - Sede Central" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Secretaría / Tribunal -->
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:18px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #fde68a;">⚖️ Secretaría / Tribunal Arbitral</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                            <div style="grid-column:1/-1;">
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;display:block;margin-bottom:6px;">Secretaría / Tribunal Arbitral</label>
                                <input type="text" id="edit-juez" value="${exp.juez||exp.especialista_legal||''}" 
                                    placeholder="Ej: Dr. Juan Pérez García — Árbitro Único" 
                                    style="width:100%;padding:10px 12px;border:1px solid #fcd34d;border-radius:8px;font-size:14px;background:#fff;">
                                <div style="font-size:11px;color:#92400e;margin-top:5px;">Este nombre aparece en el seguimiento público del expediente.</div>
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;display:block;margin-bottom:6px;">Órgano / Institución</label>
                                <input type="text" id="edit-organo" value="${exp.organo_jurisdiccional||''}" placeholder="Ej: TMARC — Centro de Arbitraje" style="width:100%;padding:10px 12px;border:1px solid #fcd34d;border-radius:8px;font-size:14px;background:#fff;">
                            </div>
                            <div>
                                <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;display:block;margin-bottom:6px;">Especialista Legal</label>
                                <input type="text" id="edit-especialista" value="${exp.especialista_legal||''}" placeholder="Nombre del especialista" style="width:100%;padding:10px 12px;border:1px solid #fcd34d;border-radius:8px;font-size:14px;background:#fff;">
                            </div>
                        </div>
                    </div>

                    <!-- Sección: Observaciones -->
                    <div>
                        <label style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;display:block;margin-bottom:6px;">Observaciones Internas</label>
                        <textarea id="edit-observaciones" rows="3" placeholder="Notas internas del expediente..." 
                            style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical;">${exp.observaciones||''}</textarea>
                    </div>

                    <!-- Botones -->
                    <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:8px;border-top:1px solid #e5e7eb;">
                        <button type="button" onclick="document.getElementById('modalEditarExpediente').remove()"
                            style="padding:10px 24px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-weight:600;color:#374151;cursor:pointer;">
                            Cancelar
                        </button>
                        <button type="submit" id="btnGuardarExpediente"
                            style="padding:10px 28px;background:linear-gradient(135deg,#d4af37,#f1d582);border:none;border-radius:8px;font-size:13px;font-weight:700;color:#1a1a1a;cursor:pointer;">
                            💾 Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Cerrar al click en overlay
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

        // Submit
        document.getElementById('formEditarExpediente').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnGuardarExpediente');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            try {
                const payload = {
                    estado:                  document.getElementById('edit-estado').value,
                    sede:                    document.getElementById('edit-sede').value,
                    especialidad:            document.getElementById('edit-especialidad').value,
                    materia:                 document.getElementById('edit-materia').value,
                    etapa_procesal:          document.getElementById('edit-etapa').value,
                    ubicacion:               document.getElementById('edit-ubicacion').value,
                    juez:                    document.getElementById('edit-juez').value,
                    organo_jurisdiccional:   document.getElementById('edit-organo').value,
                    especialista_legal:      document.getElementById('edit-especialista').value,
                    observaciones:           document.getElementById('edit-observaciones').value,
                };

                const r = await fetch(`/api/expedientes/${encodeURIComponent(expedienteId)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await r.json();

                if (result.success) {
                    modal.remove();
                    if (window.showSuccess) window.showSuccess('✅ Expediente actualizado correctamente');
                    if (typeof cargarExpedientesTabla === 'function') await cargarExpedientesTabla();
                } else {
                    throw new Error(result.error || 'Error al guardar');
                }
            } catch (err) {
                if (window.showError) window.showError('Error: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.textContent = '💾 Guardar Cambios';
            }
        });

    } catch (error) {
        console.error('Error abriendo editor:', error);
        if (window.showError) window.showError('Error al abrir el editor: ' + error.message);
    }
}

// Inicializar event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Enlaza los clicks de las pestañas
    document.querySelectorAll('#expedienteModal .expediente-tab').forEach(btn => {
        btn.addEventListener('click', mostrarTab);
    });
});

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.editarExpediente = editarExpediente;
    window.verDetalleExpediente = verDetalleExpediente;
    window.mostrarTab = mostrarTab;
    window.cerrarModalExpediente = cerrarModalExpediente;
    window.cargarDocumentosExpediente = cargarDocumentosExpediente;
    window.descargarDocumento = descargarDocumento;
    window.abrirDocumento = abrirDocumento;
    window.cargarExpedientesTabla = cargarExpedientesTabla;
    window.responderExpediente = responderExpediente;
    window.cerrarModalResponderExpediente = cerrarModalResponderExpediente;
    window.enviarRespuestaExpediente = enviarRespuestaExpediente;
}

console.log('📦 Módulo de expedientes (admin) cargado');
console.log('✅ cargarExpedientesTabla disponible:', typeof window.cargarExpedientesTabla);
