/**
 * Configuracion Module
 * Handles all configuration-related functionality
 */

class ConfiguracionModule {
    constructor(dashboardApp) {
        this.dashboard = dashboardApp;
        this.userProfile = {};
        this.smtpConfig = {};
        this.notificationPreferences = {};
        this.systemConfig = {};

        this.init();
    }

    /**
     * Initialize configuracion module
     */
    async init() {
        this.loadNotificationPreferences();
        this.setupEventListeners();
        await this.loadUserProfile();
        await this.loadSMTPConfig();
        await this.loadSystemConfig();
    }

    /**
     * Setup event listeners for configuracion
     */
    setupEventListeners() {
        // Esperar a que el DOM esté listo
        setTimeout(() => {
            // Profile form
            const profileForm = document.getElementById('profileForm');
            if (profileForm) {
                console.log('✅ Event listener agregado al formulario de perfil');
                profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
            } else {
                console.warn('⚠️ No se encontró el formulario profileForm');
            }

            // Security form
            const securityForm = document.getElementById('securityForm');
            if (securityForm) {
                console.log('✅ Event listener agregado al formulario de seguridad');
                securityForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
            }

            // Notification preferences
            const notificationCheckboxes = document.querySelectorAll('#configuracion input[type="checkbox"]');
            notificationCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', () => this.handleNotificationPreferences());
            });

            // Language selector
            const languageSelect = document.querySelector('#configuracion select');
            if (languageSelect) {
                languageSelect.addEventListener('change', (e) => this.handleLanguageChange(e));
            }
        }, 500);
    }

    /**
     * Load user profile data
     */
    async loadUserProfile() {
        try {
            const usuarioId = sessionStorage.getItem('userId') || sessionStorage.getItem('usuarioActual');

            if (!usuarioId) {
                console.warn('No user ID found');
                return;
            }

            console.log(' Cargando perfil del usuario:', usuarioId);

            const response = await fetch(`/api/usuarios/${usuarioId}`);
            const data = await response.json();

            if (data.success) {
                this.userProfile = data.data;

                // Fill profile form
                const nombreInput = document.getElementById('profile-nombre');
                const emailInput = document.getElementById('profile-email');
                const telefonoInput = document.getElementById('profile-telefono');
                const fotoInput = document.getElementById('profile-foto');
                const previewImg = document.getElementById('profile-preview');

                if (nombreInput) nombreInput.value = this.userProfile.nombre || '';
                if (emailInput) emailInput.value = this.userProfile.email || '';
                if (telefonoInput) telefonoInput.value = this.userProfile.telefono || '';
                
                if (fotoInput) {
                    const filenameSpan = document.getElementById('foto-filename');
                    // Real-time preview listener for file upload
                    fotoInput.addEventListener('change', (e) => {
                        if (e.target.files.length > 0) {
                            const file = e.target.files[0];
                            if (filenameSpan) filenameSpan.textContent = file.name;
                            
                            // Vista previa local antes de subir
                            if (previewImg) {
                                const reader = new FileReader();
                                reader.onload = (event) => previewImg.src = event.target.result;
                                reader.readAsDataURL(file);
                            }
                        }
                    });
                }
                
                if (previewImg && this.userProfile.foto_perfil) {
                    previewImg.src = this.userProfile.foto_perfil;
                }

                console.log(' Perfil cargado correctamente');
            }
        } catch (error) {
            console.error(' Error loading user profile:', error);
        }
    }

    /**
     * Populate profile form with user data
     */
    populateProfileForm() {
        if (!this.userProfile) return;

        // Find form fields and populate them
        const nombreField = document.querySelector('#configuracion input[placeholder*="nombre"]') ||
                           document.querySelector('#configuracion input[type="text"]');
        const emailField = document.querySelector('#configuracion input[type="email"]');
        const telefonoField = document.querySelector('#configuracion input[type="tel"]');

        if (nombreField) nombreField.value = this.userProfile.nombre || '';
        if (emailField) emailField.value = this.userProfile.email || '';
        if (telefonoField) telefonoField.value = this.userProfile.telefono || '';
    }

    /**
     * Handle profile update
     */
    async handleProfileUpdate(e) {
        e.preventDefault();
        const usuarioId = sessionStorage.getItem('userId');
        
        console.log('💾 Guardando cambios del perfil...');

        const formData = new FormData(e.target);
        
        // 1. Manejar subida de foto si existe un archivo seleccionado
        const fotoInput = document.getElementById('profile-foto');
        let fotoUrl = null;

        if (fotoInput && fotoInput.files.length > 0) {
            console.log('📤 Subiendo nueva imagen de perfil con reemplazo...');
            const fotoData = new FormData();
            fotoData.append('avatar', fotoInput.files[0]);

            try {
                const uploadRes = await fetch(`/api/usuarios/${usuarioId}/avatar`, {
                    method: 'POST',
                    body: fotoData
                });
                const uploadResult = await uploadRes.json();
                if (uploadResult.success) {
                    fotoUrl = uploadResult.data.foto_perfil;
                    console.log('✅ Foto subida y antigua eliminada:', fotoUrl);
                }
            } catch (err) {
                console.error('❌ Error subiendo foto:', err);
            }
        }

        const updatedData = {
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            telefono: formData.get('telefono') || ''
        };

        if (fotoUrl) {
            updatedData.foto_perfil = fotoUrl;
        }

        console.log('📝 Datos a actualizar:', updatedData);

        // Validation
        if (!updatedData.nombre || !updatedData.email) {
            this.dashboard.showError('Por favor, complete los campos obligatorios (Nombre y Email).');
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updatedData.email)) {
            this.dashboard.showError('Por favor, ingrese un correo electrónico válido.');
            return;
        }

        try {
            const usuarioId = sessionStorage.getItem('userId');

            if (!usuarioId) {
                this.dashboard.showError('Error: No se encontró el ID de usuario');
                return;
            }

            console.log('📤 Enviando a /api/usuarios/' + usuarioId);

            const response = await fetch(`/api/usuarios/${usuarioId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            const data = await response.json();

            if (data.success) {
                this.userProfile = { ...this.userProfile, ...updatedData };
                
                // Actualizar sessionStorage
                sessionStorage.setItem('userName', updatedData.nombre);
                sessionStorage.setItem('userEmail', updatedData.email);
                
                this.dashboard.showToast('✅ Perfil actualizado correctamente');
                console.log('✅ Perfil actualizado');
                
                // Recargar datos del formulario
                await this.loadUserProfile();

                // Refrescar nombre y foto en la barra lateral
                if (this.dashboard && typeof this.dashboard.updateUserProfile === 'function') {
                    this.dashboard.user = { ...this.dashboard.user, ...updatedData };
                    this.dashboard.updateUserProfile();
                }
            } else {
                throw new Error(data.error || 'Error updating profile');
            }
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            this.dashboard.showError('❌ Error actualizando perfil: ' + error.message);
        }
    }

    /**
     * Handle password change
     */
    async handlePasswordChange(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Validation
        const validation = this.validatePasswordChange(currentPassword, newPassword, confirmPassword);
        if (!validation.valid) {
            this.showValidationError(validation.errors);
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        this.showLoading(submitBtn);

        try {
            const usuarioId = sessionStorage.getItem('userId') || '2';

            // First verify current password
            const verifyResponse = await fetch(`/api/usuarios/${usuarioId}/verify-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: currentPassword
                })
            });

            const verifyData = await verifyResponse.json();

            if (!verifyData.success || !verifyData.data.valida) {
                throw new Error('La contraseña actual es incorrecta');
            }

            // Change password
            const changeResponse = await fetch(`/api/usuarios/${usuarioId}/password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const changeData = await changeResponse.json();

            if (changeData.success) {
                alert('✅ Contraseña cambiada correctamente');
                console.log('✅ Contraseña actualizada');
                e.target.reset();
                
                // Mostrar notificación si existe el método
                if (this.dashboard && this.dashboard.showSuccess) {
                    this.dashboard.showSuccess('Contraseña cambiada correctamente');
                }
            } else {
                throw new Error(changeData.error || 'Error changing password');
            }
        } catch (error) {
            console.error('❌ Error changing password:', error);
            alert('❌ Error cambiando contraseña: ' + error.message);
            
            if (this.dashboard && this.dashboard.showError) {
                this.dashboard.showError('Error cambiando contraseña: ' + error.message);
            }
        } finally {
            this.hideLoading(submitBtn);
        }
    }

    /**
     * Validate password change form
     */
    validatePasswordChange(currentPassword, newPassword, confirmPassword) {
        const errors = [];

        if (!currentPassword) {
            errors.push('La contraseña actual es requerida');
        }

        if (!newPassword) {
            errors.push('La nueva contraseña es requerida');
        } else if (newPassword.length < 6) {
            errors.push('La nueva contraseña debe tener al menos 6 caracteres');
        } else if (newPassword.length > 50) {
            errors.push('La nueva contraseña no puede tener más de 50 caracteres');
        }

        if (!confirmPassword) {
            errors.push('La confirmación de contraseña es requerida');
        } else if (newPassword !== confirmPassword) {
            errors.push('Las contraseñas no coinciden');
        }

        if (currentPassword === newPassword) {
            errors.push('La nueva contraseña debe ser diferente a la actual');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Show validation errors
     */
    showValidationError(errors) {
        const errorMessage = errors.join('\n');
        alert('Errores de validación:\n\n' + errorMessage);
    }

    /**
     * Handle notification preferences
     */
    handleNotificationPreferences() {
        const preferences = {
            email: document.getElementById('email-notif')?.checked || false,
            sms: document.getElementById('sms-notif')?.checked || false,
            push: document.getElementById('push-notif')?.checked || false
        };

        // Save preferences to localStorage
        localStorage.setItem('notificationPreferences', JSON.stringify(preferences));

        console.log('Notification preferences updated:', preferences);
    }

    /**
     * Handle language change
     */
    handleLanguageChange(e) {
        const selectedLanguage = e.target.value;

        // Save language preference
        localStorage.setItem('userLanguage', selectedLanguage);

        // In a real application, you would implement language switching
        console.log('Language changed to:', selectedLanguage);

        this.dashboard.showSuccess('Idioma cambiado correctamente');
    }

    /**
     * Load SMTP configuration
     */
    async loadSMTPConfig() {
        try {
            const response = await fetch('/api/smtp/estado');
            const data = await response.json();

            if (data.success) {
                this.smtpConfig = data.data;
                this.populateSMTPForm();
            }
        } catch (error) {
            console.error('Error loading SMTP config:', error);
        }
    }

    /**
     * Populate SMTP configuration form
     */
    populateSMTPForm() {
        if (!this.smtpConfig) return;

        const serverField = document.getElementById('smtp-server');
        const portField = document.getElementById('smtp-port');
        const userField = document.getElementById('smtp-user');
        const fromEmailField = document.getElementById('smtp-from-email');
        const fromNameField = document.getElementById('smtp-from-name');
        const sslCheckbox = document.getElementById('smtp-ssl');

        if (serverField) serverField.value = this.smtpConfig.server || '';
        if (portField) portField.value = this.smtpConfig.port || 587;
        if (userField) userField.value = this.smtpConfig.user || '';
        if (fromEmailField) fromEmailField.value = this.smtpConfig.fromEmail || '';
        if (fromNameField) fromNameField.value = this.smtpConfig.fromName || '';
        if (sslCheckbox) sslCheckbox.checked = this.smtpConfig.ssl || false;
    }

    /**
     * Test SMTP connection
     */
    async testSMTPConnection() {
        const config = {
            server: document.getElementById('smtp-server')?.value || '',
            port: parseInt(document.getElementById('smtp-port')?.value) || 587,
            user: document.getElementById('smtp-user')?.value || '',
            password: document.getElementById('smtp-password')?.value || '',
            ssl: document.getElementById('smtp-ssl')?.checked || false,
            fromEmail: document.getElementById('smtp-from-email')?.value || '',
            fromName: document.getElementById('smtp-from-name')?.value || ''
        };

        try {
            const response = await fetch('/api/smtp/probar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                this.dashboard.showSuccess('Conexión SMTP exitosa');
            } else {
                throw new Error(data.message || 'Error en conexión SMTP');
            }
        } catch (error) {
            console.error('Error testing SMTP:', error);
            this.dashboard.showError('Error probando conexión SMTP: ' + error.message);
        }
    }

    /**
     * Save SMTP configuration
     */
    async saveSMTPConfig() {
        const config = {
            server: document.getElementById('smtp-server')?.value || '',
            port: parseInt(document.getElementById('smtp-port')?.value) || 587,
            user: document.getElementById('smtp-user')?.value || '',
            password: document.getElementById('smtp-password')?.value || '',
            ssl: document.getElementById('smtp-ssl')?.checked || false,
            fromEmail: document.getElementById('smtp-from-email')?.value || '',
            fromName: document.getElementById('smtp-from-name')?.value || ''
        };

        try {
            const response = await fetch('/api/smtp/configurar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();

            if (data.success) {
                this.smtpConfig = config;
                this.dashboard.showSuccess('Configuración SMTP guardada correctamente');
            } else {
                throw new Error(data.message || 'Error guardando configuración');
            }
        } catch (error) {
            console.error('Error saving SMTP config:', error);
            this.dashboard.showError('Error guardando configuración SMTP: ' + error.message);
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return {
            userProfile: this.userProfile,
            smtpConfig: this.smtpConfig,
            preferences: this.getNotificationPreferences()
        };
    }

    /**
     * Get notification preferences
     */
    getNotificationPreferences() {
        const stored = localStorage.getItem('notificationPreferences');
        return stored ? JSON.parse(stored) : {
            email: true,
            sms: true,
            push: true
        };
    }

    /**
     * Load notification preferences into form
     */
    loadNotificationPreferences() {
        const preferences = this.getNotificationPreferences();

        const emailCheckbox = document.getElementById('email-notif');
        const smsCheckbox = document.getElementById('sms-notif');
        const pushCheckbox = document.getElementById('push-notif');

        if (emailCheckbox) emailCheckbox.checked = preferences.email;
        if (smsCheckbox) smsCheckbox.checked = preferences.sms;
        if (pushCheckbox) pushCheckbox.checked = preferences.push;
    }

    /**
     * Load system configuration
     */
    async loadSystemConfig() {
        try {
            // Load system settings from localStorage or API
            this.systemConfig = this.getSystemConfig();
            this.populateSystemConfigForm();
        } catch (error) {
            console.error('Error loading system config:', error);
        }
    }

    /**
     * Get system configuration
     */
    getSystemConfig() {
        const stored = localStorage.getItem('systemConfig');
        return stored ? JSON.parse(stored) : {
            systemName: 'Sistema de Gestión',
            supportEmail: 'soporte@sistema.gov',
            maintenanceMode: false,
            sessionTimeout: 30,
            maxFileSize: 40,
            allowedFormats: ['pdf', 'doc', 'docx']
        };
    }

    /**
     * Populate system configuration form
     */
    populateSystemConfigForm() {
        if (!this.systemConfig) return;

        const systemNameField = document.querySelector('#configuracion input[placeholder*="Sistema"]');
        const supportEmailField = document.querySelector('#configuracion input[placeholder*="soporte"]');
        const maintenanceCheckbox = document.getElementById('maintenance-mode');

        if (systemNameField) systemNameField.value = this.systemConfig.systemName || '';
        if (supportEmailField) supportEmailField.value = this.systemConfig.supportEmail || '';
        if (maintenanceCheckbox) maintenanceCheckbox.checked = this.systemConfig.maintenanceMode || false;
    }

    /**
     * Save system configuration
     */
    async saveSystemConfig() {
        const config = {
            systemName: document.querySelector('#configuracion input[placeholder*="Sistema"]')?.value || '',
            supportEmail: document.querySelector('#configuracion input[placeholder*="soporte"]')?.value || '',
            maintenanceMode: document.getElementById('maintenance-mode')?.checked || false,
            sessionTimeout: parseInt(document.getElementById('session-timeout')?.value) || 30,
            maxFileSize: parseInt(document.getElementById('max-file-size')?.value) || 40
        };

        try {
            // Save to localStorage
            localStorage.setItem('systemConfig', JSON.stringify(config));
            this.systemConfig = config;

            this.dashboard.showSuccess('Configuración del sistema guardada correctamente');
        } catch (error) {
            console.error('Error saving system config:', error);
            this.dashboard.showError('Error guardando configuración del sistema');
        }
    }

    /**
     * Clear cache
     */
    async clearCache() {
        try {
            // Clear localStorage (except essential data)
            const essentialKeys = ['authToken', 'userData', 'userId'];
            const keysToRemove = Object.keys(localStorage).filter(key => !essentialKeys.includes(key));

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            this.dashboard.showSuccess('Caché limpiado correctamente');
        } catch (error) {
            console.error('Error clearing cache:', error);
            this.dashboard.showError('Error limpiando caché');
        }
    }

    /**
     * Create backup
     */
    async createBackup() {
        try {
            // Get all data from database
            const [users, solicitudes, expedientes] = await Promise.all([
                fetch('/api/usuarios').then(r => r.json()),
                fetch('/api/solicitudes').then(r => r.json()),
                fetch('/api/expedientes').then(r => r.json())
            ]);

            const backupData = {
                timestamp: new Date().toISOString(),
                users: users.success ? users.data : [],
                solicitudes: solicitudes.success ? solicitudes.data : [],
                expedientes: expedientes.success ? expedientes.data : [],
                systemConfig: this.systemConfig
            };

            // Create and download backup file
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-sistema-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.dashboard.showSuccess('Backup creado y descargado correctamente');
        } catch (error) {
            console.error('Error creating backup:', error);
            this.dashboard.showError('Error creando backup');
        }
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(file) {
        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            // Validate backup data
            if (!backupData.timestamp || !backupData.users) {
                throw new Error('Archivo de backup inválido');
            }

            // Confirm restoration
            if (!confirm('¿Está seguro de restaurar el backup? Esto sobrescribirá los datos actuales.')) {
                return;
            }

            // Here you would implement the actual restoration logic
            // For now, just show success message
            this.dashboard.showSuccess('Backup restaurado correctamente (funcionalidad pendiente de implementar)');
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.dashboard.showError('Error restaurando backup: ' + error.message);
        }
    }

    /**
     * Export user data
     */
    async exportUserData() {
        try {
            const usuarioId = sessionStorage.getItem('userId') || '1';

            // Get user data and related information
            const [userData, userSolicitudes, userExpedientes] = await Promise.all([
                fetch(`/api/usuarios/${usuarioId}`).then(r => r.json()),
                fetch(`/api/solicitudes/usuario/${usuarioId}`).then(r => r.json()),
                fetch(`/api/expedientes?usuario_id=${usuarioId}`).then(r => r.json())
            ]);

            const exportData = {
                timestamp: new Date().toISOString(),
                user: userData.success ? userData.data : null,
                solicitudes: userSolicitudes.success ? userSolicitudes.data : [],
                expedientes: userExpedientes.success ? userExpedientes.data : []
            };

            // Create and download export file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mis-datos-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.dashboard.showSuccess('Datos exportados correctamente');
        } catch (error) {
            console.error('Error exporting user data:', error);
            this.dashboard.showError('Error exportando datos');
        }
    }

    /**
     * Delete account
     */
    async deleteAccount() {
        try {
            const confirmDelete = confirm('¿Está seguro de eliminar su cuenta? Esta acción no se puede deshacer.');

            if (!confirmDelete) return;

            const password = prompt('Ingrese su contraseña para confirmar:');
            if (!password) return;

            const usuarioId = sessionStorage.getItem('userId') || '1';

            const response = await fetch(`/api/usuarios/${usuarioId}/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: password })
            });

            const data = await response.json();

            if (data.success) {
                this.dashboard.showSuccess('Cuenta eliminada correctamente');
                setTimeout(() => {
                    this.dashboard.logout();
                }, 2000);
            } else {
                throw new Error(data.error || 'Error deleting account');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            this.dashboard.showError('Error eliminando cuenta: ' + error.message);
        }
    }

    /**
     * Show maintenance mode info
     */
    showMaintenanceInfo() {
        const maintenanceMode = this.systemConfig.maintenanceMode;

        if (maintenanceMode) {
            this.dashboard.showError('El sistema está en modo mantenimiento. Algunas funcionalidades pueden no estar disponibles.');
        }
    }

    /**
     * Validate form data
     */
    validateForm(formData, rules) {
        const errors = [];

        Object.keys(rules).forEach(field => {
            const value = formData.get(field) || '';
            const rule = rules[field];

            if (rule.required && !value) {
                errors.push(`${field} es requerido`);
            }

            if (rule.email && value && !this.isValidEmail(value)) {
                errors.push(`${field} debe ser un email válido`);
            }

            if (rule.minLength && value.length < rule.minLength) {
                errors.push(`${field} debe tener al menos ${rule.minLength} caracteres`);
            }

            if (rule.maxLength && value.length > rule.maxLength) {
                errors.push(`${field} no puede tener más de ${rule.maxLength} caracteres`);
            }
        });

        return errors;
    }

    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Show loading state
     */
    showLoading(button) {
        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = 'Procesando...';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading(button) {
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfiguracionModule;
}