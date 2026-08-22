(function () {
    const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
    const instances = new Map();

    const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);

    const formatSize = bytes => `${((Number(bytes) || 0) / 1048576).toFixed(2)} MB`;

    const getInstance = id => {
        if (!instances.has(id)) {
            instances.set(id, {
                id,
                files: [],
                maxFiles: 10,
                multiple: true,
                showMetadata: true,
                accept: DEFAULT_ACCEPT
            });
        }
        return instances.get(id);
    };

    const validateFiles = (files, accept) => {
        const allowed = String(accept || DEFAULT_ACCEPT)
            .split(',')
            .map(item => item.trim().replace(/^\./, '').toLowerCase())
            .filter(Boolean);

        return files.filter(file => {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            return allowed.includes(ext);
        });
    };

    const syncInput = id => {
        const input = document.getElementById(`${id}-input`);
        if (input) input.value = '';
    };

    const renderRows = id => {
        const instance = getInstance(id);
        const tbody = document.getElementById(`${id}-list`);
        const summary = document.getElementById(`${id}-summary`);
        const total = document.getElementById(`${id}-total`);
        if (!tbody) return;

        if (summary) {
            summary.textContent = instance.files.length
                ? `${instance.files.length} archivo(s) seleccionado(s)`
                : 'Ningún archivo seleccionado';
        }
        if (total) {
            total.textContent = formatSize(instance.files.reduce((sum, item) => sum + item.file.size, 0));
        }

        const colspan = instance.showMetadata ? 7 : 4;
        if (!instance.files.length) {
            tbody.innerHTML = `<tr><td colspan="${colspan}" style="text-align:center;padding:20px;color:#888">No se han agregado archivos</td></tr>`;
            return;
        }

        tbody.innerHTML = instance.files.map((item, index) => {
            const metadataCells = instance.showMetadata ? `
                <td><input type="number" class="form-input" min="0" value="${escapeHtml(item.paginaFin)}" onchange="FileUploadTable.update('${id}', ${index}, 'paginaFin', this.value)"></td>
                <td><input class="form-input" value="${escapeHtml(item.descripcion)}" placeholder="Descripción" onchange="FileUploadTable.update('${id}', ${index}, 'descripcion', this.value)"></td>
                <td><input type="number" class="form-input" min="0" value="${escapeHtml(item.folios)}" onchange="FileUploadTable.update('${id}', ${index}, 'folios', this.value)"></td>
            ` : '';

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</td>
                    ${metadataCells}
                    <td>${formatSize(item.file.size)}</td>
                    <td><button type="button" onclick="FileUploadTable.remove('${id}', ${index})" style="border:0;background:none;color:#dc2626;cursor:pointer;font-weight:800" title="Quitar archivo">x</button></td>
                </tr>
            `;
        }).join('');
    };

    window.FileUploadTable = {
        render(options = {}) {
            const id = options.id;
            const title = options.title || 'Anexos';
            const accept = options.accept || DEFAULT_ACCEPT;
            const maxFiles = Number(options.maxFiles || (options.multiple === false ? 1 : 10));
            const multiple = options.multiple !== false;
            const showMetadata = options.showMetadata !== false;
            const help = options.help || `Máximo ${maxFiles} archivo(s). Complete la información de cada anexo.`;
            const inputMultiple = multiple ? 'multiple' : '';
            const metadataHeaders = showMetadata ? '<th>Página fin</th><th>Descripción</th><th>Folios</th>' : '';
            const colspan = showMetadata ? 7 : 4;

            instances.set(id, { id, files: [], maxFiles, multiple, showMetadata, accept });

            return `
                <div class="mesa-upload-table" data-file-upload-table="${escapeHtml(id)}">
                    <div class="mesa-upload-title">${escapeHtml(title)}</div>
                    <div class="mesa-upload-picker">
                        <button type="button" class="btn btn-secondary" onclick="FileUploadTable.open('${escapeHtml(id)}')">+ Seleccionar archivos</button>
                        <span id="${escapeHtml(id)}-summary" class="text-muted">Ningún archivo seleccionado</span>
                        <input type="file" id="${escapeHtml(id)}-input" ${inputMultiple} style="display:none" accept="${escapeHtml(accept)}" onchange="FileUploadTable.add('${escapeHtml(id)}', this.files)">
                    </div>
                    <small class="mesa-upload-help">${escapeHtml(help)}</small>
                    <div class="mesa-upload-wrap">
                        <table class="mesa-upload-table-grid">
                            <thead><tr><th>#</th><th>Archivo</th>${metadataHeaders}<th>Peso</th><th></th></tr></thead>
                            <tbody id="${escapeHtml(id)}-list"><tr><td colspan="${colspan}" style="text-align:center;padding:20px;color:#888">No se han agregado archivos</td></tr></tbody>
                        </table>
                    </div>
                    <div class="mesa-upload-total">Total: <span id="${escapeHtml(id)}-total">0 MB</span></div>
                </div>
            `;
        },

        init(id, options = {}) {
            const instance = getInstance(id);
            Object.assign(instance, options);
            renderRows(id);
        },

        open(id) {
            document.getElementById(`${id}-input`)?.click();
        },

        add(id, fileList) {
            const instance = getInstance(id);
            const incoming = validateFiles(Array.from(fileList || []), instance.accept);

            if (incoming.length !== Array.from(fileList || []).length) {
                if (window.Swal) Swal.fire({ title: 'Archivo no permitido', text: 'Use un formato permitido para documentos o imágenes.', icon: 'warning', confirmButtonColor: '#D4AF37' });
                else alert('Use un formato permitido para documentos o imágenes.');
            }

            const nextFiles = instance.multiple ? incoming : incoming.slice(0, 1);
            if (instance.files.length + nextFiles.length > instance.maxFiles) {
                if (window.Swal) Swal.fire({ title: 'Límite de archivos', text: `Puede adjuntar como máximo ${instance.maxFiles} archivo(s).`, icon: 'warning', confirmButtonColor: '#D4AF37' });
                else alert(`Puede adjuntar como máximo ${instance.maxFiles} archivo(s).`);
                syncInput(id);
                return;
            }

            if (!instance.multiple) instance.files = [];
            nextFiles.forEach(file => instance.files.push({ file, paginaFin: 0, descripcion: '', folios: 0 }));
            syncInput(id);
            renderRows(id);
        },

        remove(id, index) {
            const instance = getInstance(id);
            instance.files.splice(index, 1);
            renderRows(id);
        },

        update(id, index, field, value) {
            const instance = getInstance(id);
            if (instance.files[index]) instance.files[index][field] = value;
        },

        getFiles(id) {
            return getInstance(id).files.map(item => item.file);
        },

        getItems(id) {
            return getInstance(id).files.slice();
        },

        getMetadata(id) {
            return getInstance(id).files.map(item => ({
                nombre: item.file.name,
                pagina_fin: item.paginaFin,
                descripcion: item.descripcion,
                folios: item.folios
            }));
        },

        clear(id) {
            const instance = getInstance(id);
            instance.files = [];
            syncInput(id);
            renderRows(id);
        }
    };
})();
