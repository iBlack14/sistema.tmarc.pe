const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.BREVO_API_KEY = '';
process.env.BREVO_FROM_EMAIL = 'sistema@tmarc.pe';
const database = require.resolve('../database-config');
require.cache[database] = { id: database, filename: database, loaded: true, exports: {
    inicializarBaseDatos: async () => {},
    query: async (sql, params) => {
        if (sql.includes('SELECT tipo, activo')) return [{ tipo: Number(params[0]) === 1 ? 'admin' : 'usuario', activo: 1 }];
        if (sql.includes('AND usuario_id = ? LIMIT 1')) return Number(params[0]) === 20 && params[2] === 2 ? [{ id: 20 }] : [];
        if (sql.includes('AS archivos')) return [{ archivos: [{ ruta: '/uploads/mesa-partes/own.pdf' }] }];
        if (sql.includes('WHERE username = ? OR email = ?')) return [{ id: 2, password: 'private-hash', email: 'person@example.test' }];
        return [];
    }
} };
const app = require('../app');
let server, base;
const token = id => jwt.sign({ id, tipo: id === 1 ? 'admin' : 'usuario' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const headers = id => ({ Authorization: 'Bearer ' + token(id) });
before(async () => { server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); });

test('public pages and admin assets remain accessible; backend and archive are blocked', async () => {
    for (const name of ['/login.html', '/dashboard-modular.html', '/public/admin/index.html', '/admin/js/utils.js', '/assets/js/api-session.js']) {
        const response = await fetch(base + name); assert.equal(response.status, 200, name); await response.text();
    }
    for (const name of ['/server.js', '/database-config.js', '/package.json', '/.env', '/.env2', '/sistema.tmarc.pe.zip', '/routes/api.js']) {
        const response = await fetch(base + name); assert.equal(response.status, 404, name); await response.text();
    }
});
test('sensitive operations require authentication and administrator privileges', async () => {
    for (const name of ['/api/usuarios', '/api/init-db', '/api/smtp/status', '/api/notificaciones/admin-todas', '/uploads/mesa-partes/own.pdf']) {
        const response = await fetch(base + name); assert.equal(response.status, 401, name); await response.text();
    }
    for (const name of ['/api/usuarios', '/api/init-db', '/api/notificaciones/admin-todas', '/api/casilla-electronica']) {
        const response = await fetch(base + name, { headers: headers(2) }); assert.equal(response.status, 403, name); await response.text();
    }
    const result = await fetch(base + '/api/email/status', { headers: headers(1) });
    assert.equal(result.status, 200); assert.equal((await result.json()).data.provider, 'brevo');
});
test('public email lookup returns existence without exposing account fields', async () => {
    const response = await fetch(base + '/api/usuarios/existe/person@example.test');
    assert.deepEqual((await response.json()).data, { existe: true });
});
test('users cannot read other users or another presentation', async () => {
    for (const name of ['/api/usuarios/3', '/api/mesa-partes/21', '/api/mesa-partes/21/timeline', '/api/estadisticas/usuario/3']) {
        const response = await fetch(base + name, { headers: headers(2) }); assert.equal(response.status, 403, name); await response.text();
    }
    const response = await fetch(base + '/api/download/archivo/other.pdf', { headers: headers(2) });
    assert.equal(response.status, 403); await response.text();
});
test('authenticated file links can use HttpOnly cookie and logout clears it', async () => {
    const response = await fetch(base + '/api/email/status', { headers: headers(2) });
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); await response.text();
    const denied = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie.split(';')[0], Origin: 'https://other.example' } });
    assert.equal(denied.status, 403); await denied.text();
    const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: headers(2) });
    assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/); await logout.text();
});
test('file matching uses complete filename, not substrings', () => {
    const { containsFile } = require('../middleware/access-policy');
    assert.equal(containsFile('[{"ruta":"C:\\\\uploads\\\\own.pdf"}]', 'own.pdf'), true);
    assert.equal(containsFile([{ ruta: '/uploads/not-own.pdf' }], 'own.pdf'), false);
});
test('Brevo contract sends HTTPS payload, handles errors and never simulates success', async () => {
    const email = require('../email-service'); const original = global.fetch;
    assert.equal((await email.enviarEmail({ to: 'person@example.test', html: '<p>Code</p>' })).success, false);
    process.env.BREVO_API_KEY = 'test-api-key';
    try {
        global.fetch = async (url, options) => {
            assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
            assert.equal(options.headers['api-key'], 'test-api-key');
            const body = JSON.parse(options.body);
            assert.equal(body.sender.email, 'sistema@tmarc.pe');
            assert.deepEqual(body.to, [{ email: 'person@example.test' }]);
            assert.equal(body.subject, 'Código'); assert.equal(body.htmlContent, '<p>Code</p>');
            return { ok: true, json: async () => ({ messageId: 'test-id' }) };
        };
        assert.equal((await email.enviarEmail({ destinatario: 'person@example.test', asunto: 'Código', contenido: '<p>Code</p>' })).messageId, 'test-id');
        global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ message: 'private provider response' }) });
        const rejected = await email.enviarEmail({ to: 'person@example.test', html: 'x' });
        assert.equal(rejected.success, false); assert.match(rejected.message, /401/); assert.doesNotMatch(rejected.message, /private/);
        global.fetch = async () => { throw new Error('network unavailable'); };
        assert.equal((await email.enviarEmail({ to: 'person@example.test', html: 'x' })).success, false);
    } finally { global.fetch = original; process.env.BREVO_API_KEY = ''; }
});

test('browser requests preserve headers and send tokens only to local API and uploads', async () => {
    const vm = require('node:vm'); const fs = require('node:fs'); const requests = [];
    const context = { URL, Headers, Request, AbortSignal, location: { href: 'https://sistema.example/dashboard-modular.html', origin: 'https://sistema.example' }, sessionStorage: { getItem: () => 'plain-token' } };
    context.window = { fetch: async (input, options) => { requests.push({ input, options }); return { ok: true }; } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/api-session.js'), 'utf8'), context);
    await context.window.fetch('/api/mesa-partes', { headers: { 'Content-Type': 'application/json' } });
    assert.equal(requests[0].options.headers.get('Authorization'), 'Bearer plain-token');
    assert.equal(requests[0].options.headers.get('Content-Type'), 'application/json');
    context.window.getSecureItem = async () => 'decrypted-token';
    await context.window.fetch('/api/usuarios/2');
    assert.equal(requests[1].options.headers.get('Authorization'), 'Bearer decrypted-token');
    await context.window.fetch('https://other.example/api/status');
    assert.equal(requests[2].options.headers, undefined);
});

test('solicitudes uses current presentation fields without changing original record', () => {
    const vm = require('node:vm'); const fs = require('node:fs'); const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/modules/solicitudes.js'), 'utf8'), context);
    const result = vm.runInContext(`SolicitudesModule.prototype.normalizarSolicitud({ id: 20, tipo_presentacion: 'Arbitraje', fecha_presentacion: '2026-10-27', sumilla: 'Consulta', demandante: '{"nombre":"Persona"}' })`, context);
    assert.equal(result.id, 20); assert.equal(result.tipo, 'Arbitraje'); assert.equal(result.nombre, 'Persona'); assert.equal(result.fecha, '2026-10-27');
});
