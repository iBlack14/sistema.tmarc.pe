-- Migración irreversible: ejecutar solo después de realizar un respaldo externo.
-- Mesa de Partes es la única fuente de presentaciones nuevas.

SET @schema_actual = DATABASE();

DROP PROCEDURE IF EXISTS drop_legacy_foreign_keys;
DELIMITER $$
CREATE PROCEDURE drop_legacy_foreign_keys()
BEGIN
    DECLARE terminado INT DEFAULT 0;
    DECLARE tabla_hija VARCHAR(64);
    DECLARE restriccion VARCHAR(64);
    DECLARE claves CURSOR FOR
        SELECT TABLE_NAME, CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = @schema_actual
          AND REFERENCED_TABLE_NAME IN ('expedientes', 'solicitudes');
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET terminado = 1;

    OPEN claves;
    ciclo: LOOP
        FETCH claves INTO tabla_hija, restriccion;
        IF terminado = 1 THEN LEAVE ciclo; END IF;
        SET @sql_fk = CONCAT('ALTER TABLE `', tabla_hija, '` DROP FOREIGN KEY `', restriccion, '`');
        PREPARE sentencia FROM @sql_fk;
        EXECUTE sentencia;
        DEALLOCATE PREPARE sentencia;
    END LOOP;
    CLOSE claves;
END$$
DELIMITER ;

CALL drop_legacy_foreign_keys();
DROP PROCEDURE drop_legacy_foreign_keys;

DROP TABLE IF EXISTS solicitudes;
DROP TABLE IF EXISTS expedientes;

-- Verificación: debe devolver cero filas.
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('expedientes', 'solicitudes');
