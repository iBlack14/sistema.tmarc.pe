// Sistema de conexión entre Dashboard Usuario y Admin
class ConexionDatos {
    constructor() {
        this.tipoUsuario = this.detectarTipoUsuario();
    }

    detectarTipoUsuario() {
        // Detectar si estamos en admin o usuario basado en la URL o título
        if (document.title.includes('Admin') || window.location.href.includes('admin')) {
            return 'admin';
        }
        return 'usuario';
    }

    // Método para que el usuario envíe una nueva solicitud
    async enviarSolicitud(datosFormulario) {
        try {
            // Preparar datos para enviar a la API
            const solicitudData = {
                nombre: datosFormulario.nombre,
                email: datosFormulario.email,
                telefono: datosFormulario.telefono,
                dni: datosFormulario.dni,
                tipo: datosFormulario.tipo,
                asunto: datosFormulario.asunto,
                descripcion: datosFormulario.descripcion,
                prioridad: datosFormulario.prioridad,
                documentos: datosFormulario.documentos || []
            };

            // Enviar a la API REST
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(solicitudData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al enviar solicitud');
            }

            // Si la API responde correctamente, actualizar localStorage para UI
            const solicitudLocal = {
                id: data.data?.id || 'SOL-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3),
                usuario: datosFormulario.nombre || 'Usuario Anónimo',
                email: datosFormulario.email || 'usuario@example.com',
                tipo: datosFormulario.tipo || 'Consulta',
                asunto: datosFormulario.asunto || 'Solicitud sin asunto',
                descripcion: datosFormulario.descripcion || 'Sin descripción',
                fecha: new Date().toLocaleString('es-ES'),
                estado: 'Pendiente',
                prioridad: datosFormulario.prioridad || 'Normal',
                documentos: datosFormulario.documentos || []
            };

            // Agregar a las solicitudes del usuario para mostrar en UI
            const solicitudesUsuario = JSON.parse(localStorage.getItem('solicitudesUsuario') || '[]');
            solicitudesUsuario.unshift(solicitudLocal);
            localStorage.setItem('solicitudesUsuario', JSON.stringify(solicitudesUsuario));

            // También agregar a la casilla electrónica del admin como "expediente pendiente"
            const casillaElectronica = JSON.parse(localStorage.getItem('casillasElectronicas') || '[]');

            // Convertir la solicitud a formato de expediente para la casilla electrónica
            const expedienteParaCasilla = {
                numero: solicitudLocal.id,
                presentante: solicitudLocal.usuario,
                correo: solicitudLocal.email,
                telefono: solicitudLocal.telefono || 'No especificado',
                tipo: 'SOLICITUD',
                proceso: solicitudLocal.tipo,
                materia: solicitudLocal.asunto,
                sumilla: solicitudLocal.descripcion.length > 100 ?
                    solicitudLocal.descripcion.substring(0, 100) + '...' :
                    solicitudLocal.descripcion,
                sede: 'VIRTUAL',
                especialidad: 'MESA DE PARTES',
                estado: 'Pendiente',
                fecha_creacion: new Date().toLocaleDateString('es-ES'),
                fecha_actualizacion: new Date().toLocaleString('es-ES'),
                prioridad: solicitudLocal.prioridad,
                dni: solicitudLocal.dni || 'No especificado',
                observaciones: `Solicitud enviada por ${solicitudLocal.usuario} - ${solicitudLocal.fecha}`
            };

            casillaElectronica.unshift(expedienteParaCasilla);
            localStorage.setItem('casillasElectronicas', JSON.stringify(casillaElectronica));

            // Notificar al admin sobre la nueva solicitud (para sincronización entre pestañas)
            localStorage.setItem('notificacion_para_admin', JSON.stringify({
                tipo: 'nueva_solicitud',
                solicitud: solicitudLocal,
                timestamp: new Date().toISOString()
            }));

            // Limpiar la notificación después de un tiempo
            setTimeout(() => {
                localStorage.removeItem('notificacion_para_admin');
            }, 1000);

            // Mostrar confirmación
            this.mostrarNotificacion('¡Solicitud enviada correctamente!', 'success');

            return solicitudLocal;

        } catch (error) {
            console.error('Error enviando solicitud:', error);
            this.mostrarNotificacion('Error al enviar solicitud: ' + error.message, 'error');
            throw error; // Re-lanzar para que el código que llama pueda manejar el error
        }
    }

