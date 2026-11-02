# Revisión de fiabilidad de Supabase — 2 de noviembre de 2026

## Resultado y alcance

Se ha revisado la integración de acceso, clientes SDK, consultas, actualizaciones en tiempo real, carritos, ventas locales y sincronización. El inventario estático inicial recorrió 456 archivos de `app`, `lib` y `components`, identificando 497 cadenas de consulta y 80 selecciones literales de `*`. Este inventario es una herramienta de selección: incluye algunas escrituras con retorno y no significa que todas esas consultas sean problemáticas ni que se haya demostrado una causa raíz.

La caída de infraestructura sigue sin diagnóstico concluyente. Al comenzar esta revisión fallaban las consultas SQL y el endpoint de métricas con timeout, mientras el plano de control mostraba `ACTIVE_HEALTHY`. No se ha reiniciado ni pausado el proyecto, cambiado el plan, enviado mensajes a terceros o modificado datos de negocio.

## Fallos confirmados y cambios

| Área | Evidencia en código | Corrección |
| --- | --- | --- |
| Lecturas del SDK | El SDK reintenta por defecto errores transitorios; numerosos clientes directos carecían de tiempo máximo y protección común | Cliente común para los 29 puntos directos de la API, servicio y comprobación de planes. Lecturas REST GET/HEAD limitadas a 8 s, incluido el cuerpo; pausa de 15 s tras fallo transitorio; una prueba de recuperación por instancia. Los reintentos del SDK durante la pausa se resuelven localmente. |
| Escrituras | Interrumpir una escritura no demuestra que el servidor no la haya aplicado | La protección anterior no altera POST/PATCH/DELETE ni reintenta esas escrituras. Se conserva el tratamiento del cobro sin confirmar. |
| Autorización | `requireTenantAccess` ignoraba errores de Auth/consulta y podía devolver 401/403 por indisponibilidad | Fallos de verificación devuelven 503; credenciales inválidas reales conservan 401/403. La sesión PIN válida no necesita consultar Auth de propietario. |
| PIN y cookie | Errores de lectura de empleado se trataban como PIN inválido; permisos/sesión activa fallidos podían reemplazar la cookie | Se distinguen errores de servicio de datos inexistentes, sin registrar intentos incorrectos por una caída. No se crea una cookie nueva si no se han confirmado todas las comprobaciones. |
| Plan | Cada pedido contaba exactamente todas las ventas del mes incluso con límite infinito; errores de lectura usaban datos de prueba por defecto | Se omite el conteo en planes ilimitados. Una lectura fallida no se convierte en prueba caducada ni contador cero. Los límites finitos se siguen comprobando. |
| Caché de restaurante | Un fallo temporal se guardaba durante 30 s como restaurante inexistente; consultas simultáneas se duplicaban | No se cachean resultados nulos y se comparte únicamente la consulta en curso para la misma clave. No se comparten datos de usuario. |
| Carritos | `abandonCart` modificaba todos los carritos activos del negocio tras un cobro | Se limita al identificador del navegador que finaliza la operación, conservando los demás TPV. |
| Guardado local | Venta y operación pendiente se escribían en transacciones separadas; se resolvía antes de confirmar toda la transacción | Ambas se guardan atómicamente. Marcar venta sincronizada y retirar operación pendiente también es atómico. Un error de lectura local no se muestra como cola vacía. |
| Varias pestañas | El bloqueo de sincronización solo existía en memoria de cada pestaña | Web Locks serializa las subidas del mismo negocio entre pestañas. Se mantienen identificadores idempotentes y protección del servidor como respaldo. No se migra ni elimina la cola existente. |
| Fecha de venta local | La sincronización no enviaba `createdAt`, por lo que podía asignar la fecha de recuperación | Se envía y valida la fecha original; `created_at` conserva la venta y `updated_at` refleja la sincronización. Una fecha inválida permanece pendiente. Solo aplica al origen autorizado `pos-offline` con identificador local. |
| Cierre pendiente | Una venta local tardía podía parecer incluida en un cierre antiguo sin enlaces | La marca de auditoría de sincronización tardía evita esa inferencia, igual que las ventas registradas expresamente del día anterior. |
| Pantalla de acceso | Se seleccionaba `tenant_branding.logo_url`, columna que los registros confirmaban inexistente | Se usa el logo de metadatos o de `tenants`, sin consultar la columna inexistente. |
| Portada | Cada visita descargaba elementos de todo el historial para destacar productos | Muestra popularidad sobre una muestra de hasta 500 ventas pagadas de los últimos 30 días, con timeout de 5 s. No modifica cifras contables. |
| Analítica | Consultas `*`, respuestas truncadas por el límite predeterminado y respuestas antiguas al cambiar de rango | Campos concretos, paginación estable de 1000 filas, rango inicio/fin en SQL y cancelación al cambiar pantalla/rango. Evita NaN con periodos vacíos. |
| API de estadísticas | Faltaba comprobación explícita de acceso y se descargaban elementos de todo el historial | Autorización por negocio; solo metadatos escalares para KPIs históricos y elementos dentro del periodo solicitado. No se devuelven cifras parciales si falla una página. |

## Realtime y procesos de fondo

Se han revisado los canales del TPV, KDS y entregas. Tienen filtro por negocio, limpieza al desmontarse y consultas de recuperación. El TPV ya incluye protección frente a consultas superpuestas y pausa de comprobaciones en segundo plano. El motor genérico de sincronización no tiene consumidores activos fuera de sus exports, por lo que no se le atribuye la incidencia observada.

Que Realtime registre primero un error no demuestra que lo cause. No se ha desactivado la cocina ni eliminado la actualización de pedidos sin evidencia que justifique ese impacto.

## Verificación

- 248 pruebas unitarias pasan, incluyendo el SDK real para pausa, recuperación, cancelación, cuerpos detenidos, paginación, permisos y preservación de escrituras.
- Comprobación de tipos sin errores.
- Navegador aislado con el componente real del TPV: una venta con tarjeta se conserva localmente con internet cortado y con internet activo pero servidor caído.
- IndexedDB real: abortar después de escribir una venta revierte venta y operación; abortar la confirmación conserva la venta pendiente.
- Dos pestañas y 10 ventas ficticias: 10 identificadores únicos enviados una sola vez, cinco pagos con tarjeta conservados, fecha original incluida y ambas colas en cero al confirmar.
- Analítica en navegador con SDK real y 1003 ventas ficticias: total completo, rango aplicado y datos vacíos sin NaN.
- Estas verificaciones no han sincronizado ni inspeccionado las 10 ventas del navegador del usuario. No se ha usado su sesión ni realizado ventas reales de prueba.

## Pendiente de infraestructura

La aplicación está endurecida frente a fallos, pero ello no garantiza que un host externo nunca vuelva a caer. La protección es por navegador/instancia de servidor; no es un limitador global entre todas las funciones desplegadas.

Para identificar el origen de las caídas faltan las métricas históricas del host durante la interrupción: RAM/OOM, IO/latencia de disco, CPU, conexiones por proceso y replicación. Cuando la base responda, deben capturarse actividad/esperas y estadísticas de consultas antes de reiniciar contadores. El fallo inicial del 2 de noviembre se observa alrededor de 13:53–13:58 UTC, con errores posteriores 522/524 y pérdida del pool.

No se han cambiado parámetros de memoria, pools, índices, RLS ni publicaciones Realtime sin poder revisar su estado efectivo y sus planes de consulta. La recuperación productiva y la causa recurrente siguen pendientes de comprobación; el estado saludable del plano de control no se toma como prueba de disponibilidad.
