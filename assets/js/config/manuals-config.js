/**
 * CONFIGURACIÓN DE MANUALES DE SISTMARC
 *
 * DÓNDE SUBIR LOS PDF:
 *   output/pdf/manuales/
 *
 * NOMBRES RECOMENDADOS:
 *   1. manual-registro-usuarios.pdf
 *   2. manual-acceso-cuenta.pdf
 *   3. manual-mesa-partes-virtual.pdf
 *   4. manual-seguimiento-trazabilidad.pdf
 *
 * CÓMO REEMPLAZARLOS:
 *   - Suba el PDF nuevo a la carpeta indicada usando exactamente el nombre recomendado.
 *   - Luego cambie `publicado: false` por `publicado: true` en el manual correspondiente.
 *   - Si utiliza otro nombre, cambie también el valor de `archivo`.
 *   - No es necesario modificar manuals.js ni dashboard-sections.js.
 *
 * Mientras `publicado` sea false, el sistema abrirá la página correspondiente
 * del instructivo general actual para que los botones continúen funcionando.
 */
(function () {
    const instructivoActual = '/output/pdf/instructivo-uso-sistmarc.pdf';
    const carpetaManuales = '/output/pdf/manuales/';

    const manuales = {
        registro: {
            titulo: 'Manual para el registro de usuarios',
            archivo: 'manual-registro-usuarios.pdf',
            publicado: false,
            respaldo: `${instructivoActual}#page=3`
        },
        acceso: {
            titulo: 'Acceso y uso de la cuenta',
            archivo: 'manual-acceso-cuenta.pdf',
            publicado: false,
            respaldo: `${instructivoActual}#page=4`
        },
        mesaPartes: {
            titulo: 'Uso de la mesa de partes virtual',
            archivo: 'manual-mesa-partes-virtual.pdf',
            publicado: false,
            respaldo: `${instructivoActual}#page=6`
        },
        seguimiento: {
            titulo: 'Seguimiento y trazabilidad de la información',
            archivo: 'manual-seguimiento-trazabilidad.pdf',
            publicado: false,
            respaldo: `${instructivoActual}#page=7`
        }
    };

    Object.values(manuales).forEach(manual => {
        manual.url = manual.publicado ? `${carpetaManuales}${manual.archivo}` : manual.respaldo;
    });

    window.SISTMARC_MANUALES = manuales;

    // Permite que páginas con enlaces HTML existentes usen la misma configuración.
    document.querySelectorAll('[data-manual]').forEach(enlace => {
        const manual = manuales[enlace.dataset.manual];
        if (manual) enlace.href = manual.url;
    });
})();
