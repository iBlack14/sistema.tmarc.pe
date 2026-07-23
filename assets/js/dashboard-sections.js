/**
 * 🏛️ DASHBOARD SECTIONS GENERATOR (UI-UX-PRO-MAX)
 * Creates ultra-modern dashboard sections with Glassmorphism
 */

class DashboardSections {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.sections = {};
    }

    generateSections() {
        this.createNavigation();
        this.createInicioSection();
        this.createSolicitudesSection();
        this.createCasillaSection();
        this.createExpedientesSection();
        this.createMesaPartesSection();
        this.createConfiguracionSection();
    }

    createNavigation() {
        const navMenu = document.querySelector('.nav-menu');
        if (!navMenu) return;

        const sections = DashboardConfig.sections;

        navMenu.innerHTML = Object.values(sections).map(section => `
            <a href="#" class="nav-item ${section.default ? 'active' : ''}" data-section="${section.id}" onclick="showSection('${section.id}', event)">
                ${section.icon}
                <span class="nav-text">${section.title}</span>
            </a>
        `).join('') + `
            <a href="#" class="nav-item logout-item" onclick="logout()" style="margin-top: auto; color: var(--color-error);">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                <span class="nav-text">Cerrar sesión</span>
            </a>
        `;
    }

    createInicioSection() {
        const section = document.getElementById('inicio') || this.createSection('inicio');

        section.innerHTML = `
            <div class="header fade-in">
                <h1 class="text-gold">Panel de Control Institutional</h1>
                <p class="text-muted">Bienvenido, gestione sus trámites judiciales con seguridad y eficiencia.</p>
            </div>

            <div class="stats-grid fade-in">
                <div class="card stat-card">
                    <span class="stat-label">Solicitudes</span>
                    <span class="stat-value" id="inicio-solicitudes">0</span>
                    <div class="badge badge-success">En Línea</div>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">Expedientes</span>
                    <span class="stat-value" id="inicio-expedientes">0</span>
                    <div class="badge badge-warning">Activos</div>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">Notificaciones</span>
                    <span class="stat-value" id="inicio-documentos">0</span>
                    <div class="badge badge-error">Pendientes</div>
                </div>
            </div>

            <div class="table-container fade-in" style="margin-top: var(--space-5);">
                <div class="card">
                    <h3 class="card-title text-gold">📅 Actividad Reciente</h3>
                    <div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Actividad</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody id="actividades-tbody">
                                <tr>
                                    <td colspan="3" class="text-center text-muted">Sincronizando actividades...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    createSolicitudesSection() {
        const section = document.getElementById('solicitudes') || this.createSection('solicitudes');

        section.innerHTML = `
            <div class="header fade-in">
                <h1 class="text-gold">Gestión de Solicitudes</h1>
                <p class="text-muted">Administración centralizada de trámites y procesos.</p>
            </div>

            <div class="stats-grid fade-in">
                <div class="card" style="grid-column: span 2;">
                    <h3 class="card-title text-gold">🚀 Nueva Gestión</h3>
                    <p class="text-muted" style="margin-bottom: var(--space-4);">Inicie una nueva solicitud procesal en el sistema virtual.</p>
                    <button class="btn btn-primary" onclick="window.dashboardApp.modules.solicitudes?.crearNuevaSolicitud()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Crear Nueva Solicitud
                    </button>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">Total Aprobadas</span>
                    <span class="stat-value" id="solicitudes-aprobadas">0</span>
                </div>
            </div>

            <div class="table-container fade-in" style="margin-top: var(--space-5);">
                <div class="card">
                    <h3 class="card-title text-gold">📋 Historial de Solicitudes</h3>
                    <div class="table-wrapper">
                        <table class="table" id="solicitudes-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="solicitudes-tbody">
                                <tr><td colspan="5" class="text-center text-muted">Cargando datos...</td></tr>
                            </tbody>
                        </table>
                        <div id="no-solicitudes" style="display: none; padding: 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 20px;">📂</div>
                            <h4 class="text-gold">No hay solicitudes registradas</h4>
                            <p class="text-muted">Inicie una nueva gestión utilizando el botón superior.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createCasillaSection() {
        const section = document.getElementById('casilla') || this.createSection('casilla');

        section.innerHTML = `
            <div class="header fade-in">
                <h1 class="text-gold">Casilla Electrónica</h1>
                <p class="text-muted">Sistema de notificaciones procesales garantizado.</p>
            </div>

            <div class="stats-grid fade-in">
                <div class="card stat-card">
                    <span class="stat-label">Mensajes Nuevos</span>
                    <span class="stat-value text-gold" id="casilla-no-leidos">0</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">No Leídos</span>
                    <span class="stat-value text-gold" id="casilla-no-leidos-2">0</span>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">Mensajes Leídos</span>
                    <span class="stat-value" id="casilla-total">0</span>
                </div>
            </div>

            <div class="table-container fade-in" style="margin-top: var(--space-5);">
                <div class="card">
                    <h3 class="card-title text-gold">📥 Buzón de Notificaciones</h3>
                    <div class="table-wrapper">
                        <table class="table" id="notificaciones-table">
                            <thead>
                                <tr>
                                    <th>Remitente</th>
                                    <th>Asunto</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="notificaciones-tbody">
                                <tr><td colspan="5" class="text-center text-muted">Accediendo a la casilla...</td></tr>
                            </tbody>
                        </table>
                        <div id="no-notificaciones" style="display: none; padding: 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 20px;">✉️</div>
                            <h4 class="text-gold">Buzón de notificaciones vacío</h4>
                            <p class="text-muted">No tiene notificaciones procesales pendientes en este momento.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createExpedientesSection() {
        const section = document.getElementById('expedientes') || this.createSection('expedientes');

        section.innerHTML = `
            <div class="header fade-in">
                <h1 class="text-gold">Expedientes Virtuales</h1>
                <p class="text-muted">Consulta y seguimiento de procesos en tiempo real.</p>
            </div>

            <div class="stats-grid fade-in">
                <div class="card" style="grid-column: span 2;">
                    <h3 class="card-title text-gold">📂 Registro Procesal</h3>
                    <p class="text-muted" style="margin-bottom: var(--space-4);">Incorpore un nuevo expediente para su seguimiento administrativo.</p>
                    <button class="btn btn-primary" onclick="window.dashboardApp.modules.expedientes?.crearNuevoExpediente()">Registrar Expediente</button>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">En Trámite</span>
                    <span class="stat-value" id="expedientes-activos">0</span>
                </div>
            </div>

            <div class="table-container fade-in" style="margin-top: var(--space-5);">
                <div class="card">
                    <h3 class="card-title text-gold">🔍 Listado de Expedientes</h3>
                    <div class="table-wrapper">
                        <table class="table" id="expedientes-table">
                            <thead>
                                <tr>
                                    <th>Expediente Nº</th>
                                    <th>Asunto</th>
                                    <th>Apertura</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="expedientes-tbody">
                                <tr><td colspan="5" class="text-center text-muted">Sincronizando expedientes...</td></tr>
                            </tbody>
                        </table>
                        <div id="no-expedientes" style="display: none; padding: 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                            <h4 class="text-gold">No se encontraron expedientes</h4>
                            <p class="text-muted">Aún no tiene expedientes registrados en su historial institucional.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createMesaPartesSection() {
        const section = document.getElementById('mesa') || this.createSection('mesa');

        section.innerHTML = `
            <div class="header fade-in">
                <h1 class="text-gold">Mesa de Partes Virtual</h1>
                <p class="text-muted">Presentación de escritos y documentos con firma digital.</p>
            </div>

            <div class="stats-grid fade-in">
                <div class="card" style="grid-column: span 2;">
                    <h3 class="card-title text-gold">📤 Ingreso de Documentos</h3>
                    <p class="text-muted" style="margin-bottom: var(--space-4);">Suba escritos, demandas o anexos de forma segura.</p>
                    <button class="btn btn-primary" onclick="window.dashboardApp.modules.mesaPartes?.presentarDocumento()">Nueva Presentación</button>
                </div>
                <div class="card stat-card">
                    <span class="stat-label">Presentados</span>
                    <span class="stat-value" id="mesa-presentados">0</span>
                </div>
            </div>

            <div class="table-container fade-in" style="margin-top: var(--space-5);">
                <div class="card">
                    <h3 class="card-title text-gold">📜 Mis Presentaciones</h3>
                    <div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Registro</th>
                                    <th>Materia</th>
                                    <th>Fecha</th>
                                    <th>Estado</th>
                                    <th>Cargo</th>
                                </tr>
                            </thead>
                            <tbody id="mesa-tbody">
                                <tr><td colspan="5" class="text-center text-muted">Cargando registros...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    createConfiguracionSection() {
        const section = document.getElementById('configuracion') || this.createSection('configuracion');

        section.innerHTML = `
            <div class="header fade-in">
                <h1 class="text-gold">Configuración del Sistema</h1>
                <p class="text-muted">Gestione su identidad digital y preferencias de seguridad institucional.</p>
            </div>

            <div class="stats-grid fade-in" style="grid-template-columns: 1.2fr 0.8fr; gap: 24px; margin-top: 24px;">
                <!-- Card de Perfil -->
                <div class="card" style="padding: 30px; border-radius: 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(10px);">
                    <h3 class="card-title text-gold" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        Perfil Institucional
                    </h3>
                    
                    <form id="profileForm" style="display: flex; flex-direction: column; gap: 20px;">
                        <div style="display: flex; align-items: center; gap: 30px; padding: 20px; background: rgba(212, 175, 55, 0.03); border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.1);">
                            <div class="profile-preview-container" style="position: relative; width: 100px; height: 100px; flex-shrink: 0;">
                                <img id="profile-preview" src="assets/img/default-avatar.svg" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid var(--color-primary); box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);">
                                <div style="position: absolute; bottom: 0; right: 0; background: var(--color-primary); color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 3px solid #1a1a1a; cursor: pointer;" onclick="document.getElementById('profile-foto').click()">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 4V1h2v3h3v2H5v3H3V6H0V4h3zm3 6V7h3V4h7l1.83 2H21c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V10h3zm7 9c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-3.2-5c0 1.77 1.43 3.2 3.2 3.2s3.2-1.43 3.2-3.2-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2z"/></svg>
                                </div>
                            </div>
                            <div style="flex: 1;">
                                <label class="stat-label" style="font-weight: 600; color: var(--color-primary);">FOTOGRAFÍA DE PERFIL</label>
                                <p class="text-muted" style="font-size: 11px; margin-bottom: 12px;">Se recomienda una imagen cuadrada de máx. 2MB (JPG, PNG).</p>
                                <input type="file" id="profile-foto" name="avatar" accept="image/*" style="display: none;">
                                <span id="foto-filename" class="text-muted" style="font-size: 11px; font-style: italic;">Ninguna imagen seleccionada</span>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div class="form-group">
                                <label class="stat-label">NOMBRE COMPLETO</label>
                                <input type="text" id="profile-nombre" class="form-input" name="nombre" readonly style="background: rgba(0,0,0,0.1); cursor: not-allowed;">
                            </div>
                            <div class="form-group">
                                <label class="stat-label">TELÉFONO DE CONTACTO</label>
                                <input type="text" id="profile-telefono" class="form-input" name="telefono" placeholder="+51 000 000 000">
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="stat-label">CORREO ELECTRÓNICO INSTITUCIONAL</label>
                            <input type="email" id="profile-email" class="form-input" name="email" placeholder="usuario@tmarc.com.pe">
                        </div>

                        <div style="margin-top: 10px;">
                            <button type="submit" class="btn btn-primary" style="padding: 12px 40px; font-weight: 600; width: fit-content;">💾 GUARDAR CAMBIOS DE PERFIL</button>
                        </div>
                    </form>
                </div>

                <!-- Card de Seguridad -->
                <div class="card" style="padding: 30px; border-radius: 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(10px);">
                    <h3 class="card-title text-gold" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
                        Seguridad
                    </h3>
                    <p class="text-muted" style="font-size: 13px; margin-bottom: 24px;">Actualice su contraseña periódicamente para mantener la integridad de sus datos.</p>
                    
                    <form id="securityForm" style="display: flex; flex-direction: column; gap: 20px;">
                        <div class="form-group">
                            <label class="stat-label">CONTRASEÑA ACTUAL</label>
                            <input type="password" id="currentPassword" name="currentPassword" class="form-input" placeholder="••••••••" required>
                        </div>
                        
                        <div style="height: 1px; background: rgba(255,255,255,0.05); margin: 10px 0;"></div>
                        
                        <div class="form-group">
                            <label class="stat-label">NUEVA CONTRASEÑA</label>
                            <input type="password" id="newPassword" name="newPassword" class="form-input" placeholder="••••••••" required>
                        </div>
                        <div class="form-group">
                            <label class="stat-label">CONFIRMAR NUEVA CONTRASEÑA</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" placeholder="••••••••" required>
                        </div>
                        
                        <div style="margin-top: 10px;">
                            <button type="submit" class="btn btn-secondary" style="padding: 12px 30px; width: 100%; border: 1px solid var(--color-primary);">🛡️ ACTUALIZAR CONTRASEÑA</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    createSection(sectionId) {
        const section = document.createElement('div');
        section.className = 'content-section';
        section.id = sectionId;

        if (sectionId === 'inicio') {
            section.classList.add('active');
        }

        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.appendChild(section);
        }

        return section;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardSections;
}