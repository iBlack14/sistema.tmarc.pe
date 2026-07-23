/**
 * Módulo de Casilla Electrónica
 * Maneja todas las funciones relacionadas con la casilla electrónica
 */

// Función para cargar casilla electrónica en admin
async function cargarCasillaElectronicaAdmin() {
    try {
        const response = await fetch('/api/casilla-electronica');
        const data = await response.json();

        if (data.success && data.data) {
            const tbody = document.querySelector('#casilla table tbody');
            if (!tbody) return;

            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay documentos en la casilla electrónica</td></tr>';
                return;
            }

            tbody.innerHTML = data.data.map((doc, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${doc.numero_expediente || 'N/A'}</td>
                    <td>${doc.presentante || 'No especificado'}</td>
                    <td>${doc.proceso || 'No especificado'}</td>
                    <td title="${doc.sumilla || ''}">${truncarTexto(doc.sumilla || 'Sin sumilla', 100)}</td>
                    <td>
                        <strong>Sede:</strong> ${doc.sede || 'N/A'}<br>
                        <strong>Especialidad:</strong> ${doc.especialidad || 'N/A'}
                    </td>
                    <td>
                        ${doc.fecha ? new Date(doc.fecha).toLocaleDateString('es-ES') : 'N/A'}<br>
                        <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin-top: 5px;" 
                                onclick="verDetallesCasilla('${doc.id}')" title="Ver detalles">👁️ Ver</button>
                        ${doc.anexos_count > 0 ? `<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px; margin-top: 5px;" 
                                onclick="verAnexosCasilla('${doc.id}')" title="Ver anexos">📎 Anexos (${doc.anexos_count})</button>` : ''}
                    </td>
                </tr>
            `).join('');
        } else {
            console.error('Error cargando casilla electrónica:', data.error);
        }
    } catch (error) {
        console.error('Error cargando casilla electrónica:', error);
    }
}

// Función para truncar texto
function truncarTexto(texto, maxLength) {
    if (!texto) return '';
    if (texto.length <= maxLength) return texto;
    return texto.substring(0, maxLength) + '...';
}

// Función para ver detalles de documento de casilla
async function verDetallesCasilla(id) {
    try {
        const response = await fetch(`/api/casilla-electronica/${id}`);
        const data = await response.json();

        if (data.success) {
            const doc = data.data;

            // Crear modal dinámico con los detalles
            const modalContent = `
                <div class="modal" id="detallesCasillaModal" style="display: block;">
                    <div class="modal-content" style="max-width: 800px;">
                        <div class="modal-header">
                            <h2>📧 Detalles del Documento - Casilla Electrónica</h2>
                            <button class="expediente-close" onclick="cerrarDetallesCasilla()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="expediente-info-grid">
                                <div class="expediente-info-card">
                                    <h3>📄 Información del Expediente</h3>
                                    <div class="expediente-info-item">
                                        <span class="expediente-info-label">N° Expediente:</span>
                                        <span class="expediente-info-value">${doc.numero_expediente || 'N/A'}</span>
                                    </div>
                                    <div class="expediente-info-item">
                                        <span class="expediente-info-label">Sede:</span>
                                        <span class="expediente-info-value">${doc.sede || 'N/A'}</span>
                                    </div>
                                    <div class="expediente-info-item">
                                        <span class="expediente-info-label">Especialidad:</span>
                                        <span class="expediente-info-value">${doc.especialidad || 'N/A'}</span>
                                    </div>
                                    <div class="expediente-info-item">
                                        <span class="expediente-info-label">Proceso:</span>
                                        <span class="expediente-info-value">${doc.proceso || 'N/A'}</span>
                                    </div>
                                </div>
                                <div class="expediente-info-card">
                                    <h3>👤 Presentante</h3>
                                    <div class="expediente-info-item">
                                        <span class="expediente-info-label">Nombre:</span>
                                        <span class="expediente-info-value">${doc.presentante || 'No especificado'}</span>
                                    </div>
                                    <div class="expediente-info-item">
                                        <span class="expediente-info-label">Fecha:</span>
                                        <span class="expediente-info-value">${doc.fecha ? new Date(doc.fecha).toLocaleString('es-ES') : 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="expediente-info-card">
                                <h3>📝 Sumilla</h3>
                                <div style="line-height: 1.6; color: #000000;">${doc.sumilla || 'Sin sumilla'}</div>
                            </div>
                            ${doc.documento_url ? `
                            <div class="expediente-info-card">
                                <h3>📎 Documento Principal</h3>
                                <button class="btn btn-primary" onclick="descargarDocumentoCasilla('${doc.documento_url}', '${doc.numero_expediente}')">
                                    ⬇️ Descargar Documento
                                </button>
                            </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button class="btn-close" onclick="cerrarDetallesCasilla()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;

            // Insertar modal en el DOM
            const existingModal = document.getElementById('detallesCasillaModal');
            if (existingModal) {
                existingModal.remove();
            }
            document.body.insertAdjacentHTML('beforeend', modalContent);
        } else {
            alert('Error obteniendo detalles del documento');
        }
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        alert('Error obteniendo detalles del documento');
    }
}

// Función para cerrar modal de detalles de casilla
function cerrarDetallesCasilla() {
    const modal = document.getElementById('detallesCasillaModal');
    if (modal) {
        modal.remove();
    }
}

// Función para ver anexos de documento de casilla
async function verAnexosCasilla(id) {
    try {
        const response = await fetch(`/api/casilla-electronica/${id}/anexos`);
        const data = await response.json();

        if (data.success) {
            const anexos = data.data;

            if (anexos.length === 0) {
                alert('No hay anexos disponibles para este documento');
                return;
            }

            // Crear modal con lista de anexos
            const anexosHTML = anexos.map((anexo, index) => `
                <div class="anexo-item" style="padding: 15px; margin-bottom: 10px; background: #f0f0f0; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>📎 Anexo ${index + 1}</strong><br>
                            <span style="font-size: 12px; color: #666;">
                                ${anexo.nombre || `Anexo_${index + 1}.pdf`} 
                                ${anexo.tamano ? `(${formatearTamano(anexo.tamano)})` : ''}
                            </span>
                        </div>
                        <button class="btn btn-primary" style="padding: 6px 12px;" 
                                onclick="descargarAnexoCasilla('${anexo.url}', '${anexo.nombre || `Anexo_${index + 1}`}')">
                            ⬇️ Descargar
                        </button>
                    </div>
                </div>
            `).join('');

            const modalContent = `
                <div class="modal" id="anexosCasillaModal" style="display: block;">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h2>📎 Anexos del Documento</h2>
                            <button class="expediente-close" onclick="cerrarAnexosCasilla()">&times;</button>
                        </div>
                        <div class="modal-body">
                            ${anexosHTML}
                        </div>
                        <div class="modal-footer">
                            <button class="btn-close" onclick="cerrarAnexosCasilla()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;

            // Insertar modal en el DOM
            const existingModal = document.getElementById('anexosCasillaModal');
            if (existingModal) {
                existingModal.remove();
            }
            document.body.insertAdjacentHTML('beforeend', modalContent);
        } else {
            alert('Error obteniendo anexos del documento');
        }
    } catch (error) {
        console.error('Error obteniendo anexos:', error);
        alert('Error obteniendo anexos del documento');
    }
}

// Función para cerrar modal de anexos
function cerrarAnexosCasilla() {
    const modal = document.getElementById('anexosCasillaModal');
    if (modal) {
        modal.remove();
    }
}

// Función para descargar documento de casilla
function descargarDocumentoCasilla(url, nombreExpediente) {
    if (!url) {
        alert('URL del documento no disponible');
        return;
    }

    // Crear enlace temporal para descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = `Documento_${nombreExpediente || 'Casilla'}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función para descargar anexo de casilla
function descargarAnexoCasilla(url, nombre) {
    if (!url) {
        alert('URL del anexo no disponible');
        return;
    }

    // Crear enlace temporal para descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Función para refrescar casilla electrónica
async function refrescarCasillaElectronica() {
    const btn = event?.target;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '🔄 Actualizando...';
    }

    await cargarCasillaElectronicaAdmin();

    if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Refrescar';
    }

    if (window.conexionDatos) {
        window.conexionDatos.mostrarNotificacion('Casilla electrónica actualizada', 'success');
    }
}

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.cargarCasillaElectronicaAdmin = cargarCasillaElectronicaAdmin;
    window.truncarTexto = truncarTexto;
    window.verDetallesCasilla = verDetallesCasilla;
    window.cerrarDetallesCasilla = cerrarDetallesCasilla;
    window.verAnexosCasilla = verAnexosCasilla;
    window.cerrarAnexosCasilla = cerrarAnexosCasilla;
    window.descargarDocumentoCasilla = descargarDocumentoCasilla;
    window.descargarAnexoCasilla = descargarAnexoCasilla;
    window.refrescarCasillaElectronica = refrescarCasillaElectronica;
}
