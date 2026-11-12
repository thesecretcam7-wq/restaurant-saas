# Auditoría de Supabase — 12 de noviembre de 2026

Proyecto: `csdooyggiuhzovehykna`. Código base: `a62a8a3`.

## Resultado y límites

Se corrigieron fuentes comprobadas de trabajo innecesario, sin borrar información, modificar importes o aumentar el plan. Las consultas equivalentes se contrastaron con datos reales de los ocho restaurantes. No se ha demostrado que una única consulta explique todas las desconexiones anteriores: faltan las series de IOPS, CPU, memoria y presupuesto de disco correspondientes a cada incidente. No se promete que el plan actual soporte cualquier carga ni que las caídas sean imposibles.

La fotografía inicial no mostraba una caída en curso: siete conexiones de cliente inactivas y una activa, cero bloqueos mutuos y cero bytes temporales acumulados. El diagnóstico de salud no devolvió avisos. PostgreSQL llevaba activo desde el 2 de noviembre; sus contadores acumulados no representan consumo diario.

## Hallazgos confirmados

1. **Cierres de caja:** una consulta PostgREST de `orders` con un agregado JSON lateral de `cash_closing_items` acumulaba 542.158 ms en 2.445 ejecuciones, media de 221,7 ms. Para encontrar cinco ventas sin cierre generaba 2.637 agregados, incluso para órdenes que se descartaban. Existía ya el índice adecuado por restaurante y orden; no faltaba otro índice.
2. **Dashboard y compras:** la lectura de IDs de órdenes cerradas construía un objeto de orden por cada vínculo histórico y luego eliminaba duplicados en JavaScript. Dos variantes acumulaban 89.715 y 42.115 ms. Ahora se filtran fechas y restaurante directamente en órdenes y se comprueba la existencia del vínculo.
3. **Cocina:** había 4.429 productos pendientes con `requires_kitchen=true`, 4.421 asociados a órdenes pagadas y 4.104 de más de siete días. El Cruce tenía el KDS activado y el valor predeterminado real de la columna seguía siendo `true`. Cobrar no implica preparar ni entregar: no se cambió ningún estado histórico.
4. **Activación de cocina incompleta:** la página y el componente KDS podían iniciar consultas, Realtime y polling sin comprobar la configuración. Su lectura tampoco acotaba el día. El POST antiguo de productos de orden creaba pendientes sin utilizar la configuración del restaurante.
5. **Notificaciones del TPV:** las ventas locales suben como `pos-offline`, pero la condición que excluía al TPV solo reconocía `pos`. Cada subida ejecutaba otras tres lecturas de presentación/contacto y podía lanzar notificaciones de pedido web innecesarias.
6. **Carritos:** se podían reenviar instantáneas idénticas ya confirmadas. El historial de 11.792 carritos no son 11.792 sesiones activas: solo había uno activo al inspeccionar. No se borraron carritos archivados.

No se encontró evidencia de un trabajador autónomo de cocina consultando los 4.429 pendientes de forma permanente. Esos pendientes prueban acumulación, no que todos causen I/O en cada venta. En los registros disponibles de las últimas 24 horas solo aparecían seis lecturas HTTP de `order_items`; no sería correcto atribuirles por sí solas las caídas diarias.

La revisión ampliada de todas las consultas acumuladas también detectó una operación interna de Realtime con unas 1.029.124 llamadas y 6.116 segundos totales. Visitó unos 1.590 millones de bloques en caché y solo seis bloques físicos. Ese trabajo merece seguirse, pero no demuestra por sí solo consumo excesivo de disco ni un proceso de cocina. No se modificaron funciones internas de Supabase ni se desactivó Realtime globalmente; se retiraron las suscripciones de aplicación innecesarias en los flujos intervenidos.

## Cambios implementados

