'use strict';
const express = require('express');
const path = require('path');

// Only explicitly public directories and browser entry points may be served.
module.exports = function publicFiles(app, root) {
    for (const directory of ['assets', 'templates']) {
        app.use('/' + directory, express.static(path.join(root, directory), { dotfiles: 'deny', index: false }));
    }
    app.use('/public/admin', express.static(path.join(root, 'public/admin'), { index: false, extensions: ['html', 'htm'] }));
    app.use('/admin', express.static(path.join(root, 'public/admin'), { index: false, extensions: ['html', 'htm'] }));
    app.get(/^\/output\/pdf\/(instructivo-uso-sistmarc\.pdf|manuales\/manual-(registro-usuarios|acceso-cuenta|mesa-partes-virtual|seguimiento-trazabilidad)\.pdf)$/, (req, res) => {
        res.sendFile(path.join(root, req.path));
    });
    const allowed = new Set(['index.html', 'login.html', 'registrarse.html', 'recuperar-password.html', 'dashboard-modular.html', 'nueva-solicitud.html', 'seguimiento.html', '404.html', 'conexion-datos.js']);
    app.use((req, res, next) => {
        if (!['GET', 'HEAD'].includes(req.method)) return next();
        const name = req.path.slice(1);
        if (!allowed.has(name)) return next();
        res.sendFile(path.join(root, name));
    });
};
