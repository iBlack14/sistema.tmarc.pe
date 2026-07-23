/**
 * Módulo de Configuración del Admin
 * Maneja la configuración general del sistema
 */

// Cargar configuración al mostrar la sección
async function cargarConfiguracion() {
    try {
        console.log('📋 Cargando configuración del sistema...');
        
        const response = await fetch('/api/configuracion');
        const data = await response.json();
        
        if (data.success) {
            const config = data.data;
            
            // Configuración General (Compatible con nombres antiguos y nuevos)
            const nombre = config.nombre_sistema || config.nombre_institucion;
            if (nombre) {
                document.getElementById('config-nombre-sistema').value = nombre.valor;
            }
            
            const correo = config.correo_soporte || config.email_soporte;
            if (correo) {
                document.getElementById('config-correo-soporte').value = correo.valor;
            }
            
            // Configuración SMTP
            if (config.smtp_server) {
                document.getElementById('smtp-server').value = config.smtp_server.valor || '';
            }
            if (config.smtp_port) {
                document.getElementById('smtp-port').value = config.smtp_port.valor || '';
            }
            if (config.smtp_user) {
                document.getElementById('smtp-user').value = config.smtp_user.valor || '';
            }
            if (config.smtp_password) {
                document.getElementById('smtp-password').value = config.smtp_password.valor || '';
            }
            if (config.smtp_ssl) {
                document.getElementById('smtp-ssl').checked = config.smtp_ssl.valor;
            }
            if (config.smtp_from_email) {
                document.getElementById('smtp-from-email').value = config.smtp_from_email.valor || '';
            }
            if (config.smtp_from_name) {
                document.getElementById('smtp-from-name').value = config.smtp_from_name.valor || '';
            }
            
            console.log('✅ Configuración cargada correctamente');
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error);
    }
}

/**
 * Guardar configuración general
 */
async function guardarConfigGeneral() {
    try {
        const nombreSistema = document.getElementById('config-nombre-sistema').value;
        const correoSoporte = document.getElementById('config-correo-soporte').value;
        
        if (!nombreSistema || !correoSoporte) {
            mostrarNotificacion('Por favor, complete todos los campos', 'warning');
            return;
        }
        
        console.log('💾 Guardando configuración general...');
        
        const token = await getSecureItem('authToken');
        const response = await fetch('/api/configuracion/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                configuraciones: {
                    nombre_sistema: nombreSistema,
                    correo_soporte: correoSoporte
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('✅ Configuración guardada correctamente', 'success');
            } else {
                alert('✅ Configuración guardada correctamente');
            }
            console.log('✅ Configuración guardada');
        } else {
            throw new Error(data.error || 'Error guardando configuración');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        if (window.conexionDatos) {
            window.conexionDatos.mostrarNotificacion('❌ Error guardando configuración', 'error');
        } else {
            alert('❌ Error guardando configuración');
        }
    }
}

/**
 * Guardar configuración SMTP
 */
async function guardarConfigSMTP() {
    try {
        const smtpServer = document.getElementById('smtp-server').value;
        const smtpPort = document.getElementById('smtp-port').value;
        const smtpUser = document.getElementById('smtp-user').value;
        const smtpPassword = document.getElementById('smtp-password').value;
        const smtpSsl = document.getElementById('smtp-ssl').checked;
        const smtpFromEmail = document.getElementById('smtp-from-email').value;
        const smtpFromName = document.getElementById('smtp-from-name').value;
        
        console.log('💾 Guardando configuración SMTP...');
        
        const response = await fetch('/api/configuracion/batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getSecureItem('authToken')}`
            },
            body: JSON.stringify({
                configuraciones: {
                    smtp_server: smtpServer,
                    smtp_port: smtpPort,
                    smtp_user: smtpUser,
                    smtp_password: smtpPassword,
                    smtp_ssl: smtpSsl,
                    smtp_from_email: smtpFromEmail,
                    smtp_from_name: smtpFromName
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('✅ Configuración SMTP guardada correctamente', 'success');
            } else {
                alert('✅ Configuración SMTP guardada correctamente');
            }
            console.log('✅ Configuración SMTP guardada');
        } else {
            throw new Error(data.error || 'Error guardando configuración SMTP');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        if (window.conexionDatos) {
            window.conexionDatos.mostrarNotificacion('❌ Error guardando configuración SMTP', 'error');
        } else {
            alert('❌ Error guardando configuración SMTP');
        }
    }
}

/**
 * Probar conexión SMTP
 */
async function probarConfigSMTP() {
    try {
        console.log('🔍 Probando conexión SMTP...');
        
        if (window.conexionDatos) {
            window.conexionDatos.mostrarNotificacion('🔍 Probando conexión SMTP...', 'info');
        }
        
        const response = await fetch('/api/smtp/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (window.conexionDatos) {
                window.conexionDatos.mostrarNotificacion('✅ Conexión SMTP exitosa', 'success');
            } else {
                alert('✅ Conexión SMTP exitosa');
            }
        } else {
            throw new Error(data.error || 'Error en la conexión SMTP');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        if (window.conexionDatos) {
            window.conexionDatos.mostrarNotificacion('❌ Error en conexión SMTP: ' + error.message, 'error');
        } else {
            alert('❌ Error en conexión SMTP: ' + error.message);
        }
    }
}

// Cargar configuración cuando se muestre la sección
document.addEventListener('DOMContentLoaded', () => {
    // Detectar cuando se muestra la sección de configuración
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const configSection = document.getElementById('configuracion');
            if (configSection && configSection.classList.contains('active')) {
                cargarConfiguracion();
            }
        });
    });
    
    const configSection = document.getElementById('configuracion');
    if (configSection) {
        observer.observe(configSection, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

console.log('✅ Módulo de configuración cargado');

/**
 * Cambiar contraseña del administrador
 */
async function cambiarPasswordAdmin() {
    const currentPassword = document.getElementById('admin-pass-actual').value;
    const newPassword = document.getElementById('admin-pass-nueva').value;
    const confirmPassword = document.getElementById('admin-pass-confirmar').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        mostrarNotificacion('Por favor, completa todos los campos de contraseña', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        mostrarNotificacion('La nueva contraseña y su confirmación no coinciden', 'error');
        return;
    }

    if (newPassword.length < 6) {
        mostrarNotificacion('La nueva contraseña debe tener al menos 6 caracteres', 'warning');
        return;
    }

    try {
        const token = await getSecureItem('authToken');
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            mostrarNotificacion('¡Contraseña actualizada con éxito!', 'success');
            document.getElementById('admin-pass-actual').value = '';
            document.getElementById('admin-pass-nueva').value = '';
            document.getElementById('admin-pass-confirmar').value = '';
        } else {
            mostrarNotificacion(data.error || 'Error al cambiar contraseña', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error de conexión con el servidor', 'error');
    }
}

/**
 * Utilidad para mostrar notificaciones (si SweetAlert está presente, usarlo)
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: tipo === 'success' ? 'Éxito' : 'Aviso',
            text: mensaje,
            icon: tipo,
            confirmButtonColor: '#d4af37'
        });
    } else {
        alert(mensaje);
    }
}

/**
 * Alternar visibilidad de contraseña
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}