- Dos funciones de lectura para pendientes de cierre e IDs ya cerrados. Usan `NOT EXISTS` / `EXISTS`, filtros explícitos `tenant_id`, límites de fecha, orden estable y páginas de hasta 1.000. La aplicación mantiene sus cálculos de pagos mixtos, anulaciones, impuestos y gastos. Un fallo no se convierte en un balance cero ni en resultados parciales.
- Las funciones son `SECURITY INVOKER`, mantienen `search_path=pg_catalog` y solo permiten ejecución a `service_role`. Los puntos de entrada de la aplicación siguen autorizando al restaurante antes de consultar. Se comprobó que `anon` y `authenticated` no pueden ejecutarlas.
- Se comprobó la función real, además de la consulta SQL aislada. La primera versión sufría una elección de plan desfavorable; la versión final emplea `EXECUTE ... USING` con SQL fijo y parámetros separados, para planificar con restaurante y fechas concretos. No concatena entradas del usuario en el SQL.
- KDS desactivado: ninguna lectura de productos, suscripción Realtime ni polling. Si se desactiva durante el uso, la siguiente actualización retira el canal y detiene el polling. El servidor rechaza acciones marcadas como cocina cuando está desactivada.
- KDS activado: consulta paginada de la jornada operativa del restaurante, con zona horaria y cambio de hora; permite elegir expresamente un día histórico. Consultar historia no mantiene una suscripción ni polling. Los pedidos pagados pueden seguir pendientes de preparación.
- Cocina y entregas retiran sus canales al abandonar la pantalla. La pantalla de camarero consulta entregas de la jornada en vez de todo el historial. Se conserva la entrega directa de productos que no requieren preparación.
- Creación de productos: el POST antiguo utiliza la misma lógica de enrutamiento que los demás canales. Confirmar una orden sin productos que deban enviarse a cocina/servicio evita consultar y contar `order_items`; tampoco interrumpe las comprobaciones posteriores del pedido.
- Sincronización `pos-offline`: evita las consultas y notificaciones de pedidos web. Mantiene preparación/servicio si ese restaurante los utiliza.
- Carritos: omite durante 15 segundos un envío idéntico ya confirmado para el mismo cliente, restaurante y sesión. Las modificaciones se guardan; los errores no se cachean. El pago o abandono invalida el recuerdo, incluso si termina después una petición antigua.
- Nuevos registros: el alta escribe expresamente `kds_enabled:false`. La configuración permite activarlo posteriormente. El Cruce se desactivó por petición del usuario; se comprobó que los otros siete registros conservaron su valor.

## Comparación de rendimiento

Se alternaron tres ejecuciones antiguas y tres nuevas en una misma transacción, usando `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` y datos reales. La tabla compara la media de las dos últimas ejecuciones de cada versión, para separar el arranque y calentamiento. Las primeras ejecuciones, más variables, también están conservadas en las evidencias locales.

| Consulta y alcance | Antes, caché caliente | Después, caché caliente | Bloques compartidos visitados antes → después |
| --- | ---: | ---: | ---: |
| Pendientes de cierre, 30 días, cinco resultados | 30,68 ms | 6,82 ms | 8.399 → 3.121 |
| IDs cerrados de octubre, primera página de 1.000 | 17,74 ms | 3,28 ms | 17.465 → 1.555 |

Son reducciones aproximadas del 78% y 82% del tiempo de ejecución en estas pruebas. **Ambas versiones tuvieron cero lecturas físicas durante estas muestras:** se ha demostrado menos trabajo y accesos a buffers, no un porcentaje de ahorro del Disk IO Budget diario. El consumo real necesita observarse con tráfico normal y métricas del proveedor.

Los resultados se compararon para los ocho restaurantes, con y sin filtro de pago, y todos los IDs cerrados, paginando todo el intervalo 2020–2027. Las 24 comparaciones coincidieron. Para pendientes se comparó la fila completa devuelta por la función, incluidos importes, impuestos, desglose de pago, fecha y notas; para cerrados se comparó el conjunto de IDs que utiliza la aplicación.

## Conservación de datos y permisos

Entre las capturas de 19:17 y 19:39 UTC se mantuvieron los mismos recuentos y las mismas huellas de comprobación:

