/**
 * UI Components Library
 * Reusable UI components for the dashboard
 */

/**
 * Create a stat card component
 */
function createStatCard(title, value, icon = null, options = {}) {
    const card = document.createElement('div');
    card.className = 'stat-card';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'stat-label';
    titleDiv.textContent = title;

    const valueDiv = document.createElement('div');
    valueDiv.className = 'stat-value';
    valueDiv.textContent = value;

    card.appendChild(titleDiv);
    card.appendChild(valueDiv);

    if (icon) {
        const iconDiv = document.createElement('div');
        iconDiv.className = 'stat-icon';
        iconDiv.innerHTML = icon;
        card.insertBefore(iconDiv, titleDiv);
    }

    // Apply options
    if (options.className) {
        card.classList.add(options.className);
    }

    if (options.onClick) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', options.onClick);
    }

    return card;
}

/**
 * Create a card component
 */
function createCard(title, content, options = {}) {
    const card = document.createElement('div');
    card.className = 'card';

    if (options.className) {
        card.classList.add(options.className);
    }

    if (title) {
        const header = document.createElement('div');
        header.className = 'card-header';

        if (options.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'card-icon';
            iconSpan.innerHTML = options.icon;
            header.appendChild(iconSpan);
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'card-title';
        titleSpan.textContent = title;
        header.appendChild(titleSpan);

        card.appendChild(header);
    }

    if (typeof content === 'string') {
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        card.appendChild(contentDiv);
    } else if (content instanceof HTMLElement) {
        card.appendChild(content);
    }

    return card;
}

/**
 * Create a modal component
 */
function createModal(id, title, content, options = {}) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = id;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    header.appendChild(titleSpan);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', () => closeModal(id));
    header.appendChild(closeBtn);

    modalContent.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';

    if (typeof content === 'string') {
        body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
        body.appendChild(content);
    }

    modalContent.appendChild(body);

    // Actions (if provided)
    if (options.actions) {
        const actions = document.createElement('div');
        actions.className = 'modal-actions';

        options.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `btn-modal ${action.className || 'btn-modal-secondary'}`;
            btn.textContent = action.text;
            btn.addEventListener('click', action.handler);
            actions.appendChild(btn);
        });

        modalContent.appendChild(actions);
    }

    modal.appendChild(modalContent);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(id);
        }
    });

    return modal;
}

/**
 * Create a table component
 */
function createTable(headers, data, options = {}) {
    const container = document.createElement('div');
    container.className = 'table-container';

    const table = document.createElement('table');

    // Headers
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        if (options.sortable && options.sortable.includes(header)) {
            th.classList.add('sortable');
            th.addEventListener('click', () => {
                if (options.onSort) {
                    options.onSort(header);
                }
            });
        }
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');

    if (data && data.length > 0) {
        data.forEach(row => {
            const tr = document.createElement('tr');

            if (options.rowClass) {
                tr.className = options.rowClass(row);
            }

            row.forEach((cell, index) => {
                const td = document.createElement('td');

                if (typeof cell === 'object' && cell.html) {
                    td.innerHTML = cell.html;
                } else {
                    td.textContent = cell;
                }

                if (options.cellClass) {
                    const cellClass = options.cellClass(index, cell);
                    if (cellClass) {
                        td.className = cellClass;
                    }
                }

                tr.appendChild(td);
            });

            if (options.onRowClick) {
                tr.style.cursor = 'pointer';
                tr.addEventListener('click', () => options.onRowClick(row));
            }

            tbody.appendChild(tr);
        });
    } else {
        // Empty state
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = headers.length;
        emptyCell.className = 'table-empty';
        emptyCell.innerHTML = options.emptyMessage || 'No hay datos disponibles';
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);
    }

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
}

/**
 * Create a form group component
 */
function createFormGroup(label, input, options = {}) {
    const group = document.createElement('div');
    group.className = 'form-group';

    if (options.className) {
        group.classList.add(options.className);
    }

    const labelEl = document.createElement('label');
    labelEl.className = 'form-label';
    labelEl.textContent = label;
    if (options.required) {
        labelEl.classList.add('required');
    }

    group.appendChild(labelEl);
    group.appendChild(input);

    if (options.helpText) {
        const help = document.createElement('div');
        help.className = 'form-help';
        help.textContent = options.helpText;
        group.appendChild(help);
    }

    return group;
}

