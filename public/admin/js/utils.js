/**
 * Utilidades Generales
 * Funciones auxiliares compartidas por todos los módulos
 */

// Loader Global Pro Max
function showLoader(text = 'CARGANDO') {
    if (document.querySelector('.loader-wrapper')) return;
    const loader = document.createElement('div');
    loader.className = 'loader-wrapper';
    loader.innerHTML = `
        <div class="loader-premium"></div>
        <div class="loader-text">${text}</div>
    `;
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.querySelector('.loader-wrapper');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 400);
    }
}

// Función para obtener icono de archivo
function obtenerIconoArchivo(tipo) {
    if (tipo.includes('pdf')) return '📄';
    if (tipo.includes('image')) return '🖼️';
    if (tipo.includes('word') || tipo.includes('document')) return '📝';
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return '📊';
    if (tipo.includes('powerpoint') || tipo.includes('presentation')) return '📋';
    if (tipo.includes('zip') || tipo.includes('rar')) return '🗜️';
    if (tipo.includes('video')) return '🎥';
    if (tipo.includes('audio')) return '🎵';
    return '📎';
}

// Función para obtener tipo de archivo
function obtenerTipoArchivo(tipo) {
    if (tipo.includes('pdf')) return 'PDF';
    if (tipo.includes('jpeg') || tipo.includes('jpg')) return 'JPEG';
    if (tipo.includes('png')) return 'PNG';
    if (tipo.includes('gif')) return 'GIF';
    if (tipo.includes('word')) return 'Word';
    if (tipo.includes('excel')) return 'Excel';
    if (tipo.includes('powerpoint')) return 'PowerPoint';
    if (tipo.includes('zip')) return 'ZIP';
    if (tipo.includes('rar')) return 'RAR';
    return 'Archivo';
}

// Función para formatear tamaño de archivo
function formatearTamano(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para mostrar imagen en modal
function mostrarImagenModal(nombreImagen) {
    alert(`🖼️ Visualizador de imágenes\n\nMostrando: ${nombreImagen}\n\nEn un sistema real, aquí se mostraría la imagen en un visor especializado.`);
}

// Función para obtener clase de estado
function getStatusClass(estado) {
    switch(estado?.toLowerCase()) {
        case 'activo':
        case 'aprobado':
        case 'completado':
            return 'status-active';
        case 'pendiente':
        case 'en proceso':
            return 'status-pending';
        case 'inactivo':
        case 'rechazado':
        case 'cancelado':
            return 'status-inactive';
        default:
            return 'status-pending';
    }
}

// Función para cambiar sección
function showSection(sectionId, el) {
    // Alternar secciones
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    // Marcar item activo del menú
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    // Si no se pasó el elemento, intentar encontrarlo por el sectionId
    if (!el) {
        el = document.querySelector(`.nav-item[onclick*="'${sectionId}'"]`) || 
             document.querySelector(`.nav-item[onclick*='"${sectionId}"']`);
    }
    
    if (el) el.classList.add('active');

    // Títulos dinámicos Pro
    const sectionTitles = {
        'dashboard': 'Dashboard',
        'usuarios': 'Gestión de Usuarios',
        'casilla': 'Casilla Electrónica',
        'expedientes': 'Expedientes Judiciales',
        'solicitudes': 'Solicitudes Pendientes',
        'configuracion': 'Configuración Sistema'
    };
    
    const pageTitle = sectionTitles[sectionId] || 'Panel Administrativo';
    document.title = `TMARC | ${pageTitle}`;

    // Actualizar hash en la URL para vista "Pro"
    if (window.location.hash !== '#' + sectionId) {
        history.replaceState(null, null, '#' + sectionId);
    }

    // Cargas perezosas
    if (sectionId === 'solicitudes') {
        if (typeof window.cargarTablaSolicitudes === 'function') {
            window.cargarTablaSolicitudes();
        } else if (typeof window.refreshSolicitudesTable === 'function') {
            window.refreshSolicitudesTable();
        }
    } else if (sectionId === 'expedientes') {
        if (typeof window.cargarExpedientesTabla === 'function') {
            window.cargarExpedientesTabla();
        }
    } else if (sectionId === 'casilla' && typeof window.cargarCasillaElectronicaAdmin === 'function') {
        window.cargarCasillaElectronicaAdmin();
    }
}

// Función para cerrar modal genérico
function closeModal() {
    const modals = document.querySelectorAll('.modal, .modal-overlay, .expediente-modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });
}

// Función para logout
function logout() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¿Cerrar Sesión?',
            text: "Está a punto de salir del sistema administrativo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d4af37',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cerrar sesión',
            cancelButtonText: 'Cancelar',
            background: '#fff',
            customClass: {
                title: 'swal2-title-custom',
                content: 'swal2-content-custom'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('userData');
                window.location.href = 'login.html';
            }
        });
    } else {
        if (confirm('¿Está seguro de cerrar sesión?')) {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            window.location.href = 'login.html';
        }
    }
}

