package com.eccofood.taptopay

import com.stripe.stripeterminal.external.callable.ConnectionTokenCallback
import com.stripe.stripeterminal.external.callable.ConnectionTokenProvider
import com.stripe.stripeterminal.external.models.ConnectionTokenException

class TerminalTokenProvider(
    private val api: EccofoodApi,
    private val tenantIdProvider: () -> String?
) : ConnectionTokenProvider {
    @Volatile
    var lastLocationId: String? = null
        private set

    override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
        try {
            val tenantId = tenantIdProvider()
                ?: throw IllegalStateException("Restaurante no seleccionado")
            val payload = api.connectionToken(tenantId)
            lastLocationId = payload.optString("locationId").takeIf { it.isNotBlank() }
            callback.onSuccess(payload.getString("secret"))
        } catch (error: Exception) {
            callback.onFailure(ConnectionTokenException("No se pudo obtener token de Terminal", error))
        }
    }
}
