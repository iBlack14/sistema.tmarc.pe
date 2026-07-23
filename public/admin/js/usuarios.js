/**
 * Módulo de Gestión de Usuarios
 * Maneja todas las funciones relacionadas con usuarios
 */

// Función para cargar usuarios desde MySQL
async function cargarUsuariosDesdeMySQL() {
    try {
        const response = await fetch('/api/usuarios');
        const data = await response.json();

        if (data.success) {
            const tbody = document.querySelector('#usuarios table tbody');
            if (!tbody) return;

            if (data.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay usuarios registrados</td></tr>';
                return;
            }

            tbody.innerHTML = data.data.map(usuario => `
                <tr>
                    <td>${usuario.id}</td>
                    <td>${usuario.nombre}</td>
                    <td>${usuario.email}</td>
                    <td>${usuario.tipo || 'usuario'}</td>
                    <td><span class="status-badge ${usuario.activo ? 'status-active' : 'status-inactive'}">${usuario.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td>
                        <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;" onclick="editarUsuario('${usuario.id}')" title="Editar">✏️</button>
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="eliminarUsuario('${usuario.id}')" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `).join('');

            // Actualizar estadísticas
            actualizarEstadisticasUsuarios(data.data);
        } else {
            console.error('Error cargando usuarios:', data.error);
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

// Función para actualizar estadísticas de usuarios
function actualizarEstadisticasUsuarios(usuarios) {
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = usuarios.filter(u => !u.activo).length;
    
    const statCards = document.querySelectorAll('#usuarios .stat-value');
    if (statCards.length >= 3) {
        statCards[0].textContent = activos;
        statCards[1].textContent = inactivos;
        // Nuevos esta semana - calcular
        const haceUnaSemana = new Date();
        haceUnaSemana.setDate(haceUnaSemana.getDate() - 7);
        const nuevos = usuarios.filter(u => new Date(u.fecha_creacion) > haceUnaSemana).length;
        statCards[2].textContent = nuevos;
    }
}

// Función para mostrar modal de agregar usuario
function mostrarModalAgregarUsuario() {
    document.getElementById('agregarUsuarioModal').style.display = 'block';
}

// Función para cerrar modal de agregar usuario
function cerrarModalAgregarUsuario() {
    document.getElementById('agregarUsuarioModal').style.display = 'none';
    const form = document.getElementById('formAgregarUsuario');
    if (form) form.reset();
}

// Función para manejar agregar usuario
async function manejarAgregarUsuario(event) {
    event.preventDefault();

    const nuevoUsuario = {
        username: document.getElementById('agregar-username').value.trim(),
        nombre: document.getElementById('agregar-nombre').value.trim(),
        email: document.getElementById('agregar-email').value.trim(),
        password: document.getElementById('agregar-password').value,
        tipo: document.getElementById('agregar-rol').value.toLowerCase(),
        activo: true // Por defecto activo
    };

    // Validación
    if (!nuevoUsuario.username || !nuevoUsuario.nombre || !nuevoUsuario.email || !nuevoUsuario.password) {
        if (window.showError) window.showError('Por favor, complete todos los campos obligatorios.');
        return;
    }

    // Validar confirmación de contraseña
    const passwordConfirm = document.getElementById('agregar-password-confirm').value;
    if (nuevoUsuario.password !== passwordConfirm) {
        if (window.showError) window.showError('Las contraseñas no coinciden.');
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoUsuario.email)) {
        if (window.showError) window.showError('Por favor, ingrese un correo electrónico válido.');
        return;
    }

    // Validar contraseña
    if (nuevoUsuario.password.length < 6) {
        if (window.showError) window.showError('La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    try {
        if (window.showLoading) window.showLoading('Creando usuario...');
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoUsuario)
        });

        const data = await response.json();
        if (window.hideLoading) window.hideLoading();

        if (data.success) {
            if (window.showSuccess) window.showSuccess('Usuario creado exitosamente');
            cerrarModalAgregarUsuario();
            await cargarUsuariosDesdeMySQL();
        } else {
            if (window.showError) window.showError('Error al crear usuario: ' + (data.error || data.message));
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error creando usuario:', error);
        if (window.showError) window.showError('Error de conexión al crear usuario');
    }
}

// Función para editar usuario
async function editarUsuario(id) {
    try {
        const response = await fetch(`/api/usuarios/${id}`);
        const data = await response.json();

        if (data.success) {
            const usuario = data.data;

            // Llenar formulario de edición
            document.getElementById('editar-usuario-id').value = usuario.id;
            document.getElementById('editar-id-display').value = usuario.id;
            document.getElementById('editar-nombre').value = usuario.nombre;
            document.getElementById('editar-email').value = usuario.email;
            document.getElementById('editar-rol').value = usuario.tipo || 'usuario';
            document.getElementById('editar-estado').value = usuario.activo ? 'Activo' : 'Inactivo';

            // Mostrar modal
            document.getElementById('editarUsuarioModal').style.display = 'block';
        } else {
            if (window.showError) window.showError('Error obteniendo datos del usuario');
        }
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        if (window.showError) window.showError('Error obteniendo datos del usuario');
    }
}

// Función para cerrar modal de editar usuario
function cerrarModalEditarUsuario() {
    document.getElementById('editarUsuarioModal').style.display = 'none';
    const form = document.getElementById('formEditarUsuario');
    if (form) form.reset();
}

// Función para manejar actualización de usuario
async function manejarActualizarUsuario(event) {
    event.preventDefault();

    const id = document.getElementById('editar-usuario-id').value;
    const datosActualizados = {
        nombre: document.getElementById('editar-nombre').value.trim(),
        email: document.getElementById('editar-email').value.trim(),
        tipo: document.getElementById('editar-rol').value,
        activo: document.getElementById('editar-estado').value === 'Activo'
    };

    // Validación
    if (!datosActualizados.nombre || !datosActualizados.email) {
        if (window.showError) window.showError('Por favor, complete todos los campos obligatorios.');
        return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(datosActualizados.email)) {
        if (window.showError) window.showError('Por favor, ingrese un correo electrónico válido.');
        return;
    }

    try {
        if (window.showLoading) window.showLoading('Actualizando usuario...');
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosActualizados)
        });

        const data = await response.json();
        if (window.hideLoading) window.hideLoading();

        if (data.success) {
            if (window.showSuccess) window.showSuccess('Usuario actualizado exitosamente');
            cerrarModalEditarUsuario();
            await cargarUsuariosDesdeMySQL();
        } else {
            if (window.showError) window.showError('Error al actualizar el usuario: ' + data.error);
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error actualizando usuario:', error);
        if (window.showError) window.showError('Error al actualizar el usuario');
    }
}

