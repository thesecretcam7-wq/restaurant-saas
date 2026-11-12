# Validación compartida de sesiones de personal — 12/11/2026

## Problema comprobado

La protección privada del carrito ya comprobaba la firma de la sesión, pero el
validador general de las API, la navegación privada, el layout de administración
y el perfil de sesión seguían leyendo directamente el JSON de `staff_session`.
Sus decisiones de permisos no compartían la misma comprobación. Además, el layout
consultaba Auth del propietario antes de autorizar al personal y no vinculaba la
sesión de personal al restaurante solicitado.

## Cambios

- `lib/staff-session.ts` centraliza comprobación HMAC, estructura, caducidad y
  pertenencia al restaurante. API, proxy, layout y perfil usan este validador.
- Las sesiones firmadas se validan localmente sin consultar permisos ni Auth
  en cada petición. Los roles permitidos por cada API se conservan.
- Una sesión antigua sin firma solo puede renovarse con el token aleatorio de
  `active_sessions`, empleado activo, mismo restaurante y mismo rol. El nombre
  y los permisos proceden del servidor, nunca del JSON sin firma. Las API y el
  perfil pueden escribir las nuevas cookies; el layout y proxy solo leen.
- Las comprobaciones antiguas simultáneas del mismo token comparten la consulta
  en curso, con límite de memoria. No se guarda una autorización entre peticiones.
- Una firma incorrecta nunca pasa por la vía antigua. El propietario puede usar
  su autenticación independiente aunque exista una cookie de personal inválida.
- El layout carga el restaurante del personal mediante servicio, filtrando tanto
  la ruta solicitada como el tenant verificado. La vía del propietario filtra por
  propietario verificado. Sin cookie del propietario, el personal no consulta
  Auth; una caída de Auth no invalida un acceso de personal ya comprobado.
- Se conserva el control existente de sesión administrativa única en el proxy,
  añadiendo el filtro de restaurante y borrando ambas cookies únicamente cuando
  el servidor confirma una sesión sustituida o inexistente.
- Los fallos de verificación temporal responden con 503 y no borran sesiones.
  El perfil y las respuestas de error no se pueden almacenar en caché compartida.
- Cerrar sesión de personal solo revoca el registro que coincide con empleado,
  restaurante y token verificados. Una cookie manipulada no revoca a otro empleado.

## Compatibilidad y límites

No requiere migraciones ni nuevas variables. Conserva la firma introducida en el
carrito y la clave del servidor existente. Conserva los plazos de 8 horas para
admin y 7 días para otros roles; no amplía esos plazos al renovar cookies antiguas.
Si una sesión antigua de cocina/camarero carece de token verificable guardado,
deberá introducir el PIN una vez. No se vacía el carrito ni se borran ventas
pendientes locales. Las sesiones nuevas ya están firmadas.

La validación firmada es local durante su vigencia: no añade una comprobación
global de revocación en cada API. El control administrativo de sesión única ya
existente sigue en el proxy. Este cambio no pretende ser una auditoría completa
de permisos, de todas las API públicas ni de revocación inmediata.

No modifica órdenes, importes, impuestos, facturas, cierres, RLS ni estados de
cocina. No incorpora sondeos, suscripciones o tareas nuevas. No demuestra por sí
solo una reducción porcentual del consumo de Disk IO ni capacidad real para 20
negocios: siguen necesitando medición de actividad representativa.

## Verificación

- TypeScript y compilación completa de producción.
- 396 pruebas unitarias, incluyendo firma manipulada, expiración, rol, tenant,
  propietario independiente, renovación antigua, recuperación tras 503, sesión
  administrativa sustituida y revocación limitada al token propio.
- TPV real con servicios simulados: recuperar y cobrar mesa original, borrado
  con lectura atrasada, borrado rápido, mesa ya pagada y recuperación sin conexión.
- Cierre real de la interfaz con servicios simulados: escritorio, móvil y pantalla
  completa, solo dos acciones, guardado único, validación, impresión, error y
  falta de confirmación sin reintento automático.
- Las pruebas no crean ventas ni cierres en producción. La comprobación pública
  del despliegue usa navegación y peticiones GET sin credenciales válidas.
