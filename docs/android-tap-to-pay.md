# Android Tap to Pay

Esta es la base segura para que el APK Android cobre desde el comandero con Stripe Terminal Tap to Pay.

## Flujo del APK

1. El empleado entra con el mismo login/PIN del restaurante dentro del WebView del APK.
2. El APK conserva la cookie `staff_session` que entrega Eccofood.
3. Cuando carga una mesa completa, Eccofood detecta el puente nativo `EccofoodAndroidTapToPay`.
4. El boton Tap to Pay del comandero envia al APK los pedidos pendientes de la mesa.
5. El APK pide:
   - `POST /api/terminal/tap-to-pay/connection-token`
   - `POST /api/terminal/tap-to-pay/table-payment-intent`
6. El APK usa el Stripe Terminal Android SDK para descubrir el lector local Tap to Pay, conectar y procesar el `PaymentIntent`.
7. Cuando Stripe Terminal devuelve el pago como exitoso, el APK llama:
   - `POST /api/terminal/tap-to-pay/complete-table`

## Rutas privadas

Todas requieren una sesion valida del restaurante y aceptan `admin`, `cajero` o `camarero`.

### Crear token de Terminal

```http
POST /api/terminal/tap-to-pay/connection-token
Content-Type: application/json

{ "tenantId": "parrillaburgers" }
```

Respuesta:

```json
{
  "secret": "pst_...",
  "stripeAccountId": "acct_...",
  "locationId": "tml_...",
  "tenantId": "..."
}
```

### Preparar cobro presencial

```http
POST /api/terminal/tap-to-pay/payment-intent
Content-Type: application/json

{ "tenantId": "parrillaburgers", "orderId": "..." }
```

### Confirmar cobro presencial

```http
POST /api/terminal/tap-to-pay/complete
Content-Type: application/json

{
  "tenantId": "parrillaburgers",
  "orderId": "...",
  "paymentIntentId": "pi_..."
}
```

### Preparar mesa completa

```http
POST /api/terminal/tap-to-pay/table-payment-intent
Content-Type: application/json

{
  "tenantId": "parrillaburgers",
  "orderIds": ["...", "..."],
  "tableNumber": 4
}
```

### Confirmar mesa completa

```http
POST /api/terminal/tap-to-pay/complete-table
Content-Type: application/json

{
  "tenantId": "parrillaburgers",
  "orderIds": ["...", "..."],
  "paymentIntentId": "pi_..."
}
```

Si Stripe confirma `succeeded`, Eccofood marca como pagadas todas las rondas de la mesa, guarda `payment_method = stripe`, conserva el `stripe_payment_intent_id`, descuenta inventario y registra auditoria.

## Proyecto Android

El proyecto nativo esta en `android-tap-to-pay/`.

Para compilarlo en Android Studio:

1. Abre la carpeta `android-tap-to-pay`.
2. Configura la URL del backend.

```bash
./gradlew assembleDebug -PECCOFOOD_BASE_URL=https://tu-dominio.com
```

Para probar contra un servidor local desde un telefono fisico, usa la IP local del computador:

```bash
./gradlew assembleDebug -PECCOFOOD_BASE_URL=http://192.168.1.50:3000
```

La version debug usa lector simulado de Tap to Pay. Para pago real, compila release, usa HTTPS, Stripe en modo correcto y un Android compatible.

## Notas importantes

- Esto sirve para todos los restaurantes, no solo ParrillaBurgers.
- No cambia el comandero web actual en navegador normal.
- Tap to Pay no funciona solo con PWA/web; necesita APK Android con Stripe Terminal SDK.
- El cobro se crea en la cuenta conectada Stripe del restaurante.
- La mesa completa se cobra como un solo PaymentIntent y luego se marcan pagadas todas las rondas incluidas.
- Stripe Terminal requiere un `locationId`; Eccofood lo crea o reutiliza por restaurante en la cuenta conectada.
- El importe se envia a Stripe en la unidad menor correcta de cada moneda.
- Antes de activar en produccion hay que validar pais, cuenta Stripe conectada y disponibilidad de Tap to Pay para ese mercado.
