require('dotenv').config();
const { inicializarBaseDatos, cerrarConexion } = require('../database-config');

async function resetDB() {
    console.log('🚀 Iniciando reset total de la base de datos TMARC...');
    try {
        // Llamamos a inicializar con reset = true
        await inicializarBaseDatos(true);
        console.log('✅ Base de datos reseteada y recreada con éxito.');
        console.log('👤 Administrador creado según configuración de .env');
    } catch (error) {
        console.error('❌ Error crítico durante el reset:', error);
    } finally {
        await cerrarConexion();
        process.exit(0);
    }
}

resetDB();