| Datos contrastados | Filas | MD5 de comparación |
| --- | ---: | --- |
| Órdenes: ID, tenant, total, impuesto, subtotal, estado/método/desglose de pago | 12.915 | `084f03b1925797b76e1f0547b81bc775` |
| Productos: ID, tenant, orden, estado, cantidad, precio, requisito de cocina | 17.947 | `f96e927e534701e0f38f338f4d2f011d` |
| Cierres completos | 279 | `d781d699956896a107765546d68dfde8` |
| Vínculos de cierres completos | 12.796 | `2bb8725c6ce5b4b284c133d15cc02b62` |

En la primera fase, las 22 políticas inspeccionadas quedaron exactamente iguales. Tras la autorización posterior del usuario, se optimizaron 21 sin cambiar su significado; la política de servicio restante se conservó. La comparación normalizada confirmó los mismos comandos, roles, condiciones de lectura y escritura, y RLS sigue activado en todas las tablas. No se utilizaron credenciales de sesiones de usuarios ni se realizaron cobros, cierres o ventas reales de prueba.

## Índices y RLS pendientes de revisión

No se añadieron ni eliminaron índices. Los planes ya aprovechan los índices existentes. El asesor detectó ocho claves foráneas sin índice; no se crearon índices sin un plan de ejecución que justificase su beneficio.

Hay tres pares de índices duplicados exactos en `order_items` (orden, restaurante y fecha), unos 1,06 MiB redundantes que también se actualizan al escribir. Su eliminación queda pendiente de autorización expresa; no se adjunta ninguna eliminación automática.

El asesor señaló evaluaciones repetidas de `auth.uid()` y políticas permisivas múltiples. La propuesta fue autorizada posteriormente por el usuario y aplicada como `20261112195157_optimize_hot_rls_and_kds_default`: convierte únicamente `auth.uid()` en `(select auth.uid())`, conserva comandos, roles y predicados y cambia el valor predeterminado SQL de KDS a `false`. La aplicación también escribe `false` en el alta normal. Los valores de configuración de los ocho restaurantes existentes se conservaron.

La advertencia `auth_rls_initplan` bajó de **68 a 47 hallazgos**: desaparecieron los 21 de las siete tablas intervenidas. Las advertencias de otras tablas no se dan por resueltas ni se cambian únicamente para limpiar el panel del asesor. Los planes posteriores muestran `InitPlan`; una muestra aislada antes/después no se utiliza para anunciar otro porcentaje de mejora.

Se comparó la visibilidad real de ocho propietarios y de una identidad sin restaurante sobre órdenes, productos, cierres, vínculos, gastos y configuración: las nueve comparaciones coincidieron. La identidad ajena vio cero filas. Una segunda comprobación de integridad, incluyendo ahora los 383 pagos de facturas y todos los campos de los productos, dio los mismos recuentos y huellas antes y después de aplicar RLS.

El problema de aislamiento previo de `pos_carts` se corrigió en una fase posterior autorizada: el TPV utiliza una API que verifica la sesión, limita el restaurante y terminal y confirma las filas actualizadas; la pantalla del cliente usa un enlace firmado de solo lectura. Se publicó primero la compatibilidad con los terminales abiertos y después se limitaron las cuatro políticas de la tabla a `service_role`, manteniendo RLS. Las lecturas e inserciones anónimas ya se rechazan; los datos históricos permanecen intactos. Véase [la verificación y el despliegue del acceso privado a carritos](pos-cart-access-hardening-2026-11-12.md). Esto no equivale a una auditoría completa de seguridad de todos los módulos de la aplicación.

## Verificación

