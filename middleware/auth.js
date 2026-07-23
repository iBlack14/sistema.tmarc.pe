const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar autenticación JWT
 * Uso: router.get('/ruta-protegida', verificarAuth, (req, res) => {...})
 */
function verificarAuth(req, res, next) {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'No autorizado - Token no proporcionado'
            });
        }

        const token = authHeader.substring(7); // Remover "Bearer "

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Validar que el ID sea un número válido para evitar NaN en SQL
        const userId = parseInt(decoded.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido - ID de usuario no válido'
            });
        }

        // Agregar información del usuario al request
        req.usuario = {
            id: userId,
            tipo: decoded.tipo,
            username: decoded.username
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado - Por favor inicia sesión nuevamente'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
        }

        console.error('Error en verificación de token:', error);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
}

/**
 * Middleware para verificar que el usuario es administrador
 * Debe usarse DESPUÉS de verificarAuth
 */
function verificarAdmin(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            success: false,
            error: 'No autorizado'
        });
    }

    if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado - Se requieren permisos de administrador'
        });
    }

    next();
}

/**
 * Middleware opcional - permite acceso sin token pero agrega info si existe
 */
function verificarAuthOpcional(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const userId = parseInt(decoded.id, 10);
            if (!isNaN(userId)) {
                req.usuario = {
                    id: userId,
                    tipo: decoded.tipo,
                    username: decoded.username
                };
            }
        }
    } catch (error) {
        // Ignorar errores en auth opcional
    }
    
    next();
}

module.exports = {
    verificarAuth,
    verificarAdmin,
    verificarAuthOpcional
};
