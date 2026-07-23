/**
 * Mesa de Partes Module
 * Handles all mesa de partes functionality
 */

class MesaPartesModule {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.documentos = [];
        this.currentFilters = {};

        console.log('📂 Mesa de Partes Module Initialized');
        this.init();
    }

    /**
     * Initialize mesa de partes module
     */
    async init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for mesa de partes
     */
    setupEventListeners() {
        // Presentar documento button
        const presentarBtn = document.querySelector('[onclick*="presentarDocumento"]');
        if (presentarBtn) {
            presentarBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.presentarDocumento();
            });
        }

        // File upload for mesa de partes
        const fileInput = document.getElementById('mesa-file-upload');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
    }

    /**
     * Load mesa de partes data
     */
    async loadMesaPartesData() {
        try {
            // Load documentos presentados
            await this.loadDocumentosPresentados();
        } catch (error) {
            console.error('Error loading mesa de partes data:', error);
        }
    }

    /**
     * Load documentos presentados (Mesa de Partes)
     */
    async loadDocumentosPresentados() {
        try {
            const usuarioId = sessionStorage.getItem('userId') || '1';

            console.log('📂 Cargando presentaciones de Mesa de Partes para usuario:', usuarioId);

            // Get presentaciones from mesa-partes
            const response = await fetch(`/api/mesa-partes?usuario_id=${usuarioId}`);
            const data = await response.json();

            console.log('📦 Presentaciones recibidas:', data);

            if (data.success) {
                this.documentos = data.data || [];
                this.mostrarDocumentosPresentados(this.documentos);
            } else {
                throw new Error(data.error || 'Error loading documentos');
            }
        } catch (error) {
            console.error('❌ Error loading documentos presentados:', error);
            this.mostrarDocumentosPresentados([]);
        }
    }

    /**
     * Display documentos presentados (Mesa de Partes)
     */
    mostrarDocumentosPresentados(documentos) {
        const tableBody = document.querySelector('#mesa-tbody');
        
        // Si el DOM no está listo (sucede durante la inicialización rápida), reintentar
        if (!tableBody) {
            console.log('⏳ DOM de Mesa de Partes no listo, reintentando renderizado...');
            setTimeout(() => this.mostrarDocumentosPresentados(documentos), 500);
            return;
        }

        if (!documentos || documentos.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #666; padding: 40px;">
                        No hay presentaciones registradas
                    </td>
                </tr>
            `;
            return;
        }

        console.log('📋 Mostrando', documentos.length, 'presentaciones');

        tableBody.innerHTML = documentos.map(doc => {
            const fecha = new Date(doc.fecha_presentacion).toLocaleDateString('es-ES');
            const estadoClass = `status-${(doc.estado || 'pendiente').toLowerCase().replace(' ', '-')}`;

            return `
                <tr style="transition: background 0.2s;" 
                    onmouseover="this.style.background='rgba(192,192,192,0.05)'" 
                    onmouseout="this.style.background='transparent'">
                    <td>${doc.numero_registro || 'N/A'}</td>
                    <td>${doc.materia || doc.tipo_presentacion || 'Documento'}</td>
                    <td>${fecha}</td>
                    <td><span class="status-badge ${estadoClass}">${doc.estado || 'Pendiente'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="mesaPartesModule.verDetalle('${doc.id}')" title="Ver detalles">
                            👁️ Ver Detalle
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Ver detalle de presentación
     */
    async verDetalle(id) {
        try {
            console.log('🔍 Cargando detalle de presentación:', id);

            const response = await fetch(`/api/mesa-partes/${id}`);
            const data = await response.json();

            if (data.success) {
                this.mostrarModalDetalle(data.data);
            } else {
                throw new Error(data.error || 'Error cargando detalle');
            }
        } catch (error) {
            console.error('❌ Error cargando detalle:', error);
            alert('Error al cargar el detalle de la presentación');
        }
    }

    /**
     * Mostrar modal con detalle de presentación
     */
    mostrarModalDetalle(presentacion) {
        // Eliminar modal anterior si existe
        const anterior = document.getElementById('modalDetalleMesaPartes');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'modalDetalleMesaPartes';

        const dem  = presentacion.demandante || {};
        const ddo  = presentacion.demandado  || {};
        const docs = presentacion.documentos || [];
        const cerrar = `this.closest('.modal-overlay').remove(); document.body.style.overflow='';`;

        const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
        const fmtSize  = (b) => b ? (b >= 1048576 ? (b/1048576).toFixed(1)+' MB' : (b/1024).toFixed(1)+' KB') : '';

        // Badge de estado
        const estadoColors = { pendiente:'#f59e0b', 'en revisión':'#3b82f6', aprobado:'#10b981', rechazado:'#ef4444' };
        const estadoKey = (presentacion.estado||'').toLowerCase();
        const estadoColor = estadoColors[estadoKey] || '#6b7280';

        // Fila de campo (solo si tiene valor)
        const campo = (label, val) => val && val !== 'N/A' ? `
            <div style="display:flex;flex-direction:column;gap:3px;">
                <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">${label}</span>
                <span style="font-size:14px;font-weight:600;color:#111827;">${val}</span>
            </div>` : '';

        // Sección con título
        const seccion = (icono, titulo, contenido) => `
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;
                            margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;">
                    <span>${icono}</span><span>${titulo}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${contenido}</div>
            </div>`;

        modal.innerHTML = `
            <div class="modal-content" style="max-width:780px;border-radius:20px;overflow:hidden;">
                <!-- Header -->
                <div class="modal-header" style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
                    <div style="display:flex;flex-direction:column;gap:2px;">
                        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Mesa de Partes Virtual</span>
                        <span style="font-size:16px;font-weight:800;color:#d97706;">${presentacion.numero_registro}</span>
                    </div>
                    <button class="modal-close" onclick="${cerrar}">&times;</button>
                </div>

                <div class="modal-body" style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow-y:auto;">

                    <!-- Resumen rápido -->
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                        <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fde68a;border-radius:14px;padding:14px 16px;">
                            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:5px;">Tipo</div>
                            <div style="font-size:13px;font-weight:700;color:#b45309;">${presentacion.tipo_presentacion || '—'}</div>
                        </div>
                        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;">
                            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:5px;">Materia</div>
                            <div style="font-size:13px;font-weight:700;color:#111827;">${presentacion.materia || '—'}</div>
                        </div>
                        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:14px 16px;">
                            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin-bottom:5px;">Estado</div>
                            <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;
                                         background:${estadoColor}18;color:${estadoColor};border:1px solid ${estadoColor}30;">
                                <span style="width:6px;height:6px;border-radius:50%;background:${estadoColor};display:inline-block;"></span>
                                ${presentacion.estado || 'Pendiente'}
                            </span>
                        </div>
                    </div>

                    <!-- Fecha -->
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 16px;
                                font-size:13px;color:#6b7280;display:flex;align-items:center;gap:8px;">
                        🕐 <strong style="color:#374151;">Fecha de presentación:</strong>&nbsp;${fmtFecha(presentacion.fecha_presentacion)}
                    </div>

                    <!-- Demandante -->
                    ${seccion('👤', 'Demandante',
                        campo('Nombre', dem.nombre || dem.razon_social) +
                        campo('Documento', dem.documento_tipo && dem.documento_numero ? `${dem.documento_tipo} ${dem.documento_numero}` : (dem.documento_numero || null)) +
                        campo('Correo', dem.correo) +
                        campo('Teléfono', dem.telefono)
                    )}

                    <!-- Demandado (solo si tiene datos reales) -->
                    ${(ddo.nombre || ddo.razon_social) ? seccion('⚖️', 'Demandado',
                        campo('Nombre', ddo.nombre || ddo.razon_social) +
                        campo('Documento', ddo.documento_tipo && ddo.documento_numero ? `${ddo.documento_tipo} ${ddo.documento_numero}` : (ddo.documento_numero || null)) +
                        campo('Correo', ddo.correo) +
                        campo('Teléfono', ddo.telefono)
                    ) : ''}

                    <!-- Sumilla -->
                    ${presentacion.sumilla ? `
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px 20px;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:8px;">📝 Sumilla</div>
                        <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;">${presentacion.sumilla}</p>
                    </div>` : ''}

                    <!-- Documentos -->
                    ${docs.length > 0 ? `
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;
                                    margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;">
                            📎 Documentos Adjuntos <span style="background:#e5e7eb;color:#374151;padding:2px 8px;border-radius:20px;font-size:11px;">${docs.length}</span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            ${docs.map((doc, i) => `
                            <div style="display:flex;justify-content:space-between;align-items:center;
                                        background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px 16px;">
                                <div style="display:flex;align-items:center;gap:12px;">
                                    <div style="width:36px;height:36px;background:#fee2e2;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">📄</div>
                                    <div>
                                        <div style="font-size:13px;font-weight:600;color:#111827;max-width:380px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                                            ${i+1}. ${doc.nombre_original || 'Documento'}
                                        </div>
                                        ${doc.tamano ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px;">${fmtSize(doc.tamano)}</div>` : ''}
                                    </div>
                                </div>
                                <a href="/uploads/mesa-partes/${doc.nombre_archivo}" target="_blank"
                                   style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
                                          background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;
                                          border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;
                                          text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;">
                                    ⬇ Descargar
                                </a>
                            </div>`).join('')}
                        </div>
                    </div>` : ''}

                    <!-- Observaciones -->
                    ${presentacion.observaciones ? `
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 20px;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;margin-bottom:8px;">💬 Observaciones</div>
                        <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;">${presentacion.observaciones}</p>
                    </div>` : ''}

                </div>

                <!-- Footer -->
                <div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                    <button onclick="${cerrar}"
                        style="padding:10px 28px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:10px;
                               font-size:13px;font-weight:600;color:#374151;cursor:pointer;transition:all 0.2s;"
                        onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        // Cerrar al click en el overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
        });
    }

    /**
     * Presentar documento
     */
    presentarDocumento() {
        // Show file upload interface
        this.showDocumentoModal();
    }

    /**
     * Show documento modal
     */
    showDocumentoModal() {
        // Create or show modal for document presentation
        let modal = document.getElementById('modalPresentarDocumento');

        if (!modal) {
            modal = this.createDocumentoModal();
            document.body.appendChild(modal);
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Create documento modal
     */
    createDocumentoModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modalPresentarDocumento';

        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width: 850px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, transparent 100%); flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 40px; height: 40px; background: var(--color-primary); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📤</div>
                        <div>
                            <h2 style="margin: 0; font-family: var(--font-title); font-size: 18px; color: var(--color-primary);">Nueva Presentación Procesal</h2>
                            <p style="margin: 0; font-size: 12px; color: var(--color-text-muted);">Mesa de Partes Virtual - TMARC</p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="closeAllModals()">×</button>
                </div>

                <form id="formMesaPartes" style="padding: 24px 28px; overflow-y: auto; flex: 1;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">

                        <!-- Columna 1: Datos del Presentante -->
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-primary);">👤 Datos del Presentante</h4>

                            <div class="form-group">
                                <label class="stat-label">Nombre Completo / Razón Social</label>
                                <input type="text" id="mesaNombre" class="form-input" placeholder="Ej. Juan Pérez o Empresa S.A.C" required>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div class="form-group">
                                    <label class="stat-label">DNI / RUC</label>
                                    <input type="text" id="mesaDni" class="form-input" placeholder="00000000" required>
                                </div>
                                <div class="form-group">
                                    <label class="stat-label">Teléfono</label>
                                    <input type="tel" id="mesaTelefono" class="form-input" placeholder="+51 900...">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="stat-label">Correo Electrónico</label>
                                <input type="email" id="mesaEmail" class="form-input" placeholder="usuario@ejemplo.com">
                            </div>

                            <div class="form-group">
                                <label class="stat-label">Nombre del Demandado / Contraparte</label>
                                <input type="text" id="mesaDemandadoNombre" class="form-input" placeholder="Nombre o razón social">
                            </div>

                            <div class="form-group">
                                <label class="stat-label">DNI / RUC del Demandado</label>
                                <input type="text" id="mesaDemandadoDni" class="form-input" placeholder="00000000">
                            </div>
                        </div>

                        <!-- Columna 2: Detalle del Documento -->
                        <div style="display: flex; flex-direction: column; gap: 14px;">
                            <h4 style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--color-primary);">⚖️ Detalle del Documento</h4>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div class="form-group">
                                    <label class="stat-label">Tipo de Presentación</label>
                                    <select id="tipoDocumentoMesa" class="form-select">
                                        <option value="ARBITRAJE">Arbitraje</option>
                                        <option value="JUNTA DE PREVENCION">Junta de Prevención y Resolución de Disputas</option>
                                        <option value="CONCILIACION">Conciliación Extrajudicial</option>
                                        <option value="ARBITRAJE DE EMERGENCIA">Arbitraje de Emergencia</option>
                                        <option value="ARBITRAJE EXPRESS">Arbitraje Express</option>
                                        <option value="ARBITRAJE ENTRE PRIVADOS">Arbitraje entre Privados</option>
                                        <option value="CENTRO DE FORMACION">Centro de Formación y Capacitación</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="stat-label">Cuantía (S/.) <span style="opacity:0.5; font-size:10px;">Opcional</span></label>
                                    <input type="number" id="mesaCuantia" class="form-input" placeholder="0.00" min="0" step="0.01">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="stat-label">Asunto / Sumilla *</label>
                                <input type="text" id="mesaAsunto" class="form-input" placeholder="Ej. Presentación de Escrito Nº 01" maxlength="150" required>
                            </div>

                            <div class="form-group">
                                <label class="stat-label">Descripción Detallada</label>
                                <textarea id="descripcionMesa" class="form-input" style="min-height: 80px; resize: none;" placeholder="Describa el contenido del documento..."></textarea>
                            </div>

                            <div class="form-group">
                                <label class="stat-label">📄 Documento Principal (PDF, Word, etc.)</label>
                                <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('fileMesa').click()" style="padding: 8px 16px; font-size: 12px; flex-shrink: 0;">Seleccionar Archivo</button>
                                    <span id="fileNameMesa" class="text-muted" style="font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Ningún archivo seleccionado</span>
                                    <input type="file" id="fileMesa" style="display: none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Botones siempre visibles al final del form -->
                    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; gap: 12px;">
                        <button type="button" class="btn btn-secondary" onclick="closeAllModals()" style="padding: 11px 24px;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="padding: 11px 36px; font-weight: 600;">🚀 Presentar Documento</button>
                    </div>
                </form>
            </div>
        `;

        // File input display
        const input = modal.querySelector('#fileMesa');
        const nameSpan = modal.querySelector('#fileNameMesa');
        input.onchange = (e) => {
            nameSpan.textContent = e.target.files.length > 0 ? e.target.files[0].name : 'Ningún archivo seleccionado';
        };

        // Form submit
        const form = modal.querySelector('#formMesaPartes');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            window.mesaPartesModule.submitDocumento();
        });

        // Auto-fill con datos del usuario
        setTimeout(() => {
            const emailInput = modal.querySelector('#mesaEmail');
            const nombreInput = modal.querySelector('#mesaNombre');
            if (emailInput && !emailInput.value) emailInput.value = sessionStorage.getItem('userEmail') || '';
            if (nombreInput && !nombreInput.value) nombreInput.value = sessionStorage.getItem('userName') || '';
        }, 100);

        return modal;
    }

    /**
     * Submit documento
     */
    async submitDocumento() {
        const tipo        = document.getElementById('tipoDocumentoMesa')?.value;
        const nombre      = document.getElementById('mesaNombre')?.value?.trim();
        const dni         = document.getElementById('mesaDni')?.value?.trim();
        const telefono    = document.getElementById('mesaTelefono')?.value?.trim() || '';
        const email       = document.getElementById('mesaEmail')?.value?.trim() || '';
        const asunto      = document.getElementById('mesaAsunto')?.value?.trim();
        const descripcion = document.getElementById('descripcionMesa')?.value?.trim() || '';
        const cuantia     = document.getElementById('mesaCuantia')?.value || null;
        const demNombre   = document.getElementById('mesaDemandadoNombre')?.value?.trim() || 'N/A';
        const demDni      = document.getElementById('mesaDemandadoDni')?.value?.trim() || '';
        const fileInput   = document.getElementById('fileMesa');

        if (!tipo || !nombre || !dni || !asunto) {
            this.dashboard.showError('Por favor, complete los campos obligatorios: Nombre, DNI, Tipo y Asunto.');
            return;
        }

        if (!fileInput?.files[0]) {
            this.dashboard.showError('Por favor, seleccione el documento a presentar.');
            return;
        }

        const btn = document.querySelector('#formMesaPartes button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

        try {
            const usuarioId = sessionStorage.getItem('userId');
            if (!usuarioId) { this.dashboard.showError('Error: No se encontró el ID de usuario'); return; }

            const formData = new FormData();
            formData.append('usuario_id', usuarioId);
            formData.append('tipo_presentacion', tipo);
            formData.append('materia', asunto);
            formData.append('sumilla', descripcion || asunto);
            if (cuantia) formData.append('cuantia', cuantia);

            formData.append('demandante', JSON.stringify({
                nombre:           nombre,
                correo:           email,
                telefono:         telefono,
                documento_tipo:   'DNI',
                documento_numero: dni
            }));

            formData.append('demandado', JSON.stringify({
                nombre:           demNombre,
                documento_tipo:   'DNI',
                documento_numero: demDni
            }));

            formData.append('documentos', fileInput.files[0]);

            const response = await fetch('/api/mesa-partes', { method: 'POST', body: formData });
            const result   = await response.json();

            if (result.success) {
                this.dashboard.showSuccess('✅ Documento presentado correctamente.');
                this.closeDocumentoModal();
                await this.loadDocumentosPresentados();
            } else {
                throw new Error(result.error || 'Error presentando documento');
            }
        } catch (error) {
            console.error('❌ Error presentando documento:', error);
            this.dashboard.showError('Error presentando documento: ' + error.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🚀 Presentar Documento'; }
        }
    }

    /**
     * Close documento modal
     */
    closeDocumentoModal() {
        const modal = document.getElementById('modalPresentarDocumento');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Get mesa de partes statistics
     */
    getMesaPartesStats() {
        const total = this.documentos.length;
        const recibidos = this.documentos.filter(d => d.estado === 'Recibido').length;

        return { total, recibidos };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MesaPartesModule;
}