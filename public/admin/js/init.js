/**
 * Inicialización del Admin Dashboard
 * Punto de entrada principal que coordina todos los módulos
 */

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando Admin Dashboard Modular...');

    try {
        // 1. Verificar autenticación (ya se inicializa automáticamente en auth.js)
        console.log('✅ Módulo de autenticación cargado');

        // 2. Configurar modales
        if (typeof setupModalClickOutside === 'function') {
            setupModalClickOutside();
            console.log('✅ Módulo de modales configurado');
        }

        // 3. Cargar datos iniciales
        await cargarDatosIniciales();

        // 4. Configurar formularios
        configurarFormularios();

        // 5. Iniciar actualizaciones periódicas
        iniciarActualizacionesPeriodicas();

        // 6. Configurar event listeners
        configurarEventListeners();

        // 7. Manejar hash inicial para navegación Pro
        manejarHashInicial();
        window.addEventListener('hashchange', manejarHashInicial);

        console.log('✅ Admin Dashboard inicializado correctamente');

    } catch (error) {
        console.error('❌ Error inicializando Admin Dashboard:', error);
        alert('Error al inicializar el dashboard. Por favor, recargue la página.');
    }
});

// Función para manejar navegación por Hash (#)
function manejarHashInicial() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        // Mapear hash a sectionId (por si son diferentes, aunque aquí coinciden)
        const validSections = ['dashboard', 'usuarios', 'casilla', 'expedientes', 'solicitudes', 'configuracion'];
        if (validSections.includes(hash)) {
            if (typeof window.showSection === 'function') {
                window.showSection(hash);
            }
        }
    } else {
        // Si no hay hash, forzar dashboard por defecto
        if (typeof window.showSection === 'function') {
            window.showSection('dashboard');
        }
    }
}

// Función para cargar datos iniciales
async function cargarDatosIniciales() {
    console.log('📦 Cargando datos iniciales...');

    try {
        // Cargar usuarios
        if (typeof cargarUsuariosDesdeMySQL === 'function') {
            await cargarUsuariosDesdeMySQL();
            console.log('  ✓ Usuarios cargados');
        }

        // Cargar expedientes
        if (typeof cargarExpedientesTabla === 'function') {
            await cargarExpedientesTabla();
            console.log('  ✓ Expedientes cargados');
        }

        // Cargar solicitudes
        if (typeof cargarTablaSolicitudes === 'function') {
            await cargarTablaSolicitudes();
            console.log('  ✓ Solicitudes cargadas');
        } else if (typeof window.refreshSolicitudesTable === 'function') {
            await window.refreshSolicitudesTable();
            console.log('  ✓ Solicitudes cargadas');
        }

        // Cargar casilla electrónica unificada
        if (typeof CasillaUnificada !== 'undefined') {
            await CasillaUnificada.init();
            console.log('  ✓ Casilla electrónica unificada cargada');
        } else if (typeof cargarCasillaElectronicaAdmin === 'function') {
            await cargarCasillaElectronicaAdmin();
            console.log('  ✓ Casilla electrónica (legacy) cargada');
        }

        // Cargar configuración del sistema
        if (typeof cargarConfiguracion === 'function') {
            await cargarConfiguracion();
            console.log('  ✓ Configuración del sistema cargada');
        }

        // Cargar estadísticas del dashboard
        if (typeof DashboardModule !== 'undefined') {
            await DashboardModule.init();
            console.log('  ✓ Dashboard inicializado');
        } else if (window.adminAuth && typeof window.adminAuth.cargarDatosDashboard === 'function') {
            await window.adminAuth.cargarDatosDashboard();
            console.log('  ✓ Estadísticas del dashboard actualizadas (legacy)');
        }

    } catch (error) {
        console.error('Error cargando datos iniciales:', error);
    }
}

// Función para configurar formularios
function configurarFormularios() {
    console.log('📝 Configurando formularios...');

    // Formulario de agregar usuario
    const formAgregarUsuario = document.getElementById('formAgregarUsuario');
    if (formAgregarUsuario && typeof manejarAgregarUsuario === 'function') {
        formAgregarUsuario.addEventListener('submit', manejarAgregarUsuario);
        console.log('  ✓ Formulario agregar usuario');
    }

    // Formulario de editar usuario
    const formEditarUsuario = document.getElementById('formEditarUsuario');
    if (formEditarUsuario && typeof manejarActualizarUsuario === 'function') {
        formEditarUsuario.addEventListener('submit', manejarActualizarUsuario);
        console.log('  ✓ Formulario editar usuario');
    }

    // Formulario de enviar notificación
    const formEnviarNotificacion = document.getElementById('formEnviarNotificacion');
    if (formEnviarNotificacion && typeof manejarEnvioNotificacion === 'function') {
        formEnviarNotificacion.addEventListener('submit', manejarEnvioNotificacion);
        console.log('  ✓ Formulario enviar notificación');
    }

    // Formulario de responder
    const formResponder = document.getElementById('formResponder');
    if (formResponder && typeof manejarEnvioRespuesta === 'function') {
        formResponder.addEventListener('submit', manejarEnvioRespuesta);
        console.log('  ✓ Formulario responder');
    }
}