// Función para toggle del menú de usuario
function toggleUserMenu() {
    console.log('Toggle user menu');
}

// --- SISTEMA DE ENCRIPTACIÓN DE SESIÓN (AES-256) ---
const SESSION_KEY = 'TMARC_SECURE_JUDICIAL_KEY_2026';

/**
 * Encripta datos usando AES-GCM (Web Crypto API)
 */
async function encryptSessionData(text) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        
        // Generar una clave a partir del string secreto
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw', encoder.encode(SESSION_KEY), 'PBKDF2', false, ['deriveKey']
        );
        const key = await window.crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: encoder.encode('tmarc-salt'), iterations: 100000, hash: 'SHA-256' },
            keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
        
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        // Conversión segura a Base64 para evitar corrupción de bytes
        let binary = '';
        const bytes = new Uint8Array(combined);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } catch (e) {
        console.error('❌ Error crítico encriptando sesión:', e);
        return text;
    }
}

/**
 * Desencripta datos usando AES-GCM
 */
async function decryptSessionData(encoded) {
    try {
        if (!encoded || encoded.startsWith('{') || encoded.startsWith('[') || encoded.length < 20) {
            return encoded; // No parece estar encriptado
        }

        const encoder = new TextEncoder();
        const binary = atob(encoded);
        const combined = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            combined[i] = binary.charCodeAt(i);
        }
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const keyMaterial = await window.crypto.subtle.importKey(
            'raw', encoder.encode(SESSION_KEY), 'PBKDF2', false, ['deriveKey']
        );
        const key = await window.crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: encoder.encode('tmarc-salt'), iterations: 100000, hash: 'SHA-256' },
            keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
        );

        const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        // Si falla, probablemente no esté encriptado
        return encoded;
    }
}

/**
 * Guarda un item de forma segura en sessionStorage
 */
async function setSecureItem(key, value) {
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const encrypted = await encryptSessionData(stringValue);
    sessionStorage.setItem(key, encrypted);
}

/**
 * Obtiene un item de forma segura de sessionStorage
 */
async function getSecureItem(key) {
    const encrypted = sessionStorage.getItem(key);
    if (!encrypted) return null;
    const decrypted = await decryptSessionData(encrypted);
    try {
        return JSON.parse(decrypted);
    } catch (e) {
        return decrypted;
    }
}

// --- SISTEMA DE NOTIFICACIONES PROFESIONALES (SweetAlert2) ---

/**
 * Muestra una notificación de éxito profesional
 */
function showSuccess(mensaje, titulo = '¡Éxito!') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: titulo,
            text: mensaje,
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false,
            background: '#fff',
            customClass: {
                popup: 'premium-swal-popup-success',
                title: 'premium-swal-title'
            }
        });
    } else {
        alert('✅ ' + mensaje);
    }
}

/**
 * Muestra una notificación de error profesional
 */
function showError(mensaje, titulo = '¡Error!') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: titulo,
            text: mensaje,
            confirmButtonColor: '#d4af37',
            confirmButtonText: 'Entendido',
            background: '#fff',
            customClass: {
                popup: 'premium-swal-popup-error',
                title: 'premium-swal-title'
            }
        });
    } else {
        alert('❌ ' + mensaje);
    }
}

/**
 * Muestra un overlay de carga profesional
 */
function showLoading(mensaje = 'Cargando...') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: mensaje,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            background: '#fff',
            didOpen: () => {
                Swal.showLoading();
            }
        });
    } else {
        // Fallback al overlay manual si Swal no está
        const loader = document.getElementById('loading-overlay-admin');
        if (loader) {
            loader.style.display = 'flex';
        }
    }
}

/**
 * Oculta el overlay de carga
 */
function hideLoading() {
    if (typeof Swal !== 'undefined' && Swal.isVisible()) {
        Swal.close();
    }
    const loader = document.getElementById('loading-overlay-admin');
    if (loader) {
        loader.style.display = 'none';
        if (typeof CasillaUnificada !== 'undefined' && CasillaUnificada.cerrarCargando) {
            CasillaUnificada.cerrarCargando();
        }
    }
}

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.obtenerIconoArchivo = obtenerIconoArchivo;
    window.obtenerTipoArchivo = obtenerTipoArchivo;
    window.formatearTamano = formatearTamano;
    window.mostrarImagenModal = mostrarImagenModal;
    window.getStatusClass = getStatusClass;
    window.showSection = showSection;
    window.closeModal = closeModal;
    window.logout = logout;
    window.toggleUserMenu = toggleUserMenu;
    window.setSecureItem = setSecureItem;
    window.getSecureItem = getSecureItem;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
}
