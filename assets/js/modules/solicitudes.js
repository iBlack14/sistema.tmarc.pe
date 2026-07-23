/**
 * Solicitudes Module
 * Handles all solicitud-related functionality
 */

class SolicitudesModule {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.solicitudes = [];
        this.currentFilters = {};

        this.init();
    }

    /**
     * Initialize solicitudes module
     */
    init() {
        this.setupEventListeners();
        this.setupRealTimeValidation();
    }

    /**
     * Setup event listeners for solicitudes
     */
    setupEventListeners() {
        // Nueva solicitud button - Soporta múltiples formatos de selector
        const nuevaSolicitudBtn = document.querySelector('[onclick*="crearNuevaSolicitud"]');
        if (nuevaSolicitudBtn) {
            nuevaSolicitudBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.crearNuevaSolicitud();
            });
        }

        // Form submission
        const formSolicitud = document.getElementById('formSolicitud');
        if (formSolicitud) {
            formSolicitud.addEventListener('submit', (e) => this.handleNuevaSolicitud(e));
        }

        // Tipo de solicitud change
        const tipoSolicitud = document.getElementById('tipoSolicitud');
        if (tipoSolicitud) {
            tipoSolicitud.addEventListener('change', (e) => this.handleTipoSolicitudChange(e));
        }

        // Character counter for asunto
        const asuntoSolicitud = document.getElementById('asuntoSolicitud');
        if (asuntoSolicitud) {
            asuntoSolicitud.addEventListener('input', (e) => this.updateCharacterCount(e));
        }

        // Documento principal file input
        const documentoPrincipal = document.getElementById('documentoPrincipal');
        if (documentoPrincipal) {
            documentoPrincipal.addEventListener('change', (e) => this.handleDocumentoPrincipalChange(e));
        }

        // Anexos file input
        const anexosFiles = document.getElementById('anexosFiles');
        if (anexosFiles) {
            anexosFiles.addEventListener('change', (e) => this.handleAnexosChange(e));
        }

        // Auto-fill user data if available
        this.autoFillUserData();
    }

    /**
     * Load solicitudes for current user
     */
    async loadSolicitudesUsuario() {
        try {
            this.dashboard.showLoading();
            const usuarioId = this.dashboard.getCurrentUserId();

            const response = await fetch(`/api/solicitudes/usuario/${usuarioId}`);
            const data = await response.json();

            if (data.success) {
                this.solicitudes = data.data || [];
                this.mostrarSolicitudes(this.solicitudes);
            } else {
                throw new Error(data.error || 'Error loading solicitudes');
            }
        } catch (error) {
            console.error('Error loading solicitudes:', error);
            this.mostrarSolicitudes([]);
        } finally {
            this.dashboard.hideLoading();
        }
    }

    /**
     * Obtener clase CSS según estado
     */
    getStatusClass(estado) {
        const e = (estado || '').toLowerCase();
        if (e.includes('pend')) return 'status-pending';
        if (e.includes('aprob') || e.includes('activ') || e.includes('complet')) return 'status-active';
        if (e.includes('rechaz') || e.includes('cancel')) return 'status-inactive';
        if (e.includes('proceso') || e.includes('revision')) return 'status-process';
        return 'status-pending';
    }

    /**
     * Display solicitudes in table
     */
    mostrarSolicitudes(solicitudes) {
        const tbody = document.getElementById('solicitudes-tbody');
        const table = document.getElementById('solicitudes-table');
        const noSolicitudes = document.getElementById('no-solicitudes');

        if (!solicitudes || solicitudes.length === 0) {
            if (table) table.style.display = 'none';
            if (noSolicitudes) noSolicitudes.style.display = 'block';
            return;
        }

        if (table) table.style.display = 'table';
        if (noSolicitudes) noSolicitudes.style.display = 'none';

        if (tbody) {
            tbody.innerHTML = solicitudes.map(solicitud => {
                const fecha = new Date(solicitud.fecha).toLocaleDateString('es-ES', {
                    year: 'numeric', month: '2-digit', day: '2-digit'
                });
                const estadoClass = this.getStatusClass(solicitud.estado);

                return `
                    <tr class="solicitud-row">
                        <td>${solicitud.id}</td>
                        <td>${fecha}</td>
                        <td>${solicitud.tipo || 'No especificado'}</td>
                        <td><span class="status-badge ${estadoClass}">${solicitud.estado}</span></td>
                        <td>
                            <button class="btn btn-secondary" onclick="event.stopPropagation(); verDetalleSolicitud('${solicitud.id}')" style="padding: 4px 8px; font-size: 12px;">
                                Ver Detalle
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    /**
     * Create new solicitud modal
     */
    crearNuevaSolicitud() {
        const modal = document.getElementById('modalSolicitud');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.resetFormSolicitud();

            setTimeout(() => {
                const firstField = document.getElementById('solicitanteNombre');
                if (firstField) firstField.focus();
            }, 100);
        }
    }

    /**
     * Handle new solicitud form submission
     */
    async handleNuevaSolicitud(e) {
        e.preventDefault();

        const tipoVal = document.getElementById('tipoSolicitud').value;
        const solicitudData = {
            nombre: document.getElementById('solicitanteNombre').value,
            email: document.getElementById('solicitanteEmail').value,
            telefono: document.getElementById('solicitanteTelefono').value || '',
            dni: document.getElementById('solicitanteDni').value,
            tipo: tipoVal === 'otro' ?
                  (document.getElementById('otrosTipo').value || tipoVal) :
                  tipoVal,
            asunto: document.getElementById('asuntoSolicitud').value,
            descripcion: document.getElementById('descripcionSolicitud').value || '',
            prioridad: document.getElementById('prioridadSolicitud').value || 'normal',
            casilla_electronica: document.getElementById('casillaElectronica').value || '53099',
            demandado_nombre: document.getElementById('demandadoNombre')?.value || '',
            demandado_dni:    document.getElementById('demandadoDni')?.value || '',
            demandado_email:  document.getElementById('demandadoEmail')?.value || '',
            usuario_id: this.dashboard.getCurrentUserId()
        };

        const validation = this.validateSolicitudData(solicitudData);
        if (!validation.valid) {
            alert('⚠️ Requerimiento Institucional:\n' + validation.errors.join('\n'));
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const formData = new FormData();
            Object.keys(solicitudData).forEach(key => formData.append(key, solicitudData[key]));

            const documentoPrincipal = document.getElementById('documentoPrincipal');
            if (documentoPrincipal && documentoPrincipal.files.length > 0) {
                formData.append('documentos_principales', documentoPrincipal.files[0]);
            }

            const anexosFiles = document.getElementById('anexosFiles');
            if (anexosFiles && anexosFiles.files.length > 0) {
                Array.from(anexosFiles.files).forEach(file => formData.append('anexos', file));
            }

            const response = await fetch('/api/solicitudes', { method: 'POST', body: formData });
            const result = await response.json();

            if (result.success) {
                this.dashboard.showSuccess('✅ Solicitud registrada exitosamente');
                this.resetFormSolicitud();
                this.dashboard.closeAllModals();
                await this.loadSolicitudesUsuario();
            } else {
                throw new Error(result.error || 'Error enviando solicitud');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.dashboard.showError('Error: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Validate solicitud data
     */
    validateSolicitudData(data) {
        const errors = [];
        if (!data.nombre || data.nombre.trim().length < 3) errors.push('• Nombre Completo o Razón Social es obligatorio.');
        if (!data.dni || data.dni.trim().length < 8) errors.push('• DNI o RUC es obligatorio.');
        if (!data.email || data.email.trim() === '') errors.push('• El correo electrónico es obligatorio.');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('• El correo electrónico no tiene un formato válido.');
        if (!data.asunto || data.asunto.trim() === '') errors.push('• El asunto es obligatorio.');
        return { valid: errors.length === 0, errors };
    }

    /**
     * Enhanced form validation with real-time feedback
     */
    setupRealTimeValidation() {
        const fieldsToValidate = [
            { id: 'solicitanteNombre', minLength: 3, required: true },
            { id: 'solicitanteDni', minLength: 8, required: true },
            { id: 'solicitanteEmail', email: true, required: false },
            { id: 'asuntoSolicitud', required: false },
            { id: 'descripcionSolicitud', required: false }
        ];

        fieldsToValidate.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.addEventListener('blur', () => this.validateField(field));
                element.addEventListener('input', () => this.clearFieldError(field.id));
            }
        });
    }

    validateField(fieldConfig) {
        const element = document.getElementById(fieldConfig.id);
        if (!element) return true;
        const value = element.value.trim();
        let isValid = true;
        let errorMessage = '';

        if (fieldConfig.required && !value) {
            isValid = false;
            errorMessage = 'Este campo es obligatorio';
        } else if (fieldConfig.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            isValid = false;
            errorMessage = 'Formato de correo inválido';
        }

        if (!isValid) this.showFieldError(fieldConfig.id, errorMessage);
        else this.clearFieldError(fieldConfig.id);
        return isValid;
    }

    showFieldError(fieldId, message) {
        this.clearFieldError(fieldId);
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.classList.add('field-error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'color: #ff4444; font-size: 11px; margin-top: 4px;';
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        field.classList.remove('field-error');
        const errorMessage = field.parentNode.querySelector('.field-error-message');
        if (errorMessage) errorMessage.remove();
    }

    handleTipoSolicitudChange(e) {
        const otrosContainer = document.getElementById('otrosContainer');
        if (otrosContainer) otrosContainer.style.display = e.target.value === 'otro' ? 'block' : 'none';
    }

    updateCharacterCount(e) {
        const charCount = document.getElementById('charCount');
        if (charCount) charCount.textContent = e.target.value.length;
    }

    handleDocumentoPrincipalChange(e) {
        const fileNameSpan = document.getElementById('fileNamePrincipal');
        const file = e.target.files[0];
        if (file) {
            // Permitir PDF, Word, Excel e Imágenes
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];
            const isAllowed = allowedTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/i);
            
            if (!isAllowed) { 
                alert('Formato no soportado. Use PDF, Word, Excel o Imágenes.'); 
                e.target.value = ''; 
                return; 
            }
            if (file.size > 40 * 1024 * 1024) { alert('Máximo 40 MB'); e.target.value = ''; return; }
            if (fileNameSpan) fileNameSpan.textContent = file.name;
        }
    }

    handleAnexosChange(e) {
        const files = Array.from(e.target.files);
        const fileNameSpan = document.getElementById('fileNameAnexos');
        const anexosList = document.getElementById('anexosList');
        
        // Validar formatos (PDF, Word, Excel, Imágenes)
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png)$/i));
        
        if (invalidFiles.length > 0) {
            alert('Algunos archivos no tienen un formato permitido (PDF, Word, Excel o Imagen)');
            e.target.value = '';
            return;
        }

        if (fileNameSpan) fileNameSpan.textContent = files.length > 0 ? `${files.length} archivos` : 'Ningún archivo';
        if (anexosList) {
            anexosList.innerHTML = files.map((file, index) => `
                <div class="anexo-item" style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">📎 ${file.name}</span>
                    <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ff4444; cursor: pointer;">×</button>
                </div>
            `).join('');
        }
    }

    toggleAnexosContainer(e) {
        const container = document.getElementById('anexosContainer');
        if (container) container.style.display = e.target.checked ? 'block' : 'none';
    }

    autoFillUserData() {
        if (this.dashboard.user) {
            const nombreField = document.getElementById('solicitanteNombre');
            const emailField = document.getElementById('solicitanteEmail');
            const dniField = document.getElementById('solicitanteDni');
            if (nombreField) nombreField.value = this.dashboard.user.nombre || '';
            if (emailField) emailField.value = this.dashboard.user.email || '';
            if (dniField) dniField.value = this.dashboard.user.dni || '';
        }
    }

    resetFormSolicitud() {
        const form = document.getElementById('formSolicitud');
        if (form) {
            form.reset();
            const els = ['charCount', 'fileNamePrincipal', 'fileNameAnexos', 'anexosList'];
            els.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = id.includes('Count') ? '0' : id.includes('fileName') ? 'Ningún archivo' : ''; });
            const containers = ['otrosContainer', 'anexosContainer'];
            containers.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML && (el.style.display = 'none'); });
            this.autoFillUserData();
        }
    }

    async verDetalleSolicitud(solicitudId) {
        try {
            const response = await fetch(`/api/solicitudes/${solicitudId}`);
            const data = await response.json();
            
            if (!data.success) {
                this.dashboard.showError('Error cargando detalles de la solicitud');
                return;
            }
            
            const solicitud = data.data;
            
            // Modal de detalle completo
            let detailModal = document.getElementById('modalDetalleSolicitud');
            if (!detailModal) {
                detailModal = document.createElement('div');
                detailModal.id = 'modalDetalleSolicitud';
                detailModal.className = 'modal-overlay';
                document.body.appendChild(detailModal);
            }

            const documentos = solicitud.documentos ? (Array.isArray(solicitud.documentos) ? solicitud.documentos : JSON.parse(solicitud.documentos)) : [];

            detailModal.innerHTML = `
                <div class="modal-content glass-panel" style="max-width: 800px;">
                    <div class="modal-header">
                        <span class="text-gold">Detalle de Solicitud #${solicitud.id}</span>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <!-- Información General -->
                        <div style="background: rgba(212, 175, 55, 0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--color-primary);">📋 Información General</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div><strong>Fecha:</strong><br>${new Date(solicitud.fecha || solicitud.fecha_creacion).toLocaleString('es-ES')}</div>
                                <div><strong>Estado:</strong><br><span class="status-badge ${this.getStatusClass(solicitud.estado)}">${solicitud.estado}</span></div>
                                <div><strong>Tipo:</strong><br>${solicitud.tipo}</div>
                                <div><strong>Prioridad:</strong><br>${solicitud.prioridad || 'Normal'}</div>
                            </div>
                        </div>

                        <!-- Solicitante -->
                        <div style="background: rgba(0, 0, 0, 0.03); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--color-primary);">👤 Solicitante</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div><strong>Nombre:</strong><br>${solicitud.nombre || 'N/A'}</div>
                                <div><strong>DNI/RUC:</strong><br>${solicitud.dni || 'N/A'}</div>
                                <div><strong>Email:</strong><br>${solicitud.email || 'N/A'}</div>
                                <div><strong>Teléfono:</strong><br>${solicitud.telefono || 'N/A'}</div>
                                <div><strong>Casilla Electrónica:</strong><br>${solicitud.casilla_electronica || 'N/A'}</div>
                            </div>
                        </div>

                        <!-- Demandado -->
                        ${solicitud.demandado_nombre ? `
                        <div style="background: rgba(0, 0, 0, 0.03); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--color-primary);">⚖️ Demandado / Contraparte</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div><strong>Nombre:</strong><br>${solicitud.demandado_nombre || 'N/A'}</div>
                                <div><strong>DNI/RUC:</strong><br>${solicitud.demandado_dni || 'N/A'}</div>
                                <div><strong>Email:</strong><br>${solicitud.demandado_email || 'N/A'}</div>
                            </div>
                        </div>
                        ` : ''}

                        <!-- Asunto y Descripción -->
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 10px 0; color: var(--color-primary);">📝 Detalles de la Solicitud</h4>
                            <div style="margin-bottom: 10px;"><strong>Asunto:</strong><br>${solicitud.asunto || 'N/A'}</div>
                            <div><strong>Descripción:</strong><br>${solicitud.descripcion || 'Sin descripción'}</div>
                        </div>

                        <!-- Documentos -->
                        ${documentos.length > 0 ? `
                        <div style="background: rgba(212, 175, 55, 0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--color-primary);">📎 Documentos Adjuntos (${documentos.length})</h4>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                                ${documentos.map(doc => `
                                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 8px;">
                                        <span style="font-size: 18px;">${doc.tipo === 'principal' ? '📄' : '📎'}</span>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; font-size: 12px;">${doc.nombre_original || doc.nombre}</div>
                                            <div style="font-size: 10px; color: #666;">${doc.tipo ? doc.tipo.toUpperCase() : 'ANEXO'} • ${(doc.tamano / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                        <a href="/uploads/${doc.nombre_archivo}" target="_blank" style="padding: 6px 12px; background: var(--color-primary); color: white; border-radius: 6px; text-decoration: none; font-size: 11px;">Descargar</a>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Información del Expediente (si está vinculado) -->
                        ${solicitud.numero_expediente ? `
                        <div style="background: rgba(0, 0, 0, 0.03); padding: 15px; border-radius: 12px; margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--color-primary);">🏛️ Expediente Vinculado</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div><strong>Número:</strong><br>${solicitud.numero_expediente}</div>
                                <div><strong>Sede:</strong><br>${solicitud.sede || 'N/A'}</div>
                                <div><strong>Especialidad:</strong><br>${solicitud.especialidad || 'N/A'}</div>
                                <div><strong>Materia:</strong><br>${solicitud.materia || 'N/A'}</div>
                            </div>
                        </div>
                        ` : ''}

                        <div style="text-align: center; margin-top: 20px;">
                            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').classList.remove('active')">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            detailModal.classList.add('active');
        } catch (error) {
            console.error('Error cargando detalle de solicitud:', error);
            this.dashboard.showError('Error cargando detalles de la solicitud');
        }
    }
}

window.verDetalleSolicitud = (id) => window.dashboardApp.modules.solicitudes?.verDetalleSolicitud(id);