# Correcciones e integración de correo

Se conserva la presentación visual. No se ejecutaron migraciones ni consultas contra la base de datos real.

## Correo Brevo por HTTPS

Configurar en el entorno privado del servidor (ver `.env.brevo.example`):

```dotenv
BREVO_API_KEY=clave_privada_de_Brevo
BREVO_FROM_EMAIL=sistema@tmarc.pe
BREVO_FROM_NAME=Sistema TMARC
```

Validar el dominio y remitente en Brevo y reiniciar la aplicación después de configurar el entorno. Nunca colocar la clave en JavaScript del navegador. No hay transporte SMTP ni retorno automático a SMTP. Los archivos `smtp-service.js` y `smtp-config-manager.js` son alias de compatibilidad.

Las plantillas de bienvenida, códigos de acceso, recuperación y notificaciones siguen utilizando el mismo contrato interno. Un resultado satisfactorio indica aceptación por Brevo, no entrega confirmada. La verificación administrativa es `POST /api/email/verify`; el estado sin secretos es `GET /api/email/status`. Las rutas antiguas de diagnóstico se conservan como alias protegidos.

## Correcciones

- Aplicación compartida entre `npm start` y Passenger.
- Autenticación y permisos administrativos en la API, con identidad comprobada contra la cuenta actual.
- Consulta de presentaciones, actividad, notificaciones y archivos restringida al propietario o administrador.
- Registro público sin capacidad de crear administradores y actualización de perfil sin modificar roles.
- Archivos públicos limitados a páginas, recursos del navegador y manuales publicados. El código, la configuración y el ZIP quedan fuera.
- Adjuntos protegidos también mediante reglas de Apache/Passenger en `.htaccess`. Esa configuración requiere validación en el hosting.
- Sesión HttpOnly para abrir adjuntos mediante enlaces, con comprobación de origen para escrituras por cookie y limpieza al salir.
- Historial de solicitudes conectado a Mesa de Partes, conservando los nombres de campos que necesita la pantalla.
- Recuperación de contraseña sin confirmar falsamente el envío ni registrar el código en logs.

El acceso compartido por participantes continúa pendiente según `PENDIENTES.md`. Las antiguas tablas de expedientes y solicitudes no se migraron ni eliminaron; sus rutas retiradas continúan retiradas.

## Validación

`npm test` utiliza una base de datos simulada y un proveedor de correo simulado. Comprueba archivos públicos, bloqueo de acceso, permisos, cookies, contrato de Brevo y compatibilidad del navegador. No envía mensajes reales. La conexión real a MySQL, la entrega de correo y Apache/Passenger deben verificarse en el entorno de despliegue.
