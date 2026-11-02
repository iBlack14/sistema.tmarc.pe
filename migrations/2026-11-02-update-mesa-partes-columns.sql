-- Migración: Actualización de columnas en mesa_partes para soportar nuevos servicios y tipo/número de documento
-- Soporta nombres largos de servicio (hasta 255 chars) y nuevos campos requeridos

-- Asegurar tipo_presentacion con VARCHAR(255)
ALTER TABLE mesa_partes MODIFY COLUMN tipo_presentacion VARCHAR(255) DEFAULT 'Arbitraje';

-- Agregar tipo_servicio si no existe o modificar longitud si existe
SET @existe_tipo_servicio = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mesa_partes' AND COLUMN_NAME = 'tipo_servicio');
SET @sql_tipo_servicio = IF(@existe_tipo_servicio = 0,
    'ALTER TABLE mesa_partes ADD COLUMN tipo_servicio VARCHAR(255) DEFAULT \'Arbitraje\'',
    'ALTER TABLE mesa_partes MODIFY COLUMN tipo_servicio VARCHAR(255) DEFAULT \'Arbitraje\''
);
PREPARE stmt FROM @sql_tipo_servicio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar tipo_documento si no existe
SET @existe_tipo_doc = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mesa_partes' AND COLUMN_NAME = 'tipo_documento');
SET @sql_tipo_doc = IF(@existe_tipo_doc = 0,
    'ALTER TABLE mesa_partes ADD COLUMN tipo_documento VARCHAR(100)',
    'SELECT "Columna tipo_documento ya existe"'
);
PREPARE stmt FROM @sql_tipo_doc;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar numero_documento si no existe
SET @existe_num_doc = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mesa_partes' AND COLUMN_NAME = 'numero_documento');
SET @sql_num_doc = IF(@existe_num_doc = 0,
    'ALTER TABLE mesa_partes ADD COLUMN numero_documento VARCHAR(100)',
    'SELECT "Columna numero_documento ya existe"'
);
PREPARE stmt FROM @sql_num_doc;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

