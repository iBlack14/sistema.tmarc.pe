const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

// Validar que existan las variables de entorno requeridas
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error('❌ ERROR: Faltan variables de entorno de base de datos');
    console.error('   Asegúrate de tener un archivo .env con:');
    console.error('   - DB_HOST');
    console.error('   - DB_USER');
    console.error('   - DB_PASSWORD');
    console.error('   - DB_NAME');
    process.exit(1);
}

// Configuración de la conexión a MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    connectionLimit: 20,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
};

// Debug: mostrar configuración (sin mostrar password)
console.log('📡 [SISTEMA] Conectando a Base de Datos:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    port: dbConfig.port
});

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para ejecutar consultas
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        // Si no hay pool (modo SQLite), usamos lógica alternativa si fuera necesario
        // Pero por ahora, asumimos que si llegamos aquí el pool debería existir
        if (!pool) {
            console.warn('⚠️ Intentando ejecutar consulta sin conexión activa');
            return resolve([]);
        }

        pool.getConnection((err, connection) => {
            if (err) {
                console.error('Error conectando a la base de datos:', err);
                reject(err);
                return;
            }

            connection.query(sql, params, (error, results) => {
                connection.release(); // Liberar la conexión

                if (error) {
                    console.error('Error ejecutando consulta:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    });
}

// Función auxiliar para verificar si una columna existe
async function columnaExiste(tabla, columna) {
    try {
        const resultado = await query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            AND COLUMN_NAME = ?
        `, [process.env.DB_NAME, tabla, columna]);
        return resultado[0].count > 0;
    } catch (error) {
        console.error(`Error verificando columna ${columna} en tabla ${tabla}:`, error);
        return false;
    }
}

// Función auxiliar para verificar si un índice existe
async function indiceExiste(tabla, indice) {
    try {
        const resultado = await query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = ? 
            AND INDEX_NAME = ?
        `, [process.env.DB_NAME, tabla, indice]);
        return resultado[0].count > 0;
    } catch (error) {
        console.error(`Error verificando índice ${indice} en tabla ${tabla}:`, error);
        return false;
    }
}

// Función para resetear completamente la base de datos (opcional)
async function resetearBaseDatos() {
    try {
        console.log('🔄 Reseteando base de datos...');

        // Usar la base de datos
        await query(`USE \`${process.env.DB_NAME}\``);

        // Deshabilitar foreign keys temporalmente
        await query('SET FOREIGN_KEY_CHECKS = 0');
        console.log('🔓 Foreign keys deshabilitadas');

        // Eliminar todas las tablas
        const tablas = [
            'seguimiento_timeline',
            'notificaciones_procesales',
            'actos_procesales',
            'respuestas_admin',
            'notificaciones',
            'partes_procesales',
            'documentos',
            'mesa_partes',
            'solicitudes',
            'expedientes',
            'smtp_config',
            'configuracion_sistema',
            'logs_auditoria',
            'usuarios'
        ];

        for (const tabla of tablas) {
            try {
                await query(`DROP TABLE IF EXISTS ${tabla}`);
                console.log(`✅ Tabla ${tabla} eliminada`);
            } catch (error) {
                console.log(`⚠️  No se pudo eliminar tabla ${tabla}:`, error.message);
            }
        }

        // Volver a habilitar foreign keys
        await query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🔒 Foreign keys habilitadas');

        console.log('✅ Base de datos reseteada completamente');
    } catch (error) {
        // Asegurarse de volver a habilitar foreign keys en caso de error
        try {
            await query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (fkError) {
            console.log('⚠️  Error al re-habilitar foreign keys:', fkError.message);
        }
        console.error('❌ Error reseteando base de datos:', error);
        throw error;
    }
}

// Función para inicializar la base de datos y tablas
async function inicializarBaseDatos(reset = false) {
    try {
        // Crear base de datos si no existe (con backticks)
        await query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log('✅ Base de datos verificada/creada');

        // Usar la base de datos (con backticks)
        await query(`USE \`${process.env.DB_NAME}\``);

        // Resetear si se solicita
        if (reset) {
            await resetearBaseDatos();
        }

        // Crear tabla de usuarios
        await query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                nombre VARCHAR(100) NOT NULL,
                telefono VARCHAR(20),
                tipo ENUM('admin', 'usuario') DEFAULT 'usuario',
                activo TINYINT(1) DEFAULT 1,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso TIMESTAMP NULL,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_username (username),
                INDEX idx_email (email)
            )
        `);

        // Agregar columnas faltantes a usuarios si no existen
        const tieneTelefono = await columnaExiste('usuarios', 'telefono');
        if (!tieneTelefono) {
            console.log('➕ Agregando columna telefono a tabla usuarios...');
            await query(`ALTER TABLE usuarios ADD COLUMN telefono VARCHAR(20) AFTER nombre`);
        }

        const tieneFotoPerfil = await columnaExiste('usuarios', 'foto_perfil');
        if (!tieneFotoPerfil) {
            console.log('➕ Agregando columna foto_perfil a tabla usuarios...');
            await query(`ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(500) NULL AFTER telefono`);
            console.log('✅ Columna foto_perfil agregada');
        }

        const tieneUpdatedAt = await columnaExiste('usuarios', 'updated_at');
        if (!tieneUpdatedAt) {
            console.log('➕ Agregando columna updated_at a tabla usuarios...');
            await query(`
                ALTER TABLE usuarios 
                ADD COLUMN updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
            `);
            console.log('✅ Columna updated_at agregada');
        }

        // Crear tabla de mesa_partes (NUEVA)
        console.log('📦 Verificando/Creando tabla mesa_partes...');
        await query(`
            CREATE TABLE IF NOT EXISTS mesa_partes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numero_registro VARCHAR(20) UNIQUE NOT NULL,
                usuario_id INT,
                tipo_presentacion VARCHAR(100) DEFAULT 'Arbitraje',
                materia VARCHAR(100) DEFAULT 'General',
                demandante JSON,
                demandado JSON,
                documentos JSON,
                cuantia DECIMAL(15,2),
                sumilla TEXT,
                estado ENUM('Pendiente', 'En Revisión', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
                fecha_presentacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                observaciones TEXT,
                revisado_por INT,
                fecha_revision TIMESTAMP NULL,
                fecha_respuesta TIMESTAMP NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
                FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
                INDEX idx_numero_registro (numero_registro),
                INDEX idx_usuario_id (usuario_id),
                INDEX idx_estado (estado)
            )
        `);
        console.log('✅ Tabla mesa_partes verificada');

        // Asegurar columnas extra en mesa_partes si ya existía
        if (!(await columnaExiste('mesa_partes', 'cuantia'))) {
            await query('ALTER TABLE mesa_partes ADD COLUMN cuantia DECIMAL(15,2) AFTER documentos');
        }
        if (!(await columnaExiste('mesa_partes', 'sumilla'))) {
            await query('ALTER TABLE mesa_partes ADD COLUMN sumilla TEXT AFTER cuantia');
        }

        // Crear tabla de expedientes
        await query(`
            CREATE TABLE IF NOT EXISTS expedientes (
                id VARCHAR(20) PRIMARY KEY,
                usuario_id INT,
                numero VARCHAR(50) UNIQUE,
                -- Datos Generales
                sede VARCHAR(50),
                especialidad VARCHAR(100),
                -- Datos del Expediente
                motivo_ingreso VARCHAR(100),
                proceso VARCHAR(100),
                materia VARCHAR(100),
                cuantia DECIMAL(15,2),
                moneda VARCHAR(10) DEFAULT 'PEN',
                indeterminado TINYINT(1) DEFAULT 0,
                sumilla TEXT,
                -- Datos de Presentante
                tipo_presentante VARCHAR(50),
                presentante VARCHAR(150),
                documento VARCHAR(20),
                correo VARCHAR(100),
                telefono VARCHAR(20),
                domicilio TEXT,
                colegiatura VARCHAR(20),
                colegio_abogados VARCHAR(100),
                casilla_fisica VARCHAR(20),
                oficina_casilla VARCHAR(50),
                casilla_electronica VARCHAR(20),
                -- Campos Institucionales (CEJ)
                organo_jurisdiccional VARCHAR(200),
                distrito_judicial VARCHAR(100),
                juez VARCHAR(150),
                especialista_legal VARCHAR(150),
                etapa_procesal VARCHAR(100),
                ubicacion VARCHAR(200),
                fecha_inicio DATE,
                fecha_conclusion DATE,
                motivo_conclusion TEXT,
                
                -- Metadatos
                estado ENUM('Nuevo', 'En Trámite', 'En Procesamiento', 'Completado', 'Archivado') DEFAULT 'Nuevo',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                documentos JSON,
                observaciones TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            )
        `);

        // Crear tabla de solicitudes
        await query(`
            CREATE TABLE IF NOT EXISTS solicitudes (
                id VARCHAR(20) PRIMARY KEY,
                usuario_id INT,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                telefono VARCHAR(20),
                dni VARCHAR(20),
                tipo VARCHAR(50) NOT NULL,
                asunto VARCHAR(200) NOT NULL,
                descripcion TEXT NOT NULL,
                prioridad ENUM('baja', 'normal', 'alta', 'urgente') DEFAULT 'normal',
                estado ENUM('Pendiente', 'En Revisión', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                documentos JSON,
                observaciones TEXT,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            )
        `);

        // Crear tabla de documentos adjuntos
        await query(`
            CREATE TABLE IF NOT EXISTS documentos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expediente_id VARCHAR(20),
                nombre_original VARCHAR(255) NOT NULL,
                nombre_archivo VARCHAR(255) NOT NULL,
                tipo VARCHAR(100),
                tamano INT,
                ruta VARCHAR(500),
                tipo_documento ENUM('principal', 'anexo') DEFAULT 'principal',
                fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE
            )
        `);

        // Crear tabla de partes procesales
        await query(`
            CREATE TABLE IF NOT EXISTS partes_procesales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expediente_id VARCHAR(20),
                tipo_parte ENUM('demandante', 'demandado', 'otros'),
                tipo_persona ENUM('natural', 'juridica'),
                nombre_completo VARCHAR(200),
                documento_identidad VARCHAR(20),
                telefono VARCHAR(20),
                correo VARCHAR(100),
                domicilio TEXT,
                representante_legal VARCHAR(100),
                apellido_paterno VARCHAR(100),
                apellido_materno VARCHAR(100),
                nombres VARCHAR(100),
                razon_social VARCHAR(200),
                FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE
            )
        `);

        // Crear tabla de notificaciones
        await query(`
            CREATE TABLE IF NOT EXISTS notificaciones (
                id VARCHAR(50) PRIMARY KEY,
                usuario_id INT,
                tipo ENUM('respuesta_admin', 'sistema', 'urgente') DEFAULT 'sistema',
                titulo VARCHAR(200) NOT NULL,
                mensaje TEXT NOT NULL,
                expediente_id VARCHAR(20),
                solicitud_id VARCHAR(20),
                archivo_adjunto JSON,
                leida TINYINT(1) DEFAULT 0,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de actos procesales (EL CORAZÓN DEL SEGUIMIENTO)
        await query(`
            CREATE TABLE IF NOT EXISTS actos_procesales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expediente_id VARCHAR(20) NOT NULL,
                fecha_ingreso DATETIME NOT NULL,
                resolucion VARCHAR(100),
                tipo_acto VARCHAR(50) DEFAULT 'NOTA',
                folios INT DEFAULT 0,
                fojas INT DEFAULT 0,
                fecha_proveido DATE,
                tipo_notificacion VARCHAR(100),
                sumilla TEXT,
                descripcion_usuario TEXT,
                tiene_documento TINYINT(1) DEFAULT 0,
                documento_nombre VARCHAR(255),
                documento_archivo VARCHAR(255),
                documento_ruta VARCHAR(500),
                creado_por INT,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE
            )
        `);

        // Crear tabla de notificaciones procesales (Tipo CEJ)
        await query(`
            CREATE TABLE IF NOT EXISTS notificaciones_procesales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                expediente_id VARCHAR(20) NOT NULL,
                acto_procesal_id INT,
                numero_notificacion VARCHAR(50),
                destinatario VARCHAR(200) NOT NULL,
                anexos VARCHAR(200),
                forma_entrega VARCHAR(100),
                fecha_envio DATE NOT NULL,
                estado ENUM('Enviada', 'Recibida', 'Devuelta', 'Pendiente') DEFAULT 'Enviada',
                observaciones TEXT,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
                FOREIGN KEY (acto_procesal_id) REFERENCES actos_procesales(id) ON DELETE SET NULL
            )
        `);

        // Crear tabla de respuestas del administrador
        await query(`
            CREATE TABLE IF NOT EXISTS respuestas_admin (
                id VARCHAR(20) PRIMARY KEY,
                expediente_id VARCHAR(20),
                solicitud_id VARCHAR(20),
                administrador_id INT,
                destinatario_email VARCHAR(100),
                presentante VARCHAR(150),
                asunto VARCHAR(200) NOT NULL,
                mensaje TEXT NOT NULL,
                email_enviado TINYINT(1) DEFAULT 0,
                notificacion_enviada TINYINT(1) DEFAULT 0,
                fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de configuración SMTP
        await query(`
            CREATE TABLE IF NOT EXISTS smtp_config (
                id INT AUTO_INCREMENT PRIMARY KEY,
                servidor VARCHAR(100),
                puerto INT DEFAULT 587,
                usuario VARCHAR(100),
                password VARCHAR(255),
                ssl_enabled TINYINT(1) DEFAULT 1,
                email_remitente VARCHAR(100),
                nombre_remitente VARCHAR(100),
                activo TINYINT(1) DEFAULT 0,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de configuración del sistema
        await query(`
            CREATE TABLE IF NOT EXISTS configuracion_sistema (
                id INT AUTO_INCREMENT PRIMARY KEY,
                categoria VARCHAR(50) NOT NULL,
                clave VARCHAR(50) NOT NULL UNIQUE,
                valor TEXT,
                tipo VARCHAR(20) DEFAULT 'texto',
                descripcion VARCHAR(255),
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla de logs_auditoria
        await query(`
            CREATE TABLE IF NOT EXISTS logs_auditoria (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                accion VARCHAR(100) NOT NULL,
                tabla_afectada VARCHAR(50),
                registro_id VARCHAR(50),
                detalles TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
            )
        `);

        // ═══════════════════════════════════════════════════════════════
        // TABLA DE SEGUIMIENTO TIMELINE (polimórfica: Exp + MP + Sol)
        // ═══════════════════════════════════════════════════════════════
        await query(`
            CREATE TABLE IF NOT EXISTS seguimiento_timeline (
                id INT AUTO_INCREMENT PRIMARY KEY,
                
                -- Vínculo polimórfico (uno de estos se llena)
                expediente_id VARCHAR(20),
                mesa_partes_id INT,
                solicitud_id VARCHAR(20),
                
                -- Datos del movimiento
                fecha_documento DATE NOT NULL,
                fecha_presentacion DATE,
                fecha_emision DATE,
                
                -- Identificación del documento
                tipo_documento VARCHAR(100) NOT NULL,
                numero_documento VARCHAR(100),
                asunto VARCHAR(300),
                sumilla TEXT,
                
                -- Partes involucradas
                presentado_por VARCHAR(200),
                tipo_parte VARCHAR(50),
                
                -- Notificaciones
                fecha_notificacion_virtual DATE,
                fecha_notificacion_fisica DATE,
                forma_entrega VARCHAR(100),
                destinatario_notificacion VARCHAR(200),
                
                -- Documentos adjuntos
                tiene_documento TINYINT(1) DEFAULT 0,
                documento_nombre VARCHAR(255),
                documento_archivo VARCHAR(255),
                documento_ruta VARCHAR(500),
                
                -- Observaciones
                observaciones TEXT,
                
                -- Auditoría
                creado_por INT,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                actualizado_por INT,
                fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                INDEX idx_st_expediente (expediente_id),
                INDEX idx_st_mesa_partes (mesa_partes_id),
                INDEX idx_st_solicitud (solicitud_id),
                INDEX idx_st_fecha (fecha_documento),
                INDEX idx_st_tipo (tipo_documento),
                
                FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE,
                FOREIGN KEY (mesa_partes_id) REFERENCES mesa_partes(id) ON DELETE CASCADE,
                FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ Tabla seguimiento_timeline verificada');

        // Las configuraciones iniciales ahora se gestionan vía .env para mayor seguridad y flexibilidad

        console.log('✅ Todas las tablas verificadas/creadas');

        // Insertar usuarios por defecto si no existen o actualizar si han cambiado en .env
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@sblxkstudio.com';
        const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
        const hashedAdminPass = await bcrypt.hash(adminPass, 10);

        try {
            // Solo insertar el administrador si no existe ningún usuario admin
            const adminExistente = await query("SELECT id FROM usuarios WHERE tipo = 'admin' LIMIT 1");

            if (adminExistente.length === 0) {
                console.log('👤 Creando administrador inicial...');
                await query(`
                    INSERT INTO usuarios (username, email, password, nombre, tipo) 
                    VALUES (?, ?, ?, ?, ?)
                `, [adminUser, adminEmail, hashedAdminPass, 'Administrador del Sistema', 'admin']);
                console.log('✅ Administrador inicial creado exitosamente');
            } else {
                console.log('ℹ️ Administrador ya existe. Las contraseñas se gestionan desde el panel.');
            }
        } catch (error) {
            console.error('⚠️ Error al inicializar administrador:', error.message);
        }

        // Insertar configuración SMTP por defecto (inactiva)
        const smtpExistente = await query('SELECT COUNT(*) as count FROM smtp_config');
        if (smtpExistente[0].count === 0) {
            await query(`
                INSERT INTO smtp_config (servidor, puerto, ssl_enabled, activo) VALUES
                ('smtp.gmail.com', 587, 1, 0)
            `);
            console.log('✅ Configuración SMTP por defecto insertada');
        }

        // Agregar columnas faltantes a tablas existentes de forma segura
        try {
            // Verificar si la columna tipo existe en configuracion_sistema
            if (!(await columnaExiste('configuracion_sistema', 'tipo'))) {
                await query("ALTER TABLE configuracion_sistema ADD COLUMN tipo VARCHAR(20) DEFAULT 'texto' AFTER valor");
                console.log('✅ Columna tipo añadida a configuracion_sistema');
            }

            // Verificar si la columna casilla_electronica existe en solicitudes
            const existeCasillaElectronica = await columnaExiste('solicitudes', 'casilla_electronica');
            if (!existeCasillaElectronica) {
                await query('ALTER TABLE solicitudes ADD COLUMN casilla_electronica VARCHAR(20)');
                console.log('✅ Columna casilla_electronica agregada a solicitudes');
            } else {
                console.log('ℹ️  Columna casilla_electronica ya existe en solicitudes');
            }

            // ── Columnas de seguimiento para mesa_partes ──
            if (!(await columnaExiste('mesa_partes', 'numero_expediente_externo'))) {
                await query('ALTER TABLE mesa_partes ADD COLUMN numero_expediente_externo VARCHAR(50)');
                console.log('✅ Columna numero_expediente_externo agregada a mesa_partes');
            }
            if (!(await columnaExiste('mesa_partes', 'tipo_servicio'))) {
                await query("ALTER TABLE mesa_partes ADD COLUMN tipo_servicio VARCHAR(50) DEFAULT 'Arbitraje'");
                console.log('✅ Columna tipo_servicio agregada a mesa_partes');
            }
            if (!(await columnaExiste('mesa_partes', 'responsable'))) {
                await query('ALTER TABLE mesa_partes ADD COLUMN responsable VARCHAR(150)');
                console.log('✅ Columna responsable agregada a mesa_partes');
            }
            if (!(await columnaExiste('mesa_partes', 'sede'))) {
                await query('ALTER TABLE mesa_partes ADD COLUMN sede VARCHAR(100)');
                console.log('✅ Columna sede agregada a mesa_partes');
            }

            // ── Columnas de revisión para mesa_partes ──
            if (!(await columnaExiste('mesa_partes', 'revisado_por'))) {
                await query('ALTER TABLE mesa_partes ADD COLUMN revisado_por INT AFTER observaciones');
                await query('ALTER TABLE mesa_partes ADD CONSTRAINT fk_mp_revisado_por FOREIGN KEY (revisado_por) REFERENCES usuarios(id) ON DELETE SET NULL');
                console.log('✅ Columna revisado_por agregada a mesa_partes');
            }
            if (!(await columnaExiste('mesa_partes', 'fecha_revision'))) {
                await query('ALTER TABLE mesa_partes ADD COLUMN fecha_revision TIMESTAMP NULL AFTER revisado_por');
                console.log('✅ Columna fecha_revision agregada a mesa_partes');
            }
            if (!(await columnaExiste('mesa_partes', 'fecha_respuesta'))) {
                await query('ALTER TABLE mesa_partes ADD COLUMN fecha_respuesta TIMESTAMP NULL AFTER fecha_revision');
                console.log('✅ Columna fecha_respuesta agregada a mesa_partes');
            }

            // ── Columnas de seguimiento para solicitudes ──
            if (!(await columnaExiste('solicitudes', 'responsable'))) {
                await query('ALTER TABLE solicitudes ADD COLUMN responsable VARCHAR(150)');
                console.log('✅ Columna responsable agregada a solicitudes');
            }
            if (!(await columnaExiste('solicitudes', 'sede'))) {
                await query('ALTER TABLE solicitudes ADD COLUMN sede VARCHAR(100)');
                console.log('✅ Columna sede agregada a solicitudes');
            }
            if (!(await columnaExiste('solicitudes', 'demandado_nombre'))) {
                await query('ALTER TABLE solicitudes ADD COLUMN demandado_nombre VARCHAR(200) NULL');
                console.log('✅ Columna demandado_nombre agregada a solicitudes');
            }
            if (!(await columnaExiste('solicitudes', 'demandado_dni'))) {
                await query('ALTER TABLE solicitudes ADD COLUMN demandado_dni VARCHAR(20) NULL');
                console.log('✅ Columna demandado_dni agregada a solicitudes');
            }
            if (!(await columnaExiste('solicitudes', 'demandado_email'))) {
                await query('ALTER TABLE solicitudes ADD COLUMN demandado_email VARCHAR(100) NULL');
                console.log('✅ Columna demandado_email agregada a solicitudes');
            }

            // ── Columna documentos para expedientes ──
            if (!(await columnaExiste('expedientes', 'documentos'))) {
                await query('ALTER TABLE expedientes ADD COLUMN documentos JSON AFTER fecha_actualizacion');
                console.log('✅ Columna documentos agregada a expedientes');
            }

            // ── Columnas de Demandante para expedientes ──
            if (!(await columnaExiste('expedientes', 'demandante_nombre'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandante_nombre VARCHAR(200) NULL');
                console.log('✅ Columna demandante_nombre agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandante_dni'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandante_dni VARCHAR(20) NULL');
                console.log('✅ Columna demandante_dni agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandante_correo'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandante_correo VARCHAR(100) NULL');
                console.log('✅ Columna demandante_correo agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandante_telefono'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandante_telefono VARCHAR(20) NULL');
                console.log('✅ Columna demandante_telefono agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandante_domicilio'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandante_domicilio TEXT NULL');
                console.log('✅ Columna demandante_domicilio agregada a expedientes');
            }

            // ── Columnas de Demandado para expedientes ──
            if (!(await columnaExiste('expedientes', 'demandado_nombre'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandado_nombre VARCHAR(200) NULL');
                console.log('✅ Columna demandado_nombre agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandado_dni'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandado_dni VARCHAR(20) NULL');
                console.log('✅ Columna demandado_dni agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandado_correo'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandado_correo VARCHAR(100) NULL');
                console.log('✅ Columna demandado_correo agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandado_telefono'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandado_telefono VARCHAR(20) NULL');
                console.log('✅ Columna demandado_telefono agregada a expedientes');
            }
            if (!(await columnaExiste('expedientes', 'demandado_domicilio'))) {
                await query('ALTER TABLE expedientes ADD COLUMN demandado_domicilio TEXT NULL');
                console.log('✅ Columna demandado_domicilio agregada a expedientes');
            }

            // ── Columna archivo_adjunto para notificaciones ──
            if (!(await columnaExiste('notificaciones', 'archivo_adjunto'))) {
                await query('ALTER TABLE notificaciones ADD COLUMN archivo_adjunto JSON AFTER solicitud_id');
                console.log('✅ Columna archivo_adjunto agregada a notificaciones');
            }

            // ── Ampliar tamaño del ID de notificaciones ──
            try {
                await query('ALTER TABLE notificaciones MODIFY id VARCHAR(50)');
                console.log('✅ Columna id de notificaciones ampliada a VARCHAR(50)');
            } catch (e) {
                console.log('⚠️  Error ampliando id de notificaciones:', e.message);
            }
        } catch (alterError) {
            console.log('⚠️  Error agregando columnas:', alterError.message);
        }

        // Crear índices para mejorar rendimiento de forma segura
        try {
            // Índices para solicitudes
            if (!(await indiceExiste('solicitudes', 'idx_solicitudes_usuario'))) {
                await query('CREATE INDEX idx_solicitudes_usuario ON solicitudes(usuario_id)');
                console.log('✅ Índice idx_solicitudes_usuario creado');
            }
            if (!(await indiceExiste('solicitudes', 'idx_solicitudes_estado'))) {
                await query('CREATE INDEX idx_solicitudes_estado ON solicitudes(estado)');
                console.log('✅ Índice idx_solicitudes_estado creado');
            }
            if (!(await indiceExiste('solicitudes', 'idx_solicitudes_fecha'))) {
                await query('CREATE INDEX idx_solicitudes_fecha ON solicitudes(fecha)');
                console.log('✅ Índice idx_solicitudes_fecha creado');
            }

            // Índices para expedientes
            if (!(await indiceExiste('expedientes', 'idx_expedientes_usuario'))) {
                await query('CREATE INDEX idx_expedientes_usuario ON expedientes(usuario_id)');
                console.log('✅ Índice idx_expedientes_usuario creado');
            }
            if (!(await indiceExiste('expedientes', 'idx_expedientes_estado'))) {
                await query('CREATE INDEX idx_expedientes_estado ON expedientes(estado)');
                console.log('✅ Índice idx_expedientes_estado creado');
            }
            if (!(await indiceExiste('expedientes', 'idx_expedientes_numero'))) {
                await query('CREATE INDEX idx_expedientes_numero ON expedientes(numero)');
                console.log('✅ Índice idx_expedientes_numero creado');
            }

            // Índices para notificaciones
            if (!(await indiceExiste('notificaciones', 'idx_notificaciones_usuario'))) {
                await query('CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id)');
                console.log('✅ Índice idx_notificaciones_usuario creado');
            }
            if (!(await indiceExiste('notificaciones', 'idx_notificaciones_leida'))) {
                await query('CREATE INDEX idx_notificaciones_leida ON notificaciones(leida)');
                console.log('✅ Índice idx_notificaciones_leida creado');
            }
            if (!(await indiceExiste('notificaciones', 'idx_notificaciones_fecha'))) {
                await query('CREATE INDEX idx_notificaciones_fecha ON notificaciones(fecha)');
                console.log('✅ Índice idx_notificaciones_fecha creado');
            }

            // Índices para logs_auditoria
            if (!(await indiceExiste('logs_auditoria', 'idx_logs_usuario'))) {
                await query('CREATE INDEX idx_logs_usuario ON logs_auditoria(usuario_id)');
                console.log('✅ Índice idx_logs_usuario creado');
            }
            if (!(await indiceExiste('logs_auditoria', 'idx_logs_fecha'))) {
                await query('CREATE INDEX idx_logs_fecha ON logs_auditoria(fecha)');
                console.log('✅ Índice idx_logs_fecha creado');
            }

            // Columnas para logs_auditoria
            if (!(await columnaExiste('logs_auditoria', 'ip_address'))) {
                if (await columnaExiste('logs_auditoria', 'ip_direccion')) {
                    await query('ALTER TABLE logs_auditoria CHANGE COLUMN ip_direccion ip_address VARCHAR(45)');
                    console.log('✅ Columna ip_direccion renombrada a ip_address en logs_auditoria');
                } else {
                    await query('ALTER TABLE logs_auditoria ADD COLUMN ip_address VARCHAR(45) AFTER detalles');
                    console.log('✅ Columna ip_address agregada a logs_auditoria');
                }
            }
            if (!(await columnaExiste('logs_auditoria', 'user_agent'))) {
                await query('ALTER TABLE logs_auditoria ADD COLUMN user_agent TEXT AFTER ip_address');
                console.log('✅ Columna user_agent agregada a logs_auditoria');
            }

            console.log('✅ Todos los índices verificados/creados');
        } catch (indexError) {
            console.log('⚠️  Error creando algunos índices:', indexError.message);
        }

        console.log('✅ Base de datos inicializada correctamente');

    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        throw error;
    }
}

// Función para cerrar el pool de conexiones
function cerrarConexion() {
    return new Promise((resolve) => {
        pool.end(() => {
            console.log('🔌 Conexión a base de datos cerrada');
            resolve();
        });
    });
}

module.exports = {
    query,
    inicializarBaseDatos,
    resetearBaseDatos,
    cerrarConexion,
    pool
};