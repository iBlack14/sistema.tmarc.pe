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
        this.createSoporteSection();
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

        const mobileNav = document.getElementById('mobile-bottom-nav');
        if (mobileNav) {
            const primaryMobileSections = ['inicio', 'solicitudes', 'casilla', 'expedientes'];
            mobileNav.innerHTML = primaryMobileSections.map(sectionId => {
                const section = sections[sectionId];
                return `
                    <a href="#${section.id}" class="mobile-nav-item ${section.default ? 'active' : ''}"
                        data-section="${section.id}" onclick="showSection('${section.id}', event)">
                        ${section.icon}
                        <span>${section.title === 'Casilla electrónica' ? 'Casilla' : section.title}</span>
                    </a>
                `;
            }).join('') + `
                <button class="mobile-nav-item mobile-nav-more" id="mobile-nav-more" type="button"
                    onclick="window.dashboardApp.toggleMobileSidebar()" aria-label="Abrir más opciones">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.5"></circle>
                        <circle cx="12" cy="12" r="1.5"></circle>
                        <circle cx="19" cy="12" r="1.5"></circle>
                    </svg>
                    <span>Más</span>
                </button>
            `;
        }
    }

    createInicioSection() {
        const section = document.getElementById('inicio') || this.createSection('inicio');

        section.innerHTML = `
            <div class="home-dashboard fade-in">
                <section class="home-hero" aria-labelledby="home-title">
                    <div class="home-hero-copy">
                        <span class="home-eyebrow">Centro de gestión</span>
                        <h1 id="home-title">Panel de control institucional</h1>
                        <p>Administre sus trámites, expedientes y comunicaciones desde un solo lugar.</p>
                    </div>
                    <div class="home-hero-actions" aria-label="Acciones rápidas">
                        <button class="home-action home-action-primary" type="button" onclick="showSection('solicitudes', event)">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                            Nueva solicitud
                        </button>
                        <button class="home-action" type="button" onclick="showSection('expedientes', event)">
                            Ver seguimiento
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </section>

                <section class="home-metrics" aria-label="Resumen general">
                    <button class="home-metric home-metric-blue" type="button" onclick="showSection('solicitudes', event)">
                        <span class="home-metric-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5h6M9 9h6M9 13h4M7 3h10a2 2 0 0 1 2 2v14H5V5a2 2 0 0 1 2-2Z"/></svg>
                        </span>
                        <span class="home-metric-copy">
                            <span class="home-metric-label">Solicitudes</span>
                            <strong id="inicio-solicitudes">0</strong>
                            <span class="home-metric-detail">Trámites registrados</span>
                        </span>
                        <span class="home-metric-arrow" aria-hidden="true">→</span>
                    </button>
                    <button class="home-metric home-metric-gold" type="button" onclick="showSection('expedientes', event)">
                        <span class="home-metric-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3V7Zm0 0V5h7l2 2"/></svg>
                        </span>
                        <span class="home-metric-copy">
                            <span class="home-metric-label">Expedientes</span>
                            <strong id="inicio-expedientes">0</strong>
                            <span class="home-metric-detail">Procesos en seguimiento</span>
                        </span>
                        <span class="home-metric-arrow" aria-hidden="true">→</span>
                    </button>
                    <button class="home-metric home-metric-red" type="button" onclick="showSection('casilla', event)">
                        <span class="home-metric-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></svg>
                        </span>
                        <span class="home-metric-copy">
                            <span class="home-metric-label">Notificaciones</span>
                            <strong id="inicio-documentos">0</strong>
                            <span class="home-metric-detail">Pendientes de lectura</span>
                        </span>
                        <span class="home-metric-arrow" aria-hidden="true">→</span>
                    </button>
                </section>

                <section class="home-activity card">
                    <div class="home-section-heading">
                        <div>
                            <span class="home-eyebrow">Últimos movimientos</span>
                            <h2>Actividad reciente</h2>
                        </div>
                        <button type="button" class="home-text-action" onclick="showSection('expedientes', event)">Ver seguimiento →</button>
                    </div>
                    <div class="table-wrapper">
                        <table class="table home-activity-table">
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
                </section>
            </div>
        `;
    }

    createSolicitudesSection() {
        const section = document.getElementById('solicitudes') || this.createSection('solicitudes');

        section.innerHTML = `
            <div class="requests-dashboard fade-in">
                <section class="requests-header" aria-labelledby="requests-title">
                    <div>
                        <span class="requests-eyebrow">Tipos de solicitud</span>
                        <h1 id="requests-title">Genere una nueva solicitud</h1>
                        <p>Seleccione el tipo de solicitud que desea presentar en SISTMARC.</p>
                    </div>
                </section>

                <section id="solicitudesServicesView" class="requests-service-panel card">
                    <div class="service-selector">
                        <div><span class="service-selector-label">Seleccione una solicitud</span><div class="service-grid">
                            ${this.servicePageButton('arbitraje','Arbitraje','<path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7zm10 0-4 7h8l-4-7z"/>',true)}
                            ${this.servicePageButton('arbitraje-express','Arbitraje Express','<path d="m13 2-9 12h8l-1 8 9-12h-8z"/>')}
                            ${this.servicePageButton('arbitraje-emergencia','Arbitraje de Emergencia','<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.7 2.4 17.4A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.6L13.7 3.7a2 2 0 0 0-3.4 0z"/>')}
                            ${this.servicePageButton('jprd','Junta de Prevención y Resolución de Disputas','<path d="M3 21h18M6 21V8l6-5 6 5v13M9 21v-6h6v6"/>')}
                            ${this.servicePageButton('conciliacion','Conciliación Extrajudicial','<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>')}
                            ${this.servicePageButton('recusacion','Recusación','<path d="M12 3 4 6v5c0 4.8 3.1 8.6 8 10 4.9-1.4 8-5.2 8-10V6l-8-3z"/><path d="m9 12 2 2 4-5"/>')}
                        </div></div>
                        <aside class="service-detail"><div class="service-detail-visual" id="pageServiceDetailVisual"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7zm10 0-4 7h8l-4-7z"/></svg></div><div class="service-detail-body"><h3 id="pageServiceDetailTitle">Arbitraje</h3><p id="pageServiceDetailDescription">Procedimiento para resolver controversias mediante un tribunal arbitral o árbitro único.</p><div class="service-requirements"><div class="service-requirement"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l4 4v16H6zM14 2v5h5"/></svg> Revise y prepare la documentación</div><div class="service-requirement"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg> Complete todos los datos requeridos</div></div><button type="button" class="service-start" onclick="window.solicitudesModule?.startSelectedPageService()">Comenzar solicitud <span>→</span></button></div></aside>
                    </div>
                </section>

                <section class="requests-summary" id="requestsSummary" aria-label="Resumen de solicitudes" style="display:none"><div class="requests-summary-copy"><span class="requests-summary-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l2 2 4-4M7 3h10a2 2 0 0 1 2 2v14H5V5a2 2 0 0 1 2-2Z"/></svg></span><div><span>Solicitudes aprobadas</span><small>Trámites concluidos favorablemente</small></div></div><strong id="solicitudes-aprobadas">0</strong></section>

                <section class="requests-history card" id="solicitudesHistoryView" style="display:none">
                    <div class="requests-section-heading">
                        <div>
                            <span class="requests-eyebrow">Seguimiento</span>
                            <h2>Historial de solicitudes</h2>
                        </div>
                        <span class="requests-secure-label">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.6 2.9 8.2 7 10 4.1-1.8 7-5.4 7-10V6l-7-3Z"/></svg>
                            Información protegida
                        </span>
                    </div>
                    <div class="table-wrapper requests-table-wrapper">
                        <table class="table requests-table" id="solicitudes-table">
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
                        <div id="no-solicitudes" class="requests-empty" style="display: none;">
                            <span class="requests-empty-icon">
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h7l2 2h9v10H3V7Zm6 6h6M12 10v6"/></svg>
                            </span>
                            <h3>Aún no tiene solicitudes</h3>
                            <p>Cuando registre un trámite podrá consultar aquí su estado y los últimos movimientos.</p>
                            <button type="button" onclick="window.dashboardApp.modules.solicitudes?.crearNuevaSolicitud()">Registrar primera solicitud</button>
                        </div>
                    </div>
                </section>
            </div>
        `;
    }

    servicePageButton(id, title, icon, active = false) {
        return `<button type="button" class="service-choice${active ? ' active' : ''}" data-page-service="${id}" onclick="window.solicitudesModule?.selectPageService('${id}', this)"><span class="service-choice-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg></span><span>${title}</span></button>`;
    }

    createCasillaSection() {
        const section = document.getElementById('casilla') || this.createSection('casilla');

        section.innerHTML = `
            <div class="header module-header fade-in">
                <span class="module-eyebrow">Comunicaciones oficiales</span>
                <h1>Casilla electrónica</h1>
                <p class="text-muted">Sistema de notificaciones procesales garantizado.</p>
            </div>

            <div class="stats-grid module-stats fade-in">
                <div class="card stat-card module-stat-card">
                    <span class="stat-label">Mensajes Nuevos</span>
                    <span class="stat-value text-gold" id="casilla-no-leidos">0</span>
                </div>
                <div class="card stat-card module-stat-card">
                    <span class="stat-label">No Leídos</span>
                    <span class="stat-value text-gold" id="casilla-no-leidos-2">0</span>
                </div>
                <div class="card stat-card module-stat-card">
                    <span class="stat-label">Mensajes Leídos</span>
                    <span class="stat-value" id="casilla-total">0</span>
                </div>
            </div>

            <div class="table-container module-table-container fade-in">
                <div class="card module-table-card">
                    <div class="module-card-heading">
                        <div><span class="module-eyebrow">Centro de mensajes</span><h2>Buzón de notificaciones</h2></div>
                        <span class="module-security">Contenido protegido</span>
                    </div>
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
                        <div id="no-notificaciones" class="module-empty" style="display: none;">
                            <div class="module-empty-icon">✉</div>
                            <h4>Buzón de notificaciones vacío</h4>
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
            <div class="header module-header fade-in">
                <span class="module-eyebrow">Expedientes</span>
                <h1>Seguimiento procesal</h1>
                <p class="text-muted">Consulte el estado, las actuaciones y el historial de sus procesos en tiempo real.</p>
            </div>

            <div class="table-container module-table-container fade-in">
                <div class="card module-table-card">
                    <div class="module-card-heading">
                        <div><span class="module-eyebrow">Constancias y cargos</span><h2>Mis presentaciones</h2></div>
                        <span class="module-security">Recepción segura</span>
                    </div>
                    <div class="table-wrapper">
                        <table class="table">
                            <thead><tr><th>Registro</th><th>Materia</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
                            <tbody id="mesa-tbody"><tr><td colspan="5" class="text-center text-muted">Cargando presentaciones...</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

        `;
    }

    createMesaPartesSection() {
        const section = document.getElementById('mesa') || this.createSection('mesa');

        section.innerHTML = `
            <div class="header module-header fade-in">
                <span class="module-eyebrow">Recepción digital</span>
                <h1>Mesa de partes virtual</h1>
                <p class="text-muted">Presentación de escritos y documentos con firma digital.</p>
            </div>

            <div id="mesa-formulario-inline" class="fade-in"></div>

        `;
        setTimeout(() => window.mesaPartesModule?.mostrarFormularioInline(), 0);
    }

    createSoporteSection() {
        const section = document.getElementById('soporte') || this.createSection('soporte');
        const manualConfig = window.SISTMARC_MANUALES || {};
        const iconoLibro = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>';
        const descarga = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/></svg>';
        const manuales = [
            { titulo: 'Acceso y uso de la cuenta', texto: 'Guía para ingresar, administrar su perfil y utilizar de manera segura su cuenta institucional.', url: manualConfig.acceso?.url || '/output/pdf/instructivo-uso-sistmarc.pdf#page=4' },
            { titulo: 'Uso de la mesa de partes virtual', texto: 'Procedimiento para presentar solicitudes, escritos, documentos principales y anexos.', url: manualConfig.mesaPartes?.url || '/output/pdf/instructivo-uso-sistmarc.pdf#page=6' },
            { titulo: 'Seguimiento y trazabilidad', texto: 'Consulta de cargos, confirmaciones de recepción e información agregada a sus presentaciones.', url: manualConfig.seguimiento?.url || '/output/pdf/instructivo-uso-sistmarc.pdf#page=7' }
        ];
        section.innerHTML = `<div class="support-module fade-in">
            <header class="support-header"><span class="module-eyebrow">Centro de ayuda</span><h1>Módulo de soporte tecnológico</h1><p>Consulte manuales y canales de asistencia para utilizar correctamente las herramientas digitales de SISTMARC.</p></header>
            <div class="support-manual-grid">${manuales.map((item, i) => `<article class="support-manual-card"><div class="support-card-top"><span class="support-book">${iconoLibro}</span><div class="support-badges"><b>IMPORTANTE</b><span>PARTE ${i + 1}</span></div></div><h2>${item.titulo}</h2><p>${item.texto}</p><dl><div><dt>VERSIÓN</dt><dd>v1.0</dd></div><div><dt>ACTUALIZADO</dt><dd>17-08-2026</dd></div><div><dt>FORMATO</dt><dd>PDF</dd></div></dl><a class="support-download" href="${item.url}" target="_blank" rel="noopener">${descarga} Descargar manual</a></article>`).join('')}</div>
            <section class="support-assistance"><div class="support-channels"><div class="support-info-icon">i</div><div><h2>Canales de asistencia</h2><div class="support-channel"><span></span><div><b>Centro de ayuda para las partes</b><p>Orientación sobre presentación de documentos, constancias y seguimiento de sus procesos.</p></div></div><div class="support-channel"><span></span><div><b>Soporte técnico especializado</b><p>Ayuda ante dificultades de acceso, carga de archivos o uso de la casilla electrónica.</p></div></div></div></div><div class="support-contact"><small>SOPORTE TÉCNICO SISTMARC</small><h3>Consultas o dudas llamar al:</h3><div class="support-phone-list"><a href="https://wa.me/51967735960?text=Hola%20SISTMARC%2C%20necesito%20asistencia%20t%C3%A9cnica" target="_blank" rel="noopener">Cel. (+51) 967 735 960</a><a href="https://wa.me/51968183889?text=Hola%20SISTMARC%2C%20necesito%20asistencia%20t%C3%A9cnica" target="_blank" rel="noopener">Cel. (+51) 968 183 889</a></div><p>También puede escribir a <a href="mailto:sistema@tmarc.pe">sistema@tmarc.pe</a></p></div></section>
        </div>`;
    }

    createConfiguracionSection() {
        const section = document.getElementById('configuracion') || this.createSection('configuracion');

        section.innerHTML = `
            <div class="header module-header fade-in">
                <span class="module-eyebrow">Cuenta y seguridad</span>
                <h1>Configuración del sistema</h1>
                <p class="text-muted">Gestione su identidad digital y preferencias de seguridad institucional.</p>
            </div>

            <div class="stats-grid configuration-grid fade-in" style="grid-template-columns: 1.2fr 0.8fr; gap: 24px; margin-top: 24px;">
                <!-- Card de Perfil -->
                <div class="card configuration-card" style="padding: 30px; border-radius: 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(10px);">
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
                <div class="card configuration-card" style="padding: 30px; border-radius: 20px; background: rgba(255,255,255,0.02); backdrop-filter: blur(10px);">
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
