# Demora al entrar — 25/11/2026

Proyecto: `csdooyggiuhzovehykna`. Horas de esta nota: Europe/Madrid.

## Evidencia

- Registros 09:35–10:06: entre 10:03 y 10:04 Auth devolvió 500/504 al
  autenticar con contraseña y renovar tokens. Sus mensajes incluyen
  `error finding user`, `context deadline exceeded` y `context canceled`.
- Las operaciones fallidas de Auth tardaron aproximadamente 11–14 segundos;
  el gateway registró hasta 69.399 ms para `/auth/v1/token` con 504.
- A las 10:04:38 vuelven a constar autenticaciones y renovaciones correctas.
- El sondeo posterior de las páginas de acceso y login de El Cruce dio 200
  en 806 y 398 ms. El proyecto figuraba como `ACTIVE_HEALTHY`.
- En la captura posterior de PostgreSQL no había bloqueos pendientes ni otras
  consultas de cliente activas. Las conexiones REST estaban inactivas y no
  había reinicio reciente de PostgreSQL. Esto no reconstruye CPU/IO del incidente.
- Los totales de `pg_stat_statements` se acumulan desde el 31 de octubre:
  no son consumo de hoy. La consulta antigua de cierres de 2.445 llamadas sigue
  exactamente en ese recuento; no prueba que causara este incidente.

Está demostrada la interrupción temporal al atender Auth. No queda demostrada
su causa de infraestructura: no se atribuye a Disk IO, falta de conexiones,
una consulta concreta o una caída general sin métricas del intervalo.

## Corrección de la aplicación

La ruta `/api/auth/login` creaba el cliente SSR sin `supabaseFetch`.
Su `Promise.race` devolvía un timeout, pero dejaba la petición HTTP trabajando.
Además, todos los errores devueltos por Auth se mostraban como credenciales
incorrectas, incluidos 500/504.

- El login usa ahora el fetch protegido compartido. Las peticiones con contraseña
  se abortan a los ocho segundos si no se completa la respuesta, incluido el cuerpo.
- Un intento explícito de contraseña no queda bloqueado por la espera preventiva
  de las renovaciones automáticas. No se añaden reintentos automáticos de login.
- 429/5xx de Auth se presentan como servicio de acceso temporalmente no disponible;
  una clave realmente incorrecta sigue rechazándose.
- La espera también protege el cuerpo de las respuestas de sesión. Se conserva
  el tratamiento de los tokens ante fallos temporales y de la cancelación externa.
- Se limpian los temporizadores al resolver cada paso del login y se acotan
  la consulta del restaurante y el guardado de la sesión. Un error de consulta
  ya no se muestra como restaurante inexistente; un error de escritura no
  genera una cookie que afirme que ese token se guardó.

No se cambia el plan, RLS, esquema, importes, pagos ni cierres. La protección
acota el bloqueo de la aplicación, pero no garantiza que Supabase deje de tener
interrupciones de servicio.

## Comprobaciones

455 pruebas aprobadas en 66 archivos. Las nuevas pruebas usan el SDK real de
Supabase SSR/Auth con red simulada: abortar una contraseña atascada, cuerpos
atascados, login correcto, credenciales inválidas, 429/500/504, consulta fallida
del restaurante y escritura fallida de la sesión. No se usan contraseñas reales
ni se crean ventas de prueba en producción.
