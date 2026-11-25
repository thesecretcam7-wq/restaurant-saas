# Consulta del corte sin conexión — 25/11/2026

El botón Corte dependía siempre de GET `/api/pos/cash-closing`. Un fallo de
internet o del proyecto Supabase impedía abrir la ventana.

## Comportamiento

- Al abrir el TPV con conexión se conserva una lectura de la caja actual. Se
  actualiza al consultar Corte, en sus refrescos existentes y tras guardar un
  cierre. La preparación inicial se limita a una vez por apertura/reconexión,
  con una espera mínima de un minuto entre intentos; no se consulta por venta.
- Sin conexión se abre directamente una consulta provisional desde IndexedDB.
  Si el servidor falla aunque el navegador tenga internet, se intenta la misma
  consulta local al terminar la petición de lectura acotada a ocho segundos.
- Si existe una lectura de la jornada elegida, muestra sus importes y facturas
  con la fecha de lectura. Las ventas locales pendientes se presentan aparte,
  desglosadas en efectivo y tarjeta. Nunca se suman automáticamente: una venta
  pendiente de confirmación podría estar ya guardada en el servidor.
- Sin una lectura guardada de esa jornada, se muestran solo las ventas locales
  pendientes y se indica que faltan ventas sincronizadas y facturas. No se
  presentan ceros de impuestos, descuentos o cancelaciones como cifras conocidas.
- Se descarta una caché de otra jornada; se respeta el corte horario configurado
  del restaurante. Una consulta histórica requiere su propia copia guardada.
- Las consultas son provisionales: faltan operaciones de otros dispositivos y
  cambios posteriores a la copia. No se garantiza un corte completo sin servidor.
- Solo mirar continúa cerrando la ventana sin escribir ningún cierre. Guardar
  cierre se deshabilita sin conexión, al ver una copia local o mientras queden
  ventas del TPV sin sincronizar. La función de guardado vuelve a comprobarlo.
- Para guardar definitivamente, se reconecta, se sincronizan las ventas y se
  vuelve a abrir Corte para obtener datos actuales del servidor.

## Datos y aislamiento

Se reutiliza `tenant_config` de IndexedDB, con claves que contienen tenant y modo.
No cambia la versión ni el esquema de IndexedDB, ni se modifican tablas de Supabase.
Las ventas locales conservan su cola y sus identificadores originales.

Un cierre confirmado limpia ambas copias locales de ese restaurante y guarda un
marcador: una respuesta de lectura iniciada antes del cierre no puede restaurar
sus cifras anteriores. No se limpian datos de otros restaurantes. Cambiar de
tenant cierra la consulta y las respuestas de otro tenant no abren una ventana.

No se crean cierres offline ni se reproducen escrituras financieras. La ventana
normal, su teclado, impresión y comportamiento de confirmación se conservan.

## Validación

- 462 pruebas unitarias aprobadas en 67 archivos. Los casos nuevos comprueban
  fecha operativa, tenant, caché de la jornada anterior, pagos, duplicados locales,
  ventas sincronizadas/incompletas y separación del servidor y la cola local.
- `scripts/verify-pos-offline-closing.mjs`: componente TPV, IndexedDB y módulo de
  sincronización reales con API simulada, en 390 y 1024 px. Comprueba apertura
  inmediata, recarga offline, aislamiento, invalidación, lectura fallida,
  sincronización al reintentar conexión y vuelta al corte normal sin duplicar.
- `scripts/verify-pos-cash-closing.mjs`: cierre habitual, dos botones, contado con
  teclado, notas, una única escritura, fallo/reintento, importe cero, impresión
  y permanencia en pantalla completa. Un guardado sin confirmación no se reintenta.
- Las pruebas de navegador no acceden a Supabase ni crean ventas reales.

El cliente debe recibir esta versión mientras tenga acceso a Eccofood. No puede
reconstruir una lectura del servidor que nunca hubiera guardado antes de un corte
de conexión. La recuperación del servicio Supabase es una incidencia independiente.
