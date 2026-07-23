/**
 * Módulo de Gestión de Modales
 * Maneja todos los modales genéricos y personalizados
 */

// Variables globales para callbacks de modales
let confirmCallback = null;
let promptCallback = null;

// Función para mostrar modal de confirmación personalizado
function mostrarConfirmModal(mensaje, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const messageElement = document.getElementById('confirmMessage');
    
    if (!modal || !messageElement) {
        // Fallback a confirm nativo si el modal no existe
        if (confirm(mensaje)) {
            onConfirm();
        }
        return;
    }

    messageElement.textContent = mensaje;
    confirmCallback = onConfirm;
    modal.style.display = 'block';
}

// Función para cerrar modal de confirmación
function cerrarConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
    confirmCallback = null;
}

// Función para confirmar acción
function confirmarAccion() {
    if (confirmCallback && typeof confirmCallback === 'function') {
        confirmCallback();
    }
    cerrarConfirmModal();
}

// Función para mostrar modal de prompt personalizado
function mostrarPromptModal(mensaje, onSubmit) {
    const modal = document.getElementById('promptModal');
    const messageElement = document.getElementById('promptMessage');
    const inputElement = document.getElementById('promptInput');
    
    if (!modal || !messageElement || !inputElement) {
        // Fallback a prompt nativo si el modal no existe
        const resultado = prompt(mensaje);
        if (resultado !== null) {
            onSubmit(resultado);
        }
        return;
    }

    messageElement.textContent = mensaje;
    inputElement.value = '';
    promptCallback = onSubmit;
    modal.style.display = 'block';
    
    // Enfocar el input
    setTimeout(() => inputElement.focus(), 100);
}

// Función para cerrar modal de prompt
function cerrarPromptModal() {
    const modal = document.getElementById('promptModal');
    if (modal) {
        modal.style.display = 'none';
    }
    promptCallback = null;
}

// Función para enviar prompt
function enviarPrompt() {
    const inputElement = document.getElementById('promptInput');
    const valor = inputElement ? inputElement.value.trim() : '';
    
    if (promptCallback && typeof promptCallback === 'function') {
        if (valor) {
            promptCallback(valor);
            cerrarPromptModal();
        } else {
            alert('Por favor, ingrese un valor');
        }
    }
}

// Función para cerrar modal de respuesta
function cerrarModalResponder() {
    const modal = document.getElementById('responderModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para manejar clic fuera de modales
function setupModalClickOutside() {
    window.onclick = function(event) {
        const expedienteModal = document.getElementById('expedienteModal');
        const solicitudModal = document.getElementById('solicitudModal');
        const editarModal = document.getElementById('editarUsuarioModal');
        const agregarModal = document.getElementById('agregarUsuarioModal');
        const notifModal = document.getElementById('enviarNotificacionModal');
        const responderModal = document.getElementById('responderModal');
        const confirmModal = document.getElementById('confirmModal');
        const promptModal = document.getElementById('promptModal');

        if (event.target === expedienteModal) {
            cerrarModalExpediente();
        }
        if (event.target === solicitudModal) {
            cerrarModalSolicitud();
        }
        if (event.target === editarModal) {
            cerrarModalEditarUsuario();
        }
        if (event.target === agregarModal) {
            cerrarModalAgregarUsuario();
        }
        if (event.target === notifModal) {
            cerrarModalEnviarNotificacion();
        }
        if (event.target === responderModal) {
            cerrarModalResponder();
        }
        if (event.target === confirmModal) {
            cerrarConfirmModal();
        }
        if (event.target === promptModal) {
            cerrarPromptModal();
        }
    };
}

// Función para cerrar todos los modales
function cerrarTodosLosModales() {
    const modales = document.querySelectorAll('.modal, .modal-overlay, .expediente-modal');
    modales.forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });
    
    // Limpiar callbacks
    confirmCallback = null;
    promptCallback = null;
}

