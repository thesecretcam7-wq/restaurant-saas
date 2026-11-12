# Acceso privado a carritos — 12 de noviembre de 2026

## Cambio

Los navegadores dejan de leer o escribir `pos_carts` directamente. El TPV utiliza `/api/pos/cart`, que exige propietario verificado o sesión de personal firmada, valida la carga y limita cada operación al restaurante y a la sesión del terminal. Las sesiones antiguas se actualizan únicamente si su token aleatorio coincide con el registro del servidor y el empleado sigue activo; los permisos se recuperan del servidor. Un JSON de sesión inventado no autoriza el acceso.

El inicio de sesión emite una firma adicional en una cookie HttpOnly. Una sesión antigua no verificable debe confirmar el PIN una vez, sin borrar el carrito local ni las ventas pendientes. No se ha convertido la firma en una garantía de auditoría completa de todos los demás módulos de autenticación.

La pantalla del cliente usa un enlace firmado de solo lectura, limitado al restaurante y terminal y válido durante 30 días. La credencial va en el fragmento del enlace y después en la cabecera de autorización, no en la consulta HTTP. El enlace se obtiene con el botón «Cliente» del TPV. No permite guardar o borrar cuentas ni consultar otros restaurantes. La respuesta excluye nombres de empleados, notas, IDs de órdenes y contexto interno del carrito.

Las actualizaciones de pantalla usan avisos sin datos por un canal opaco de Broadcast y comprobaciones de respaldo cada 60 segundos cuando la pantalla está visible. Los avisos nunca se toman como precios ni importes: se vuelve a la lectura autorizada. Ya no hay una suscripción anónima a las filas de la tabla. Los canales y las lecturas en curso se cierran al abandonar la pantalla.

## Conservación y compatibilidad

La operación interna `mutate_pos_cart` mantiene una sola cuenta activa cuando se repite una creación y serializa por restaurante y terminal. Las actualizaciones exigen el ID activo esperado; un mensaje antiguo no reactiva un carrito cerrado. Cerrar una cuenta conserva las filas históricas. Solo `service_role` puede ejecutar esta función, con `SECURITY INVOKER` y búsqueda fija `pg_catalog`.

También se corrigió la recuperación que escribía `readonly` y `loaded_order_id`, columnas inexistentes: esos datos se guardan en `cart_context`, sin añadir columnas ni perder el vínculo con la orden. La copia visual del carrito respeta el IVA incluido para no añadirlo por segunda vez; no cambia los cálculos ni registros de órdenes o cierres.

El service worker actualizado adapta las peticiones de versiones ya abiertas del TPV a la nueva API autorizada, incluso actualizaciones antiguas que enviaban únicamente el ID después de una lectura. No reenvía claves de base de datos ni admite eliminaciones. Se conserva la caché anterior para los terminales que siguen utilizando la versión previa sin conexión; las cuentas y ventas locales no se limpian y no se fuerza una recarga durante el cobro.

Las pantallas del cliente abiertas en otro dispositivo mediante el enlace antiguo y sin ninguna sesión necesitan abrir el nuevo enlace desde «Cliente». No se mantiene una excepción pública por restaurante para ese caso.

## Verificación

- 355 pruebas unitarias correctas en 54 archivos, comprobación de tipos y compilación de producción.
- Casos de sesión falsificada, firma alterada, sesión caducada, actualización de sesión antigua, permisos y nombre canónicos del servidor, propietario válido y restaurante ajeno.
- API: límites de restaurante y terminal, autorización antes de consultar, rechazo de cargas alteradas y de orígenes externos, confirmación de actualización y contexto de cuentas recuperadas.
- Pantalla: enlace válido, caducado, alterado o con restaurante/terminal sustituidos; un enlace de lectura no puede autorizar escrituras.
- `scripts/verify-pos-cart-security.mjs`: pantalla real y service worker real con servidor HTTP aislado. Conservación de la última cuenta durante fallos, recuperación, limpieza de canales, compatibilidad con lecturas y actualizaciones antiguas y rechazo de navegador anónimo.
- Regresiones del TPV: seis escenarios de mesas y recuperación offline, y cierre de caja en escritorio, pantalla completa y móvil.
- Función real de PostgreSQL: ocho verificaciones de creación repetida, ID incorrecto, terminal ajeno, actualización y cierre. Ejecutadas en una transacción revertida, sin dejar cuentas de prueba ni tocar órdenes, pagos o cierres.

## Despliegue

1. Instalar la función interna de carritos, sin restringir todavía los clientes antiguos: `20261112203253_server_pos_cart_mutations`.
2. Publicar y comprobar la API, el TPV, la pantalla y el service worker de compatibilidad.
3. Tras comprobar esa publicación, limitar las cuatro políticas de `pos_carts` a `service_role`, conservando RLS y todos los registros. Verificar que `anon` y `authenticated` ya no ven carritos directamente y que la función interna no es pública.
4. Comparar recuentos y huellas de órdenes, productos, pagos, cierres y carritos; documentar cualquier actividad legítima del negocio que ocurra entre las capturas.

Estado de la publicación y del cierre de políticas: se registrará al completar el paso 3. No ejecutar primero la restricción en un entorno que todavía sirva solo el cliente antiguo.