    // Método para enviar solicitud desde dashboard
    async enviarSolicitudDashboard(datosSolicitud) {
        try {
            // Preparar datos para enviar a la API
            const solicitudData = {
                nombre: 'Usuario Dashboard',
                email: 'usuario@dashboard.com',
                telefono: '999999999',
                dni: '00000000',
                tipo: datosSolicitud.documentType === 'otros' ? datosSolicitud.otrosText : datosSolicitud.documentType,
                asunto: datosSolicitud.subject,
                descripcion: `Solicitud desde dashboard: ${datosSolicitud.subject}`,
                prioridad: 'normal',
                documentos: [],
                casilla_electronica: '53099'
            };

            // Enviar a la API REST
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(solicitudData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al enviar solicitud');
            }

            // Actualizar localStorage para UI
            const solicitudLocal = {
                id: data.data?.id || 'SOL-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3),
                usuario: solicitudData.nombre,
                email: solicitudData.email,
                tipo: solicitudData.tipo,
                asunto: solicitudData.asunto,
                descripcion: solicitudData.descripcion,
                fecha: new Date().toLocaleString('es-ES'),
                estado: 'Pendiente',
                prioridad: solicitudData.prioridad,
                casilla_electronica: solicitudData.casilla_electronica
            };

            // Agregar a las solicitudes del usuario
            const solicitudesUsuario = JSON.parse(localStorage.getItem('solicitudesUsuario') || '[]');
            solicitudesUsuario.unshift(solicitudLocal);
            localStorage.setItem('solicitudesUsuario', JSON.stringify(solicitudesUsuario));

            // Notificar al admin sobre la nueva solicitud
            const casillaElectronica = JSON.parse(localStorage.getItem('casillasElectronicas') || '[]');
            const expedienteParaAdmin = {
                numero: solicitudLocal.id,
                presentante: solicitudLocal.usuario,
                correo: solicitudLocal.email,
                telefono: solicitudLocal.telefono,
                tipo: 'SOLICITUD_DASHBOARD',
                proceso: solicitudLocal.tipo,
                materia: solicitudLocal.asunto,
                sumilla: solicitudLocal.descripcion,
                sede: 'VIRTUAL',
                especialidad: 'MESA DE PARTES',
                estado: 'Pendiente',
                fecha_creacion: new Date().toLocaleDateString('es-ES'),
                fecha_actualizacion: new Date().toLocaleString('es-ES'),
                prioridad: solicitudLocal.prioridad,
                dni: solicitudLocal.dni,
                observaciones: `Solicitud desde dashboard - Casilla electrónica: ${solicitudLocal.casilla_electronica}`
            };

            casillaElectronica.unshift(expedienteParaAdmin);
            localStorage.setItem('casillasElectronicas', JSON.stringify(casillaElectronica));

            // Notificación para sincronización entre pestañas
            localStorage.setItem('notificacion_para_admin', JSON.stringify({
                tipo: 'nueva_solicitud_dashboard',
                solicitud: solicitudLocal,
                timestamp: new Date().toISOString()
            }));

            // Limpiar la notificación después de un tiempo
            setTimeout(() => {
                localStorage.removeItem('notificacion_para_admin');
            }, 1000);

            // Mostrar confirmación
            this.mostrarNotificacion('¡Solicitud enviada correctamente!', 'success');

            return solicitudLocal;

        } catch (error) {
            console.error('Error enviando solicitud desde dashboard:', error);
            this.mostrarNotificacion('Error al enviar solicitud: ' + error.message, 'error');
            throw error;
        }
    }

