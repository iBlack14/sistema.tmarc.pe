'use strict';
const { verificarAuth, verificarAuthOpcional } = require('./auth');
const { query } = require('../database-config');

const deny = res => res.status(403).json({ success: false, error: 'Acceso denegado' });
const publicAuth = /^\/auth\/(login|verify-first-login|resend-first-login|forgot-password|verify-code|reset-password)$/;

async function policy(req, res, next) {
    const pathname = req.path.replace(/\/$/, '') || '/';
    if (publicAuth.test(pathname) || (req.method === 'GET' && ['/healthz'].includes(pathname))) return next();
    if (req.method === 'POST' && pathname === '/usuarios') {
        verificarAuthOpcional(req, res, () => {});
        let admin = false;
        if (req.usuario) {
            try {
                const [account] = await query('SELECT tipo, activo FROM usuarios WHERE id = ?', [req.usuario.id]);
                admin = account?.tipo === 'admin' && Boolean(account.activo);
            } catch (error) { return next(error); }
        }
        if (!admin) req.body.tipo = 'usuario';
        return next();
    }
    if (req.method === 'GET' && /^\/usuarios\/existe\//.test(pathname)) return next();
    return verificarAuth(req, res, async () => {
        try {
            const id = req.usuario.id;
            const [account] = await query('SELECT tipo, activo FROM usuarios WHERE id = ?', [id]);
            if (!account || !account.activo) return deny(res);
            req.usuario.tipo = account.tipo;
            if (account.tipo === 'admin') return next();
            if (/^\/auth\/(me|logout|change-password)$/.test(pathname)) return next();
            const user = pathname.match(/^\/usuarios\/(\d+)(?:\/(avatar|password|verify-password|delete))?$/);
            if (user) {
                if (Number(user[1]) !== id) return deny(res);
                if (req.method === 'PUT' && !user[2]) {
                    req.body = Object.fromEntries(Object.entries(req.body).filter(([key]) => ['username', 'email', 'nombre', 'telefono', 'foto_perfil'].includes(key)));
                }
                return next();
            }
            const stats = pathname.match(/^\/estadisticas\/usuario\/(\d+)(?:\/actividades)?$/);
            if (stats) return Number(stats[1]) === id ? next() : deny(res);
            if (['/configuracion/smtp', '/email/status'].includes(pathname) && req.method === 'GET') return next();
            if (pathname === '/resumen-actividad') return next();
            if (pathname === '/mesa-partes' && req.method === 'GET') { req.query.usuario_id = id; return next(); }
            if (pathname === '/mesa-partes' && req.method === 'POST') return next(); // multipart ownership is set after multer
            const presentation = pathname.match(/^\/mesa-partes\/([^/]+)(?:\/(archivos|timeline))?$/);
            if (presentation && (req.method === 'GET' || (req.method === 'POST' && presentation[2] === 'timeline'))) {
                const [row] = await query('SELECT id FROM mesa_partes WHERE (id = ? OR numero_registro = ?) AND usuario_id = ? LIMIT 1', [presentation[1], presentation[1], id]);
                return row ? next() : deny(res);
            }
            if (/^\/mesa-partes\/seguimiento\//.test(pathname) || /^\/seguimiento-completo\//.test(pathname)) return next(); // these handlers validate ownership
            if (pathname === '/notificaciones' && req.method === 'GET') {
                req.query.usuario_id = id;
                delete req.query.expediente_id; delete req.query.solicitud_id;
                return next();
            }
            if (pathname === '/notificaciones/estadisticas' && req.method === 'GET') { req.query.usuario_id = id; return next(); }
            if (/^\/notificaciones\/(leida-todas|[^/]+\/leida)$/.test(pathname) && req.method === 'PUT') { req.body.usuario_id = id; return next(); }
            if (/^\/download\/archivo\//.test(pathname) || pathname.startsWith('/files/')) return next(); // file ownership checked by fileAccess
            return deny(res);
        } catch (error) { next(error); }
    });
}

function containsFile(value, filename) {
    if (!value) return false;
    if (typeof value === 'string') {
        try { return containsFile(JSON.parse(value), filename); } catch (_) {
            return value.replace(/\\/g, '/').split('/').pop() === filename;
        }
    }
    if (Array.isArray(value)) return value.some(item => containsFile(item, filename));
    return typeof value === 'object' && ['ruta', 'filename', 'nombre_archivo', 'documento_archivo', 'documento_ruta'].some(key => containsFile(value[key], filename));
}

function fileAccess(req, res, next) {
    return verificarAuth(req, res, async () => {
        try {
            const [account] = await query('SELECT tipo, activo FROM usuarios WHERE id = ?', [req.usuario.id]);
            if (!account?.activo) return deny(res);
            if (account.tipo === 'admin') return next();
            const filename = req.params.filename || decodeURIComponent(req.path).replace(/\\/g, '/').split('/').pop();
            const rows = await query(`SELECT documentos AS archivos FROM mesa_partes WHERE usuario_id = ?
                UNION ALL SELECT st.documentos FROM seguimiento_timeline st JOIN mesa_partes mp ON mp.id = st.mesa_partes_id WHERE mp.usuario_id = ?
                UNION ALL SELECT st.documento_ruta FROM seguimiento_timeline st JOIN mesa_partes mp ON mp.id = st.mesa_partes_id WHERE mp.usuario_id = ?
                UNION ALL SELECT archivo_adjunto FROM notificaciones WHERE usuario_id = ?
                UNION ALL SELECT foto_perfil FROM usuarios WHERE id = ?`, Array(5).fill(req.usuario.id));
            return rows.some(row => containsFile(row.archivos, filename)) ? next() : deny(res);
        } catch (error) { next(error); }
    });
}

module.exports = { policy, fileAccess, containsFile };