/**
 * Create a button component
 */
function createButton(text, options = {}) {
    const btn = document.createElement('button');
    btn.className = `btn ${options.className || 'btn-primary'}`;
    btn.textContent = text;

    if (options.onClick) {
        btn.addEventListener('click', options.onClick);
    }

    if (options.disabled) {
        btn.disabled = true;
    }

    if (options.icon) {
        btn.innerHTML = `${options.icon} ${text}`;
    }

    return btn;
}

/**
 * Create a loading spinner component
 */
function createLoadingSpinner(options = {}) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';

    const spinnerInner = document.createElement('div');
    spinnerInner.className = 'table-loading-spinner';
    spinnerInner.style.width = options.size || '20px';
    spinnerInner.style.height = options.size || '20px';

    const text = document.createElement('span');
    text.textContent = options.text || 'Cargando...';

    spinner.appendChild(spinnerInner);
    spinner.appendChild(text);

    return spinner;
}

/**
 * Create an alert/notification component
 */
function createAlert(message, type = 'info', options = {}) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;

    alert.innerHTML = `
        <span>${message}</span>
        ${options.dismissible ? '<button class="alert-close">×</button>' : ''}
    `;

    if (options.dismissible) {
        const closeBtn = alert.querySelector('.alert-close');
        closeBtn.addEventListener('click', () => alert.remove());
    }

    if (options.autoClose) {
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, options.autoClose);
    }

    return alert;
}

/**
 * Modal utility functions
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Create a dropdown component
 */
function createDropdown(options, selectedValue = null, changeHandler = null) {
    const select = document.createElement('select');
    select.className = 'form-select-modal';

    options.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option.value;
        optionEl.textContent = option.text;
        if (option.value === selectedValue) {
            optionEl.selected = true;
        }
        select.appendChild(optionEl);
    });

    if (changeHandler) {
        select.addEventListener('change', changeHandler);
    }

    return select;
}

/**
 * Create a file upload component
 */
function createFileUpload(accept = '', multiple = false, changeHandler = null) {
    const container = document.createElement('div');
    container.className = 'file-upload';

    const label = document.createElement('label');
    label.className = 'file-upload-label';
    label.textContent = 'Seleccionar archivo';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';

    const fileName = document.createElement('span');
    fileName.id = 'fileName';

    if (changeHandler) {
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                fileName.textContent = file.name;
                changeHandler(e);
            } else {
                fileName.textContent = '';
            }
        });
    }

    label.appendChild(input);
    container.appendChild(label);
    container.appendChild(fileName);

    return container;
}

/**
 * Create a tabs component
 */
function createTabs(tabs, activeTab = null) {
    const container = document.createElement('div');
    container.className = 'tabs-container';

    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'tabs-header';

    const tabsContent = document.createElement('div');
    tabsContent.className = 'tabs-content';

    tabs.forEach((tab, index) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = `tab-btn ${activeTab === tab.id || (!activeTab && index === 0) ? 'active' : ''}`;
        tabBtn.textContent = tab.title;
        tabBtn.addEventListener('click', () => {
            // Remove active from all tabs
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Add active to clicked tab
            tabBtn.classList.add('active');
            const content = document.getElementById(`tab-${tab.id}`);
            if (content) {
                content.classList.add('active');
            }
        });
        tabsHeader.appendChild(tabBtn);

        const tabContent = document.createElement('div');
        tabContent.className = `tab-content ${activeTab === tab.id || (!activeTab && index === 0) ? 'active' : ''}`;
        tabContent.id = `tab-${tab.id}`;

        if (typeof tab.content === 'string') {
            tabContent.innerHTML = tab.content;
        } else if (tab.content instanceof HTMLElement) {
            tabContent.appendChild(tab.content);
        }

        tabsContent.appendChild(tabContent);
    });

    container.appendChild(tabsHeader);
    container.appendChild(tabsContent);

    return container;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createStatCard,
        createCard,
        createModal,
        createTable,
        createFormGroup,
        createButton,
        createLoadingSpinner,
        createAlert,
        createDropdown,
        createFileUpload,
        createTabs,
        showModal,
        closeModal
    };
}