// Función para mostrar modal de carga
function mostrarModalCarga(mensaje = 'Cargando...') {
    let modal = document.getElementById('loadingModal');
    
    if (!modal) {
        // Crear modal de carga si no existe
        const modalHTML = `
            <div id="loadingModal" class="modal" style="display: none;">
                <div class="modal-content" style="max-width: 300px; text-align: center;">
                    <div class="modal-body" style="padding: 30px;">
                        <div style="font-size: 48px; margin-bottom: 15px;">⏳</div>
                        <p id="loadingMessage" style="margin: 0; color: #000000;">${mensaje}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('loadingModal');
    }
    
    const messageElement = document.getElementById('loadingMessage');
    if (messageElement) {
        messageElement.textContent = mensaje;
    }
    
    modal.style.display = 'block';
}

// Función para cerrar modal de carga
function cerrarModalCarga() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Función para mostrar modal de éxito
function mostrarModalExito(mensaje, onClose) {
    const modalHTML = `
        <div id="successModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div class="modal-body" style="padding: 30px;">
                    <div style="font-size: 64px; color: #4caf50; margin-bottom: 15px;">✅</div>
                    <h3 style="color: #000000; margin-bottom: 15px;">¡Éxito!</h3>
                    <p style="margin: 0; color: #000000;">${mensaje}</p>
                </div>
                <div class="modal-footer" style="text-align: center;">
                    <button class="btn btn-primary" onclick="cerrarModalExito()">Aceptar</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('successModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Guardar callback si existe
    if (onClose && typeof onClose === 'function') {
        window._successModalCallback = onClose;
    }
}

// Función para cerrar modal de éxito
function cerrarModalExito() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.remove();
    }
    
    if (window._successModalCallback && typeof window._successModalCallback === 'function') {
        window._successModalCallback();
        window._successModalCallback = null;
    }
}

// Función para mostrar modal de error
function mostrarModalError(mensaje, onClose) {
    const modalHTML = `
        <div id="errorModal" class="modal" style="display: block;">
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div class="modal-body" style="padding: 30px;">
                    <div style="font-size: 64px; color: #f44336; margin-bottom: 15px;">❌</div>
                    <h3 style="color: #000000; margin-bottom: 15px;">Error</h3>
                    <p style="margin: 0; color: #000000;">${mensaje}</p>
                </div>
                <div class="modal-footer" style="text-align: center;">
                    <button class="btn btn-primary" onclick="cerrarModalError()">Aceptar</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('errorModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Guardar callback si existe
    if (onClose && typeof onClose === 'function') {
        window._errorModalCallback = onClose;
    }
}

// Función para cerrar modal de error
function cerrarModalError() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.remove();
    }
    
    if (window._errorModalCallback && typeof window._errorModalCallback === 'function') {
        window._errorModalCallback();
        window._errorModalCallback = null;
    }
}

// Inicializar event listeners cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setupModalClickOutside();
    
    // Cerrar modales con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarTodosLosModales();
        }
    });
    
    // Enter en prompt modal
    const promptInput = document.getElementById('promptInput');
    if (promptInput) {
        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                enviarPrompt();
            }
        });
    }
});

// Exportar funciones para uso global
if (typeof window !== 'undefined') {
    window.mostrarConfirmModal = mostrarConfirmModal;
    window.cerrarConfirmModal = cerrarConfirmModal;
    window.confirmarAccion = confirmarAccion;
    window.mostrarPromptModal = mostrarPromptModal;
    window.cerrarPromptModal = cerrarPromptModal;
    window.enviarPrompt = enviarPrompt;
    window.cerrarModalResponder = cerrarModalResponder;
    window.setupModalClickOutside = setupModalClickOutside;
    window.cerrarTodosLosModales = cerrarTodosLosModales;
    window.mostrarModalCarga = mostrarModalCarga;
    window.cerrarModalCarga = cerrarModalCarga;
    window.mostrarModalExito = mostrarModalExito;
    window.cerrarModalExito = cerrarModalExito;
    window.mostrarModalError = mostrarModalError;
    window.cerrarModalError = cerrarModalError;
}
