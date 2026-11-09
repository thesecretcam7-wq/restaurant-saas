# Pruebas de capacidad — 9 de noviembre de 2026

## Resultado

**Se comprobaron 20 sesiones de consulta con el perfil descrito, durante una etapa de aproximadamente 30 segundos, sin errores. Esto no certifica 20 negocios trabajando con todas sus funciones ni establece el máximo de usuarios del sistema.**

La prueba funcional aislada comprobó 20 negocios ficticios, 40 pestañas y 200 ventas locales. Sus respuestas de servidor eran simuladas: ese resultado comprueba el comportamiento del cliente, no la capacidad de escritura de Supabase.

No se cambió el plan ni se crearon negocios, ventas o cierres ficticios en producción. No se usaron ni se extrajeron sesiones de usuarios. No se reinició el servidor.

## Consultas al servicio real

Ventana registrada: 18:51:52–18:54:17 UTC (19:51:52–19:54:17 en Madrid). Fuente: [resultado original](capacity-readonly-2026-11-09.json).

Se usaron datos de **un único negocio existente**, con el conjunto de datos calentado por las peticiones anteriores. Una sesión virtual programa una petición cada cinco segundos. No representa un negocio completo con TPV, KDS, clientes web y administración simultáneos.

| Sesiones virtuales | Peticiones objetivo/s | Peticiones completadas | Errores | Mediana | Percentil 95 | Resultado |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 5 | 1 | 30 | 0 | 214 ms | 763 ms | Pasa |
| 10 | 2 | 60 | 0 | 186 ms | 659 ms | Pasa |
| 20 | 4 | 120 | 0 | 177 ms | 670 ms | Pasa |
| 40 | 8 | Sin estadística completa | Sin estadística completa | — | — | Interrumpida por protección |

Se hicieron seis peticiones previas, una por tipo de consulta. La carga combinó:

- API pública de bootstrap del TPV: seis consultas internas de catálogo y configuración.
- API pública de publicidad del televisor.
- API de disponibilidad de la nube.
- Lecturas directas autorizadas de Supabase que reproducen las selecciones de pedidos abiertos, una página de hasta 1000 ventas del mes y una página de facturas pagadas. Se midieron respuestas completas, incluyendo su cuerpo.

Las lecturas directas usan credenciales de servicio únicamente en el proceso de prueba. Por ello **no miden la autorización, los límites de planes, el inicio de sesión ni las políticas RLS de cada rol**. No se probaron escrituras reales, pagos externos, contención de caja, sesiones Realtime ni 20 conjuntos independientes de datos.

### Parada y alcance de la evidencia

La etapa de 40 sesiones se interrumpió al alcanzar el plazo del cliente en `pos-bootstrap` (cinco segundos). La versión ejecutada conserva el motivo `Stopped on pos-bootstrap: Deadline/stop`, pero no guardó las observaciones de esa etapa al fallar la lectura posterior de métricas. El script se corrigió después para conservar también la etapa interrumpida y distinguir su petición inicial de las cancelaciones posteriores. **No se volvió a aumentar la carga real para reconstruir la estadística perdida.**

No se atribuye ese timeout a una saturación demostrada de Supabase: en la ventana 18:53:40–18:54:35 UTC la consulta a logs devolvió 354 eventos de `edge_logs`, sin respuestas 5xx identificadas. No devolvió registros PostgreSQL para atribuir una causa interna. Tampoco se han medido suficientes muestras para separar red, Vercel y base de datos.

Las protecciones de la prueba eran: un máximo de ocho peticiones HTTP en curso, timeout de cinco segundos, parada al primer error o después de dos respuestas consecutivas superiores a 2,5 segundos, criterio de p95 inferior a dos segundos y mínimo de 64 MiB disponibles en las muestras de memoria. El tráfico real de otros usuarios no se aisló.

### Recursos y comprobación posterior

Las muestras de memoria disponibles durante las etapas completadas estuvieron entre 201 y 220 MiB; swap utilizado, entre 343 y 360 MiB. Algunas lecturas de contadores de CPU no cambiaron entre muestras: sus porcentajes figuran como `null`, no como CPU al 0 %. La única etapa con delta calculable mostró aproximadamente 3 % de CPU ocupada y 7,1 % de espera de IO; son métricas agregadas del host y no establecen la causa del timeout.

A las 18:54:43 UTC, la consulta posterior mostró 15 conexiones cliente, cero consultas activas ajenas a la comprobación, cero esperas por bloqueo y cero transacciones ociosas abiertas. PostgreSQL conservaba el inicio del 2 de noviembre a las 16:14:53 UTC. A las 18:55 UTC respondieron Auth (200, 670 ms), una lectura REST (200, 758 ms) y la comprobación pública de nube (200).

## Ventas locales de 20 negocios: prueba funcional aislada

Fuente: [resultado funcional](capacity-offline-2026-11-09.json).

- 20 negocios ficticios; dos pestañas por negocio; 10 ventas por negocio.
- IndexedDB y módulo de sincronización reales; origen local seguro y Web Locks del navegador.
- 100 ventas en efectivo y 100 con tarjeta externa.
- Un fallo 503 simulado por negocio conservó las 200 ventas pendientes.
- Una respuesta sin confirmación conservó las ventas pendientes, incluso cuando el servidor simulado había aceptado la primera venta.
- Al restablecer las confirmaciones, se sincronizaron las 200 ventas, con identificadores, precios, métodos de pago y fechas originales conservados.
- Las dos pestañas compartieron exclusión de subidas por negocio: 200 solicitudes de recuperación para 200 ventas, sin subidas duplicadas en esa fase.
- Todas las colas de ventas y operaciones quedaron vacías; no se cruzaron solicitudes entre los negocios ficticios.
- Hubo hasta 20 peticiones simuladas simultáneas, con una demora de respuesta artificial de 100 ms. No es una medición de latencia de Supabase.

## Cómo repetir las pruebas

La prueba real es deliberadamente explícita:

```powershell
node scripts/capacity-readonly.mjs             # Solo muestra la configuración; no hace peticiones.
node scripts/capacity-readonly.mjs --run-readonly
```

Requiere las variables existentes de Eccofood en el entorno o `.env.local`. Solo admite el proyecto esperado, hace GET y no imprime credenciales ni registros. No debe repetirse automáticamente para perseguir un fallo de producción. Guarda un resultado nuevo en `output/capacity/readonly-result.json`; el resultado original de esta revisión está versionado en `docs`.

La prueba funcional requiere Playwright, esbuild y un navegador de Playwright. Puede resolver esas herramientas desde el `package.json` indicado por `ECCOFOOD_BROWSER_PACKAGE`, y usar el ejecutable indicado por `ECCOFOOD_BROWSER_EXECUTABLE`:

```powershell
node scripts/capacity-offline.mjs
```

Todo su tráfico se intercepta dentro del navegador; no necesita un servidor en el puerto 3000 y no envía ventas a producción.

## Decisión para incorporar 20 negocios

El resultado útil es una etapa satisfactoria de 20 sesiones de lectura a cuatro peticiones por segundo y la preservación funcional de 200 ventas locales en 20 negocios simulados. **No hay todavía una cifra validada de negocios completos ni un límite máximo.**

Para certificar 20 negocios faltan un entorno de datos independiente comparable al de producción, carga de escritura y lectura combinada, autenticación real de cuentas de prueba, catálogos e históricos por negocio, cocina y caja concurrentes, reconexión en masa y una prueba sostenida que cubra el consumo de IO. La incorporación por etapas permite medir ese perfil antes de comprometer a los 20 negocios con una capacidad que esta prueba no ha demostrado.