    // Método para que el usuario cree un nuevo expediente
    async crearExpediente(datosExpediente) {
        try {
            // Preparar datos para enviar a la API
            const expedienteData = {
                numero_expediente: datosExpediente.numero || ('EXP-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-3)),
                sede: datosExpediente.sede,
                especialidad: datosExpediente.especialidad,
                motivo_ingreso: datosExpediente.motivoIngreso,
                proceso: datosExpediente.proceso,
                materia: datosExpediente.materia,
                cuantia: datosExpediente.cuantia ? parseFloat(datosExpediente.cuantia) : null,
                moneda: datosExpediente.moneda || 'PEN',
                sumilla: datosExpediente.sumilla,
                tipo_presentante: datosExpediente.tipoPresentante,
                presentante: datosExpediente.presentante,
                documento_identidad: datosExpediente.documento,
                correo: datosExpediente.correo,
                telefono: datosExpediente.telefono,
                domicilio: datosExpediente.domicilio,
                colegiatura: datosExpediente.colegiatura,
                colegio_abogados: datosExpediente.colegioAbogados,
                casilla_electronica: datosExpediente.casillaElectronica,
                estado: 'Nuevo',
                observaciones: 'Expediente creado desde dashboard de usuario'
            };

            // Enviar a la API REST
            const response = await fetch('/api/expedientes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(expedienteData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al crear expediente');
            }

            // Si la API responde correctamente, actualizar localStorage para UI
            const expedienteLocal = {
                id: data.data?.id || expedienteData.numero_expediente,
                numero: expedienteData.numero_expediente,
                // Datos Generales
                sede: expedienteData.sede,
                especialidad: expedienteData.especialidad,
                // Datos del Expediente
                motivoIngreso: expedienteData.motivo_ingreso,
                proceso: expedienteData.proceso,
                materia: expedienteData.materia,
                cuantia: expedienteData.cuantia,
                moneda: expedienteData.moneda,
                sumilla: expedienteData.sumilla,
                // Datos de Presentante
                tipoPresentante: expedienteData.tipo_presentante,
                presentante: expedienteData.presentante,
                documento: expedienteData.documento_identidad,
                correo: expedienteData.correo,
                telefono: expedienteData.telefono,
                domicilio: expedienteData.domicilio,
                colegiatura: expedienteData.colegiatura,
                colegioAbogados: expedienteData.colegio_abogados,
                casillaElectronica: expedienteData.casilla_electronica,
                // Datos del sistema
                fechaCreacion: new Date().toLocaleDateString('es-ES'),
                fechaActualizacion: new Date().toLocaleString('es-ES'),
                estado: expedienteData.estado,
                tipo: 'Expediente',
                observaciones: expedienteData.observaciones
            };

            // Agregar a los expedientes del usuario para mostrar en UI
            const expedientesUsuario = JSON.parse(localStorage.getItem('expedientesUsuario') || '[]');
            expedientesUsuario.unshift(expedienteLocal);
            localStorage.setItem('expedientesUsuario', JSON.stringify(expedientesUsuario));

            // Mostrar confirmación
            this.mostrarNotificacion('¡Expediente creado exitosamente!', 'success');

            return expedienteLocal;

        } catch (error) {
            console.error('Error creando expediente:', error);
            this.mostrarNotificacion('Error al crear expediente: ' + error.message, 'error');
            throw error; // Re-lanzar para que el código que llama pueda manejar el error
        }
    }

    // Obtener notificaciones para el usuario
    obtenerNotificacionesUsuario() {
        return JSON.parse(localStorage.getItem('notificacionesUsuario') || '[]');
    }

    // Obtener solicitudes del usuario
    obtenerSolicitudesUsuario() {
        return JSON.parse(localStorage.getItem('solicitudesUsuario') || '[]');
    }

    // Obtener expedientes del usuario
    obtenerExpedientesUsuario() {
        return JSON.parse(localStorage.getItem('expedientesUsuario') || '[]');
    }

    // Marcar notificación como leída
    marcarNotificacionLeida(notificacionId) {
        const notificaciones = this.obtenerNotificacionesUsuario();
        const notificacion = notificaciones.find(n => n.id === notificacionId);
        if (notificacion) {
            notificacion.leida = true;
            localStorage.setItem('notificacionesUsuario', JSON.stringify(notificaciones));
        }
    }

    // Contar notificaciones no leídas
    contarNotificacionesNoLeidas() {
        const notificaciones = this.obtenerNotificacionesUsuario();
        return notificaciones.filter(n => !n.leida).length;
    }

