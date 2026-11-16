# Inventario diario — 16/11/2026

## Problemas comprobados

- El movimiento «adjustment» se registraba pero no cambiaba las existencias.
- Altas y formularios truncaban cantidades a enteros, pese a que la base admite
  tres decimales. El teclado de movimientos no admitía decimales.
- El movimiento y la actualización se escribían por separado, con posibilidad
  de historial sin cambio de cantidad, lecturas atrasadas y doble pulsación.
- Los errores de carga y movimiento podían quedar solo en la consola.
- Las alertas antiguas y los artículos generados automáticamente a cero hacían
  difícil distinguir una reposición real de un artículo por preparar.
- La vista mostraba dólares y formato colombiano incluso en restaurantes españoles.
- El historial consultaba todos los movimientos y enviaba referencias de ajustes
  a una consulta de órdenes aunque no fueran identificadores de órdenes.
- El layout de inventario consultaba con credenciales de propietario incluso
  para personal autorizado por sesión firmada.

## Uso

1. **Recibir** suma mercancía. Se puede indicar cantidad directa o paquetes/cajas
   multiplicados por el contenido de cada uno.
2. **Contar** establece la cantidad total que se ha contado, incluido cero. El
   historial conserva la diferencia con signo. Si las existencias cambiaron desde
   la lectura, se actualiza la vista y se pide revisar el recuento.
3. **Merma** resta caducidades, roturas o desperdicio, impidiendo cantidades negativas.
4. **Datos** configura unidad, mínimo, cantidad deseada, coste, proveedor y código.
   Unidades: unidad, kg, g, l y ml. Las cantidades existentes no se convierten;
   una unidad ya definida no se puede reinterpretar editando su etiqueta.
5. **Reponer** muestra agotados y existencias bajo el mínimo, con lista copiable.
   **Por preparar** identifica filas antiguas sin unidad, cantidad, mínimo, coste
   ni recetas. No modifica ni oculta esos registros. Su primera entrada/recuento
   guía primero a definir la unidad.

La entrada de mercancía no crea pagos ni ventas. El coste solo valora existencias.
Los cobros, gastos y cierres mantienen su funcionamiento. No se habilitan nuevas
recetas ni se modifica el descuento automático existente: esta entrega mejora
los movimientos manuales y su interfaz, no rediseña todos los flujos de ventas.

## Integridad y carga

Migración: `20261116174045_inventory_daily_workflow.sql`, aplicada al proyecto.
Añade `inventory.unit` nullable, sin convertir o recalcular cantidades antiguas.
Añade dos funciones de servicio con SECURITY INVOKER, search_path fijo y sin
ejecución para PUBLIC/anon/authenticated. RLS y las políticas existentes permanecen.

- Los movimientos manuales bloquean únicamente el artículo del tenant solicitado
  y guardan cantidad, movimiento y actualización de alertas en la misma transacción.
- Una referencia UUID permite comprobar una entrada ya guardada sin volver a sumarla.
- Crear un artículo guarda el recuento inicial y su historial en una transacción;
  el UUID del alta permite confirmar la misma creación sin duplicarla.
- La referencia pendiente se conserva localmente antes de enviar. No hay reintento
  automático ni cola que cambie existencias a ciegas sin conexión. Un fallo de Auth
  también conserva la referencia hasta entrar de nuevo y comprobar la operación.
- Web Locks evita guardados simultáneos en pestañas del dispositivo donde esté
  disponible. La protección del servidor e idempotencia no dependen de este bloqueo.
- Las API verifican acceso firmado y filtran por tenant. El actor se toma de la
  autenticación, no del cuerpo enviado. Los cambios de datos no escriben stock.
- Eliminar artículos con existencias, movimientos o recetas se rechaza para
  conservar su historial. La interfaz no incluye eliminación como acción diaria.
- Búsqueda, filtros y páginas de 24 artículos funcionan localmente. Sin polling ni
  nuevas suscripciones. La lectura se pagina en bloques de 500; historial bajo
  demanda, 50 movimientos por página. Las referencias ajenas a órdenes no consultan orders.
- Al fallar una actualización se conserva la última lista y se muestra el error.
  Un guardado cancela lecturas antiguas para que no sobrescriban el resultado visible.

## Verificación

- 422 pruebas unitarias; TypeScript y compilación completa de producción.
- `scripts/verify-inventory-workflow.mjs`: interfaz React real con API simulada,
  anchos 390/1024/1366, sin desbordamiento horizontal; cajas y decimales, doble
  pulsación, teclado virtual, recuento a cero, historial con signo, alta, búsqueda
  sin consultas adicionales, merma, preparación guiada y datos conservados tras 503.
- Conflicto de recuento con actualización antes de reintentar. Guardado sin
  confirmación, recarga completa y resolución con el mismo UUID sin doble entrada.
- Prueba SQL de las funciones con un artículo temporal dentro de transacción
  terminada en ROLLBACK: alta repetida, entrada repetida, recuento a cero repetido,
  recuento atrasado rechazado, stock insuficiente y tenant incorrecto rechazados.
- Digest antes/después, excluyendo exclusivamente la columna añadida:
  inventario 191 filas, `ea55c215310028edc58e0e76b432adf9`;
  movimientos 9 filas, `e31aad989ed02660dc146259d9650046`.
  Los registros reales se conservaron. Pruebas de interfaz sin cobros ni facturas reales.
- Salud de Supabase sin avisos; las funciones no son ejecutables desde anon ni
  authenticated, solo desde el servidor autorizado con service_role.

No se han añadido índices, cambiado el plan de Supabase ni alterado importes,
impuestos, pagos, cierres o estados de pedidos.
