# Pendientes de SISTMARC

## Acceso compartido a expedientes por roles

Estado: pendiente de diseño e implementación.

Objetivo: permitir que un mismo expediente sea consultado por varios usuarios, cada uno con su cuenta individual, rol procesal y permisos específicos. No se deben compartir cuentas entre participantes.

### Flujo previsto

1. El administrador abre el expediente.
2. Presiona **Vincular usuario**.
3. Busca al usuario por DNI, RUC, correo o nombre.
4. Selecciona su rol: demandante, demandado, árbitro/juez/encargado, abogado, secretario, perito u observador.
5. Define permisos de consulta, carga de documentos, acceso a documentos privados y gestión del proceso.
6. El usuario recibe una notificación en su Casilla electrónica.
7. El expediente aparece automáticamente en su sección de Seguimiento.

### Consideraciones

- Incorporar la acción **Desvincular acceso** sin eliminar documentos ni movimientos históricos.
- Mantener una relación independiente entre expedientes y usuarios, incluyendo rol, estado, permisos, fecha de vinculación y administrador que autorizó el acceso.
- Registrar en auditoría las vinculaciones, desvinculaciones, consultas, descargas y cargas de archivos.
- Conservar el historial aunque un usuario pierda posteriormente el acceso.
- Aplicar permisos por usuario y por expediente; no depender únicamente del rol general de la cuenta.