// Función para eliminar usuario con SweetAlert2
async function eliminarUsuario(id) {
    // Obtener datos del usuario primero
    try {
        const response = await fetch(`/api/usuarios/${id}`);
        const data = await response.json();

        if (!data.success) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo obtener los datos del usuario',
                confirmButtonColor: '#D4AF37'
            });
            return;
        }

        const usuario = data.data;

        // Mostrar modal de confirmación con SweetAlert2
        const result = await Swal.fire({
            title: '⚠️ Confirmar Eliminación',
            html: `
                <div style="text-align: left; padding: 10px;">
                    <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); border-left: 4px solid #ff9800; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #856404; font-weight: 600; font-size: 13px;">
                            ⚠️ Esta acción no se puede deshacer
                        </p>
                    </div>
                    <p style="color: #333; margin-bottom: 20px; font-size: 14px;">
                        ¿Está seguro de que desea eliminar al siguiente usuario?
                    </p>
                    <div style="background: #f8f9fa; border: 2px solid #D4AF37; border-radius: 10px; padding: 15px;">
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #6c757d; font-size: 11px; text-transform: uppercase;">ID Usuario:</strong>
                            <div style="color: #495057; font-size: 14px; font-weight: 600;">#${usuario.id}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <strong style="color: #6c757d; font-size: 11px; text-transform: uppercase;">Nombre:</strong>
                            <div style="color: #212529; font-size: 15px; font-weight: 700;">${usuario.nombre}</div>
                        </div>
                        <div>
                            <strong style="color: #6c757d; font-size: 11px; text-transform: uppercase;">Email:</strong>
                            <div style="color: #495057; font-size: 13px; font-weight: 600;">${usuario.email}</div>
                        </div>
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e74c3c',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '🗑️ Sí, eliminar',
            cancelButtonText: '❌ Cancelar',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                confirmButton: 'swal-custom-confirm',
                cancelButton: 'swal-custom-cancel'
            },
            width: '500px'
        });

        if (result.isConfirmed) {
            // Mostrar loading
            Swal.fire({
                title: 'Eliminando usuario...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            // Ejecutar eliminación
            const deleteResponse = await fetch(`/api/usuarios/${id}`, {
                method: 'DELETE'
            });

            const deleteData = await deleteResponse.json();

            if (deleteData.success) {
                await Swal.fire({
                    icon: 'success',
                    title: '✅ Usuario Eliminado',
                    text: 'El usuario ha sido eliminado exitosamente',
                    confirmButtonColor: '#D4AF37',
                    timer: 2000
                });

                await cargarUsuariosDesdeMySQL();

                if (window.conexionDatos) {
                    window.conexionDatos.mostrarNotificacion('Usuario eliminado correctamente', 'success');
                }
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al eliminar usuario: ' + deleteData.error,
                    confirmButtonColor: '#D4AF37'
                });
            }
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Error al eliminar el usuario',
            confirmButtonColor: '#D4AF37'
        });
    }
}

// Función para mostrar modal de enviar notificación
function mostrarModalEnviarNotificacion() {
    cargarUsuariosParaNotificacion();
    document.getElementById('enviarNotificacionModal').style.display = 'block';
}

// Función para cerrar modal de enviar notificación
function cerrarModalEnviarNotificacion() {
    document.getElementById('enviarNotificacionModal').style.display = 'none';
    const form = document.getElementById('formEnviarNotificacion');
    if (form) form.reset();
}

// Función para cargar usuarios en el select de notificaciones
async function cargarUsuariosParaNotificacion() {
    try {
        const response = await fetch('/api/usuarios');
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('notif-usuario-id');
            if (!select) return;

            select.innerHTML = '<option value="">Seleccione un usuario...</option>';

            data.data.forEach(usuario => {
                const option = document.createElement('option');
                option.value = usuario.id;
                option.textContent = `${usuario.nombre} (${usuario.email})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando usuarios para notificación:', error);
    }
}

