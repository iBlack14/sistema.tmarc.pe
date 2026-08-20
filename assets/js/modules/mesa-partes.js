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
                    <td data-label="Registro">${doc.numero_registro || 'N/A'}</td>
                    <td data-label="Materia">${doc.materia || doc.tipo_presentacion || 'Documento'}</td>
                    <td data-label="Fecha">${fecha}</td>
                    <td data-label="Estado"><span class="status-badge ${estadoClass}">${doc.estado || 'Pendiente'}</span></td>
                    <td data-label="Acciones">
                        <div style="display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end;">
                            <button class="btn btn-secondary btn-sm" onclick="mesaPartesModule.descargarCargo('${doc.id}')" title="Descargar cargo de recepción">📥 Cargo</button>
                            <button class="btn btn-primary btn-sm" onclick="mesaPartesModule.abrirAgregarInformacion('${doc.id}')" title="Agregar información o documentos">＋ Agregar</button>
                            <button class="btn btn-secondary btn-sm" onclick="mesaPartesModule.verDetalle('${doc.id}')" title="Ver detalles">👁️ Ver detalle</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    abrirAgregarInformacion(presentacionId) {
        document.getElementById('modalAgregarInfoMesa')?.remove();
        const fecha = new Date();
        const hoy = `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}-${String(fecha.getDate()).padStart(2,'0')}`;
        const modal = document.createElement('div');
        modal.id = 'modalAgregarInfoMesa';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `<div class="modal-content glass-panel" style="max-width:720px;border-radius:18px;overflow:hidden;"><div class="modal-header" style="padding:20px 24px;"><div><strong style="display:block;color:var(--color-primary);">Agregar información o documentos</strong><small style="color:var(--color-text-muted);">Mesa de Partes · ${presentacionId}</small></div><button class="modal-close" type="button" onclick="document.getElementById('modalAgregarInfoMesa').remove();document.body.style.overflow=''">×</button></div><div class="modal-body" style="padding:24px;"><form id="formAgregarInfoMesa"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div class="form-group"><label class="stat-label">Fecha del documento *</label><input type="date" id="mesa-info-fecha" class="form-input" value="${hoy}" required></div><div class="form-group"><label class="stat-label">Tipo de información *</label><select id="mesa-info-tipo" class="form-select" required><option value="">Seleccionar</option><option value="ESCRITO">Escrito</option><option value="CARTA">Carta</option><option value="INFORME">Informe</option><option value="SUBSANACION">Subsanación</option><option value="ANEXO">Anexo</option><option value="OTRO">Otro</option></select></div><div class="form-group"><label class="stat-label">Número del documento</label><input type="text" id="mesa-info-numero" class="form-input" maxlength="60" placeholder="Ej. Escrito N.° 02"></div><div class="form-group"><label class="stat-label">Presentado por</label><input type="text" id="mesa-info-presentado" class="form-input" maxlength="150" placeholder="Nombre o razón social"></div></div><div class="form-group" style="margin-top:16px;"><label class="stat-label">Asunto</label><input type="text" id="mesa-info-asunto" class="form-input" maxlength="200" placeholder="Asunto de la presentación"></div><div class="form-group" style="margin-top:16px;"><label class="stat-label">Información adicional</label><textarea id="mesa-info-sumilla" class="form-input" rows="4" maxlength="1000" placeholder="Detalle o descripción"></textarea></div><div class="form-group" style="margin-top:16px;padding:16px;border:1px dashed var(--color-primary);border-radius:12px;"><label class="stat-label">Documento adjunto (opcional)</label><input type="file" id="mesa-info-documento" class="form-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"></div><div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;"><button type="button" class="btn btn-secondary" onclick="document.getElementById('modalAgregarInfoMesa').remove();document.body.style.overflow=''">Cancelar</button><button type="submit" id="btnAgregarInfoMesa" class="btn btn-primary">Guardar información</button></div></form></div></div>`;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.getElementById('formAgregarInfoMesa').addEventListener('submit', event => this.guardarInformacion(event, presentacionId));
    }

    async guardarInformacion(event, presentacionId) {
        event.preventDefault();
        const button = document.getElementById('btnAgregarInfoMesa');
        const original = button.textContent;
        const data = new FormData();
        data.append('fecha_documento', document.getElementById('mesa-info-fecha').value);
        data.append('tipo_documento', document.getElementById('mesa-info-tipo').value);
        data.append('numero_documento', document.getElementById('mesa-info-numero').value.trim());
        data.append('presentado_por', document.getElementById('mesa-info-presentado').value.trim());
        data.append('asunto', document.getElementById('mesa-info-asunto').value.trim());
        data.append('sumilla', document.getElementById('mesa-info-sumilla').value.trim());
        data.append('creado_por', sessionStorage.getItem('userId') || '');
        const archivo = document.getElementById('mesa-info-documento').files[0];
        const datosConstancia = {
            fecha: document.getElementById('mesa-info-fecha').value,
            tipo: document.getElementById('mesa-info-tipo').value,
            numero: document.getElementById('mesa-info-numero').value.trim(),
            presentadoPor: document.getElementById('mesa-info-presentado').value.trim(),
            asunto: document.getElementById('mesa-info-asunto').value.trim(),
            detalle: document.getElementById('mesa-info-sumilla').value.trim(),
            archivo: archivo?.name || ''
        };
        if (archivo) data.append('documento', archivo);
        try {
            button.disabled = true; button.textContent = 'Guardando...';
            const response = await fetch(`/api/mesa-partes/${encodeURIComponent(presentacionId)}/timeline`, { method:'POST', body:data });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo guardar la información');
            document.getElementById('modalAgregarInfoMesa')?.remove(); document.body.style.overflow = '';
            const numeroConstancia = `CONST-${presentacionId}-${String(result.data.id).padStart(4, '0')}`;
            const cargo = {
                expediente: presentacionId,
                numero_constancia: numeroConstancia,
                titulo: 'CONSTANCIA DE ENVÍO DE INFORMACIÓN',
                solicitante: datosConstancia.presentadoPor || sessionStorage.getItem('userName') || 'Usuario TMARC',
                fecha: new Date().toLocaleString('es-PE'),
                folios: datosConstancia.archivo ? `1 archivo: ${datosConstancia.archivo}` : 'Sin archivo adjunto',
                tipo_servicio: datosConstancia.tipo,
                asunto: datosConstancia.asunto || datosConstancia.detalle || 'Información adicional'
            };
            const correoEnviado = await window.expedientesModule?.enviarConstanciaCorreo?.(presentacionId, numeroConstancia, datosConstancia) || false;
            const confirmacion = await Swal.fire({
                title: 'Información recibida',
                html: `<strong>${this.escaparHtml(numeroConstancia)}</strong><br>Registrada en el historial de la presentación.<br><small>${correoEnviado ? 'La constancia fue enviada a su correo.' : 'Puede descargar su constancia ahora.'}</small>`,
                icon: 'success',
                confirmButtonText: '📥 Descargar constancia',
                denyButtonText: '🖨️ Imprimir',
                showDenyButton: true,
                showCancelButton: true,
                cancelButtonText: 'Cerrar',
                confirmButtonColor: '#D4AF37',
                denyButtonColor: '#111827'
            });
            if (confirmacion.isConfirmed) await window.CargoGenerator.descargar(cargo);
            if (confirmacion.isDenied) window.CargoGenerator.imprimir(cargo);
        } catch (error) {
            Swal.fire({title:'No se pudo guardar',text:error.message,icon:'error',confirmButtonColor:'#D4AF37'});
        } finally { button.disabled=false; button.textContent=original; }
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
                                        ${(doc.pagina_fin || doc.folios || doc.descripcion) ? `<div style="font-size:10px;color:#6b7280;margin-top:3px;">${doc.pagina_fin ? `Página fin: ${doc.pagina_fin}` : ''}${doc.folios ? ` · Folios: ${doc.folios}` : ''}${doc.descripcion ? ` · ${this.escaparHtml(doc.descripcion)}` : ''}</div>` : ''}
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

                    <!-- Información y documentos agregados posteriormente -->
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:18px 20px;">
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;
                                    margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #fde68a;">
                            📚 Historial de información agregada
                        </div>
                        <div id="mesa-info-agregada-usuario" style="display:flex;flex-direction:column;gap:10px;">
                            <div style="padding:14px;text-align:center;color:#92400e;">Cargando historial...</div>
                        </div>
                    </div>

                    <!-- Observaciones -->
                    ${presentacion.observaciones ? `
                    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px 20px;">
                        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#166534;margin-bottom:8px;">💬 Observaciones</div>
                        <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;">${presentacion.observaciones}</p>
                    </div>` : ''}

                </div>

                <!-- Footer -->
                <div style="padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
                    <button onclick="mesaPartesModule.descargarCargo('${presentacion.id}')"
                        style="padding:10px 20px;background:#d4af37;border:1px solid #c49e28;border-radius:10px;font-size:13px;font-weight:700;color:#111827;cursor:pointer;">
                        📥 Descargar cargo
                    </button>
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
        this.cargarInformacionAgregadaDetalle(presentacion.id || presentacion.numero_registro);

        // Cerrar al click en el overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
        });
    }

    async cargarInformacionAgregadaDetalle(id) {
        const container = document.getElementById('mesa-info-agregada-usuario');
        if (!container) return;

        try {
            const response = await fetch(`/api/mesa-partes/${encodeURIComponent(id)}/timeline`);
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo cargar el historial');
            }

            const movimientos = Array.isArray(result.data) ? result.data.slice().reverse() : [];
            if (!movimientos.length) {
                container.innerHTML = '<div style="padding:14px;text-align:center;color:#78716c;border:1px dashed #d6d3d1;border-radius:10px;background:#fff;">Todavía no se agregó información adicional.</div>';
                return;
            }

            container.innerHTML = movimientos.map(movimiento => {
                const fechaValor = `${movimiento.fecha_documento || ''}`.slice(0, 10);
                const fecha = fechaValor
                    ? new Date(`${fechaValor}T12:00:00`).toLocaleDateString('es-PE')
                    : 'Sin fecha';
                const hora = movimiento.fecha_creacion
                    ? new Date(movimiento.fecha_creacion).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true })
                    : '';
                const rutaDocumento = movimiento.documento_ruta ||
                    (movimiento.documento_archivo ? `/uploads/timeline/${movimiento.documento_archivo}` : '');
                const adjunto = rutaDocumento ? `
                    <a href="${this.escaparHtml(rutaDocumento)}" target="_blank" rel="noopener"
                       style="display:inline-flex;align-items:center;gap:6px;padding:7px 11px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">
                        📎 ${this.escaparHtml(movimiento.documento_nombre || 'Ver archivo')}
                    </a>` : '<span style="font-size:11px;color:#9ca3af;">Sin archivo adjunto</span>';

                return `
                    <div style="padding:14px;background:#fff;border:1px solid #fde68a;border-left:4px solid #d4af37;border-radius:11px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                            <div>
                                <strong style="display:block;font-size:12px;color:#111827;text-transform:uppercase;">${this.escaparHtml(movimiento.tipo_documento || 'Información')}</strong>
                                <span style="font-size:11px;color:#78716c;">${fecha}${hora ? ` · ${hora}` : ''}${movimiento.numero_documento ? ` · N.° ${this.escaparHtml(movimiento.numero_documento)}` : ''}</span>
                            </div>
                            ${adjunto}
                        </div>
                        ${movimiento.asunto ? `<div style="margin-top:9px;font-size:13px;font-weight:700;color:#374151;">${this.escaparHtml(movimiento.asunto)}</div>` : ''}
                        ${movimiento.sumilla ? `<p style="margin:6px 0 0;font-size:12px;line-height:1.55;color:#57534e;white-space:pre-wrap;">${this.escaparHtml(movimiento.sumilla)}</p>` : ''}
                        ${movimiento.presentado_por ? `<div style="margin-top:8px;font-size:11px;color:#78716c;"><b>Presentado por:</b> ${this.escaparHtml(movimiento.presentado_por)}</div>` : ''}
                    </div>`;
            }).join('');
        } catch (error) {
            console.error('Error cargando historial de Mesa de Partes:', error);
            container.innerHTML = '<div style="padding:14px;color:#b91c1c;background:#fef2f2;border-radius:10px;">No se pudo cargar la información agregada. Intente nuevamente.</div>';
        }
    }

    escaparHtml(valor) {
        return String(valor ?? '').replace(/[&<>'"]/g, caracter => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[caracter]);
    }

    crearDatosCargo(presentacion) {
        const demandante = presentacion.demandante || {};
        const documentos = Array.isArray(presentacion.documentos) ? presentacion.documentos : [];
        const fechaBase = presentacion.fecha_presentacion || presentacion.created_at || new Date().toISOString();
        return {
            expediente: presentacion.numero_registro || presentacion.id || '',
            solicitante: demandante.nombre || demandante.razon_social || 'No especificado',
            fecha: new Date(fechaBase).toLocaleString('es-PE'),
            folios: documentos.length ? `${documentos.length} archivo(s)` : 'Sin archivo registrado',
            tipo_servicio: presentacion.tipo_presentacion || 'Mesa de Partes',
            asunto: presentacion.materia || presentacion.sumilla || '',
            token: ''
        };
    }

    async descargarCargo(id) {
        try {
            if (!window.CargoGenerator) throw new Error('El generador de cargos no está disponible');
            const response = await fetch(`/api/mesa-partes/${encodeURIComponent(id)}`);
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se encontró la presentación');
            await window.CargoGenerator.descargar(this.crearDatosCargo(result.data));
        } catch (error) {
            console.error('Error generando cargo:', error);
            this.dashboard.showError('No se pudo generar el cargo: ' + error.message);
        }
    }

    async mostrarCargoRecepcion(presentacion) {
        const datos = this.crearDatosCargo(presentacion);
        const respuesta = await Swal.fire({
            icon: 'success',
            title: 'Presentación registrada',
            html: `Su cargo está listo.<br><strong style="color:#b38600;">${this.escaparHtml(datos.expediente)}</strong>`,
            confirmButtonText: '📥 Descargar cargo',
            denyButtonText: '🖨️ Imprimir',
            showDenyButton: true,
            cancelButtonText: 'Cerrar',
            showCancelButton: true,
            confirmButtonColor: '#d4af37',
            denyButtonColor: '#111827'
        });
        if (respuesta.isConfirmed) await window.CargoGenerator.descargar(datos);
        if (respuesta.isDenied) window.CargoGenerator.imprimir(datos);
    }

    /**
     * Presentar documento
     */
    presentarDocumento(opciones = {}) {
        this.modoPresentacion = opciones.modo || 'mesa';
        this.servicioPreseleccionado = opciones.servicio || '';
        document.getElementById('modalPresentarDocumento')?.remove();
        this.showDocumentoModal();
    }

    mostrarFormularioInline() {
        const container = document.getElementById('mesa-formulario-inline');
        if (!container) return;
        this.modoPresentacion = 'mesa';
        this.servicioPreseleccionado = '';
        const estructura = this.createDocumentoModal();
        const contenido = estructura.querySelector('.modal-content');
        if (!contenido) return;
        contenido.querySelector('.modal-header')?.remove();
        contenido.style.maxWidth = '1100px';
        contenido.style.width = '100%';
        contenido.style.maxHeight = 'none';
        contenido.style.margin = '0 auto';
        contenido.style.boxShadow = '0 16px 40px rgba(0,0,0,.08)';
        const formulario = contenido.querySelector('#formMesaPartes');
        if (formulario) {
            formulario.style.overflowY = 'visible';
            formulario.style.maxHeight = 'none';
        }
        container.replaceChildren(contenido);
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
        const catalogo = window.solicitudesModule?.getServiceCatalog?.() || {};
        const servicio = catalogo[this.servicioPreseleccionado];
        const selector = modal.querySelector('#tipoDocumentoMesa');
        if (servicio && selector) selector.value = servicio.title;
        const titulo = modal.querySelector('[data-mesa-form-title]');
        const subtitulo = modal.querySelector('[data-mesa-form-subtitle]');
        if (titulo) titulo.textContent = this.modoPresentacion === 'solicitud_servicio' ? `Nueva solicitud: ${servicio?.title || 'TMARC'}` : 'Nueva Presentación Procesal';
        if (subtitulo) subtitulo.textContent = this.modoPresentacion === 'solicitud_servicio' ? 'Gestión de Solicitudes - SISTMARC' : 'Mesa de Partes Virtual - SISTMARC';
        const botonEnviar = modal.querySelector('#formMesaPartes > div:not(#mesaCamposAntiguos) button[type="submit"]');
        if (botonEnviar) botonEnviar.textContent = '🚀 Presentar documento';
    }

    /**
     * Create documento modal
     */
    createDocumentoModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modalPresentarDocumento';
        modal.dataset.preventOutsideClose = 'true';

        modal.innerHTML = `
            <div class="modal-content glass-panel" style="max-width: 850px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="padding: 20px 28px; background: linear-gradient(135deg, rgba(212,175,55,0.1) 0%, transparent 100%); flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 40px; height: 40px; background: var(--color-primary); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📤</div>
                        <div>
                            <h2 data-mesa-form-title style="margin: 0; font-family: var(--font-title); font-size: 18px; color: var(--color-primary);">Nueva Presentación Procesal</h2>
                            <p data-mesa-form-subtitle style="margin: 0; font-size: 12px; color: var(--color-text-muted);">Mesa de Partes Virtual - TMARC</p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="closeAllModals()">×</button>
                </div>

                <form id="formMesaPartes" style="padding:24px 28px;overflow-y:auto;flex:1;">
                    <style>
                        #formMesaPartes .mesa-seccion{border:1px solid #e5e7eb;border-radius:14px;margin-bottom:15px;overflow:hidden;background:#fff}
                        #formMesaPartes .mesa-seccion-titulo{padding:13px 16px;background:#fafafa;border-bottom:1px solid #e5e7eb;color:#9b7413;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.7px}
                        #formMesaPartes .mesa-seccion-cuerpo{padding:16px}.mesa-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.mesa-full{grid-column:1/-1}
                        #formMesaPartes .mesa-persona{display:flex;gap:18px;padding:10px 12px;margin-bottom:13px;background:#f8fafc;border-radius:10px;font-size:12px;font-weight:600}#formMesaPartes .mesa-persona input{accent-color:#d4af37}
                        #mesaArchivosTabla{width:100%;border-collapse:collapse;font-size:11px}#mesaArchivosTabla th,#mesaArchivosTabla td{padding:8px;border-bottom:1px solid #eee;text-align:left}#mesaArchivosTabla input{min-width:75px;padding:6px}#mesaCamposAntiguos,.mesa-botones-antiguos{display:none!important}
                        @media(max-width:700px){.mesa-form-grid{grid-template-columns:1fr}.mesa-full{grid-column:auto}#formMesaPartes{padding:14px!important}#mesaArchivosWrap{overflow-x:auto}}
                    </style>

                    <div class="mesa-seccion">
                        <div class="mesa-seccion-titulo">👤 1. Solicitante o demandante</div>
                        <div class="mesa-seccion-cuerpo">
                            <div class="mesa-persona"><label><input type="radio" name="mesaTipoDemandante" value="natural" checked onchange="mesaPartesModule.alternarPersonaMesa('demandante','natural')"> Persona natural</label><label><input type="radio" name="mesaTipoDemandante" value="juridica" onchange="mesaPartesModule.alternarPersonaMesa('demandante','juridica')"> Persona jurídica</label></div>
                            <div id="mesaDemandanteNatural" class="mesa-form-grid"><div class="form-group mesa-full"><label class="stat-label">Nombre completo *</label><input id="mesaNombre" class="form-input" required></div><div class="form-group"><label class="stat-label">Tipo de documento</label><select id="mesaDocTipo" class="form-select"><option>DNI</option><option>CE</option><option>RUC</option></select></div><div class="form-group"><label class="stat-label">Número de documento *</label><input id="mesaDni" class="form-input" inputmode="numeric" maxlength="11" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)" required></div></div>
                            <div id="mesaDemandanteJuridica" class="mesa-form-grid" style="display:none"><div class="form-group mesa-full"><label class="stat-label">Razón social *</label><input id="mesaRazonSocial" class="form-input"></div><div class="form-group"><label class="stat-label">RUC *</label><input id="mesaRuc" class="form-input" inputmode="numeric" maxlength="11" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)"></div><div class="form-group"><label class="stat-label">Representante / Apoderado</label><input id="mesaRepresentante" class="form-input"></div></div>
                            <div class="mesa-form-grid" style="margin-top:13px"><div class="form-group"><label class="stat-label">Correo electrónico *</label><input type="email" id="mesaEmail" class="form-input" required></div><div class="form-group"><label class="stat-label">Celular / WhatsApp</label><input type="tel" id="mesaTelefono" class="form-input" inputmode="numeric" maxlength="9" oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)"></div><div class="form-group mesa-full"><label class="stat-label">Dirección de domicilio</label><input id="mesaDomicilio" class="form-input" placeholder="Calle, número, distrito, provincia"></div></div>
                        </div>
                    </div>

                    <div class="mesa-seccion">
                        <div class="mesa-seccion-titulo">⚖️ 2. Datos de la otra parte o demandado</div>
                        <div class="mesa-seccion-cuerpo">
                            <div class="mesa-persona"><label><input type="radio" name="mesaTipoDemandado" value="natural" checked onchange="mesaPartesModule.alternarPersonaMesa('demandado','natural')"> Persona natural</label><label><input type="radio" name="mesaTipoDemandado" value="juridica" onchange="mesaPartesModule.alternarPersonaMesa('demandado','juridica')"> Persona jurídica</label></div>
                            <div id="mesaDemandadoNatural" class="mesa-form-grid"><div class="form-group mesa-full"><label class="stat-label">Nombre completo</label><input id="mesaDemandadoNombre" class="form-input"></div><div class="form-group"><label class="stat-label">Tipo de documento</label><select id="mesaDemandadoDocTipo" class="form-select"><option>DNI</option><option>CE</option><option>RUC</option></select></div><div class="form-group"><label class="stat-label">Número de documento</label><input id="mesaDemandadoDni" class="form-input" inputmode="numeric" maxlength="11" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)"></div></div>
                            <div id="mesaDemandadoJuridica" class="mesa-form-grid" style="display:none"><div class="form-group mesa-full"><label class="stat-label">Razón social</label><input id="mesaDemandadoRazon" class="form-input"></div><div class="form-group"><label class="stat-label">RUC</label><input id="mesaDemandadoRuc" class="form-input" inputmode="numeric" maxlength="11" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)"></div><div class="form-group"><label class="stat-label">Representante / Apoderado</label><input id="mesaDemandadoRepresentante" class="form-input"></div></div>
                            <div class="mesa-form-grid" style="margin-top:13px"><div class="form-group"><label class="stat-label">Correo electrónico</label><input type="email" id="mesaDemandadoEmail" class="form-input"></div><div class="form-group"><label class="stat-label">Celular / WhatsApp</label><input type="tel" id="mesaDemandadoTelefono" class="form-input" inputmode="numeric" maxlength="9" oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)"></div><div class="form-group mesa-full"><label class="stat-label">Dirección de domicilio</label><input id="mesaDemandadoDomicilio" class="form-input"></div></div>
                        </div>
                    </div>

                    <div class="mesa-seccion"><div class="mesa-seccion-titulo">📋 3. Detalles de la solicitud</div><div class="mesa-seccion-cuerpo"><div class="mesa-form-grid"><div class="form-group mesa-full"><label class="stat-label">Asunto *</label><input id="mesaAsunto" class="form-input" maxlength="150" required></div><div class="form-group"><label class="stat-label">Tipo de solicitud *</label><select id="tipoDocumentoMesa" class="form-select"><option value="Arbitraje">Arbitraje</option><option value="Junta de Prevención y Resolución de Disputas">Junta de Prevención y Resolución de Disputas</option><option value="Conciliación Extrajudicial">Conciliación Extrajudicial</option><option value="Arbitraje de Emergencia">Arbitraje de Emergencia</option><option value="Arbitraje Express">Arbitraje Express</option><option value="Arbitraje entre privados">Arbitraje entre privados</option><option value="Recusación">Recusación</option><option value="Centro de Formación y Capacitación">Centro de Formación y Capacitación</option><option value="Otro">Otro</option></select></div><div class="form-group"><label class="stat-label">Cuantía (S/) — opcional</label><input type="number" id="mesaCuantia" class="form-input" min="0" step="0.01"></div><div class="form-group mesa-full"><label class="stat-label">Descripción / Sumilla</label><textarea id="descripcionMesa" class="form-input" rows="4"></textarea></div></div></div></div>

                    <div class="mesa-seccion"><div class="mesa-seccion-titulo">📎 4. Anexos</div><div class="mesa-seccion-cuerpo"><div style="padding:14px;border:1px dashed #d4af37;border-radius:11px"><button type="button" class="btn btn-secondary" onclick="mesaPartesModule.getControlMesa('archivosMesa')?.click()">＋ Seleccionar archivos</button><span id="archivosMesaResumen" class="text-muted" style="font-size:11px;margin-left:10px">Ningún archivo seleccionado</span><input type="file" id="archivosMesa" multiple style="display:none" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div><small style="display:block;margin:8px 0;color:#777">Máximo 10 archivos. Complete la información de cada anexo.</small><div id="mesaArchivosWrap"><table id="mesaArchivosTabla"><thead><tr><th>#</th><th>Archivo</th><th>Página fin</th><th>Descripción</th><th>Folios</th><th>Peso</th><th></th></tr></thead><tbody id="mesaArchivosLista"><tr><td colspan="7" style="text-align:center;padding:20px;color:#888">No se han agregado archivos</td></tr></tbody></table></div><div style="margin-top:10px;text-align:right;font-size:12px;font-weight:700">Total: <span id="mesaPesoTotal">0 MB</span></div></div></div>

                    <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--glass-border);display:flex;justify-content:flex-end;gap:12px;flex-wrap:wrap"><button type="submit" class="btn btn-primary" style="padding:11px 36px;font-weight:600">🚀 Enviar solicitud</button></div>
                    <div id="mesaCamposAntiguos" style="display:none">
                        <!-- Campos antiguos retirados visualmente -->
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

                            <div class="form-group" style="padding:12px;border:1px dashed rgba(212,175,55,.65);border-radius:12px;background:rgba(212,175,55,.04);">
                                <label class="stat-label">📎 Anexos adicionales <span style="opacity:.6;font-size:10px;">(Opcional)</span></label>
                                <div style="display:flex;align-items:center;gap:10px;margin-top:7px;flex-wrap:wrap;">
                                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('anexosMesa').click()" style="padding:8px 16px;font-size:12px;">＋ Agregar anexos</button>
                                    <span id="anexosMesaResumen" class="text-muted" style="font-size:11px;">Ningún anexo seleccionado</span>
                                    <input type="file" id="anexosMesa" style="display:none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" multiple>
                                </div>
                                <div id="anexosMesaLista" style="display:flex;flex-direction:column;gap:5px;margin-top:9px;"></div>
                                <small style="display:block;margin-top:8px;color:var(--color-text-muted);font-size:10px;">Puede seleccionar varios archivos a la vez. Máximo 19 anexos.</small>
                            </div>
                        </div>
                    </div>

                    <!-- Botones antiguos -->
                    <div class="mesa-botones-antiguos" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; gap: 12px;">
                        <button type="button" class="btn btn-secondary" onclick="closeAllModals()" style="padding: 11px 24px;">Cancelar</button>
                        <button type="submit" class="btn btn-primary" style="padding: 11px 36px; font-weight: 600;">🚀 Presentar Documento</button>
                    </div>
                    </div>
                </form>
            </div>
        `;

        this.mesaArchivos = [];
        modal.querySelectorAll('#mesaCamposAntiguos input, #mesaCamposAntiguos select, #mesaCamposAntiguos textarea, #mesaCamposAntiguos button').forEach(control => control.disabled = true);
        const archivosInput = modal.querySelector('#archivosMesa');
        archivosInput.onchange = event => this.agregarArchivosMesa(event.target.files);

        // File input display
        const input = modal.querySelector('#fileMesa');
        const nameSpan = modal.querySelector('#fileNameMesa');
        input.onchange = (e) => {
            nameSpan.textContent = e.target.files.length > 0 ? e.target.files[0].name : 'Ningún archivo seleccionado';
        };

        const anexosInput = modal.querySelector('#anexosMesa');
        const anexosResumen = modal.querySelector('#anexosMesaResumen');
        const anexosLista = modal.querySelector('#anexosMesaLista');
        anexosInput.onchange = () => {
            if (anexosInput.files.length > 19) {
                anexosInput.value = '';
                anexosResumen.textContent = 'Ningún anexo seleccionado';
                anexosLista.innerHTML = '';
                this.dashboard.showError('Puede adjuntar como máximo 19 anexos.');
                return;
            }
            const archivos = Array.from(anexosInput.files);
            anexosResumen.textContent = archivos.length ? `${archivos.length} anexo(s) seleccionado(s)` : 'Ningún anexo seleccionado';
            anexosLista.innerHTML = archivos.map((archivo, indice) => `
                <div style="display:flex;align-items:center;gap:7px;padding:6px 9px;background:#fff;border:1px solid rgba(212,175,55,.25);border-radius:7px;font-size:11px;color:#374151;">
                    <span style="color:#b38600;font-weight:800;">${indice + 1}.</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escaparHtml(archivo.name)}</span>
                </div>`).join('');
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

    alternarPersonaMesa(rol, tipo) {
        const formulario = this.getFormularioMesaActivo();
        const prefijo = rol === 'demandante' ? 'mesaDemandante' : 'mesaDemandado';
        const natural = formulario?.querySelector(`#${prefijo}Natural`);
        const juridica = formulario?.querySelector(`#${prefijo}Juridica`);
        if (natural) natural.style.display = tipo === 'natural' ? 'grid' : 'none';
        if (juridica) juridica.style.display = tipo === 'juridica' ? 'grid' : 'none';
        natural?.querySelectorAll('input, select').forEach(control => control.disabled = tipo !== 'natural');
        juridica?.querySelectorAll('input, select').forEach(control => control.disabled = tipo !== 'juridica');
        if (rol === 'demandante') {
            const camposNaturales = [this.getControlMesa('mesaNombre'), this.getControlMesa('mesaDni')];
            const camposJuridicos = [this.getControlMesa('mesaRazonSocial'), this.getControlMesa('mesaRuc')];
            camposNaturales.forEach(control => { if (control) control.required = tipo === 'natural'; });
            camposJuridicos.forEach(control => { if (control) control.required = tipo === 'juridica'; });
        }
    }

    agregarArchivosMesa(fileList) {
        const nuevos = Array.from(fileList || []);
        if (this.mesaArchivos.length + nuevos.length > 10) {
            this.dashboard.showError('Puede adjuntar como máximo 10 archivos.');
            this.getControlMesa('archivosMesa').value = '';
            return;
        }
        nuevos.forEach(archivo => this.mesaArchivos.push({ archivo, paginaFin: 0, descripcion: '', folios: 0 }));
        this.getControlMesa('archivosMesa').value = '';
        this.renderizarArchivosMesa();
    }

    getFormularioMesaActivo() {
        return document.querySelector('#modalPresentarDocumento.active #formMesaPartes') ||
            document.querySelector('#mesa-formulario-inline #formMesaPartes');
    }

    getControlMesa(id) {
        return this.getFormularioMesaActivo()?.querySelector(`#${id}`) || null;
    }

    quitarArchivoMesa(indice) {
        this.mesaArchivos.splice(indice, 1);
        this.renderizarArchivosMesa();
    }

    actualizarMetaArchivoMesa(indice, campo, valor) {
        if (this.mesaArchivos[indice]) this.mesaArchivos[indice][campo] = valor;
    }

    renderizarArchivosMesa() {
        const lista = this.getControlMesa('mesaArchivosLista');
        const resumen = this.getControlMesa('archivosMesaResumen');
        const peso = this.getControlMesa('mesaPesoTotal');
        if (!lista) return;
        resumen.textContent = this.mesaArchivos.length ? `${this.mesaArchivos.length} archivo(s) seleccionado(s)` : 'Ningún archivo seleccionado';
        peso.textContent = `${(this.mesaArchivos.reduce((total, item) => total + item.archivo.size, 0) / 1048576).toFixed(2)} MB`;
        if (!this.mesaArchivos.length) {
            lista.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#888">No se han agregado archivos</td></tr>';
            return;
        }
        lista.innerHTML = this.mesaArchivos.map((item, indice) => `<tr><td>${indice + 1}</td><td style="font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${this.escaparHtml(item.archivo.name)}">${this.escaparHtml(item.archivo.name)}</td><td><input type="number" class="form-input" min="0" value="${item.paginaFin}" onchange="mesaPartesModule.actualizarMetaArchivoMesa(${indice},'paginaFin',this.value)"></td><td><input class="form-input" value="${this.escaparHtml(item.descripcion)}" placeholder="Descripción" onchange="mesaPartesModule.actualizarMetaArchivoMesa(${indice},'descripcion',this.value)"></td><td><input type="number" class="form-input" min="0" value="${item.folios}" onchange="mesaPartesModule.actualizarMetaArchivoMesa(${indice},'folios',this.value)"></td><td>${(item.archivo.size / 1048576).toFixed(2)} MB</td><td><button type="button" onclick="mesaPartesModule.quitarArchivoMesa(${indice})" style="border:0;background:none;color:#dc2626;cursor:pointer" title="Quitar archivo">✕</button></td></tr>`).join('');
    }

    /**
     * Submit documento
     */
    async submitDocumento() {
        const formulario = this.getFormularioMesaActivo();
        const tipo        = this.getControlMesa('tipoDocumentoMesa')?.value;
        const tipoDemandante = formulario?.querySelector('input[name="mesaTipoDemandante"]:checked')?.value || 'natural';
        const tipoDemandado = formulario?.querySelector('input[name="mesaTipoDemandado"]:checked')?.value || 'natural';
        const nombre      = (tipoDemandante === 'juridica' ? this.getControlMesa('mesaRazonSocial')?.value : this.getControlMesa('mesaNombre')?.value)?.trim();
        const dni         = (tipoDemandante === 'juridica' ? this.getControlMesa('mesaRuc')?.value : this.getControlMesa('mesaDni')?.value)?.trim();
        const telefono    = this.getControlMesa('mesaTelefono')?.value?.trim() || '';
        const email       = this.getControlMesa('mesaEmail')?.value?.trim() || '';
        const asunto      = this.getControlMesa('mesaAsunto')?.value?.trim();
        const descripcion = this.getControlMesa('descripcionMesa')?.value?.trim() || '';
        const cuantia     = this.getControlMesa('mesaCuantia')?.value || null;
        const demNombre   = (tipoDemandado === 'juridica' ? this.getControlMesa('mesaDemandadoRazon')?.value : this.getControlMesa('mesaDemandadoNombre')?.value)?.trim() || 'N/A';
        const demDni      = (tipoDemandado === 'juridica' ? this.getControlMesa('mesaDemandadoRuc')?.value : this.getControlMesa('mesaDemandadoDni')?.value)?.trim() || '';
        if (!tipo || !nombre || !dni || !asunto) {
            this.dashboard.showError('Por favor, complete los campos obligatorios: Nombre, DNI, Tipo y Asunto.');
            return;
        }

        if (!this.mesaArchivos?.length) {
            this.dashboard.showError('Por favor, adjunte al menos un documento.');
            return;
        }

        const btn = formulario?.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

        try {
            const usuarioId = sessionStorage.getItem('userId');
            if (!usuarioId) { this.dashboard.showError('Error: No se encontró el ID de usuario'); return; }

            const formData = new FormData();
            const demandante = {
                tipo_persona:     tipoDemandante,
                nombre:           nombre,
                correo:           email,
                telefono:         telefono,
                domicilio:        this.getControlMesa('mesaDomicilio')?.value?.trim() || '',
                representante:    tipoDemandante === 'juridica' ? this.getControlMesa('mesaRepresentante')?.value?.trim() || '' : '',
                documento_tipo:   tipoDemandante === 'juridica' ? 'RUC' : this.getControlMesa('mesaDocTipo')?.value,
                documento_numero: dni
            };

            const demandado = {
                tipo_persona:     tipoDemandado,
                nombre:           demNombre,
                documento_tipo:   tipoDemandado === 'juridica' ? 'RUC' : this.getControlMesa('mesaDemandadoDocTipo')?.value,
                documento_numero: demDni,
                representante:    tipoDemandado === 'juridica' ? this.getControlMesa('mesaDemandadoRepresentante')?.value?.trim() || '' : '',
                correo:           this.getControlMesa('mesaDemandadoEmail')?.value?.trim() || '',
                telefono:         this.getControlMesa('mesaDemandadoTelefono')?.value?.trim() || '',
                domicilio:        this.getControlMesa('mesaDemandadoDomicilio')?.value?.trim() || ''
            };

            formData.append('usuario_id', usuarioId);
            // Toda solicitud institucional es una presentación de Mesa de Partes.
            // No se crea un registro paralelo SOL/EXP.
            formData.append('tipo_presentacion', tipo);
            formData.append('materia', asunto);
            formData.append('sumilla', descripcion || asunto);
            if (cuantia) formData.append('cuantia', cuantia);
            formData.append('demandante', JSON.stringify(demandante));
            formData.append('demandado', JSON.stringify(demandado));
            this.mesaArchivos.forEach(item => formData.append('documentos', item.archivo));
            formData.append('documentos_metadata', JSON.stringify(this.mesaArchivos.map(item => ({ nombre: item.archivo.name, pagina_fin: item.paginaFin, descripcion: item.descripcion, folios: item.folios }))));

            const response = await fetch('/api/mesa-partes', { method: 'POST', body: formData });
            const result   = await response.json();

            if (result.success) {
                this.closeDocumentoModal();
                await this.loadDocumentosPresentados();
                await this.mostrarCargoRecepcion(result.data || {
                    id: result.numero_registro,
                    numero_registro: result.numero_registro,
                    demandante: { nombre },
                    tipo_presentacion: tipo,
                    materia: asunto,
                    sumilla: descripcion,
                    fecha_presentacion: new Date().toISOString(),
                    documentos: this.mesaArchivos.map(item => ({ nombre_original: item.archivo.name }))
                });
                window.location.hash = 'mesa';
                this.dashboard.showSection('mesa');
                this.mostrarFormularioInline();
            } else {
                throw new Error(result.error || 'Error presentando documento');
            }
        } catch (error) {
            console.error('❌ Error presentando documento:', error);
            this.dashboard.showError('Error presentando documento: ' + error.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = '🚀 Presentar documento'; }
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
