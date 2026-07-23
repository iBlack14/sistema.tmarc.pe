/**
 * Dashboard Configuration
 * Centralized configuration for the dashboard application
 */

const DashboardConfig = {
    // API Endpoints
    api: {
        baseUrl: '/api',
        endpoints: {
            user: '/auth/me',
            solicitudes: '/solicitudes',
            solicitudesUsuario: '/solicitudes/usuario',
            notificaciones: '/notificaciones',
            estadisticas: '/estadisticas/dashboard',
            actividades: '/actividades-recientes',
            expedientes: '/expedientes',
            configuracion: '/configuracion'
        }
    },

    // UI Configuration
    ui: {
        sidebar: {
            width: '220px',
            collapsedWidth: '70px',
            animationDuration: 300
        },
        modals: {
            animationDuration: 300
        },
        tables: {
            pageSize: 10,
            pageSizeOptions: [10, 25, 50, 100]
        },
        notifications: {
            pollingInterval: 30000, // 30 seconds
            autoCloseDelay: 5000 // 5 seconds
        }
    },

    // Navigation Sections
    sections: {
        inicio: {
            id: 'inicio',
            title: 'Inicio',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
            default: true
        },
        solicitudes: {
            id: 'solicitudes',
            title: 'Solicitudes',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>'
        },
        casilla: {
            id: 'casilla',
            title: 'Casilla electrónica',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>'
        },
        expedientes: {
            id: 'expedientes',
            title: 'Expedientes',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>'
        },
        mesa: {
            id: 'mesa',
            title: 'Mesa de partes',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/></svg>'
        },
        configuracion: {
            id: 'configuracion',
            title: 'Configuración',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
        }
    },

    // Form Validation Rules
    validation: {
        solicitud: {
            tipo: { required: true },
            asunto: { required: true, maxLength: 150 },
            descripcion: { required: true }
        },
        expediente: {
            sede: { required: true },
            especialidad: { required: true },
            motivoIngreso: { required: true },
            proceso: { required: true },
            materia: { required: true }
        }
    },

    // File Upload Configuration
    upload: {
        maxFileSize: 40 * 1024 * 1024, // 40MB
        allowedTypes: ['application/pdf'],
        maxFiles: 10
    },

    // Status Configuration
    status: {
        pendiente: { class: 'status-pending', text: 'Pendiente' },
        aprobado: { class: 'status-approved', text: 'Aprobado' },
        rechazado: { class: 'status-rejected', text: 'Rechazado' },
        activo: { class: 'status-approved', text: 'Activo' },
        cerrado: { class: 'status-rejected', text: 'Cerrado' }
    },

    // Default User eliminado - sistema trabaja con usuarios reales
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardConfig;
}