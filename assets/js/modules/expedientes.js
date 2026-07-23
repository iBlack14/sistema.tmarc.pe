/**
 * 📂 EXPEDIENTES MODULE (UI-UX-PRO-MAX)
 * Advanced judicial case tracking with Next-Gen UI
 */

class ExpedientesModule {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.expedientes = [];
        this.init();
    }

    async init() {
        console.log('📂 Expedientes Module Initialized');
    }

    async loadExpedientesUsuario() {
        try {
            const usuarioId = sessionStorage.getItem('userId');
            const response = await fetch(`/api/expedientes?usuario_id=${usuarioId}`);
            const data = await response.json();

            if (data.success) {
                this.expedientes = data.data || [];
                this.renderExpedientes();
            }
        } catch (error) {
            console.error('Error loading expedientes:', error);
        }
    }

    renderExpedientes() {
        const container = document.getElementById('expedientes-tbody');
        if (!container) return;

        if (this.expedientes.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No se encontraron expedientes registrados.</td></tr>';
            return;
        }

        container.innerHTML = this.expedientes.map(exp => `
            <tr class="fade-in">
                <td class="font-bold text-gold">${exp.numero || exp.id}</td>
                <td>${exp.sumilla || 'Sin sumilla registrada'}</td>
                <td>${exp.fecha_creacion ? new Date(exp.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
                <td><span class="badge ${this.getBadgeClass(exp.estado)}">${exp.estado}</span></td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="window.expedientesModule.verDetalle('${exp.id}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right: 4px;"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                        Ver Detalle
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getBadgeClass(estado) {
        const s = estado?.toLowerCase();
        if (s === 'activo' || s === 'aprobado') return 'badge-success';
        if (s === 'pendiente') return 'badge-warning';
        return 'badge-error';
    }

    async verDetalle(id) {
        const exp = this.expedientes.find(e => e.id == id);
        if (!exp) return;

        const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
        const campo = (label, value) => value ? `
            <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#999;">${label}</span>
                <span style="font-size:14px; font-weight:600; color:#1a1a1a;">${value}</span>
            </div>` : '';

        const content = `
            <div style="font-family:'Inter',sans-serif; padding: 4px 0;">

                <!-- Número + Estado -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7); border:1px solid #f59e0b30; border-radius:14px; padding:16px 20px;">
                        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#92400e; margin-bottom:6px;">N° Expediente</div>
                        <div style="font-size:18px; font-weight:800; color:#b45309; letter-spacing:-0.5px;">${exp.numero || exp.id}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:16px 20px;">
                        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:6px;">Estado</div>
                        <span class="badge ${this.getBadgeClass(exp.estado)}" style="font-size:12px; padding:4px 12px;">${exp.estado || 'Nuevo'}</span>
                    </div>
                </div>

                <!-- Datos del proceso -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e2e8f0;">📂 Datos del Proceso</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        ${campo('Sede', exp.sede)}
                        ${campo('Especialidad', exp.especialidad)}
                        ${campo('Materia', exp.materia)}
                        ${campo('Proceso', exp.proceso)}
                        ${campo('Motivo de Ingreso', exp.motivo_ingreso)}
                        ${campo('Cuantía', exp.indeterminado ? 'INDETERMINADO' : (exp.cuantia ? `S/ ${parseFloat(exp.cuantia).toFixed(2)}` : null))}
                        ${campo('Fecha de Registro', fmtFecha(exp.fecha_creacion))}
                        ${campo('Última Actualización', fmtFecha(exp.fecha_actualizacion))}
                    </div>
                </div>

                <!-- Sumilla -->
                ${exp.sumilla ? `
                <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:14px; padding:16px 20px; margin-bottom:16px;">
                    <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#92400e; margin-bottom:8px;">📝 Sumilla del Proceso</div>
                    <p style="font-size:14px; color:#1a1a1a; line-height:1.6; margin:0;">${exp.sumilla}</p>
                </div>` : ''}

                <!-- Presentante -->
                ${(exp.presentante || exp.tipo_presentante) ? `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#64748b; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #e2e8f0;">👤 Datos del Presentante</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        ${campo('Tipo', exp.tipo_presentante)}
                        ${campo('Nombre', exp.presentante)}
                        ${campo('Colegiatura', exp.colegiatura)}
                        ${campo('Colegio de Abogados', exp.colegio_abogados)}
                        ${campo('Casilla Física', exp.casilla_fisica)}
                        ${campo('Casilla Electrónica', exp.casilla_electronica)}
                    </div>
                </div>` : ''}

                <!-- Demandante -->
                ${exp.demandante_nombre ? `
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:20px; margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#166534; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #bbf7d0;">⚖️ Datos del Demandante</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        ${campo('Nombre / Razón Social', exp.demandante_nombre)}
                        ${campo('DNI / RUC', exp.demandante_dni)}
                        ${campo('Correo Electrónico', exp.demandante_correo)}
                        ${campo('Teléfono', exp.demandante_telefono)}
                        ${campo('Domicilio', exp.demandante_domicilio)}
                    </div>
                </div>` : ''}

                <!-- Demandado -->
                ${exp.demandado_nombre ? `
                <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:14px; padding:20px; margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#9f1239; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #fecdd3;">🏢 Datos del Demandado / Contraparte</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                        ${campo('Nombre / Razón Social', exp.demandado_nombre)}
                        ${campo('DNI / RUC', exp.demandado_dni)}
                        ${campo('Correo Electrónico', exp.demandado_correo)}
                        ${campo('Teléfono', exp.demandado_telefono)}
                        ${campo('Domicilio', exp.demandado_domicilio)}
                    </div>
                </div>` : ''}

                <div style="display:flex; justify-content:flex-end; margin-top:8px;">
                    <button class="btn btn-secondary" onclick="if(typeof closeAllModals==='function')closeAllModals();else window.dashboardApp.closeAllModals();"
                        style="padding:10px 28px; font-size:13px; font-weight:600; border-radius:10px;">
                        Cerrar
                    </button>
                </div>
            </div>
        `;

        this.dashboard.openModal(`Expediente ${exp.numero || exp.id}`, content);
    }

    crearNuevoExpediente() {
        const content = `
            <form id="formNuevoExpediente" class="fade-in cej-form" style="max-height: 85vh; overflow-y: auto; padding: 20px;">
                <!-- Sección 1: Datos Generales -->
                <div class="form-section" style="margin-bottom: 24px;">
                    <h4 style="color: var(--color-primary); border-bottom: 2px solid rgba(212, 175, 55, 0.2); padding-bottom: 8px; margin-bottom: 16px;">🏛️ Datos Generales</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="form-group">
                            <label class="stat-label">Sede</label>
                            <input type="text" id="exp-sede" class="form-input" placeholder="Escriba la sede..." required>
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Especialidad</label>
                            <select id="exp-especialidad" class="form-select" required>
                                <option value="">(Seleccionar)</option>
                                <option value="ARBITRAJE">ARBITRAJE</option>
                                <option value="JUNTA DE PREVENCION">JUNTA DE PREVENCION Y RESOLUCION DE DISPUTAS</option>
                                <option value="CONCILIACION">CONCILIACION EXTRAJUDICIAL</option>
                                <option value="ARBITRAJE DE EMERGENCIA">ARBITRAJE DE EMERGENCIA</option>
                                <option value="ARBITRAJE EXPRESS">ARBITRAJE EXPRESS</option>
                                <option value="ARBITRAJE ENTRE PRIVADOS">ARBITRAJE ENTRE PRIVADOS</option>
                                <option value="CENTRO DE FORMACION">CENTRO DE FORMACION Y CAPACITACION</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Sección 2: Datos del Expediente -->
                <div class="form-section" style="margin-bottom: 24px;">
                    <h4 style="color: var(--color-primary); border-bottom: 2px solid rgba(212, 175, 55, 0.2); padding-bottom: 8px; margin-bottom: 16px;">📂 Datos del Expediente</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Motivo de Ingreso</label>
                            <input type="text" id="exp-motivo" class="form-input" value="DEMANDA">
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Proceso</label>
                            <select id="exp-proceso" class="form-select" required onchange="document.getElementById('exp-proceso-otro-cont').style.display = this.value === 'Otros' ? 'block' : 'none'">
                                <option value="">(Seleccionar)</option>
                                <option value="Institucional">Institucional</option>
                                <option value="Express">Express</option>
                                <option value="Ad-hoc">Ad-hoc</option>
                                <option value="Emergencia">Emergencia</option>
                                <option value="Otros">Otros (Especificar)</option>
                            </select>
                            <div id="exp-proceso-otro-cont" style="display: none; margin-top: 8px;">
                                <input type="text" id="exp-proceso-otro" class="form-input" placeholder="Escriba el proceso...">
                            </div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Materia</label>
                            <select id="exp-materia" class="form-select" required onchange="document.getElementById('exp-materia-otro-cont').style.display = this.value === 'OTRO' ? 'block' : 'none'">
                                <option value="">(Seleccionar)</option>
                                <option value="ARBITRAJE">ARBITRAJE</option>
                                <option value="JUNTA DE PREVENCION">JUNTA DE PREVENCION Y RESOLUCION DE DISPUTAS</option>
                                <option value="CONCILIACION">CONCILIACION EXTRAJUDICIAL</option>
                                <option value="ARBITRAJE DE EMERGENCIA">ARBITRAJE DE EMERGENCIA</option>
                                <option value="ARBITRAJE EXPRESS">ARBITRAJE EXPRESS</option>
                                <option value="ARBITRAJE ENTRE PRIVADOS">ARBITRAJE ENTRE PRIVADOS</option>
                                <option value="CENTRO DE FORMACION">CENTRO DE FORMACION Y CAPACITACION</option>
                                <option value="OTRO">OTRO (ESPECIFICAR)</option>
                            </select>
                            <div id="exp-materia-otro-cont" style="display: none; margin-top: 8px;">
                                <input type="text" id="exp-materia-otro" class="form-input" placeholder="Escriba la materia...">
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Cuantía (S/.)</label>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <input type="number" id="exp-cuantia" class="form-input" value="0.00" step="0.01">
                                <label style="font-size: 10px; white-space: nowrap; display: flex; align-items: center; gap: 4px; color: var(--text-muted);">
                                    <input type="checkbox" id="exp-indeterminado" onchange="document.getElementById('exp-cuantia').disabled = this.checked"> 
                                    INDETERMINADO
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="stat-label" style="display: flex; justify-content: space-between;">
                            Sumilla 
                            <span style="font-size: 10px;">Caracteres restantes: <span id="sumilla-count">255</span></span>
                        </label>
                        <textarea id="exp-sumilla" class="form-input" rows="3" maxlength="255" placeholder="Ingrese la sumilla del expediente..." oninput="document.getElementById('sumilla-count').textContent = 255 - this.value.length"></textarea>
                    </div>
                </div>

                <!-- Sección 3: Datos del Demandante -->
                <div class="form-section" style="margin-bottom: 24px;">
                    <h4 style="color: var(--color-primary); border-bottom: 2px solid rgba(212, 175, 55, 0.2); padding-bottom: 8px; margin-bottom: 16px;">⚖️ Datos del Demandante</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Nombre Completo / Razón Social</label>
                            <input type="text" id="exp-demandante-nombre" class="form-input" placeholder="Nombre o razón social del demandante" required>
                        </div>
                        <div class="form-group">
                            <label class="stat-label">DNI / RUC</label>
                            <input type="text" id="exp-demandante-dni" class="form-input" placeholder="00000000">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Correo Electrónico</label>
                            <input type="email" id="exp-demandante-correo" class="form-input" placeholder="correo@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Teléfono / WhatsApp</label>
                            <input type="tel" id="exp-demandante-telefono" class="form-input" placeholder="+51 900...">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="stat-label">Domicilio / Dirección</label>
                        <input type="text" id="exp-demandante-domicilio" class="form-input" placeholder="Dirección completa del demandante">
                    </div>
                </div>

                <!-- Sección 4: Datos del Demandado -->
                <div class="form-section" style="margin-bottom: 24px;">
                    <h4 style="color: var(--color-primary); border-bottom: 2px solid rgba(212, 175, 55, 0.2); padding-bottom: 8px; margin-bottom: 16px;">🏢 Datos del Demandado / Contraparte</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Nombre Completo / Razón Social</label>
                            <input type="text" id="exp-demandado-nombre" class="form-input" placeholder="Nombre o razón social del demandado">
                        </div>
                        <div class="form-group">
                            <label class="stat-label">DNI / RUC</label>
                            <input type="text" id="exp-demandado-dni" class="form-input" placeholder="00000000">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Correo Electrónico</label>
                            <input type="email" id="exp-demandado-correo" class="form-input" placeholder="correo@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Teléfono</label>
                            <input type="tel" id="exp-demandado-telefono" class="form-input" placeholder="+51 900...">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="stat-label">Domicilio / Dirección</label>
                        <input type="text" id="exp-demandado-domicilio" class="form-input" placeholder="Dirección completa del demandado">
                    </div>
                </div>


                <!-- Sección 5: Documentos -->
                <div class="form-section" style="margin-bottom: 24px; padding: 15px; background: rgba(212, 175, 55, 0.05); border-radius: 12px; border: 1px dashed var(--color-primary);">
                    <h4 style="color: var(--color-primary); margin-bottom: 12px; font-size: 14px;">📄 Documentos Adjuntos (Máx 5MB - PDF Firmado)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <label class="stat-label">Documento Principal</label>
                            <input type="file" id="exp-file-p" class="form-input" accept=".pdf" required>
                        </div>
                        <div>
                            <label class="stat-label">Anexos</label>
                            <input type="file" id="exp-file-a" class="form-input" accept=".pdf" multiple>
                        </div>
                    </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancelar</button>
                    <button type="submit" id="btnSubmitExp" class="btn btn-primary" style="padding: 12px 32px;">Registrar Expediente</button>
                </div>
            </form>
        `;

        this.dashboard.openModal('🏛️ Nueva Presentación de Expediente', content);
        
        const form = document.getElementById('formNuevoExpediente');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitExp');
        const originalText = btn.textContent;

        // Helper local por si closeAllModals no está en scope
        const cerrarModal = () => {
            if (typeof closeAllModals === 'function') closeAllModals();
            else if (window.dashboardApp) window.dashboardApp.closeAllModals();
        };

        try {
            btn.disabled = true;
            btn.textContent = 'Enviando...';

            const materiaSel = document.getElementById('exp-materia').value;
            const materia = materiaSel === 'OTRO' ? document.getElementById('exp-materia-otro').value : materiaSel;
            
            const procesoSel = document.getElementById('exp-proceso').value;
            const proceso = (procesoSel === 'Otros' || procesoSel === 'OTRO') ? document.getElementById('exp-proceso-otro').value : procesoSel;

            // Generar número de expediente dinámico para validación del servidor
            const numeroExpediente = 'EXP-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5);

            const formData = new FormData();
            formData.append('numero_expediente', numeroExpediente);
            formData.append('sede', document.getElementById('exp-sede').value);
            formData.append('especialidad', document.getElementById('exp-especialidad').value);
            formData.append('motivo_ingreso', document.getElementById('exp-motivo').value);
            formData.append('proceso', proceso);
            formData.append('materia', materia);
            formData.append('cuantia', document.getElementById('exp-indeterminado').checked ? 0 : document.getElementById('exp-cuantia').value);
            formData.append('indeterminado', document.getElementById('exp-indeterminado').checked ? 1 : 0);
            formData.append('sumilla', document.getElementById('exp-sumilla').value);
            formData.append('usuario_id', sessionStorage.getItem('userId') || '2');

            // Demandante
            formData.append('demandante_nombre', document.getElementById('exp-demandante-nombre').value);
            formData.append('demandante_dni', document.getElementById('exp-demandante-dni').value);
            formData.append('demandante_correo', document.getElementById('exp-demandante-correo').value);
            formData.append('demandante_telefono', document.getElementById('exp-demandante-telefono').value);
            formData.append('demandante_domicilio', document.getElementById('exp-demandante-domicilio').value);

            // Demandado
            formData.append('demandado_nombre', document.getElementById('exp-demandado-nombre').value);
            formData.append('demandado_dni', document.getElementById('exp-demandado-dni').value);
            formData.append('demandado_correo', document.getElementById('exp-demandado-correo').value);
            formData.append('demandado_telefono', document.getElementById('exp-demandado-telefono').value);
            formData.append('demandado_domicilio', document.getElementById('exp-demandado-domicilio').value);

            // Files
            const fileP = document.getElementById('exp-file-p');
            if (fileP.files.length > 0) formData.append('documentos_principales', fileP.files[0]);
            
            const fileA = document.getElementById('exp-file-a');
            if (fileA.files.length > 0) {
                Array.from(fileA.files).forEach(f => formData.append('anexos', f));
            }

            const response = await fetch('/api/expedientes', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('📡 Respuesta servidor:', response.status, result);

            if (!response.ok) {
                const mensajeError = result.details || result.error || `Error ${response.status}`;
                console.error('❌ Error del servidor:', mensajeError);
                throw new Error(mensajeError);
            }

            if (result.success) {
                cerrarModal();
                Swal.fire({
                    title: '¡Expediente Presentado!',
                    text: 'El registro se ha realizado con éxito en la Mesa de Partes Virtual.',
                    icon: 'success',
                    confirmButtonColor: '#D4AF37'
                });
                await this.loadExpedientesUsuario();
            } else {
                // Mostrar el detalle real del error del servidor
                const mensajeError = result.details || result.error || 'Error en el registro';
                console.error('❌ Detalle del servidor:', mensajeError);
                throw new Error(mensajeError);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            cerrarModal();
            Swal.fire({ title: 'Error', text: error.message, icon: 'error', confirmButtonColor: '#D4AF37' });
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExpedientesModule;
}