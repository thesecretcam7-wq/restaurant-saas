# Android Tap to Pay

Esta es la base segura para que el APK Android cobre desde el comandero con Stripe Terminal Tap to Pay.

## Flujo del APK

1. El empleado entra con el mismo login/PIN del restaurante.
2. El APK conserva la cookie `staff_session` que entrega Eccofood.
3. Cuando va a cobrar un pedido, el APK pide:
   - `POST /api/terminal/tap-to-pay/connection-token`
   - `POST /api/terminal/tap-to-pay/payment-intent`
4. El APK usa el Stripe Terminal Android SDK para descubrir el lector local Tap to Pay, conectar y procesar el `PaymentIntent`.
5. Cuando Stripe Terminal devuelve el pago como exitoso, el APK llama:
   - `POST /api/terminal/tap-to-pay/complete`

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
  "tenantId": "..."
}
```

### Preparar cobro presencial

```http
POST /api/terminal/tap-to-pay/payment-intent
Content-Type: application/json

{ "tenantId": "parrillaburgers", "orderId": "..." }
```

Respuesta:

```json
{
  "clientSecret": "pi_..._secret_...",
  "paymentIntentId": "pi_...",
  "amount": 1200,
  "currency": "eur"
}
```

### Confirmar cobro en Eccofood

```http
POST /api/terminal/tap-to-pay/complete
Content-Type: application/json

{
  "tenantId": "parrillaburgers",
  "orderId": "...",
  "paymentIntentId": "pi_..."
}
```

Si Stripe confirma `succeeded`, Eccofood marca el pedido como pagado, guarda `payment_method = stripe`, conserva el `stripe_payment_intent_id`, descuenta inventario y registra auditoria.

## Notas importantes

- Esto sirve para todos los restaurantes, no solo ParrillaBurgers.
- No cambia el comandero web actual.
- Tap to Pay no funciona solo con PWA/web; necesita APK Android con Stripe Terminal SDK.
- El cobro se crea en la cuenta conectada Stripe del restaurante.
- El importe se envia a Stripe en la unidad menor correcta de cada moneda.
- Antes de activar en produccion hay que validar pais, cuenta Stripe conectada y disponibilidad de Tap to Pay para ese mercado.
