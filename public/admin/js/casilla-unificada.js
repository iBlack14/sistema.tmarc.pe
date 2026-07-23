/**
 * Casilla Electrónica Unificada - Admin
 * Inbox centralizado: Registros, Mesa de Partes, Expedientes, Solicitudes
 * Arquitectura modular y escalable
 */

const CasillaUnificada = {
    // Estado
    data: [],
    stats: {},
    filtroActual: 'todos',
    abortController: null,

    // Configuración de tipos
    tipos: {
        registro: {
            icon: '📝',
            nombre: 'Registro',
            color: '#4CAF50'
        },
        mesa_partes: {
            icon: '📨',
            nombre: 'Mesa de Partes',
            color: '#2196F3'
        },
        expediente: {
            icon: '📁',
            nombre: 'Expediente',
            color: '#FF9800'
        },
        solicitud: {
            icon: '📋',
            nombre: 'Solicitud',
            color: '#9C27B0'
        }
    },

    /**
     * Inicializar módulo
     */
    async init() {
        console.log('🚀 Inicializando Casilla Unificada...');
        await this.cargar();
        this.setupEventListeners();
    },

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Filtros por tipo
        document.querySelectorAll('[data-filtro-tipo]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tipo = e.target.dataset.filtroTipo;
                this.filtrar(tipo);
            });
        });

        // Búsqueda
        const searchInput = document.getElementById('casilla-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.buscar(e.target.value);
            });
        }
    },

    /**
     * Cargar datos del servidor
     */
    async cargar(filtros = {}) {
        try {
            console.log('📥 Cargando casilla electrónica...');

            const params = new URLSearchParams(filtros);
            const response = await fetch(`/api/casilla-electronica?${params}`);
            const data = await response.json();

            if (data.success) {
                this.data = data.data || [];
                this.stats = data.estadisticas || {};

                this.actualizarEstadisticas();
                this.renderizar();

                console.log(`✅ ${this.data.length} items cargados`);
            } else {
                throw new Error(data.error || 'Error cargando datos');
            }
        } catch (error) {
            console.error('❌ Error cargando casilla:', error);
            this.mostrarError('Error cargando datos de la casilla electrónica');
            this.renderizar([]);
        }
    },

    /**
     * Actualizar estadísticas en UI
     */
    actualizarEstadisticas() {
        if (!this.stats.por_tipo) return;

        // Actualizar badges de contadores
        Object.keys(this.stats.por_tipo).forEach(tipo => {
            const badge = document.querySelector(`[data-badge-tipo="${tipo}"]`);
            if (badge) {
                badge.textContent = this.stats.por_tipo[tipo];
            }
        });

        // Actualizar totales
        const totalBadge = document.querySelector('[data-badge-tipo="todos"]');
        if (totalBadge) {
            totalBadge.textContent = this.stats.total || 0;
        }

        console.log('📊 Estadísticas:', this.stats);
    },

    /**
     * Renderizar tabla
     */
    renderizar(items = null) {
        const tbody = document.querySelector('#casilla table tbody');
        if (!tbody) {
            console.warn('⚠️ No se encontró tbody de casilla');
            return;
        }

        // Estilos iniciales para la transición si no existen
        if (!tbody.style.transition) {
            tbody.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }

        // Usar items filtrados o todos
        const itemsToRender = items !== null ? items : this.obtenerItemsFiltrados();

        if (itemsToRender.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 60px; color: #666; animation: fadeIn 0.5s ease-out;">
                        <div style="font-size: 64px; margin-bottom: 20px; filter: grayscale(1); opacity: 0.5;">📭</div>
                        <div style="font-weight: 500; letter-spacing: 1px;">No hay items en esta categoría</div>
                    </td>
                </tr>
            `;
            return;
        }

        // Renderizado con efecto stagger (opcional, aquí lo hacemos directo pero con la transición del tbody)
        tbody.innerHTML = itemsToRender.map((item, index) => this.renderizarFila(item, index)).join('');

        // Aplicar micro-animación a las nuevas filas
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, i) => {
            row.style.opacity = '0';
            row.style.transform = 'translateX(-10px)';
            row.style.transition = `all 0.3s ease-out ${i * 0.03}s`;

            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            }, 10);
        });

        console.log(`📋 ${itemsToRender.length} items renderizados`);
    },

    /**
     * Renderizar una fila
     */
    renderizarFila(item, index) {
        const tipo = this.tipos[item.tipo] || { icon: '📄', nombre: item.tipo };
        const fecha = new Date(item.fecha).toLocaleString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        const estadoClass = this.getEstadoClass(item.estado);

        return `
            <tr style="transition: background 0.2s;" 
                onmouseover="this.style.background='rgba(192,192,192,0.05)'" 
                onmouseout="this.style.background='transparent'">
                <td style="text-align: center;">${index + 1}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">${tipo.icon}</span>
                        <div>
                            <strong style="color: ${tipo.color};">${tipo.nombre}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${this.escaparHTML(item.titulo || 'N/A')}</strong>
                        ${item.subtitulo ? `<br><small style="color: #666;">${this.escaparHTML(item.subtitulo)}</small>` : ''}
                    </div>
                </td>
                <td>${fecha}</td>
                <td>
                    <span class="status-badge ${estadoClass}">${item.estado || 'Nuevo'}</span>
                </td>
                <td style="text-align: center;">
                    <button class="btn btn-primary" 
                            style="padding: 6px 12px; font-size: 12px; margin-right: 4px;" 
                            onclick="CasillaUnificada.verDetalle('${item.tipo}', '${item.referencia_id}')"
                            title="Ver detalles">
                        👁️ Ver
                    </button>
                    <button class="btn btn-primary" 
                            style="padding: 6px 12px; font-size: 12px; background:linear-gradient(135deg,#d4af37,#f1d582);color:#1a1a1a;" 
                            onclick="TimelineManager.abrir('${item.tipo === 'mesa_partes' ? 'mesa-partes' : item.tipo === 'expediente' ? 'expedientes' : 'solicitudes'}', '${item.referencia_id}', '${tipo.nombre}: ${item.referencia_id}')"
                            title="Ver Timeline">
                        📋
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * Obtener items filtrados
     */
    obtenerItemsFiltrados() {
        if (this.filtroActual === 'todos') {
            return this.data;
        }
        return this.data.filter(item => item.tipo === this.filtroActual);
    },

    /**
     * Filtrar por tipo
     */
    filtrar(tipo) {
        if (this.filtroActual === tipo) return;

        const tbody = document.querySelector('#casilla table tbody');
        if (tbody) {
            tbody.style.opacity = '0';
            tbody.style.transform = 'translateY(10px)';
        }

        setTimeout(() => {
            this.filtroActual = tipo;

            // Actualizar UI de botones
            document.querySelectorAll('[data-filtro-tipo]').forEach(btn => {
                const isActive = btn.dataset.filtroTipo === tipo;
                btn.classList.toggle('active', isActive);
                btn.classList.toggle('btn-primary', isActive);
                btn.classList.toggle('btn-secondary', !isActive);

                // Efecto de pulso en el badge activo
                const badge = btn.querySelector('.filter-badge');
                if (badge) {
                    badge.style.transform = isActive ? 'scale(1.2)' : 'scale(1)';
                    badge.style.boxShadow = isActive ? '0 0 10px rgba(255,255,255,0.5)' : 'none';
                }
            });

            this.renderizar();

            if (tbody) {
                setTimeout(() => {
                    tbody.style.opacity = '1';
                    tbody.style.transform = 'translateY(0)';
                }, 50);
            }
        }, 150);

        console.log(`🔍 Filtrado por: ${tipo}`);
    },

    /**
     * Buscar en items
     */
    buscar(query) {
        if (!query) {
            this.renderizar();
            return;
        }

        const queryLower = query.toLowerCase();
        const resultados = this.data.filter(item => {
            return (
                (item.titulo && item.titulo.toLowerCase().includes(queryLower)) ||
                (item.subtitulo && item.subtitulo.toLowerCase().includes(queryLower)) ||
                (item.estado && item.estado.toLowerCase().includes(queryLower))
            );
        });

        this.renderizar(resultados);
        console.log(`🔍 Búsqueda "${query}": ${resultados.length} resultados`);
    },

    /**
     * Ver detalle según tipo
     */
    async verDetalle(tipo, id) {
        // Abortar cualquier petición previa para evitar conflictos
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        showLoader('ANALIZANDO REGISTRO');

        try {
            console.log(`🔍 Cargando detalle: ${tipo} - ${id}`);

            const response = await fetch(`/api/casilla-electronica/${tipo}/${id}`, {
                signal: this.abortController.signal
            });
            const data = await response.json();

            hideLoader();

            if (data.success) {
                this.mostrarModal(tipo, data.data);
            } else {
                // Mostrar error específico
                const mensaje = data.error || 'Error obteniendo detalles';

                if (mensaje.includes('no existe')) {
                    this.mostrarError(`⚠️ La tabla "${tipo}" no existe en la base de datos. Por favor, créala primero.`);
                } else {
                    this.mostrarError(mensaje);
                }
            }
        } catch (error) {
            hideLoader();
            if (error.name === 'AbortError') {
                console.log('📥 Petición abortada por nueva carga');
                return;
            }
            console.error('❌ Error:', error);
            this.mostrarError('Error de conexión al obtener detalles');
        }
    },

    /**
     * Mostrar modal según tipo
     */
    async mostrarModal(tipo, datos) {
        let contenido;

        switch (tipo) {
            case 'registro':
                contenido = this.modalRegistro(datos);
                break;
            case 'mesa_partes':
                contenido = this.modalMesaPartes(datos);
                break;
            case 'expediente':
                contenido = this.modalExpediente(datos);
                break;
            case 'solicitud':
                contenido = await this.modalSolicitud(datos);
                break;
            default:
                contenido = this.modalGenerico(datos);
        }

        this.insertarModal(contenido);
    },

    /**
     * Modal para Registro de Usuario
     */
    modalRegistro(usuario) {
        return `
            <div class="modal" id="casillaModal" style="display: block; background: rgba(0,0,0,0.92); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 99999; animation: fadeIn 0.3s ease-out;">
                <div class="modal-content" style="max-width: 850px; border-radius: 35px; border: 1px solid rgba(212, 175, 55, 0.4); box-shadow: 0 50px 120px rgba(0,0,0,0.7); overflow: hidden; background: #ffffff; animation: modalSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 5vh;">
                    <!-- Header Premium -->
                    <div class="modal-header" style="background: linear-gradient(135deg, #050505 0%, #151515 100%); padding: 35px 50px; border-bottom: 4px solid var(--color-gold); display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('https://www.transparenttextures.com/patterns/dark-matter.png'); opacity: 0.15; pointer-events: none;"></div>
                        <div style="display: flex; align-items: center; gap: 25px; position: relative; z-index: 1;">
                            <div style="width: 65px; height: 65px; background: rgba(212, 175, 55, 0.15); border: 2px solid rgba(212, 175, 55, 0.4); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: var(--color-gold); font-size: 32px; box-shadow: 0 15px 30px rgba(0,0,0,0.3);">👤</div>
                            <div>
                                <h2 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.8px; text-transform: uppercase; font-family: 'Outfit', sans-serif;">Gestión de Usuario</h2>
                                <span style="color: var(--color-gold); font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9;">PERFIL ADMINISTRATIVO</span>
                            </div>
                        </div>
                        <button class="expediente-close" onclick="CasillaUnificada.cerrarModal()" style="width: 50px; height: 50px; border-radius: 50%; background: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid rgba(255,255,255,0.15); font-size: 32px; cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; justify-content: center;">&times;</button>
                    </div>
                    
                    <div class="modal-body" style="padding: 50px; background: #ffffff;">
                        <div style="display: grid; grid-template-columns: 1fr 0.8fr; gap: 35px; margin-bottom: 40px;">
                            <div class="expediente-info-card" style="background: #ffffff; border-radius: 28px; padding: 35px; box-shadow: 0 15px 50px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.06); position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: var(--color-gold);"></div>
                                <h3 style="color: #000; font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 20px;">🛡️</span> Datos Principales
                                </h3>
                                <div style="display: grid; grid-template-columns: 1fr; gap: 20px;">
                                    ${this.renderizarCampoModerno('Nombre Completo', usuario.nombre)}
                                    ${this.renderizarCampoModerno('Correo Electrónico', `<a href="mailto:${usuario.email}" style="color:#3498db; text-decoration:none; font-weight:600;">${usuario.email}</a>`)}
                                    ${this.renderizarCampoModerno('Identificador de Cuenta', `<span style="font-family:'JetBrains Mono'; font-weight:800; color:#d4af37;"># ${usuario.id}</span>`)}
                                </div>
                            </div>

                            <div style="display: flex; flex-direction: column; gap: 25px;">
                                <div class="expediente-info-card" style="background: #fdfdfd; border-radius: 28px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); position: relative; overflow: hidden;">
                                    <h3 style="color: #000; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px;">Estatus & Seguridad</h3>
                                    ${this.renderizarCampoModerno('Tipo de Perfil', `<span style="padding:4px 12px; background:#000; color:#fff; border-radius:8px; font-size:11px; font-weight:800;">${usuario.tipo.toUpperCase()}</span>`)}
                                    ${this.renderizarCampoModerno('Estado Operativo', usuario.activo ? '<span style="color:#27ae60; font-weight:800;">● ACTIVO</span>' : '<span style="color:#e74c3c; font-weight:800;">○ INACTIVO</span>')}
                                </div>
                                
                                <div class="expediente-info-card" style="background: #fdfdfd; border-radius: 28px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.05); position: relative; overflow: hidden;">
                                    <h3 style="color: #000; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 20px;">Estadísticas</h3>
                                    <div style="display: flex; gap: 20px;">
                                        <div style="flex:1; text-align:center; padding:15px; background:rgba(0,0,0,0.02); border-radius:15px;">
                                            <div style="font-size:24px; font-weight:900; color:#d4af37;">${usuario.presentaciones_count || 0}</div>
                                            <div style="font-size:10px; font-weight:800; color:#999; text-transform:uppercase;">Presentaciones</div>
                                        </div>
                                        <div style="flex:1; text-align:center; padding:15px; background:rgba(0,0,0,0.02); border-radius:15px;">
                                            <div style="font-size:24px; font-weight:900; color:#000;">${usuario.expedientes_count || 0}</div>
                                            <div style="font-size:10px; font-weight:800; color:#999; text-transform:uppercase;">Expedientes</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: center; gap: 20px;">
                            <button class="btn" style="background: #1a1a1a; color: white; padding: 18px 45px; border-radius: 18px; font-weight: 800; font-size: 13px; min-width: 200px; transition: all 0.3s;" onmouseover="this.style.background='#000'; this.style.transform='translateY(-3px)';" onmouseout="this.style.background='#1a1a1a'; this.style.transform='translateY(0)';" onclick="CasillaUnificada.cerrarModal()">CERRAR PERFIL</button>
                            <button class="btn" style="background: #eee; color: #333; padding: 18px 45px; border-radius: 18px; font-weight: 800; font-size: 13px; min-width: 200px; transition: all 0.3s;" onmouseover="this.style.background='#ddd'; this.style.transform='translateY(-3px)';" onmouseout="this.style.background='#eee'; this.style.transform='translateY(0)';" onclick="CasillaUnificada.cerrarModal(); showSection('usuarios'); setTimeout(() => editarUsuario('${usuario.id}'), 300);">EDITAR USUARIO</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Modal para Mesa de Partes
     */
    modalMesaPartes(presentacion) {
        const demandante = typeof presentacion.demandante === 'string' ? JSON.parse(presentacion.demandante) : (presentacion.demandante || {});
        const demandado = typeof presentacion.demandado === 'string' ? JSON.parse(presentacion.demandado) : (presentacion.demandado || {});
        const documentos = typeof presentacion.documentos === 'string' ? JSON.parse(presentacion.documentos) : (presentacion.documentos || []);
        const estadoClass = this.getEstadoClass(presentacion.estado);

        return `
            <style>
                @keyframes modalFadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes modalSlideUp { from { transform:translateY(20px) scale(0.97); opacity:0; } to { transform:translateY(0) scale(1); opacity:1; } }
            </style>
            <div class="modal" id="casillaModal" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); z-index:99999; animation:modalFadeIn 0.25s ease-out;">
                <div class="modal-content" style="max-width:720px; width:95%; border-radius:20px; border:1px solid rgba(212,175,55,0.3); box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden; background:#fff; animation:modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);">
                    <div style="background:linear-gradient(135deg,#111 0%,#1e1e1e 100%); padding:16px 22px; border-bottom:2px solid var(--color-gold); display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:36px; height:36px; background:rgba(212,175,55,0.15); border:1.5px solid rgba(212,175,55,0.4); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:17px;">📥</div>
                            <div>
                                <h2 style="margin:0; color:#fff; font-size:15px; font-weight:700; text-transform:uppercase;">Mesa de Partes</h2>
                                <span style="color:var(--color-gold); font-size:11px; font-weight:600; opacity:0.9;">REGISTRO OFICIAL &nbsp;${presentacion.numero_registro}</span>
                            </div>
                        </div>
                        <button onclick="CasillaUnificada.cerrarModal()" style="width:30px; height:30px; border-radius:50%; background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15); font-size:17px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='#d4af37';this.style.color='#000';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='#fff';">&times;</button>
                    </div>
                    <div style="padding:16px; background:#fff; max-height:72vh; overflow-y:auto;">
                        <div style="display:grid; grid-template-columns:1.4fr 0.6fr; gap:12px; margin-bottom:12px;">
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <div style="background:#fafafa; border-radius:12px; padding:14px; border:1px solid rgba(0,0,0,0.07); position:relative;">
                                    <div style="position:absolute; top:0; left:0; width:3px; height:100%; background:var(--color-gold); border-radius:12px 0 0 12px;"></div>
                                    <h3 style="color:#111; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 10px 8px;">📜 Información Estratégica</h3>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; padding-left:8px;">
                                        ${this.renderizarCampoModerno('Tipo', presentacion.tipo_presentacion)}
                                        ${this.renderizarCampoModerno('Materia', presentacion.materia)}
                                        ${this.renderizarCampoModerno('Estado', `<span class="status-badge ${estadoClass}" style="padding:3px 10px; font-size:10px; font-weight:700; border-radius:50px;">${presentacion.estado}</span>`)}
                                        ${this.renderizarCampoModerno('Fecha', new Date(presentacion.fecha_presentacion).toLocaleString('es-ES', {dateStyle:'short', timeStyle:'short'}))}
                                    </div>
                                </div>
                                <div style="background:#fafafa; border-radius:12px; padding:14px; border:1px solid rgba(0,0,0,0.07); position:relative;">
                                    <div style="position:absolute; top:0; left:0; width:3px; height:100%; background:#3498db; border-radius:12px 0 0 12px;"></div>
                                    <h3 style="color:#111; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 10px 8px;">👤 Demandante</h3>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; padding-left:8px;">
                                        ${this.renderizarCampoModerno('Nombre', `<span style="font-weight:700; font-size:13px;">${demandante.nombre || 'N/A'}</span>`)}
                                        ${this.renderizarCampoModerno('Documento', `${demandante.documento_tipo || ''} ${demandante.documento_numero || ''}`)}
                                        ${this.renderizarCampoModerno('Correo', `<a href="mailto:${demandante.correo}" style="color:#3498db; font-size:12px; text-decoration:none;">${demandante.correo || 'N/A'}</a>`)}
                                        ${this.renderizarCampoModerno('Teléfono', demandante.telefono || 'No disponible')}
                                    </div>
                                </div>
                                <div style="background:#fafafa; border-radius:12px; padding:14px; border:1px solid rgba(0,0,0,0.07); position:relative;">
                                    <div style="position:absolute; top:0; left:0; width:3px; height:100%; background:#e67e22; border-radius:12px 0 0 12px;"></div>
                                    <h3 style="color:#111; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 10px 8px;">⚖️ Demandado</h3>
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; padding-left:8px;">
                                        ${this.renderizarCampoModerno('Nombre / Razón Social', `<span style="font-weight:700; font-size:13px;">${demandado.nombre || 'N/A'}</span>`)}
                                        ${this.renderizarCampoModerno('Documento / RUC', `${demandado.documento_tipo || ''} ${demandado.documento_numero || ''}`)}
                                    </div>
                                </div>
                            </div>
                            <div style="background:#f8f9fa; border-radius:12px; padding:14px; border:1px solid rgba(0,0,0,0.06);">
                                <h3 style="color:#111; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 10px 0; display:flex; align-items:center; gap:6px;">📎 Archivos <span style="background:#d4af37; color:#000; font-size:10px; padding:1px 7px; border-radius:8px; margin-left:4px;">${documentos.length}</span></h3>
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    ${documentos.length > 0 ? documentos.map(doc => `
                                        <div style="padding:10px; background:#fff; border:1px solid rgba(0,0,0,0.07); border-radius:10px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--color-gold)';" onmouseout="this.style.borderColor='rgba(0,0,0,0.07)';" onclick="window.open('/uploads/mesa-partes/${doc.nombre_archivo}','_blank')">
                                            <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                                                <div style="width:28px; height:28px; background:#f0f0f0; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">📄</div>
                                                <div style="overflow:hidden;">
                                                    <strong style="display:block; font-size:11px; color:#1a1a1a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;">${this.escaparHTML(doc.nombre_original || 'Documento')}</strong>
                                                    <small style="font-size:10px; color:#999;">${(doc.tamano / 1024).toFixed(1)} KB</small>
                                                </div>
                                            </div>
                                            <span style="font-size:12px;">⬇️</span>
                                        </div>
                                    `).join('') : '<p style="text-align:center; color:#bbb; font-size:12px; padding:16px 0; margin:0;">Sin adjuntos</p>'}
                                </div>
                            </div>
                        </div>
                        <div style="background:#f9f9f9; border:1px solid rgba(0,0,0,0.06); border-radius:12px; padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                            <span style="color:#888; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">Acciones</span>
                            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                                <button style="background:#1a1a1a; color:#fff; padding:6px 12px; border-radius:8px; font-weight:700; font-size:11px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#000';" onmouseout="this.style.background='#1a1a1a';" onclick="CasillaUnificada.cerrarModal(); TimelineManager.abrir('mesa-partes','${presentacion.id}','Mesa de Partes: ${presentacion.numero_registro}')">📋 Seguimiento</button>
                                <button style="background:#34495e; color:#fff; padding:6px 12px; border-radius:8px; font-weight:700; font-size:11px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#2c3e50';" onmouseout="this.style.background='#34495e';" onclick="CasillaUnificada.editarMesaPartes('${presentacion.id}')">✏️ Editar</button>
                                <button style="background:#27ae60; color:#fff; padding:6px 12px; border-radius:8px; font-weight:700; font-size:11px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#219150';" onmouseout="this.style.background='#27ae60';" onclick="CasillaUnificada.responderMesaPartes('${presentacion.id}','${presentacion.usuario_id}','${presentacion.numero_registro}')">💬 Responder</button>
                                <button style="background:var(--color-gold); color:#000; padding:6px 12px; border-radius:8px; font-weight:700; font-size:11px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.opacity='0.85';" onmouseout="this.style.opacity='1';" onclick="CasillaUnificada.confirmarCambioEstado('mesa_partes','${presentacion.id}','Aprobado')">✅ Aprobar</button>
                                <button style="background:#e74c3c; color:#fff; padding:6px 12px; border-radius:8px; font-weight:700; font-size:11px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#c0392b';" onmouseout="this.style.background='#e74c3c';" onclick="CasillaUnificada.confirmarCambioEstado('mesa_partes','${presentacion.id}','Rechazado')">❌ Rechazar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    /**
     * Helper para renderizar campos con estilo moderno
     */
    renderizarCampoModerno(label, value) {
        return `
            <div style="display:flex; flex-direction:column; gap:5px; padding:10px; background:rgba(0,0,0,0.02); border-radius:10px; border:1px solid rgba(0,0,0,0.04); transition:all 0.2s;" onmouseover="this.style.background='rgba(212,175,55,0.05)'; this.style.borderColor='rgba(212,175,55,0.12)';" onmouseout="this.style.background='rgba(0,0,0,0.02)'; this.style.borderColor='rgba(0,0,0,0.04)';">
                <label style="margin:0; color:#888; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:1.2px;">${label}</label>
                <div style="color:#1a1a1a; font-size:13px; font-weight:600; line-height:1.4;">${value || '<span style="color:#ccc; font-style:italic;">No disponible</span>'}</div>
            </div>
        `;
    },

    /**
     * Modal para Expediente
     */
    modalExpediente(expediente) {
        const estadoClass = this.getEstadoClass(expediente.estado);
        return `
            <div class="modal" id="casillaModal" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); z-index:99999; animation:fadeIn 0.25s ease-out;">
                <div class="modal-content" style="max-width:640px; width:95%; border-radius:20px; border:1px solid rgba(212,175,55,0.3); box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden; background:#ffffff; animation:modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);">
                    <div class="modal-header" style="background:linear-gradient(135deg,#111 0%,#1e1e1e 100%); padding:18px 24px; border-bottom:2px solid var(--color-gold); display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:14px;">
                            <div style="width:38px; height:38px; background:rgba(212,175,55,0.15); border:1.5px solid rgba(212,175,55,0.4); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">📁</div>
                            <div>
                                <h2 style="margin:0; color:#fff; font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.3px;">Expediente Judicial</h2>
                                <span style="color:var(--color-gold); font-size:12px; font-weight:600; opacity:0.9;">ID: ${expediente.numero_expediente}</span>
                            </div>
                        </div>
                        <button onclick="CasillaUnificada.cerrarModal()" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='#d4af37';this.style.color='#000';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='#fff';">&times;</button>
                    </div>
                    <div class="modal-body" style="padding:20px; background:#fff; max-height:70vh; overflow-y:auto;">
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); position:relative;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--color-gold); border-radius:14px 0 0 14px;"></div>
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px 8px; display:flex; align-items:center; gap:8px;">📋 Resumen del Expediente</h3>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-left:8px;">
                                ${this.renderizarCampoModerno('Número', `<span style="font-weight:700; font-size:13px;">${expediente.numero_expediente}</span>`)}
                                ${this.renderizarCampoModerno('Estado', `<span class="status-badge ${estadoClass}" style="padding:4px 12px; font-size:11px; font-weight:700; border-radius:50px;">${expediente.estado}</span>`)}
                                ${this.renderizarCampoModerno('Sede', `<span style="font-weight:600; font-size:13px;">${expediente.sede}</span>`)}
                                ${this.renderizarCampoModerno('Especialidad', `<span style="font-weight:600; font-size:13px;">${expediente.especialidad}</span>`)}
                                ${this.renderizarCampoModerno('Proceso', `<span style="font-size:13px;">${expediente.proceso}</span>`)}
                                ${this.renderizarCampoModerno('Materia', `<span style="font-size:13px;">${expediente.materia}</span>`)}
                                ${this.renderizarCampoModerno('Usuario', `<span style="color:#3498db; font-weight:600; font-size:13px;">👤 ${expediente.usuario_nombre}</span>`)}
                            </div>
                        </div>
                    </div>
                    <div style="padding:14px 20px; display:flex; justify-content:flex-end; gap:10px; background:#f9f9f9; border-top:1px solid #eee;">
                        <button class="btn" style="background:#eee; color:#333; padding:9px 20px; border-radius:10px; font-weight:600; font-size:13px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#ddd';" onmouseout="this.style.background='#eee';" onclick="CasillaUnificada.cerrarModal()">Cerrar</button>
                        <button class="btn" style="background:var(--color-gold); color:#000; padding:9px 20px; border-radius:10px; font-weight:700; font-size:13px; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(212,175,55,0.25); transition:all 0.2s;" onmouseover="this.style.opacity='0.85';" onmouseout="this.style.opacity='1';" onclick="showSection('expedientes'); CasillaUnificada.cerrarModal()">Ver Expediente</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Modal para Solicitud
     */
    async modalSolicitud(solicitud) {
        const estadoClass = this.getEstadoClass(solicitud.estado);
        
        // Obtener documentos desde la API
        let documentos = [];
        try {
            const response = await fetch(`/api/solicitudes/${solicitud.id}/archivos`);
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
                documentos = data.data;
            }
        } catch (e) {
            console.error('Error obteniendo documentos:', e);
        }

        // Si no hay documentos desde la API, intentar parsear del campo documentos
        if (documentos.length === 0 && solicitud.documentos) {
            try {
                documentos = typeof solicitud.documentos === 'string' 
                    ? JSON.parse(solicitud.documentos) 
                    : solicitud.documentos;
                if (!Array.isArray(documentos)) documentos = [];
            } catch (e) {
                documentos = [];
            }
        }

        return `
            <div class="modal" id="casillaModal" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); z-index:99999; animation:fadeIn 0.25s ease-out;">
                <div class="modal-content" style="max-width:800px; width:95%; border-radius:20px; border:1px solid rgba(212,175,55,0.3); box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden; background:#ffffff; animation:modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1);">
                    <div class="modal-header" style="background:linear-gradient(135deg,#111 0%,#1e1e1e 100%); padding:18px 24px; border-bottom:2px solid var(--color-gold); display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:14px;">
                            <div style="width:38px; height:38px; background:rgba(212,175,55,0.15); border:1.5px solid rgba(212,175,55,0.4); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px;">📄</div>
                            <div>
                                <h2 style="margin:0; color:#fff; font-size:16px; font-weight:700; text-transform:uppercase; letter-spacing:0.3px;">Detalle de Solicitud</h2>
                                <span style="color:var(--color-gold); font-size:12px; font-weight:600; opacity:0.9;">ID: ${solicitud.id}</span>
                            </div>
                        </div>
                        <button onclick="CasillaUnificada.cerrarModal()" style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.08); color:#fff; border:1px solid rgba(255,255,255,0.15); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" onmouseover="this.style.background='#d4af37';this.style.color='#000';" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.color='#fff';">&times;</button>
                    </div>
                    <div class="modal-body" style="padding:20px; background:#fff; max-height:70vh; overflow-y:auto;">
                        <!-- Información General -->
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); position:relative; margin-bottom:14px;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:var(--color-gold); border-radius:14px 0 0 14px;"></div>
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px 8px; display:flex; align-items:center; gap:8px;">� Información General</h3>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-left:8px;">
                                ${this.renderizarCampoModerno('Asunto', `<span style="font-weight:700; font-size:13px;">${this.escaparHTML(solicitud.asunto)}</span>`)}
                                ${this.renderizarCampoModerno('Estado', `<span class="status-badge ${estadoClass}" style="padding:4px 12px; font-size:11px; font-weight:700; border-radius:50px;">${solicitud.estado}</span>`)}
                                ${this.renderizarCampoModerno('Tipo', `<span style="font-weight:600; font-size:13px;">${solicitud.tipo}</span>`)}
                                ${this.renderizarCampoModerno('Prioridad', `<span style="font-weight:600; font-size:13px;">${solicitud.prioridad || 'Normal'}</span>`)}
                                ${this.renderizarCampoModerno('Fecha', `<span style="font-weight:600; font-size:13px;">${new Date(solicitud.fecha || solicitud.fecha_creacion).toLocaleString('es-ES', {dateStyle:'medium', timeStyle:'short'})}</span>`)}
                                ${this.renderizarCampoModerno('Casilla', `<span style="font-weight:600; font-size:13px;">${solicitud.casilla_electronica || 'N/A'}</span>`)}
                            </div>
                        </div>

                        <!-- Solicitante -->
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); position:relative; margin-bottom:14px;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:#3498db; border-radius:14px 0 0 14px;"></div>
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px 8px; display:flex; align-items:center; gap:8px;">👤 Solicitante</h3>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-left:8px;">
                                ${this.renderizarCampoModerno('Nombre', `<span style="font-weight:600; font-size:13px;">${solicitud.nombre || 'N/A'}</span>`)}
                                ${this.renderizarCampoModerno('DNI/RUC', `<span style="font-weight:600; font-size:13px;">${solicitud.dni || 'N/A'}</span>`)}
                                ${this.renderizarCampoModerno('Email', `<a href="mailto:${solicitud.email}" style="color:#3498db; font-size:13px; text-decoration:none;">${solicitud.email || 'N/A'}</a>`)}
                                ${this.renderizarCampoModerno('Teléfono', `<span style="font-weight:600; font-size:13px;">${solicitud.telefono || 'N/A'}</span>`)}
                            </div>
                        </div>

                        <!-- Demandado -->
                        ${solicitud.demandado_nombre ? `
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); position:relative; margin-bottom:14px;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:#e74c3c; border-radius:14px 0 0 14px;"></div>
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px 8px; display:flex; align-items:center; gap:8px;">⚖️ Demandado / Contraparte</h3>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-left:8px;">
                                ${this.renderizarCampoModerno('Nombre', `<span style="font-weight:600; font-size:13px;">${solicitud.demandado_nombre || 'N/A'}</span>`)}
                                ${this.renderizarCampoModerno('DNI/RUC', `<span style="font-weight:600; font-size:13px;">${solicitud.demandado_dni || 'N/A'}</span>`)}
                                ${this.renderizarCampoModerno('Email', `<a href="mailto:${solicitud.demandado_email}" style="color:#3498db; font-size:13px; text-decoration:none;">${solicitud.demandado_email || 'N/A'}</a>`)}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Descripción -->
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); margin-bottom:14px;">
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 10px 0; display:flex; align-items:center; gap:8px;">📝 Descripción</h3>
                            <p style="line-height:1.7; color:#444; font-size:13px; background:#fff; padding:14px; border-radius:10px; border:1px solid rgba(0,0,0,0.05); white-space:pre-wrap; margin:0;">${this.escaparHTML(solicitud.descripcion || 'Sin descripción detallada')}</p>
                        </div>

                        <!-- Documentos -->
                        ${documentos.length > 0 ? `
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); position:relative; margin-bottom:14px;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:#27ae60; border-radius:14px 0 0 14px;"></div>
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px 8px; display:flex; align-items:center; gap:8px;">📎 Documentos Adjuntos (${documentos.length})</h3>
                            <div style="padding-left:8px;">
                                ${documentos.map(doc => `
                                    <div style="display:flex; align-items:center; gap:10px; padding:10px; background:#fff; border-radius:8px; margin-bottom:8px; border:1px solid rgba(0,0,0,0.05);">
                                        <span style="font-size:16px;">${doc.tipo === 'principal' ? '📄' : '📎'}</span>
                                        <div style="flex:1;">
                                            <div style="font-weight:600; font-size:12px;">${doc.nombre_original || doc.nombre}</div>
                                            <div style="font-size:10px; color:#666;">${doc.tipo ? doc.tipo.toUpperCase() : 'ANEXO'} • ${(doc.tamano / 1024 / 1024).toFixed(2)} MB</div>
                                        </div>
                                        <a href="/uploads/${doc.nombre_archivo}" target="_blank" style="padding:6px 12px; background:#27ae60; color:white; border-radius:6px; text-decoration:none; font-size:11px; font-weight:600;">Descargar</a>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}

                        <!-- Expediente Vinculado -->
                        ${solicitud.numero_expediente ? `
                        <div style="background:#fafafa; border-radius:14px; padding:18px; border:1px solid rgba(0,0,0,0.07); position:relative; margin-bottom:14px;">
                            <div style="position:absolute; top:0; left:0; width:4px; height:100%; background:#9b59b6; border-radius:14px 0 0 14px;"></div>
                            <h3 style="color:#111; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 14px 8px; display:flex; align-items:center; gap:8px;">🏛️ Expediente Vinculado</h3>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-left:8px;">
                                ${this.renderizarCampoModerno('Número', `<span style="font-weight:600; font-size:13px;">${solicitud.numero_expediente}</span>`)}
                                ${this.renderizarCampoModerno('Sede', `<span style="font-weight:600; font-size:13px;">${solicitud.sede || 'N/A'}</span>`)}
                                ${this.renderizarCampoModerno('Especialidad', `<span style="font-weight:600; font-size:13px;">${solicitud.especialidad || 'N/A'}</span>`)}
                                ${this.renderizarCampoModerno('Materia', `<span style="font-weight:600; font-size:13px;">${solicitud.materia || 'N/A'}</span>`)}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div style="padding:14px 20px; display:flex; justify-content:flex-end; gap:10px; background:#f9f9f9; border-top:1px solid #eee;">
                        <button class="btn" style="background:#eee; color:#333; padding:9px 20px; border-radius:10px; font-weight:600; font-size:13px; border:none; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#ddd';" onmouseout="this.style.background='#eee';" onclick="CasillaUnificada.cerrarModal()">Cerrar</button>
                        <button class="btn" style="background:#27ae60; color:#fff; padding:9px 20px; border-radius:10px; font-weight:700; font-size:13px; border:none; cursor:pointer; box-shadow:0 4px 12px rgba(39,174,96,0.25); transition:all 0.2s;" onmouseover="this.style.background='#2ecc71';" onmouseout="this.style.background='#27ae60';" onclick="CasillaUnificada.responderSolicitud('${solicitud.id}','${solicitud.usuario_id}','${solicitud.asunto}')">Responder</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Modal genérico
     */
    modalGenerico(datos) {
        return `
            <div class="modal" id="casillaModal" style="display: block; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px);">
                <div class="modal-content" style="max-width: 800px; border-radius: 30px; border: 1px solid rgba(212, 175, 55, 0.3); overflow: hidden; background: #fff; animation: modalSlideUp 0.5s ease-out;">
                    <div class="modal-header" style="background: #000; padding: 25px 40px; border-bottom: 3px solid #d4af37; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; color: #fff; font-size: 20px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">📄 Detalles del Registro</h2>
                        <button class="expediente-close" onclick="CasillaUnificada.cerrarModal()" style="color:#fff;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 40px; max-height: 70vh; overflow-y: auto;">
                        <div style="background: #f8f9fa; border-radius: 20px; padding: 25px; border: 1px solid #eee;">
                            <pre style="margin:0; font-family:'JetBrains Mono'; font-size:13px; color:#333; line-height:1.6; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(datos, null, 4)}</pre>
                        </div>
                    </div>
                    <div style="padding: 30px; display: flex; justify-content: center; background: #fdfdfd; border-top: 1px solid #eee;">
                        <button class="btn" style="background: #000; color: #fff; padding: 15px 40px; border-radius: 15px; font-weight: 700; transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onclick="CasillaUnificada.cerrarModal()">ENTENDIDO</button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Renderizar campo de información
     */
    renderizarCampo(label, value) {
        if (!value || value === 'null' || value === 'undefined') {
            value = 'N/A';
        }
        return `
            <div class="expediente-info-item">
                <span class="expediente-info-label">${label}:</span>
                <span class="expediente-info-value">${value}</span>
            </div>
        `;
    },

    /**
     * NUEVO: Modal de Confirmación de Cambio de Estado (Pro-Max)
     */
    confirmarCambioEstado(tipo, id, nuevoEstado) {
        const modalId = 'modalConfirmarEstado';
        const color = nuevoEstado === 'Aprobado' ? '#27ae60' : '#e74c3c';
        const icono = nuevoEstado === 'Aprobado' ? '✅' : '❌';

        const modalHTML = `
            <div id="${modalId}" style="display:flex; position:fixed; z-index:100000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter: blur(10px); align-items:center; justify-content:center; animation: fadeIn 0.3s ease-out;">
                <div style="background:#ffffff; width:90%; max-width:500px; border-radius:30px; overflow:hidden; box-shadow:0 30px 70px rgba(0,0,0,0.5); border: 1px solid rgba(0,0,0,0.05); transform: translateY(20px); animation: modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;">
                    <div style="background:${color}; padding:40px; text-align:center;">
                        <div style="font-size:60px; margin-bottom:15px; animation: scaleIn 0.5s ease-out;">${icono}</div>
                        <h2 style="color:white; margin:0; font-size:24px; font-weight:800; letter-spacing:-0.5px;">${nuevoEstado.toUpperCase()}</h2>
                        <p style="color:rgba(255,255,255,0.8); margin:10px 0 0 0; font-size:14px;">Confirmar procesamiento de documento</p>
                    </div>
                    
                    <div style="padding:40px;">
                        <label style="color:#666; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; display:block;">Observaciones Administrativas</label>
                        <textarea id="obs-cambio-estado" placeholder="Ingrese las observaciones para el usuario..." 
                                  style="width:100%; padding:20px; border:1px solid #eee; border-radius:18px; font-family:inherit; font-size:14px; background:#f9f9f9; resize:none; height:120px; transition:all 0.3s;"
                                  onfocus="this.style.borderColor='${color}'; this.style.background='white'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.03)';"></textarea>
                        
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-top:30px;">
                            <button onclick="document.getElementById('${modalId}').remove()" 
                                    style="padding:16px; background:#f5f5f5; color:#666; border:none; border-radius:15px; cursor:pointer; font-weight:700; font-size:13px; transition:all 0.2s;"
                                    onmouseover="this.style.background='#eee'" onmouseout="this.style.background='#f5f5f5'">
                                CANCELAR
                            </button>
                            <button onclick="CasillaUnificada.cambiarEstado('${tipo}', '${id}', '${nuevoEstado}', document.getElementById('obs-cambio-estado').value)" 
                                    style="padding:16px; background:${color}; color:white; border:none; border-radius:15px; cursor:pointer; font-weight:700; font-size:13px; box-shadow:0 10px 20px ${color}44; transition:all 0.2s;"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.filter='brightness(1.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.filter='none'">
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <style>
                @keyframes modalSlideUp { to { transform: translateY(0); } }
                @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        setTimeout(() => document.getElementById('obs-cambio-estado').focus(), 100);
    },

    /**
     * Cambiar estado de un item (Actualizado)
     */
    async cambiarEstado(tipo, id, nuevoEstado, observaciones = '') {
        try {
            // Cerrar el modal de confirmación si existe
            const modalConfirmar = document.getElementById('modalConfirmarEstado');
            if (modalConfirmar) modalConfirmar.remove();

            this.mostrarCargando('Actualizando estado...');

            let endpoint;
            switch (tipo) {
                case 'mesa_partes':
                    endpoint = `/api/mesa-partes/${id}/estado`;
                    break;
                default:
                    throw new Error('Tipo no soportado para cambio de estado');
            }

            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: nuevoEstado, observaciones })
            });

            const data = await response.json();

            if (data.success) {
                this.mostrarExito(`Documento ${nuevoEstado} correctamente`);
                this.cerrarModal();
                await this.cargar();
            } else {
                throw new Error(data.error || 'Error cambiando estado');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.mostrarError('Error cambiando estado: ' + error.message);
        }
    },

    /**
     * NUEVO: Mostrar overlay de carga
     */
    mostrarCargando(mensaje) {
        this.cerrarCargando();
        const loadingHTML = `
            <div id="loading-overlay-admin" style="position:fixed; z-index:50000; left:0; top:0; width:100%; height:100%; background:rgba(255,255,255,0.8); backdrop-filter:blur(5px); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px;">
                <div style="width:50px; height:50px; border:4px solid #eee; border-top:4px solid var(--color-gold); border-radius:50%; animation: spin 1s linear infinite;"></div>
                <div style="font-weight:700; color:var(--color-dark); letter-spacing:1px; font-size:12px; text-transform:uppercase;">${mensaje}</div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    },

    /**
     * NUEVO: Cerrar overlay de carga
     */
    cerrarCargando() {
        const overlay = document.getElementById('loading-overlay-admin');
        if (overlay) overlay.remove();
    },

    /**
     * Insertar modal en DOM
     */
    insertarModal(contenido) {
        this.cerrarModal(); // Cerrar modal existente
        document.body.insertAdjacentHTML('beforeend', contenido);
        document.body.style.overflow = 'hidden';
    },

    /**
     * Cerrar modal
     */
    cerrarModal() {
        const modal = document.getElementById('casillaModal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    },

    /**
     * Obtener clase de estado
     */
    getEstadoClass(estado) {
        if (!estado) return 'status-pending';
        const estadoLower = estado.toLowerCase();
        if (estadoLower.includes('pendiente')) return 'status-pending';
        if (estadoLower.includes('aprobado')) return 'status-approved';
        if (estadoLower.includes('rechazado')) return 'status-rejected';
        if (estadoLower.includes('revisión')) return 'status-in-progress';
        return 'status-pending';
    },

    /**
     * Escapar HTML para prevenir XSS
     */
    escaparHTML(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    },

    /**
     * Mostrar error (Mejorado con SweetAlert2)
     */
    mostrarError(mensaje) {
        this.cerrarCargando();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: '¡Error!',
                text: mensaje,
                background: '#fff',
                confirmButtonColor: '#d4af37',
                confirmButtonText: 'Entendido',
                customClass: {
                    popup: 'premium-swal-popup',
                    title: 'premium-swal-title'
                }
            });
        } else if (window.conexionDatos && window.conexionDatos.mostrarNotificacion) {
            window.conexionDatos.mostrarNotificacion(mensaje, 'error');
        } else {
            alert('❌ ' + mensaje);
        }
    },

    /**
     * Mostrar éxito (Mejorado con SweetAlert2)
     */
    mostrarExito(mensaje) {
        this.cerrarCargando();

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: mensaje,
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
                background: '#fff',
                customClass: {
                    popup: 'premium-swal-popup-success'
                }
            });
        } else if (window.conexionDatos && window.conexionDatos.mostrarNotificacion) {
            window.conexionDatos.mostrarNotificacion(mensaje, 'success');
        } else {
            alert('✅ ' + mensaje);
        }
    },

    /**
     * Responder a Mesa de Partes (UI Pro Max)
     */
    async responderMesaPartes(presentacionId, usuarioId, numeroRegistro) {
        showLoader('PREPARANDO FORMULARIO');
        try {
            // Obtener datos de la presentación
            const response = await fetch(`/api/mesa-partes/${presentacionId}`);
            const data = await response.json();

            hideLoader();

            if (!data.success) {
                alert('Error obteniendo datos de la presentación');
                return;
            }

            const presentacion = data.data;
            const demandante = presentacion.demandante || {};

            // Ocultar el modal de detalle mientras se responde
            const casillaModal = document.getElementById('casillaModal');
            if (casillaModal) casillaModal.style.display = 'none';

            // Crear modal de respuesta
            const modalHTML = `
                <div id="modalResponderMesaPartes" style="display:flex; position:fixed; z-index:30000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); justify-content:center; align-items:center; animation: modalFadeIn 0.3s ease-out;">
                    <div style="background:#ffffff; width:95%; max-width:650px; border-radius:32px; box-shadow:0 30px 100px rgba(0,0,0,0.5); border:1px solid rgba(212, 175, 55, 0.3); overflow:hidden; animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                        <!-- Header Premium -->
                        <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 30px 40px; border-bottom: 3px solid #d4af37; display: flex; justify-content: space-between; align-items: center; position: relative;">
                            <div style="display: flex; align-items: center; gap: 15px; position: relative; z-index: 1;">
                                <div style="width: 48px; height: 48px; background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 24px;">💬</div>
                                <div>
                                    <h2 style="margin: 0; color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Responder Mesa de Partes</h2>
                                    <span style="color: rgba(212, 175, 55, 0.8); font-size: 11px; font-weight: 700; letter-spacing: 1px;">GESTIÓN ADMINISTRATIVA TMARC</span>
                                </div>
                            </div>
                            <button onclick="CasillaUnificada.cerrarModalRespuesta()" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); font-size: 24px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center;">&times;</button>
                        </div>
                        
                        <div style="padding: 40px;">
                            <!-- Info Card (Glass) -->
                            <div style="background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); padding: 25px; border-radius: 20px; margin-bottom: 30px; position: relative; overflow: hidden;">
                                <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #d4af37;"></div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div>
                                        <label style="display: block; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Expediente / Registro</label>
                                        <span style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #333; font-size: 14px;">${numeroRegistro}</span>
                                    </div>
                                    <div>
                                        <label style="display: block; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Tipo de Presentación</label>
                                        <span style="font-weight: 700; color: #333; font-size: 14px;">${presentacion.tipo_presentacion || 'No especificado'}</span>
                                    </div>
                                    <div style="grid-column: span 2;">
                                        <label style="display: block; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Interesado / Solicitante</label>
                                        <span style="font-weight: 700; color: #333; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                                            <div style="width: 20px; height: 20px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px;">👤</div>
                                            ${demandante.nombre || 'No especificado'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <form id="formResponderMesaPartes" onsubmit="CasillaUnificada.enviarRespuestaMesaPartes(event, '${presentacionId}', '${usuarioId}')" style="display: flex; flex-direction: column; gap: 25px;">
                                <div>
                                    <label style="display:block; margin-bottom:10px; color:#1a1a1a; font-weight:800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Asunto de la Respuesta</label>
                                    <input type="text" id="respuesta-mp-asunto" required 
                                        style="width:100%; padding:15px 20px; border:2px solid #eee; border-radius:15px; font-size:15px; transition: all 0.3s; font-weight: 600;"
                                        placeholder="Ej: Respuesta a su presentación ${numeroRegistro}"
                                        onfocus="this.style.borderColor='#d4af37'; this.style.boxShadow='0 0 0 4px rgba(212, 175, 55, 0.1)';"
                                        onblur="this.style.borderColor='#eee'; this.style.boxShadow='none';">
                                </div>

                                <div>
                                    <label style="display:block; margin-bottom:10px; color:#1a1a1a; font-weight:800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Cuerpo del Mensaje</label>
                                    <textarea id="respuesta-mp-mensaje" required rows="6"
                                        style="width:100%; padding:15px 20px; border:2px solid #eee; border-radius:18px; font-size:15px; resize:vertical; transition: all 0.3s; font-weight: 500; line-height: 1.6;"
                                        placeholder="Escriba su respuesta formal aquí..."
                                        onfocus="this.style.borderColor='#d4af37'; this.style.boxShadow='0 0 0 4px rgba(212, 175, 55, 0.1)';"
                                        onblur="this.style.borderColor='#eee'; this.style.boxShadow='none';"></textarea>
                                </div>

                                <div>
                                    <label style="display:block; margin-bottom:10px; color:#1a1a1a; font-weight:800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">📎 Documento Adjunto (PDF/Doc/Imágenes)</label>
                                    <div style="position: relative;">
                                        <input type="file" id="respuesta-mp-archivo" 
                                            style="width:100%; padding:12px 15px; border:2px dashed #ddd; border-radius:15px; font-size:13px; background: #fafafa;"
                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                                        <div style="margin-top: 8px; font-size: 11px; color: #888; display: flex; justify-content: space-between; font-weight: 500;">
                                            <span>Formatos: PDF, Word, JPG, PNG</span>
                                            <span>Tamaño máx: 10MB</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Botones de Acción -->
                                <div style="display:flex; gap:15px; margin-top:15px;">
                                    <button type="button" onclick="CasillaUnificada.cerrarModalRespuesta()" 
                                        style="flex: 1; padding:18px; background:#f5f5f5; color:#666; border:none; border-radius:18px; cursor:pointer; font-size:14px; font-weight: 800; transition: all 0.3s;"
                                        onmouseover="this.style.background='#eee'; this.style.color='#333';"
                                        onmouseout="this.style.background='#f5f5f5'; this.style.color='#666';">
                                        ❌ Cancelar
                                    </button>
                                    <button type="submit" 
                                        style="flex: 2; padding:18px; background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color:#fff; border:none; border-radius:18px; cursor:pointer; font-size:14px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.3s; box-shadow: 0 10px 20px rgba(39, 174, 96, 0.2);"
                                        onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 15px 30px rgba(39, 174, 96, 0.3)';"
                                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 10px 20px rgba(39, 174, 96, 0.2)';"
                                        onclick="this.innerHTML='<div class=\'loader-small\'></div> Enviando...'">
                                        🚀 ENVIAR RESPUESTA OFICIAL
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;

            // Agregar modal al body
            const modalDiv = document.createElement('div');
            modalDiv.innerHTML = modalHTML;
            document.body.appendChild(modalDiv);

        } catch (error) {
            console.error('Error abriendo modal de respuesta:', error);
            alert('Error al abrir el formulario de respuesta');
        }
    },

    /**
     * Cerrar modal de respuesta
     */
    cerrarModalRespuesta() {
        const modal = document.getElementById('modalResponderMesaPartes');
        if (modal) {
            modal.parentElement.remove();
        }
        // Restaurar modal de detalle si existe
        const casillaModal = document.getElementById('casillaModal');
        if (casillaModal) casillaModal.style.display = 'block';
    },

    /**
     * Enviar respuesta de Mesa de Partes
     */
    async enviarRespuestaMesaPartes(event, presentacionId, usuarioId) {
        event.preventDefault();

        const asunto = document.getElementById('respuesta-mp-asunto').value;
        const mensaje = document.getElementById('respuesta-mp-mensaje').value;
        const archivoInput = document.getElementById('respuesta-mp-archivo');
        const archivo = archivoInput?.files[0];

        if (!asunto || !mensaje) {
            alert('Por favor, complete todos los campos obligatorios');
            return;
        }

        // Validar tamaño del archivo (10MB máximo)
        if (archivo && archivo.size > 10 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 10MB.');
            return;
        }

        try {
            console.log('📤 Enviando respuesta a Mesa de Partes:', presentacionId);

            const formData = new FormData();
            formData.append('usuario_id', usuarioId);
            formData.append('tipo', 'respuesta_admin');
            formData.append('titulo', asunto);
            formData.append('mensaje', mensaje);
            formData.append('referencia_tipo', 'mesa_partes');
            formData.append('referencia_id', presentacionId);

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
                    ? '✅ Respuesta enviada correctamente con archivo adjunto. El usuario la verá en su Casilla Electrónica.'
                    : '✅ Respuesta enviada correctamente. El usuario la verá en su Casilla Electrónica.';

                alert(mensajeExito);
                this.cerrarModalRespuesta();
                this.cerrarModal();

                // Refrescar casilla
                await this.cargar();
            } else {
                throw new Error(data.error || 'Error enviando respuesta');
            }
        } catch (error) {
            console.error('❌ Error enviando respuesta:', error);
            alert('❌ Error al enviar la respuesta: ' + error.message);
        }
    },

    /**
     * Refrescar datos
     */
    async refrescar() {
        const btn = event?.target;
        if (btn) {
            btn.disabled = true;
            btn.textContent = '🔄 Actualizando...';
        }

        await this.cargar();

        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔄 Refrescar';
        }

        this.mostrarExito('Casilla actualizada');
    },

    /**
     * Abrir modal para editar datos de Mesa de Partes
     */
    async editarMesaPartes(id) {
        console.log('🔍 [DEBUG] editarMesaPartes id:', id);
        if (!id || id === 'undefined') {
            alert('Error: ID de presentación no válido');
            return;
        }
        try {
            this.mostrarCargando('Obteniendo datos...');
            const response = await fetch(`/api/mesa-partes/${id}`);
            const data = await response.json();
            this.cerrarCargando();

            if (!data.success) throw new Error(data.error);

            const presentacion = data.data;
            // Usar el ID real de la base de datos si está disponible, sino el que llegó
            const targetId = presentacion.id || id;
            
            // Formatear fecha para datetime-local (YYYY-MM-DDTHH:mm)
            const fechaPresentacion = presentacion.fecha_presentacion || presentacion.fecha_registro;
            const fechaActual = fechaPresentacion ? new Date(fechaPresentacion).toISOString().slice(0, 16) : '';

            const modalId = 'modalEditarMesaPartes';
            const modalHTML = `
                <div id="${modalId}" style="display:flex; position:fixed; z-index:100001; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter: blur(15px); align-items:center; justify-content:center; animation: fadeIn 0.3s ease-out;">
                    <div style="background:#ffffff; width:95%; max-width:600px; border-radius:35px; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(212, 175, 55, 0.3); transform: translateY(20px); animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
                        <div style="background: linear-gradient(135deg, #000 0%, #222 100%); padding:30px 40px; border-bottom: 4px solid #d4af37; display:flex; justify-content:space-between; align-items:center;">
                            <div style="display:flex; align-items:center; gap:15px;">
                                <div style="font-size:24px;">✏️</div>
                                <div>
                                    <h2 style="color:white; margin:0; font-size:20px; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Editar Presentación</h2>
                                    <span style="color:#d4af37; font-size:11px; font-weight:700;">${presentacion.numero_registro}</span>
                                </div>
                            </div>
                            <button onclick="document.getElementById('${modalId}').remove()" style="background:none; border:none; color:white; font-size:30px; cursor:pointer; opacity:0.7; transition:0.3s;" onmouseover="this.style.opacity='1'">&times;</button>
                        </div>
                        
                        <div style="padding:40px;">
                            <div style="display:grid; grid-template-columns:1fr; gap:25px;">
                                <div>
                                    <label style="color:#888; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:block;">📅 Fecha de Ingreso</label>
                                    <input type="datetime-local" id="edit-fecha-presentacion" value="${fechaActual}" 
                                           style="width:100%; padding:15px 20px; border:2px solid #eee; border-radius:15px; font-size:15px; background:#f9f9f9; font-weight:600; font-family:inherit; transition:0.3s;"
                                           onfocus="this.style.borderColor='#d4af37'; this.style.background='white';">
                                </div>
                                
                                <div>
                                    <label style="color:#888; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:block;">📝 Materia / Asunto</label>
                                    <input type="text" id="edit-materia" value="${presentacion.materia || ''}" 
                                           style="width:100%; padding:15px 20px; border:2px solid #eee; border-radius:15px; font-size:15px; background:#f9f9f9; font-weight:600; font-family:inherit; transition:0.3s;"
                                           onfocus="this.style.borderColor='#d4af37'; this.style.background='white';">
                                </div>

                                <div>
                                    <label style="color:#888; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; display:block;">📂 Tipo de Presentación</label>
                                    <select id="edit-tipo-presentacion" style="width:100%; padding:15px 20px; border:2px solid #eee; border-radius:15px; font-size:15px; background:#f9f9f9; font-weight:600; font-family:inherit; transition:0.3s;"
                                            onfocus="this.style.borderColor='#d4af37'; this.style.background='white';">
                                        <option value="Arbitraje" ${presentacion.tipo_presentacion === 'Arbitraje' ? 'selected' : ''}>Arbitraje</option>
                                        <option value="Mesa de Partes" ${presentacion.tipo_presentacion === 'Mesa de Partes' ? 'selected' : ''}>Mesa de Partes</option>
                                        <option value="OTRO" ${presentacion.tipo_presentacion === 'OTRO' ? 'selected' : ''}>OTRO</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:40px;">
                                <button onclick="document.getElementById('${modalId}').remove()" 
                                        style="padding:18px; background:#f5f5f5; color:#666; border:none; border-radius:18px; cursor:pointer; font-weight:700; transition:all 0.3s;"
                                        onmouseover="this.style.background='#eee'">CANCELAR</button>
                                <button onclick="CasillaUnificada.guardarEdicionMesaPartes('${targetId}')" 
                                        style="padding:18px; background:linear-gradient(135deg, #d4af37, #f1d582); color:#000; border:none; border-radius:18px; cursor:pointer; font-weight:800; box-shadow:0 10px 20px rgba(212,175,55,0.2); transition:all 0.3s;"
                                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 15px 30px rgba(212,175,55,0.3)';"
                                        onmouseout="this.style.transform='translateY(0)';">GUARDAR CAMBIOS</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        } catch (error) {
            this.cerrarCargando();
            console.error('Error:', error);
            this.mostrarError('Error al cargar datos para edición');
        }
    },

    /**
     * Responder a una Solicitud (UI Pro Max)
     */
    async responderSolicitud(solicitudId, usuarioId, asuntoOriginal) {
        // Ocultar el modal de detalle mientras se responde
        const casillaModal = document.getElementById('casillaModal');
        if (casillaModal) casillaModal.style.display = 'none';

        const modalHTML = `
            <div id="modalResponderSolicitud" style="display:flex; position:fixed; z-index:30000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(8px); justify-content:center; align-items:center; animation: modalFadeIn 0.3s ease-out;">
                <div style="background:#ffffff; width:95%; max-width:650px; border-radius:32px; box-shadow:0 30px 100px rgba(0,0,0,0.5); border:1px solid rgba(212, 175, 55, 0.3); overflow:hidden; animation: modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                    <!-- Header Premium -->
                    <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 30px 40px; border-bottom: 3px solid #d4af37; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 48px; height: 48px; background: rgba(212, 175, 55, 0.1); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #d4af37; font-size: 24px;">💬</div>
                            <div>
                                <h2 style="margin: 0; color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase;">Responder Solicitud</h2>
                                <span style="color: rgba(212, 175, 55, 0.8); font-size: 11px; font-weight: 700; letter-spacing: 1px;">GESTIÓN ADMINISTRATIVA TMARC</span>
                            </div>
                        </div>
                        <button onclick="CasillaUnificada.cerrarModalRespuestaSolicitud()" style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); font-size: 24px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center;">&times;</button>
                    </div>

                    <div style="padding: 40px;">
                        <!-- Info Card -->
                        <div style="background: #f8f9fa; border: 1px solid rgba(0,0,0,0.05); padding: 20px 25px; border-radius: 20px; margin-bottom: 30px; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #9C27B0;"></div>
                            <label style="display: block; font-size: 10px; font-weight: 800; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Solicitud referenciada</label>
                            <span style="font-weight: 700; color: #333; font-size: 14px;">${this.escaparHTML(asuntoOriginal)}</span>
                        </div>

                        <form id="formResponderSolicitud" onsubmit="CasillaUnificada.enviarRespuestaSolicitud(event, '${solicitudId}', '${usuarioId}')" style="display: flex; flex-direction: column; gap: 25px;">
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Asunto de la respuesta *</label>
                                <input type="text" id="sol-resp-asunto" required placeholder="Ej: Respuesta a su solicitud"
                                    style="width:100%; padding:14px 18px; border:2px solid #eee; border-radius:14px; font-size:14px; font-family:inherit; transition:0.3s;"
                                    onfocus="this.style.borderColor='#d4af37'" onblur="this.style.borderColor='#eee'">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Mensaje *</label>
                                <textarea id="sol-resp-mensaje" required rows="5" placeholder="Escriba su respuesta aquí..."
                                    style="width:100%; padding:14px 18px; border:2px solid #eee; border-radius:14px; font-size:14px; font-family:inherit; resize:vertical; transition:0.3s;"
                                    onfocus="this.style.borderColor='#d4af37'" onblur="this.style.borderColor='#eee'"></textarea>
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">📎 Adjuntar archivo (opcional)</label>
                                <input type="file" id="sol-resp-archivo" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    style="width:100%; padding:12px 18px; border:2px solid #eee; border-radius:14px; font-size:13px; font-family:inherit;">
                                <small style="color:#888; font-size:11px; margin-top:5px; display:block;">PDF, Word, imágenes — máx. 10 MB</small>
                            </div>
                            <div style="display:flex; gap:15px; justify-content:flex-end; padding-top:10px; border-top:1px solid #eee;">
                                <button type="button" onclick="CasillaUnificada.cerrarModalRespuestaSolicitud()"
                                    style="padding:14px 30px; background:#f5f5f5; color:#555; border:none; border-radius:14px; font-weight:700; cursor:pointer; font-family:inherit;">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    style="padding:14px 35px; background:linear-gradient(135deg, #9C27B0, #CE93D8); color:#fff; border:none; border-radius:14px; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 8px 20px rgba(156,39,176,0.25);">
                                    📤 Enviar Respuesta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    },

    /**
     * Cerrar modal de respuesta de solicitud
     */
    cerrarModalRespuestaSolicitud() {
        const modal = document.getElementById('modalResponderSolicitud');
        if (modal) modal.remove();
        // Restaurar modal de detalle si estaba visible
        const casillaModal = document.getElementById('casillaModal');
        if (casillaModal) casillaModal.style.display = 'block';
    },

    /**
     * Enviar respuesta de Solicitud
     */
    async enviarRespuestaSolicitud(event, solicitudId, usuarioId) {
        event.preventDefault();

        const asunto = document.getElementById('sol-resp-asunto').value;
        const mensaje = document.getElementById('sol-resp-mensaje').value;
        const archivoInput = document.getElementById('sol-resp-archivo');
        const archivo = archivoInput?.files[0];

        if (!asunto || !mensaje) {
            this.mostrarError('Por favor, complete todos los campos obligatorios');
            return;
        }
        if (archivo && archivo.size > 10 * 1024 * 1024) {
            this.mostrarError('El archivo es demasiado grande. Máximo 10 MB.');
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
            if (archivo) {
                formData.append('archivo', archivo);
                console.log('📎 Archivo adjunto:', archivo.name);
            }

            const response = await fetch('/api/notificaciones', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                const mensajeExito = archivo
                    ? '✅ Respuesta enviada con archivo adjunto. El usuario la verá en su Casilla Electrónica.'
                    : '✅ Respuesta enviada correctamente. El usuario la verá en su Casilla Electrónica.';
                this.cerrarModalRespuestaSolicitud();
                this.cerrarModal();
                this.mostrarExito(mensajeExito);
                await this.cargar();
            } else {
                throw new Error(data.error || 'Error enviando respuesta');
            }
        } catch (error) {
            console.error('❌ Error enviando respuesta a solicitud:', error);
            this.mostrarError('Error al enviar la respuesta: ' + error.message);
        }
    },

    /**
     * Guardar cambios de edición de Mesa de Partes
     */
    async guardarEdicionMesaPartes(id) {
        console.log('💾 [DEBUG] guardarEdicionMesaPartes id:', id);
        try {
            const fecha = document.getElementById('edit-fecha-presentacion').value;
            const materia = document.getElementById('edit-materia').value;
            const tipo = document.getElementById('edit-tipo-presentacion').value;

            if (!fecha || !materia) {
                this.mostrarError('La fecha y la materia son obligatorias');
                return;
            }

            this.mostrarCargando('Guardando cambios...');

            // Formatear fecha para MySQL (YYYY-MM-DD HH:mm:ss)
            const fechaFormateada = fecha.replace('T', ' ') + ':00';

            const url = `/api/mesa-partes/admin/actualizar/${id}`;
            console.log('📡 [DEBUG] Llamando a PUT:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha_presentacion: fechaFormateada,
                    materia: materia,
                    tipo_presentacion: tipo
                })
            });

            console.log('📥 [DEBUG] Response status:', response.status);
            const data = await response.json();
            console.log('📥 [DEBUG] Response data:', data);

            this.cerrarCargando();

            if (data.success) {
                const modalEdit = document.getElementById('modalEditarMesaPartes');
                if (modalEdit) modalEdit.remove();
                
                this.mostrarExito('Datos actualizados correctamente');
                
                // Cerrar el modal de detalle y refrescar
                this.cerrarModal();
                await this.cargar();
                
                // Volver a abrir el detalle para ver los cambios
                setTimeout(() => this.verDetalle('mesa_partes', id), 500);
            } else {
                throw new Error(data.error || 'Error desconocido');
            }
        } catch (error) {
            this.cerrarCargando();
            console.error('❌ [DEBUG] Error en guardarEdicionMesaPartes:', error);
            this.mostrarError('Error al guardar cambios: ' + error.message);
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CasillaUnificada = CasillaUnificada;

    // Funciones legacy para compatibilidad
    window.cargarCasillaElectronicaAdmin = () => CasillaUnificada.init();
    window.refrescarCasillaElectronica = () => CasillaUnificada.refrescar();
}

console.log('✅ Módulo CasillaUnificada cargado');