// Función para manejar envío de notificación
async function manejarEnvioNotificacion(event) {
    event.preventDefault();

    const datosNotificacion = {
        usuario_id: document.getElementById('notif-usuario-id').value,
        tipo: document.getElementById('notif-tipo').value,
        titulo: document.getElementById('notif-titulo').value.trim(),
        mensaje: document.getElementById('notif-mensaje').value.trim(),
        enviar_casilla: document.getElementById('notif-canal-casilla').checked,
        enviar_email: document.getElementById('notif-canal-email').checked
    };

    // Validación
    if (!datosNotificacion.usuario_id || !datosNotificacion.titulo || !datosNotificacion.mensaje) {
        if (window.showError) window.showError('Por favor, complete todos los campos obligatorios.');
        return;
    }

    if (!datosNotificacion.enviar_casilla && !datosNotificacion.enviar_email) {
        if (window.showError) window.showError('Por favor, seleccione al menos un canal de envío (Casilla o Correo).');
        return;
    }

    try {
        if (window.showLoading) window.showLoading('Enviando notificación...');
        const response = await fetch('/api/notificaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosNotificacion)
        });

        const data = await response.json();
        if (window.hideLoading) window.hideLoading();

        if (data.success) {
            if (window.showSuccess) window.showSuccess('Notificación enviada exitosamente');
            cerrarModalEnviarNotificacion();
        } else {
            if (window.showError) window.showError('Error enviando notificación: ' + (data.error || data.message));
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error enviando notificación:', error);
        if (window.showError) window.showError('Error de conexión al enviar notificación');
    }
}

// Función para generar contraseña aleatoria
function generarContrasena(inputId, confirmId) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    document.getElementById(inputId).value = password;
    if (confirmId) {
        document.getElementById(confirmId).value = password;
    }
    
    // Cambiar temporalmente el tipo a text para que el admin pueda verla si lo desea
    // (Ya lo pusimos como text en el HTML por facilidad)
    
    if (window.conexionDatos) {
        window.conexionDatos.mostrarNotificacion('Contraseña generada', 'info');
    }
}

