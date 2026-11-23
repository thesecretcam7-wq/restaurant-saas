# Consulta de ventas ticket a ticket — 23/11/2026

## Uso

Administración → Ventas abre ahora una vista de tickets de la jornada. Cada
tarjeta muestra hora local, mesa, productos, importe guardado, pago y responsable
cuando consta. Al abrirla se ven todas las líneas y el registro de cambios.

- Fecha de jornada con el mismo corte operativo del restaurante, incluidos cambios
  de hora. No se confunde con fecha de confirmación del pago: la jornada es la del
  registro del ticket y los eventos de cobro muestran su hora por separado.
- Búsqueda por ticket, producto, mesa o nombre. Filtros de responsable, pago,
  cobrado, pendiente y anulado. Resúmenes calculados sobre todos los resultados
  filtrados, no solo los 20 tickets visibles en una página.
- Los anulados y devueltos se excluyen del total cobrado. Se muestra el total
  registrado, sin sustituirlo por la suma de líneas antes de impuestos/descuentos.
- Los gráficos, ventas por producto y gestión anterior siguen en «Productos y
  resumen de ventas». Ese enlace no precarga las consultas históricas.
- La consulta de tickets permite reimprimir y no incorpora acciones de modificar
  o anular dentro de las tarjetas de revisión.

## Responsable y límites de interpretación

La inspección comprobó que solo 15 de 555 órdenes de los siete días examinados de
El Cruce tenían `waiter_name`. No se modifican esos registros ni se atribuyen
ventas antiguas a un empleado por suposición. «TPV», «QR mesa», «Sistema» y
«Mostrador» no se presentan como nombres de personas.

Para nuevas operaciones de personal, el servidor conserva la identidad de la
sesión firmada que registra la orden o confirma el cobro. El nombre no procede
del cuerpo enviado por el navegador. El camarero indicado en el ticket y el
responsable autenticado se muestran por separado. Cada persona necesita su PIN;
una sesión compartida no permite distinguir quién utilizó físicamente el equipo.

Los eventos usan el registro `audit_logs` ya existente. El ID determinista por
tenant, orden y etapa permite reintentar sin duplicar el evento ni reemplazar al
primer responsable. La escritura es posterior a la respuesta del cobro, tiene
límite de tiempo y sus fallos no hacen repetir una venta guardada. Si no se pudo
guardar una identidad, se conserva el estado «Sin identificar».

En sincronizaciones del TPV se indica que la identidad es la sesión utilizada al
enviar el ticket al servidor; no se presenta como prueba de quién sirvió o cobró
físicamente una consumición anterior. Una venta aún sin sincronizar no aparece
en esta vista. Tampoco es posible detectar solo con estos datos una consumición
que nunca se introdujo en el sistema.

## Consultas y aislamiento

Nueva API GET `/api/sales/tickets`, autorizada mediante la validación compartida
de tenant y permisos de administración. Respuestas `private, no-store`.

Lee exclusivamente la jornada elegida, en páginas internas de 500 órdenes con
orden estable. Consulta auditoría solo para sus IDs, en lotes de 100 y páginas de
500 eventos. Una jornada de más de 10.000 filas o un fallo no se devuelve como
resultado parcial. Se deduplican IDs para evitar inflar importes cuando una
inserción concurrente desplaza una página. No se devuelve teléfono, correo,
dirección, tokens ni el resto de datos privados del cliente.

Los filtros y páginas de visualización funcionan en memoria sin otras consultas.
No hay polling ni suscripciones nuevas. Volver a la pestaña puede refrescar tras
30 segundos, con control de petición en curso y espera tras errores; no actualiza
automáticamente mientras se está leyendo un detalle o usando un formulario.
La actualización manual consulta solo esta vista, sin recargar toda la navegación.

Los errores conservan el último resultado de la misma jornada y lo señalan como
desactualizado. Al cambiar de fecha o restaurante no se muestran tickets viejos
bajo la nueva selección. La consulta de entrada a Ventas ya no descarga el mes,
el mes anterior y los totales históricos para poder consultar un ticket.

Se comprobó con EXPLAIN que la consulta de jornada utiliza el índice existente
`idx_orders_created` y orden incremental. No se añaden índices, migraciones ni
cambios de RLS. No se modifican importes, impuestos, pagos, cierres ni órdenes
históricas. Los únicos registros nuevos de negocio son eventos de auditoría
cuando el personal realiza una operación nueva o confirma un pago.

## Validación

- Pruebas unitarias de totales oficiales, anulaciones, pagos mixtos, atribución,
  incertidumbre, fechas inválidas, jornada antes de las 05:00 y días de 23/25 horas.
- Consulta paginada, tenant en todas las lecturas, auditoría por IDs, errores sin
  resultados parciales y deduplicación de páginas desplazadas.
- Acceso antes de consultar datos, eventos idempotentes y fallo de auditoría sin
  fallo del cobro. Entrada a Ventas sin consulta mensual ni histórica.
- `scripts/verify-sales-tickets.mjs`: React real y API simulada, anchos 390/1024/1366,
  detalle legible, búsqueda sin acentos, responsable, pago, todas las páginas,
  tickets sin nombre, errores con datos conservados, cambio de jornada y tenant,
  rechazo de respuesta de otro tenant y refresco sin bucle al recuperar foco.
- Compilación completa y batería de pruebas del proyecto. Las pruebas no crean
  cobros, anulaciones ni ventas de prueba en producción.

Resultado local final: 445 pruebas aprobadas en 65 archivos y `npm run build`
correcto, incluida la comprobación TypeScript. El navegador se comprueba con
datos simulados; no se ha usado una sesión real de un empleado para generar
ventas o comprobar el panel privado en producción.

La propuesta de stock de bebidas guardada en el commit local `1b89e13` sigue
separada y pendiente de instalación. Esta entrega parte de la versión publicada
`510ce8a` y no incluye sus cambios dependientes de tablas sin instalar.