// Motor de Sincronización Inteligente (Evita saturación de BD)
function iniciarActualizacionesPeriodicas() {
    console.log('⏰ Configurando Sincronización Inteligente (Modo Pro)...');

    // Configuración de intervalos (en milisegundos)
    const INTERVALO_GENERAL = 300000; // 5 minutos (Estadísticas, Casilla, Notificaciones)
    const INTERVALO_SOLICITUDES = 120000; // 2 minutos (Nuevas alertas)

    let lastGlobalUpdate = Date.now();
    let lastSolicitudCheck = Date.now();

    const ejecutarSincronizacion = async () => {
        // REGLA DE ORO: No trabajar si el usuario no está viendo la página
        if (document.hidden) return;

        const ahora = Date.now();

        // 1. Verificación de Solicitudes (Cada 2 min)
        if (ahora - lastSolicitudCheck >= INTERVALO_SOLICITUDES) {
            if (typeof verificarNuevasSolicitudes === 'function') {
                console.log('🔄 Sincronizando solicitudes...');
                await verificarNuevasSolicitudes();
            }
            lastSolicitudCheck = ahora;
        }

        // 2. Actualización General (Cada 5 min)
        if (ahora - lastGlobalUpdate >= INTERVALO_GENERAL) {
            console.log('🔄 Sincronización global en progreso...');
            
            // Estadísticas
            if (typeof DashboardModule !== 'undefined' && typeof DashboardModule.cargarEstadisticas === 'function') {
                await DashboardModule.cargarEstadisticas();
            }
            
            // Notificaciones Admin
            if (typeof cargarNotificacionesAdmin === 'function') {
                await cargarNotificacionesAdmin();
            }
            
            // Casilla
            if (typeof CasillaUnificada !== 'undefined') {
                await CasillaUnificada.cargar();
            }

            lastGlobalUpdate = ahora;
        }
    };

    // Un solo intervalo maestro cada 10 segundos para evaluar qué toca actualizar
    // (Esto no consume BD, solo evalúa tiempos en memoria)
    setInterval(ejecutarSincronizacion, 10000);

    // Actualizar inmediatamente cuando el usuario vuelve a la pestaña después de mucho tiempo
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👀 Usuario regresó: Evaluando sincronización necesaria...');
            ejecutarSincronizacion();
        }
    });

    console.log('  ✓ Sincronización Inteligente activada (Visibility-Aware)');
}

// Función para configurar event listeners
function configurarEventListeners() {
    console.log('🎯 Configurando event listeners...');

    // Cerrar modales con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (typeof cerrarTodosLosModales === 'function') {
                cerrarTodosLosModales();
            }
        }
    });

    console.log('  ✓ Event listeners configurados');
}

// Función auxiliar para verificar nuevas solicitudes
async function verificarNuevasSolicitudes() {
    try {
        const response = await fetch('/api/solicitudes');
        const data = await response.json();

        if (data.success) {
            const solicitudesAPI = data.data;
            let ultimoIdConocido = sessionStorage.getItem('ultimoIdSolicitud');
            const maxIdActual = Math.max(...solicitudesAPI.map(s => parseInt(s.id) || 0), 0);

            if (ultimoIdConocido === null) {
                sessionStorage.setItem('ultimoIdSolicitud', maxIdActual.toString());
                return;
            }

            ultimoIdConocido = parseInt(ultimoIdConocido);

            if (maxIdActual > ultimoIdConocido) {
                const nuevasSolicitudes = solicitudesAPI.filter(s => parseInt(s.id) > ultimoIdConocido);

                if (nuevasSolicitudes.length > 0) {
                    console.log('📢 Nuevas solicitudes detectadas:', nuevasSolicitudes.length);
                    sessionStorage.setItem('ultimoIdSolicitud', maxIdActual.toString());

                    // Refrescar tabla
                    if (window.dataManager && typeof window.dataManager.refreshSolicitudesTable === 'function') {
                        await window.dataManager.refreshSolicitudesTable();
                    }

                    // Mostrar notificación
                    if (typeof mostrarNotificacionNuevaSolicitud === 'function') {
                        mostrarNotificacionNuevaSolicitud(nuevasSolicitudes.length);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error verificando nuevas solicitudes:', error);
    }
}

// Función auxiliar para mostrar notificación de nueva solicitud
function mostrarNotificacionNuevaSolicitud(cantidad) {
    const mensaje = cantidad === 1 ?
        'Nueva solicitud recibida!' :
        `${cantidad} nuevas solicitudes recibidas!`;

    const notif = document.createElement('div');
    notif.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">📋</span>
            <span>${mensaje}</span>
        </div>
    `;

    Object.assign(notif.style, {
        position: 'fixed',
        top: '80px',
        right: '20px',
        background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: '10000',
        fontWeight: '600',
        cursor: 'pointer',
        maxWidth: '300px'
    });

    notif.onclick = () => {
        if (typeof showSection === 'function') {
            showSection('solicitudes');
        }
        notif.remove();
    };

    document.body.appendChild(notif);

    setTimeout(() => {
        if (notif.parentNode) {
            notif.remove();
        }
    }, 5000);
}

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.cargarDatosIniciales = cargarDatosIniciales;
    window.configurarFormularios = configurarFormularios;
    window.iniciarActualizacionesPeriodicas = iniciarActualizacionesPeriodicas;
    window.configurarEventListeners = configurarEventListeners;
}

console.log('📦 Módulo de inicialización cargado');
