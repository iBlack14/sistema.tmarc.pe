/**
 * Módulo de Registro de Usuario
 * Maneja la creación de usuarios con credenciales amigables
 */

const RegistroUsuario = {
    /**
     * Generar credenciales amigables y seguras
     */
    generarCredenciales(nombre, email) {
        // Generar username amigable
        const username = this.generarUsername(nombre, email);
        
        // Generar password memorable pero seguro
        const password = this.generarPasswordSeguro();
        
        return {
            username,
            password,
            email: email || '',
            nombre: nombre || 'Usuario',
            tipo: 'temporal',
            fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
    },

    /**
     * Generar username amigable
     * Formato: nombre.apellido o nombre_inicial
     */
    generarUsername(nombre, email) {
        if (!nombre && !email) {
            return 'usuario_' + Date.now();
        }

        let username = '';

        if (nombre) {
            // Limpiar y normalizar nombre
            const nombreLimpio = nombre
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
                .replace(/[^a-z0-9\s]/g, '') // Solo letras y números
                .trim();

            const partes = nombreLimpio.split(/\s+/);

            if (partes.length >= 2) {
                // Si tiene nombre y apellido: nombre.apellido
                username = `${partes[0]}.${partes[1]}`;
            } else {
                // Solo nombre: nombre
                username = partes[0];
            }
        } else if (email) {
            // Usar parte del email
            username = email.split('@')[0].toLowerCase();
        }

        // Agregar sufijo aleatorio corto para evitar duplicados
        const sufijo = Math.floor(Math.random() * 999);
        username = `${username}${sufijo}`;

        return username;
    },

    /**
     * Generar password seguro pero memorable
     * Formato: Palabra + Año + Símbolo + Letras
     * Ejemplo: Mesa2024#Abc
     */
    generarPasswordSeguro() {
        const palabras = ['Mesa', 'Partes', 'Sistema', 'Legal', 'Justicia', 'Derecho'];
        const simbolos = ['#', '@', '*', '!'];
        const year = new Date().getFullYear();
        
        const palabra = palabras[Math.floor(Math.random() * palabras.length)];
        const simbolo = simbolos[Math.floor(Math.random() * simbolos.length)];
        const letras = this.generarLetrasAleatorias(3);
        
        return `${palabra}${year}${simbolo}${letras}`;
    },

    /**
     * Generar letras aleatorias (mayúsculas y minúsculas)
     */
    generarLetrasAleatorias(longitud) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        let resultado = '';
        for (let i = 0; i < longitud; i++) {
            resultado += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return resultado;
    },

    /**
     * Verificar si el usuario ya existe
     */
    async verificarUsuarioExiste(email) {
        try {
            const response = await fetch(`/api/usuarios/existe/${encodeURIComponent(email)}`);
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            return {
                existe: Boolean(data.data?.existe),
                id: data.data?.detalles?.mysql?.id || null
            };
        } catch (error) {
            console.error('Error verificando usuario:', error);
            return false;
        }
    },

    /**
     * Registrar usuario en el sistema
     */
    async registrarUsuario(credenciales, datosAdicionales = {}) {
        try {
            console.log('🔍 Verificando si el usuario ya existe...');
            
            // Verificar si ya existe
            const verificacion = await this.verificarUsuarioExiste(credenciales.email);
            
            if (verificacion.existe) {
                console.warn('⚠️ Usuario ya existe:', credenciales.email);
                return {
                    success: true, 
                    yaExistia: true,
                    id: verificacion.id,
                    message: 'Usuario ya registrado previamente'
                };
            }

            console.log('📝 Usuario no existe, procediendo a crear...');

            // Preparar payload
            const payload = {
                username: credenciales.username,
                email: credenciales.email,
                password: credenciales.password,
                nombre: credenciales.nombre || 'Usuario',
                tipo: 'usuario',
                activo: 1,
                telefono: datosAdicionales.telefono || null
            };

            console.log('📤 Enviando a /api/usuarios:', { 
                ...payload, 
                password: '***' 
            });

            // Enviar a la API
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            if (!response.ok) {
                // Si el error es que ya existe (409), no es crítico
                if (response.status === 409) {
                    console.warn('⚠️ Usuario ya existía (409):', data.error);
                    return {
                        success: true, 
                        yaExistia: true,
                        id: data.id || null,
                        message: data.error
                    };
                }
                throw new Error(data.details || data.error || `HTTP ${response.status}`);
            }

            console.log('✅ Usuario creado exitosamente en BD:', data);
            
            return {
                success: true,
                yaExistia: false,
                usuario: data.data,
                message: 'Usuario creado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error registrando usuario:', error);
            return {
                success: false, 
                message: 'Error al registrar usuario: ' + error.message
            };
        }
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.RegistroUsuario = RegistroUsuario;
}

// Exportar para Node.js (si se usa en backend)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RegistroUsuario;
}
