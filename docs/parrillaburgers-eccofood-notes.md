# Memoria local - ParrillaBurgers en Eccofood

Resumen guardado el 2026-05-14.

## Contexto general

- ParrillaBurgers se esta montando dentro de Eccofood como restaurante real de cliente.
- La app debe funcionar como SaaS multi restaurante: tienda publica, kiosko, TPV, KDS/comandero y panel administrador.
- ParrillaBurgers opera en Colombia, por lo que sus precios deben mostrarse en COP aunque se pruebe desde Espana.
- El dominio real comprado en Vercel es `parrillaburgers.com`.

## Branding y diseno

- Se elimino la idea de que cada cliente cambie libremente los colores porque generaba conflictos visuales.
- Se esta usando un concepto premium comun para todos los restaurantes: fondo oscuro, dorado, contraste alto, tarjetas modernas y look profesional.
- El logo de tienda debe verse sin contenedores recortados.
- Los loaders deben ser premium: Eccofood para la app general y logo del restaurante para pantallas de tienda/restaurante.

## ParrillaBurgers

- Se cargaron productos reales, bebidas, precios e imagenes.
- Se configuro el pais de ParrillaBurgers como Colombia (`CO`) y zona horaria `America/Bogota`.
- La moneda debe salir como pesos colombianos en tienda, kiosko, TPV y admin.
- Tiene barra libre de ingredientes gratis, pero ese texto/flujo solo debe aplicar a ParrillaBurgers, no a otras tiendas.

## Admin

- El panel administrador debe verse premium igual que landing, acceso, TPV y kiosko.
- En movil debe haber drawer/menu visible para navegar categorias del admin.
- Se corrigio el drawer movil del admin y el ancho del contenido movil.
- La pagina de Delivery muestra pais/moneda del restaurante para evitar confusion.

## TPV / Operacion

- TPV debe ser rapido y legible para cajero.
- En fullscreen:
  - El carrito debe tener scroll si hay muchos productos.
  - El boton de pagar debe mantenerse grande.
  - No debe aparecer boton Admin para trabajadores.
  - El buscador se quiere cerca del nombre del restaurante.
- El punto Online debe verse verde neon y offline rojo neon.
- Si delivery esta activado, el TPV debe permitir cobrar delivery en pedidos por llamada.
- Al cerrar caja debe imprimir ticket; si falla impresion, debe quedar recibo guardado para reimprimir desde admin.
- Si no hay monitor KDS, el TPV debe poder imprimir comanda para cocina.

## Pagos

- Se agrego soporte para Wompi para restaurantes de Colombia.
- El dueno debe poder elegir proveedor de pago online: Stripe, Wompi o sin pago online.
- Wompi requiere llaves publica, privada e integridad.
- ParrillaBurgers aun debe configurarse con credenciales reales de Wompi si se va a usar en produccion.

## Impresoras

- Hay soporte para puente/bridge de impresora local.
- En Firefox no hay WebUSB, por lo que el flujo debe apoyarse en impresora Windows/bridge y no bloquear botones si el navegador no soporta USB.
- El recibo debe indicar correctamente si el pago fue efectivo o tarjeta.
- El texto del recibo se pidio un poco mas pequeno.

## Commits recientes importantes

- `3814c61 Add Wompi payment option for Colombia`
- `43f20d6 Add premium storefront theme`
- `922096c Restore mobile admin menu access`
- `2d82d30 Fix restaurant country currency settings`
- `ceb100d Use restaurant currency in admin`
- `9dfcc8c Fix mobile admin navigation drawer`

