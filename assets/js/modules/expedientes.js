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
                <td data-label="Expediente" class="font-bold text-gold">${exp.numero || exp.id}</td>
                <td data-label="Asunto">${exp.sumilla || 'Sin sumilla registrada'}</td>
                <td data-label="Apertura">${exp.fecha_creacion ? new Date(exp.fecha_creacion).toLocaleDateString() : 'N/A'}</td>
                <td data-label="Estado"><span class="badge ${this.getBadgeClass(exp.estado)}">${exp.estado}</span></td>
                <td data-label="Acciones">
                    <div style="display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end;">
                        <button class="btn btn-primary btn-sm" onclick="window.expedientesModule.abrirAgregarInformacion('${exp.id}')" title="Agregar información o documentos">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" style="margin-right:4px;"><path d="M12 5v14M5 12h14"/></svg>
                            Agregar
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.expedientesModule.verDetalle('${exp.id}')">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right:4px;"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                            Ver detalle
                        </button>
                    </div>
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

    abrirAgregarInformacion(expedienteId) {
        const hoy = new Date();
        const fechaLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        const content = `
            <form id="formAgregarInfoExpediente" class="fade-in" style="padding:4px 0;">
                <div style="padding:14px 16px; margin-bottom:18px; border:1px solid rgba(212,175,55,.28); border-radius:12px; background:rgba(212,175,55,.06);">
                    <strong style="display:block; color:var(--color-primary); margin-bottom:4px;">Expediente seleccionado</strong>
                    <span style="font-size:13px; color:var(--color-text-muted);">${expedienteId}</span>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div class="form-group"><label class="stat-label">Fecha del documento *</label><input type="date" id="info-exp-fecha" class="form-input" value="${fechaLocal}" required></div>
                    <div class="form-group"><label class="stat-label">Tipo de información *</label><select id="info-exp-tipo" class="form-select" required><option value="">Seleccionar</option><option value="ESCRITO">Escrito</option><option value="RESOLUCION">Resolución</option><option value="NOTIFICACION">Notificación</option><option value="INFORME">Informe</option><option value="ANEXO">Anexo</option><option value="OTRO">Otro</option></select></div>
                    <div class="form-group"><label class="stat-label">Número del documento</label><input type="text" id="info-exp-numero" class="form-input" maxlength="60" placeholder="Ej. Escrito N.° 01"></div>
                    <div class="form-group"><label class="stat-label">Presentado por</label><input type="text" id="info-exp-presentado" class="form-input" maxlength="150" placeholder="Nombre o razón social"></div>
                </div>
                <div class="form-group" style="margin-top:16px;"><label class="stat-label">Asunto</label><input type="text" id="info-exp-asunto" class="form-input" maxlength="200" placeholder="Asunto de la presentación"></div>
                <div class="form-group" style="margin-top:16px;"><label class="stat-label">Información adicional</label><textarea id="info-exp-sumilla" class="form-input" rows="4" maxlength="1000" placeholder="Detalle, sumilla u observaciones relevantes"></textarea></div>
                <div style="margin-top:16px;">${window.FileUploadTable ? FileUploadTable.render({ id:'infoExpDocumento', title:'Documento adjunto', multiple:false, maxFiles:1, showMetadata:false, accept:'.pdf,.doc,.docx,.jpg,.jpeg,.png', help:'Opcional. Formatos permitidos: PDF, Word, JPG y PNG.' }) : '<input type="file" id="info-exp-documento" class="form-input" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">'}</div>
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:22px;"><button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancelar</button><button type="submit" id="btnAgregarInfoExp" class="btn btn-primary">Guardar información</button></div>
            </form>`;
        this.dashboard.openModal('Agregar información o documentos', content);
        document.getElementById('formAgregarInfoExpediente')?.addEventListener('submit', event => this.guardarInformacionExpediente(event, expedienteId));
    }

    async guardarInformacionExpediente(event, expedienteId) {
        event.preventDefault();
        const button = document.getElementById('btnAgregarInfoExp');
        const original = button.textContent;
        const data = new FormData();
        data.append('fecha_documento', document.getElementById('info-exp-fecha').value);
        data.append('tipo_documento', document.getElementById('info-exp-tipo').value);
        data.append('numero_documento', document.getElementById('info-exp-numero').value.trim());
        data.append('presentado_por', document.getElementById('info-exp-presentado').value.trim());
        data.append('asunto', document.getElementById('info-exp-asunto').value.trim());
        data.append('sumilla', document.getElementById('info-exp-sumilla').value.trim());
        data.append('creado_por', sessionStorage.getItem('userId') || '');
        const archivo = (window.FileUploadTable?.getFiles('infoExpDocumento') || [])[0] || document.getElementById('info-exp-documento')?.files?.[0];
        const datosConstancia = {
            fecha: document.getElementById('info-exp-fecha').value,
            tipo: document.getElementById('info-exp-tipo').value,
            numero: document.getElementById('info-exp-numero').value.trim(),
            presentadoPor: document.getElementById('info-exp-presentado').value.trim(),
            asunto: document.getElementById('info-exp-asunto').value.trim(),
            detalle: document.getElementById('info-exp-sumilla').value.trim(),
            archivo: archivo?.name || ''
        };
        if (archivo) data.append('documento', archivo);
        try {
            button.disabled = true;
            button.textContent = 'Guardando...';
            const response = await fetch(`/api/expedientes/${encodeURIComponent(expedienteId)}/timeline`, { method: 'POST', body: data });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo guardar la información');
            this.dashboard.closeAllModals();
            const numeroConstancia = `CONST-${expedienteId}-${String(result.data.id).padStart(4, '0')}`;
            const cargo = {
                expediente: expedienteId,
                numero_constancia: numeroConstancia,
                titulo: 'CONSTANCIA DE ENVÍO DE INFORMACIÓN',
                solicitante: datosConstancia.presentadoPor || sessionStorage.getItem('userName') || 'Usuario TMARC',
                fecha: new Date().toLocaleString('es-PE'),
                folios: datosConstancia.archivo ? `1 archivo: ${datosConstancia.archivo}` : 'Sin archivo adjunto',
                tipo_servicio: datosConstancia.tipo,
                asunto: datosConstancia.asunto || datosConstancia.detalle || 'Información adicional'
            };
            const correoEnviado = await this.enviarConstanciaCorreo(expedienteId, numeroConstancia, datosConstancia);
            const confirmacion = await Swal.fire({
                title: 'Información recibida',
                html: `<strong>${numeroConstancia}</strong><br>Registrada en el historial del sistema.<br><small>${correoEnviado ? 'La constancia fue enviada a su correo.' : 'No se pudo confirmar el correo; puede descargar la constancia ahora.'}</small>`,
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
            Swal.fire({ title: 'No se pudo guardar', text: error.message, icon: 'error', confirmButtonColor: '#D4AF37' });
        } finally {
            button.disabled = false;
            button.textContent = original;
        }
    }

    async enviarConstanciaCorreo(expedienteId, numeroConstancia, datos) {
        const destinatario = sessionStorage.getItem('userEmail');
        if (!destinatario) return false;
        try {
            const response = await fetch('/api/email/credenciales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinatario,
                    asunto: `Constancia de envío ${numeroConstancia}`,
                    tipo: 'constancia_informacion',
                    fechaEnvio: new Date().toISOString(),
                    contenido: this.generarTemplateCorreoConstancia(expedienteId, numeroConstancia, datos)
                })
            });
            const result = await response.json();
            return response.ok && result.success;
        } catch (error) {
            console.warn('No se pudo enviar la constancia por correo:', error);
            return false;
        }
    }

    generarTemplateCorreoConstancia(expedienteId, numeroConstancia, datos) {
        const esc = valor => String(valor || '').replace(/[&<>"']/g, caracter => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[caracter]);
        const seguimientoUrl = `https://sistema.tmarc.pe/seguimiento.html?codigo=${encodeURIComponent(expedienteId)}`;
        const fecha = new Date().toLocaleString('es-PE', { dateStyle:'long', timeStyle:'short' });
        const fila = (titulo, valor) => `<tr><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;color:#78651f;font-size:12px;font-weight:700;width:34%;text-transform:uppercase;letter-spacing:.4px;">${titulo}</td><td style="padding:11px 14px;border-bottom:1px solid #ece7d8;color:#222;font-size:13px;font-weight:600;">${esc(valor)}</td></tr>`;
        return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#222;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4dfcf;box-shadow:0 10px 30px rgba(0,0,0,.08);"><tr><td style="background:#111;padding:25px 30px;border-bottom:4px solid #d4af37;"><div style="font-family:Georgia,serif;color:#fff;font-size:29px;font-weight:700;letter-spacing:-1px;">Tmarc</div><div style="color:#d4af37;font-size:10px;letter-spacing:1.7px;text-transform:uppercase;margin-top:3px;">Centro de Arbitraje &amp; Dispute Boards</div></td></tr><tr><td style="padding:30px;"><div style="color:#9b7413;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;margin-bottom:8px;">Constancia electrónica</div><h1 style="font-size:23px;line-height:1.25;color:#171717;margin:0 0 10px;">Información recibida correctamente</h1><p style="font-size:14px;line-height:1.6;color:#666;margin:0 0 24px;">Estimado usuario, SISTEMA TMARC confirma la recepción de la información incorporada a su expediente.</p><div style="background:#fff9e8;border:1px solid #ead486;border-radius:12px;padding:17px;text-align:center;margin-bottom:22px;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8a721e;font-weight:700;">Número de constancia</div><div style="font-size:19px;color:#171717;font-weight:800;margin-top:6px;">${esc(numeroConstancia)}</div></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #ece7d8;border-radius:10px;border-collapse:separate;overflow:hidden;">${fila('Expediente', expedienteId)}${fila('Fecha y hora', fecha)}${fila('Tipo', datos.tipo)}${datos.numero ? fila('Documento', datos.numero) : ''}${fila('Presentado por', datos.presentadoPor || sessionStorage.getItem('userName') || 'Usuario TMARC')}${fila('Asunto', datos.asunto || 'Información adicional')}${fila('Archivo', datos.archivo || 'Sin archivo adjunto')}</table><div style="text-align:center;margin:27px 0 20px;"><a href="${seguimientoUrl}" style="display:inline-block;background:#d4af37;color:#111;text-decoration:none;padding:13px 25px;border-radius:9px;font-size:13px;font-weight:800;">Consultar seguimiento →</a></div><div style="background:#f8f8f8;border-left:4px solid #d4af37;padding:13px 15px;color:#666;font-size:11px;line-height:1.55;">Esta constancia acredita la recepción electrónica de la información. Consérvela para futuras consultas. No responda a este mensaje automático.</div></td></tr><tr><td style="background:#111;padding:20px 30px;text-align:center;"><div style="color:#d4af37;font-size:11px;font-weight:700;">SISTEMA TMARC</div><div style="color:#aaa;font-size:10px;line-height:1.6;margin-top:6px;">Centro de Arbitraje &amp; Dispute Boards<br>sistema@tmarc.pe · sistema.tmarc.pe</div></td></tr></table></td></tr></table></body></html>`;
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
                            <input type="text" id="exp-demandante-dni" class="form-input" placeholder="DNI: 8 dígitos / RUC: 11 dígitos" inputmode="numeric" pattern="(?:[0-9]{8}|[0-9]{11})" maxlength="11" autocomplete="off" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)" title="Ingrese 8 dígitos para DNI o 11 dígitos para RUC">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Correo Electrónico</label>
                            <input type="email" id="exp-demandante-correo" class="form-input" placeholder="correo@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Teléfono / WhatsApp</label>
                            <input type="tel" id="exp-demandante-telefono" class="form-input" placeholder="Ej. 987654321" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="tel-national" oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)" title="Ingrese un teléfono de 9 dígitos">
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
                            <input type="text" id="exp-demandado-dni" class="form-input" placeholder="DNI: 8 dígitos / RUC: 11 dígitos" inputmode="numeric" pattern="(?:[0-9]{8}|[0-9]{11})" maxlength="11" autocomplete="off" oninput="this.value=this.value.replace(/\D/g,'').slice(0,11)" title="Ingrese 8 dígitos para DNI o 11 dígitos para RUC">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                        <div class="form-group">
                            <label class="stat-label">Correo Electrónico</label>
                            <input type="email" id="exp-demandado-correo" class="form-input" placeholder="correo@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label class="stat-label">Teléfono</label>
                            <input type="tel" id="exp-demandado-telefono" class="form-input" placeholder="Ej. 987654321" inputmode="numeric" pattern="[0-9]{9}" maxlength="9" autocomplete="tel-national" oninput="this.value=this.value.replace(/\D/g,'').slice(0,9)" title="Ingrese un teléfono de 9 dígitos">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="stat-label">Domicilio / Dirección</label>
                        <input type="text" id="exp-demandado-domicilio" class="form-input" placeholder="Dirección completa del demandado">
                    </div>
                </div>


                <!-- Sección 5: Documentos -->
                <div class="form-section" style="margin-bottom: 24px;">
                    ${window.FileUploadTable ? FileUploadTable.render({ id:'expArchivos', title:'Documentos adjuntos', maxFiles:10, accept:'.pdf', help:'Adjunte primero el documento principal. Los demás archivos se registrarán como anexos. Solo PDF.' }) : '<input type="file" id="exp-file-p" class="form-input" accept=".pdf" required><input type="file" id="exp-file-a" class="form-input" accept=".pdf" multiple>'}
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

        const demandanteDni = document.getElementById('exp-demandante-dni').value.trim();
        const demandadoDni = document.getElementById('exp-demandado-dni').value.trim();
        const demandanteTelefono = document.getElementById('exp-demandante-telefono').value.trim();
        const demandadoTelefono = document.getElementById('exp-demandado-telefono').value.trim();
        const erroresDocumento = [];
        if (demandanteDni && !/^(?:\d{8}|\d{11})$/.test(demandanteDni)) erroresDocumento.push('El DNI/RUC del demandante debe tener 8 u 11 dígitos.');
        if (demandadoDni && !/^(?:\d{8}|\d{11})$/.test(demandadoDni)) erroresDocumento.push('El DNI/RUC del demandado debe tener 8 u 11 dígitos.');
        if (demandanteTelefono && !/^\d{9}$/.test(demandanteTelefono)) erroresDocumento.push('El teléfono del demandante debe tener 9 dígitos.');
        if (demandadoTelefono && !/^\d{9}$/.test(demandadoTelefono)) erroresDocumento.push('El teléfono del demandado debe tener 9 dígitos.');
        if (erroresDocumento.length) {
            Swal.fire({ title: 'Revise los datos', html: erroresDocumento.join('<br>'), icon: 'warning', confirmButtonColor: '#D4AF37' });
            return;
        }
        const archivosIniciales = window.FileUploadTable?.getFiles('expArchivos') || [];
        const tienePrincipalLegacy = document.getElementById('exp-file-p')?.files?.length > 0;
        if (!archivosIniciales.length && !tienePrincipalLegacy) {
            Swal.fire({ title: 'Documento requerido', text: 'Adjunte al menos el documento principal del expediente.', icon: 'warning', confirmButtonColor: '#D4AF37' });
            return;
        }

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
            formData.append('demandante_dni', demandanteDni);
            formData.append('demandante_correo', document.getElementById('exp-demandante-correo').value);
            formData.append('demandante_telefono', demandanteTelefono);
            formData.append('demandante_domicilio', document.getElementById('exp-demandante-domicilio').value);

            // Demandado
            formData.append('demandado_nombre', document.getElementById('exp-demandado-nombre').value);
            formData.append('demandado_dni', demandadoDni);
            formData.append('demandado_correo', document.getElementById('exp-demandado-correo').value);
            formData.append('demandado_telefono', demandadoTelefono);
            formData.append('demandado_domicilio', document.getElementById('exp-demandado-domicilio').value);

            // Files
            const archivosExp = window.FileUploadTable?.getItems('expArchivos') || [];
            if (archivosExp.length) {
                formData.append('documentos_principales', archivosExp[0].file);
                archivosExp.slice(1).forEach(item => formData.append('anexos', item.file));
            } else {
                const fileP = document.getElementById('exp-file-p');
                if (fileP?.files.length > 0) formData.append('documentos_principales', fileP.files[0]);

                const fileA = document.getElementById('exp-file-a');
                if (fileA?.files.length > 0) {
                    Array.from(fileA.files).forEach(f => formData.append('anexos', f));
                }
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