// Función para forzar sincronización de usuarios
async function forzarSincronizacionUsuarios() {
    if (typeof Swal === 'undefined') {
        if (!confirm('¿Desea forzar la sincronización de usuarios?')) return;
        return procesarSincronizacion();
    }

    Swal.fire({
        title: 'Sincronizar Usuarios',
        text: "¿Desea forzar la sincronización con la base de datos central?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d4af37',
        confirmButtonText: 'Sí, sincronizar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            procesarSincronizacion();
        }
    });
}

async function procesarSincronizacion() {
    try {
        if (window.showLoading) window.showLoading('Sincronizando...');
        const response = await fetch('/api/usuarios/sincronizar', { method: 'POST' });
        const data = await response.json();
        if (window.hideLoading) window.hideLoading();

        if (data.success) {
            if (window.showSuccess) window.showSuccess('Sincronización completada exitosamente');
            await cargarUsuariosDesdeMySQL();
        } else {
            if (window.showError) window.showError('Error en la sincronización: ' + data.error);
        }
    } catch (error) {
        if (window.hideLoading) window.hideLoading();
        console.error('Error en sincronización:', error);
        if (window.showError) window.showError('Error en la sincronización');
    }
}

// Función para mostrar estadísticas de sincronización
async function mostrarEstadisticasSincronizacion() {
    try {
        const response = await fetch('/api/usuarios/estadisticas-sync');
        const data = await response.json();

        if (data.success) {
            const stats = data.data;
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: '📊 Estadísticas de Sincronización',
                    html: `
                        <div style="text-align: left;">
                            <p><strong>Total de usuarios:</strong> ${stats.total}</p>
                            <p><strong>Sincronizados:</strong> ${stats.sincronizados}</p>
                            <p><strong>Pendientes:</strong> ${stats.pendientes}</p>
                            <p><strong>Última sincronización:</strong> ${stats.ultima_sync || 'Nunca'}</p>
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonColor: '#d4af37'
                });
            } else {
                alert(`📊 Estadísticas de Sincronización\n\n` +
                      `Total de usuarios: ${stats.total}\n` +
                      `Sincronizados: ${stats.sincronizados}\n` +
                      `Pendientes: ${stats.pendientes}\n` +
                      `Última sincronización: ${stats.ultima_sync || 'Nunca'}`);
            }
        } else {
            if (window.showError) window.showError('Error obteniendo estadísticas');
        }
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        if (window.showError) window.showError('Error obteniendo estadísticas');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Formulario de agregar usuario
    const formAgregar = document.getElementById('formAgregarUsuario');
    if (formAgregar) {
        formAgregar.addEventListener('submit', manejarAgregarUsuario);
    }

    // Formulario de editar usuario
    const formEditar = document.getElementById('formEditarUsuario');
    if (formEditar) {
        formEditar.addEventListener('submit', manejarActualizarUsuario);
    }

    // Formulario de enviar notificación
    const formNotif = document.getElementById('formEnviarNotificacion');
    if (formNotif) {
        formNotif.addEventListener('submit', manejarEnvioNotificacion);
    }
});

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.cargarUsuariosDesdeMySQL = cargarUsuariosDesdeMySQL;
    window.actualizarEstadisticasUsuarios = actualizarEstadisticasUsuarios;
    window.mostrarModalAgregarUsuario = mostrarModalAgregarUsuario;
    window.cerrarModalAgregarUsuario = cerrarModalAgregarUsuario;
    window.manejarAgregarUsuario = manejarAgregarUsuario;
    window.editarUsuario = editarUsuario;
    window.cerrarModalEditarUsuario = cerrarModalEditarUsuario;
    window.manejarActualizarUsuario = manejarActualizarUsuario;
    window.eliminarUsuario = eliminarUsuario;
    window.mostrarModalEnviarNotificacion = mostrarModalEnviarNotificacion;
    window.cerrarModalEnviarNotificacion = cerrarModalEnviarNotificacion;
    window.cargarUsuariosParaNotificacion = cargarUsuariosParaNotificacion;
    window.manejarEnvioNotificacion = manejarEnvioNotificacion;
    window.generarContrasena = generarContrasena;
    window.forzarSincronizacionUsuarios = forzarSincronizacionUsuarios;
    window.mostrarEstadisticasSincronizacion = mostrarEstadisticasSincronizacion;
}

console.log('✅ Módulo de usuarios cargado');