- Comprobación de tipos y compilación de producción.
- Batería completa, incluidas las nuevas de fechas, paginación, configuración, autorización por tenant, carrito y sincronización. Primera fase: 318 pruebas en 50 archivos; ampliación: 320 pruebas, incluyendo el guardado concurrente y recuperación de carritos; cierre final: **321 pruebas correctas en 50 archivos**, con la regresión de navegación de primera respuesta lenta. Tipos y compilación de producción correctos.
- API real de Supabase: ambas funciones devolvieron HTTP 200 con el cliente del servidor; el intento anónimo fue rechazado por permisos (`42501`). Solo se imprimieron recuentos y códigos, sin credenciales ni datos de ventas.
- `scripts/verify-kitchen-workflow.mjs`: componente KDS real, apagado sin solicitudes/suscripciones; pagado todavía pendiente; historia sin polling; desactivación remota, errores visibles, reintento y limpieza al desmontar.
- `scripts/verify-pos-table-recovery.mjs`: recuperación de mesa, eliminación rápida y respuestas antiguas, mesa ya pagada, carrito legado y recuperación tras desconexión.
- `scripts/verify-pos-cash-closing.mjs`: consultar sin guardar, validación, un solo guardado, impresión, pantalla completa, móvil, error visible y respuesta de guardado no confirmada sin reintento automático.
- `scripts/capacity-offline.mjs`: módulo offline e IndexedDB reales con API simulada: 20 negocios, 40 pestañas y 200 ventas; caída, respuesta ambigua y recuperación sin pérdidas ni duplicados. **No mide la capacidad de escritura real de Supabase.**

Las pruebas de navegador interceptan las peticiones y no crean datos en producción. No se ejecutó una prueba de estrés contra la base de datos que está atendiendo al bar.

## Despliegue y comprobación posterior

La comprobación inmediatamente posterior al segundo despliegue detectó cinco respuestas 503 en páginas del restaurante; consultas posteriores volvieron a 200 sin revertir RLS ni reiniciar Supabase. La consulta de actividad de PostgreSQL mostraba una sola conexión activa. Los registros de Supabase del intervalo no mostraron 5xx en `/rest/v1/tenants`. Los registros de ejecución de Vercel no estuvieron disponibles: el conector respondió 403 y la herramienta local carecía de sesión; se canceló su solicitud de inicio de sesión. No se atribuye el incidente con certeza a una causa sin esos registros.

La inspección identificó un fallo reproducible en el router: la primera búsqueda del restaurante tenía un límite de solo tres segundos. En una prueba con respuesta correcta a los 4,5 segundos, tres páginas simultáneas recibían 503 aunque compartían una sola petición. Se ajustó el límite a ocho segundos, igual al presupuesto de lectura ya usado en otras consultas. La prueba pasa sin añadir consultas, reintentos ni utilizar datos de otro restaurante. Las peticiones que se quedan bloqueadas siguen terminando con 503, y las verificaciones de propietario, rol y sesión permanecen intactas. Esto elimina un caso demostrado de falso aviso de desconexión; no demuestra por sí solo la causa de todos los incidentes históricos.

Ya están aplicadas las migraciones `20261112191915_optimize_cash_closing_reads` y `20261112192159_optimize_cash_closing_custom_plans`. Añaden/sustituyen funciones de lectura; no cambian tablas financieras ni políticas. Son necesarias antes de publicar el código que las utiliza. No es necesario pausar Supabase ni cambiar el plan.

También está aplicada `20261112195157_optimize_hot_rls_and_kds_default`, autorizada en la segunda fase. El archivo de `docs/sql-proposals` queda como copia histórica de la revisión; no se utiliza como mecanismo de despliegue. No se eliminaron índices ni datos.

Tras publicar el código seguro, conviene contrastar en un intervalo comparable de actividad normal las llamadas y tiempos medios de las funciones nuevas y el descenso de las consultas anteriores, junto con IOPS/latencia de disco, presupuesto de I/O, CPU y memoria de Supabase. No reiniciar `pg_stat_statements`, no vaciar datos y no confundir visitas a caché con lecturas físicas. El cliente debe recargar una vez para sustituir el código antiguo; las ventas offline pendientes deben sincronizarse normalmente.

Evidencias detalladas de esta sesión: `output/supabase-io-audit-2026-11-12/` (locales, no incluidas en Git). Referencias: [Disk y cómputo de Supabase](https://supabase.com/docs/guides/platform/compute-and-disk), [RLS y optimización](https://supabase.com/docs/guides/database/postgres/row-level-security), [planes parametrizados en PL/pgSQL](https://www.postgresql.org/docs/17/plpgsql-statements.html#PLPGSQL-STATEMENTS-EXECUTING-DYN).