    // Mostrar notificación en pantalla (Mejorado con SweetAlert2)
    mostrarNotificacion(mensaje, tipo = 'info') {
        if (tipo === 'success') {
            window.showSuccess ? window.showSuccess(mensaje) : alert('✅ ' + mensaje);
        } else if (tipo === 'error') {
            window.showError ? window.showError(mensaje) : alert('❌ ' + mensaje);
        } else {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: mensaje,
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            } else {
                this.mostrarNotificacionLegacy(mensaje, tipo);
            }
        }
    }

    // Fallback para notificaciones si Swal no está disponible
    mostrarNotificacionLegacy(mensaje, tipo = 'info') {
        // Crear elemento de notificación
        const notificacion = document.createElement('div');
        notificacion.className = `notificacion-sistema ${tipo}`;
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${tipo === 'success' ? '#4caf50' : tipo === 'error' ? '#f44336' : '#d4af37'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        notificacion.textContent = mensaje;

        // Agregar animación CSS si no existe
        if (!document.querySelector('#notificacion-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notificacion-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notificacion);

        // Remover después de 4 segundos
        setTimeout(() => {
            notificacion.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
            }, 300);
        }, 4000);
    }

    // Datos iniciales eliminados - sistema trabaja en tiempo real
    inicializarDatosDemo() {
        // Sistema trabaja exclusivamente con datos en tiempo real desde la API
        console.log('✅ Sistema inicializado sin datos demo - modo tiempo real activo');
    }

    // Actualizar contadores en tiempo real desde la base de datos
    async actualizarContadores() {
        try {
            // Obtener estadísticas desde la API
            const response = await fetch('/api/estadisticas/dashboard');
            const data = await response.json();

            if (data.success) {
                const stats = data.data;

                if (this.tipoUsuario === 'usuario') {
                    // Actualizar contadores del dashboard de usuario
                    this.actualizarContadoresUsuario(stats);
                } else if (this.tipoUsuario === 'admin') {
                    // Actualizar contadores del dashboard de admin
                    this.actualizarContadoresAdmin(stats);
                }
            }
        } catch (error) {
            console.error('Error actualizando contadores:', error);
            // Fallback a datos locales si falla la API
            this.actualizarContadoresLocal();
        }
    }

    // Actualizar contadores del dashboard de usuario
    actualizarContadoresUsuario(stats) {
        // Buscar elementos específicos por su contenido/label
        const statLabels = document.querySelectorAll('.stat-label');

        statLabels.forEach(label => {
            const labelText = label.textContent.trim();
            const statCard = label.closest('.stat-card');
            const statValue = statCard ? statCard.querySelector('.stat-value') : null;

            if (statValue) {
                switch(labelText) {
                    case 'Solicitudes Pendientes':
                        statValue.textContent = stats.solicitudes.pendientes;
                        break;
                    case 'Expedientes Activos':
                        statValue.textContent = stats.expedientes.activos;
                        break;
                    case 'Documentos Recibidos':
                        statValue.textContent = stats.expedientes.total;
                        break;
                    case 'Mensajes Nuevos':
                        statValue.textContent = stats.notificaciones.nuevas;
                        break;
                    case 'No Leídos':
                        statValue.textContent = stats.notificaciones.nuevas;
                        break;
                    case 'Archivados':
                        statValue.textContent = stats.notificaciones.leidas;
                        break;
                }
            }
        });
    }

    // Actualizar contadores del dashboard de admin
    actualizarContadoresAdmin(stats) {
        // Buscar elementos específicos por su contenido/label
        const statLabels = document.querySelectorAll('.stat-label');

        statLabels.forEach(label => {
            const labelText = label.textContent.trim();
            const statCard = label.closest('.stat-card');
            const statValue = statCard ? statCard.querySelector('.stat-value') : null;

            if (statValue) {
                switch(labelText) {
                    case 'Usuarios Activos':
                        statValue.textContent = stats.usuarios.activos;
                        break;
                    case 'Solicitudes Pendientes':
                        statValue.textContent = stats.solicitudes.pendientes;
                        break;
                    case 'Expedientes Activos':
                        statValue.textContent = stats.expedientes.activos;
                        break;
                    case 'Tasa de Completitud':
                        statValue.textContent = stats.tasa_completitud + '%';
                        break;
                    case 'Nuevos Esta Semana':
                        statValue.textContent = stats.usuarios.nuevos_esta_semana;
                        break;
                    case 'Nuevas Notificaciones':
                        statValue.textContent = stats.notificaciones.nuevas;
                        break;
                    case 'Notificaciones Leídas':
                        statValue.textContent = stats.notificaciones.leidas;
                        break;
                    case 'Total del Mes':
                        statValue.textContent = stats.notificaciones.total_mes;
                        break;
                    case 'En Trámite':
                        statValue.textContent = stats.expedientes.en_tramite;
                        break;
                    case 'Finalizados':
                        statValue.textContent = stats.expedientes.finalizados;
                        break;
                    case 'Solicitudes Aprobadas':
                        statValue.textContent = stats.solicitudes.aprobadas;
                        break;
                    case 'Solicitudes Rechazadas':
                        statValue.textContent = stats.solicitudes.rechazadas;
                        break;
                }
            }
        });
    }

    // Fallback: actualizar contadores con datos locales
    actualizarContadoresLocal() {
        if (this.tipoUsuario === 'usuario') {
            const solicitudes = this.obtenerSolicitudesUsuario();
            const expedientes = this.obtenerExpedientesUsuario();
            const notificaciones = this.obtenerNotificacionesUsuario();

            // Actualizar contadores en el dashboard
            const pendientes = solicitudes.filter(s => s.estado === 'Pendiente').length;
            const activos = expedientes.filter(e => e.estado === 'Activo').length;
            const noLeidas = this.contarNotificacionesNoLeidas();

            // Buscar elementos y actualizar
            const statCards = document.querySelectorAll('.stat-value');
            if (statCards.length >= 3) {
                statCards[0].textContent = pendientes;
                statCards[1].textContent = activos;
                statCards[2].textContent = notificaciones.length;
            }
        }
    }
}

// Crear instancia global
window.conexionDatos = new ConexionDatos();

// Inicializar al cargar la página - sin datos demo
document.addEventListener('DOMContentLoaded', function() {
    window.conexionDatos.inicializarDatosDemo(); // Solo log, no carga datos
    window.conexionDatos.actualizarContadores();
});