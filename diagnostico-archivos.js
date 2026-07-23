/**
 * Script de diagnóstico para verificar archivos en el sistema
 * Ejecutar con: node diagnostico-archivos.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./database-config');

async function diagnosticarArchivos() {
    console.log('\n🔍 DIAGNÓSTICO DE ARCHIVOS\n');
    console.log('='.repeat(60));

    try {
        // 1. Verificar carpeta uploads
        console.log('\n📁 1. Verificando carpeta uploads...');
        const uploadsDir = path.join(__dirname, 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            console.log('❌ La carpeta uploads/ NO EXISTE');
            console.log('   Creando carpeta...');
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log('✅ Carpeta uploads/ creada');
        } else {
            console.log('✅ Carpeta uploads/ existe');
            
            // Listar archivos
            const files = fs.readdirSync(uploadsDir);
            console.log(`   Total de archivos: ${files.length}`);
            
            if (files.length > 0) {
                console.log('   Archivos encontrados:');
                files.forEach(file => {
                    const filePath = path.join(uploadsDir, file);
                    const stats = fs.statSync(filePath);
                    if (stats.isFile()) {
                        console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
                    }
                });
            } else {
                console.log('   ⚠️  No hay archivos en uploads/');
            }
        }

        // 2. Verificar carpeta mesa-partes
        console.log('\n📁 2. Verificando carpeta uploads/mesa-partes...');
        const mesaPartesDir = path.join(uploadsDir, 'mesa-partes');
        
        if (!fs.existsSync(mesaPartesDir)) {
            console.log('❌ La carpeta uploads/mesa-partes/ NO EXISTE');
            console.log('   Creando carpeta...');
            fs.mkdirSync(mesaPartesDir, { recursive: true });
            console.log('✅ Carpeta uploads/mesa-partes/ creada');
        } else {
            console.log('✅ Carpeta uploads/mesa-partes/ existe');
            const files = fs.readdirSync(mesaPartesDir);
            console.log(`   Total de archivos: ${files.length}`);
        }

        // 3. Consultar base de datos
        console.log('\n💾 3. Consultando base de datos...');
        
        const documentos = await query(`
            SELECT 
                id,
                expediente_id,
                nombre_original,
                nombre_archivo,
                ruta,
                tamano,
                tipo,
                fecha_subida
            FROM documentos
            ORDER BY fecha_subida DESC
            LIMIT 20
        `);

        console.log(`   Total de documentos en BD: ${documentos.length}`);
        
        if (documentos.length > 0) {
            console.log('\n   Últimos 10 documentos registrados:');
            console.log('   ' + '-'.repeat(100));
            
            documentos.slice(0, 10).forEach((doc, index) => {
                console.log(`\n   ${index + 1}. ${doc.nombre_original || 'Sin nombre'}`);
                console.log(`      ID: ${doc.id}`);
                console.log(`      Expediente: ${doc.expediente_id || 'N/A'}`);
                console.log(`      Archivo: ${doc.nombre_archivo || 'N/A'}`);
                console.log(`      Ruta BD: ${doc.ruta || 'N/A'}`);
                console.log(`      Tamaño: ${doc.tamano ? (doc.tamano / 1024).toFixed(2) + ' KB' : 'N/A'}`);
                
                // Verificar si el archivo existe físicamente
                if (doc.ruta) {
                    const exists = fs.existsSync(doc.ruta);
                    console.log(`      Existe físicamente: ${exists ? '✅ SÍ' : '❌ NO'}`);
                    
                    if (!exists) {
                        // Intentar rutas alternativas
                        const alternativas = [
                            path.join(uploadsDir, doc.nombre_archivo || ''),
                            path.join(mesaPartesDir, doc.nombre_archivo || '')
                        ];
                        
                        let encontrado = false;
                        for (const alt of alternativas) {
                            if (fs.existsSync(alt)) {
                                console.log(`      ⚠️  Encontrado en: ${alt}`);
                                encontrado = true;
                                break;
                            }
                        }
                        
                        if (!encontrado) {
                            console.log(`      ❌ No encontrado en ninguna ubicación`);
                        }
                    }
                } else if (doc.nombre_archivo) {
                    // Si no hay ruta, buscar por nombre de archivo
                    const posibles = [
                        path.join(uploadsDir, doc.nombre_archivo),
                        path.join(mesaPartesDir, doc.nombre_archivo)
                    ];
                    
                    let encontrado = false;
                    for (const p of posibles) {
                        if (fs.existsSync(p)) {
                            console.log(`      ✅ Encontrado en: ${p}`);
                            encontrado = true;
                            break;
                        }
                    }
                    
                    if (!encontrado) {
                        console.log(`      ❌ Archivo no encontrado físicamente`);
                    }
                }
            });
        } else {
            console.log('   ⚠️  No hay documentos registrados en la base de datos');
        }

        // 4. Resumen
        console.log('\n' + '='.repeat(60));
        console.log('\n📊 RESUMEN:');
        
        const archivosEnDisco = fs.readdirSync(uploadsDir).filter(f => {
            return fs.statSync(path.join(uploadsDir, f)).isFile();
        }).length;
        
        const archivosEnBD = documentos.length;
        
        console.log(`   Archivos en disco (uploads/): ${archivosEnDisco}`);
        console.log(`   Documentos en BD: ${archivosEnBD}`);
        
        if (archivosEnDisco === 0 && archivosEnBD > 0) {
            console.log('\n   ⚠️  PROBLEMA: Hay documentos en BD pero no archivos en disco');
            console.log('   SOLUCIÓN: Los archivos fueron eliminados o no se subieron correctamente');
        } else if (archivosEnDisco > archivosEnBD) {
            console.log('\n   ⚠️  ADVERTENCIA: Hay más archivos en disco que registros en BD');
            console.log('   SOLUCIÓN: Limpiar archivos huérfanos o registrar en BD');
        } else if (archivosEnDisco === archivosEnBD && archivosEnDisco > 0) {
            console.log('\n   ✅ Todo parece estar sincronizado');
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Diagnóstico completado\n');

    } catch (error) {
        console.error('\n❌ Error durante el diagnóstico:', error);
        console.error(error.stack);
    }
    
    process.exit(0);
}

// Ejecutar diagnóstico
diagnosticarArchivos();
