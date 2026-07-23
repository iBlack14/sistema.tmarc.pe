const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { query } = require('../database-config');

/**
 * Endpoint para descargar archivos de forma segura
 * Verifica que el archivo existe antes de servirlo
 * Soporta rutas dinámicas según entorno (local/producción)
 */
router.get('/archivo/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        
        // Validar que el nombre de archivo no contenga caracteres peligrosos
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ 
                success: false, 
                message: 'Nombre de archivo inválido' 
            });
        }

        // Buscar el archivo en la base de datos (múltiples tablas)
        let doc = null;
        
        // 1. Buscar en tabla documentos
        const docs = await query(
            'SELECT * FROM documentos WHERE nombre_archivo = ? LIMIT 1',
            [filename]
        );
        
        if (docs && docs.length > 0) {
            doc = docs[0];
            console.log('📄 Archivo encontrado en tabla documentos');
        }
        
        // 2. Si no se encuentra, buscar en solicitudes
        if (!doc) {
            const solicitudes = await query(
                'SELECT id, documentos FROM solicitudes WHERE JSON_SEARCH(documentos, "one", ?) IS NOT NULL LIMIT 1',
                [filename]
            );
            
            if (solicitudes && solicitudes.length > 0) {
                const solicitud = solicitudes[0];
                let documentos = [];
                
                try {
                    documentos = typeof solicitud.documentos === 'string' 
                        ? JSON.parse(solicitud.documentos) 
                        : solicitud.documentos;
                } catch (e) {
                    console.error('Error parseando documentos de solicitud:', e);
                }
                
                // Buscar el documento específico en el array
                const docEncontrado = Array.isArray(documentos) 
                    ? documentos.find(d => d.nombre_archivo === filename)
                    : null;
                
                if (docEncontrado) {
                    doc = {
                        nombre_archivo: docEncontrado.nombre_archivo,
                        nombre_original: docEncontrado.nombre_original,
                        ruta: docEncontrado.ruta,
                        tipo: docEncontrado.mimetype || 'application/pdf',
                        tamano: docEncontrado.tamano
                    };
                    console.log('📄 Archivo encontrado en solicitudes');
                }
            }
        }
        
        // 3. Si no se encuentra, buscar en mesa_partes
        if (!doc) {
            const presentaciones = await query(
                'SELECT id, numero_registro, documentos FROM mesa_partes WHERE JSON_SEARCH(documentos, "one", ?) IS NOT NULL LIMIT 1',
                [filename]
            );
            
            if (presentaciones && presentaciones.length > 0) {
                const presentacion = presentaciones[0];
                let documentos = [];
                
                try {
                    documentos = typeof presentacion.documentos === 'string' 
                        ? JSON.parse(presentacion.documentos) 
                        : presentacion.documentos;
                } catch (e) {
                    console.error('Error parseando documentos de presentación:', e);
                }
                
                // Buscar el documento específico en el array
                const docEncontrado = Array.isArray(documentos) 
                    ? documentos.find(d => d.nombre_archivo === filename)
                    : null;
                
                if (docEncontrado) {
                    doc = {
                        nombre_archivo: docEncontrado.nombre_archivo,
                        nombre_original: docEncontrado.nombre_original,
                        ruta: docEncontrado.ruta,
                        tipo: docEncontrado.mimetype || 'application/pdf',
                        tamano: docEncontrado.tamano
                    };
                    console.log('📄 Archivo encontrado en mesa de partes');
                }
            }
        }
        
        // 4. Si no se encuentra, buscar en expedientes.documentos
        if (!doc) {
            const expedientes = await query(
                'SELECT id, numero, documentos FROM expedientes WHERE JSON_SEARCH(documentos, "one", ?) IS NOT NULL LIMIT 1',
                [filename]
            );
            
            if (expedientes && expedientes.length > 0) {
                const expediente = expedientes[0];
                let documentos = [];
                
                try {
                    documentos = typeof expediente.documentos === 'string' 
                        ? JSON.parse(expediente.documentos) 
                        : expediente.documentos;
                } catch (e) {
                    console.error('Error parseando documentos de expediente:', e);
                }
                
                // Buscar el documento específico en el array
                const docEncontrado = Array.isArray(documentos) 
                    ? documentos.find(d => d.nombre_archivo === filename)
                    : null;
                
                if (docEncontrado) {
                    doc = {
                        nombre_archivo: docEncontrado.nombre_archivo,
                        nombre_original: docEncontrado.nombre_original,
                        ruta: docEncontrado.ruta,
                        tipo: docEncontrado.mimetype || 'application/pdf',
                        tamano: docEncontrado.tamano
                    };
                    console.log('📄 Archivo encontrado en expedientes');
                }
            }
        }
        
        // 5. Si no se encuentra, buscar en notificaciones.archivo_adjunto
        if (!doc) {
            // Buscar por ruta que contenga el filename
            const notificaciones = await query(
                'SELECT id, archivo_adjunto FROM notificaciones WHERE archivo_adjunto LIKE ? ORDER BY fecha DESC LIMIT 1',
                [`%${filename}%`]
            );
            
            if (notificaciones && notificaciones.length > 0) {
                const notificacion = notificaciones[0];
                
                try {
                    const archivoAdjunto = typeof notificacion.archivo_adjunto === 'string' 
                        ? JSON.parse(notificacion.archivo_adjunto) 
                        : notificacion.archivo_adjunto;
                    
                    // Verificar que el archivo realmente coincide
                    if (archivoAdjunto && archivoAdjunto.ruta && archivoAdjunto.ruta.includes(filename)) {
                        doc = {
                            nombre_archivo: filename,
                            nombre_original: archivoAdjunto.nombre || filename,
                            ruta: archivoAdjunto.ruta,
                            tipo: archivoAdjunto.tipo || 'application/pdf',
                            tamano: archivoAdjunto.tamano
                        };
                        console.log('📄 Archivo encontrado en notificaciones');
                    }
                } catch (e) {
                    console.error('Error parseando archivo_adjunto de notificación:', e);
                }
            }
        }
        
        if (!doc) {
            console.error('❌ Archivo no encontrado en ninguna tabla:', filename);
            return res.status(404).json({ 
                success: false, 
                message: 'Archivo no encontrado en la base de datos' 
            });
        }
        
        // Obtener ruta base de uploads desde .env o usar default
        const uploadsBase = process.env.UPLOADS_PATH || path.join(__dirname, '../uploads');
        
        // Intentar diferentes rutas posibles
        const possiblePaths = [
            doc.ruta, // Ruta guardada en BD
            path.join(uploadsBase, filename), // Desde .env
            path.join(__dirname, '../uploads', filename), // Relativa al proyecto
            path.join(__dirname, '../uploads/mesa-partes', filename),
            path.join(process.cwd(), 'uploads', filename), // Desde directorio actual
            path.join(process.cwd(), 'uploads/mesa-partes', filename)
        ].filter(p => p); // Eliminar nulls/undefined

        let filePath = null;
        
        // Buscar el archivo en las rutas posibles
        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                filePath = testPath;
                console.log(`✅ Archivo encontrado en: ${filePath}`);
                break;
            }
        }

        if (!filePath) {
            console.error('❌ Archivo no encontrado en ninguna ruta:', possiblePaths);
            return res.status(404).json({ 
                success: false, 
                message: 'Archivo no encontrado en el servidor',
                debug: process.env.NODE_ENV === 'development' ? {
                    filename,
                    searchedPaths: possiblePaths
                } : undefined
            });
        }

        // Configurar headers para descarga
        const nombreOriginal = doc.nombre_original || doc.nombre || filename;
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(nombreOriginal)}"`);
        res.setHeader('Content-Type', doc.tipo || doc.type || 'application/pdf');
        
        // Enviar el archivo
        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('Error enviando archivo:', err);
                if (!res.headersSent) {
                    res.status(500).json({ 
                        success: false, 
                        message: 'Error al enviar el archivo' 
                    });
                }
            } else {
                console.log(`📥 Archivo descargado exitosamente: ${nombreOriginal}`);
            }
        });

    } catch (error) {
        console.error('Error en descarga de archivo:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Endpoint para verificar si un archivo existe
 */
router.head('/archivo/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).end();
        }

        const docs = await query(
            'SELECT ruta, nombre_archivo FROM documentos WHERE nombre_archivo = ? LIMIT 1',
            [filename]
        );

        if (!docs || docs.length === 0) {
            return res.status(404).end();
        }

        const doc = docs[0];
        const possiblePaths = [
            doc.ruta,
            path.join(__dirname, '../uploads', filename),
            path.join(__dirname, '../uploads/mesa-partes', filename),
            path.join(process.cwd(), 'uploads', filename)
        ].filter(p => p);

        for (const testPath of possiblePaths) {
            if (fs.existsSync(testPath)) {
                return res.status(200).end();
            }
        }

        return res.status(404).end();

    } catch (error) {
        console.error('Error verificando archivo:', error);
        res.status(500).end();
    }
});

module.exports = router;
