package com.eccofood.taptopay

import android.webkit.CookieManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class EccofoodApi(private val baseUrl: String) {
    fun connectionToken(tenantId: String): JSONObject {
        return post("/api/terminal/tap-to-pay/connection-token", JSONObject().put("tenantId", tenantId))
    }

    fun tablePaymentIntent(tenantId: String, orderIds: JSONArray, tableNumber: Int?): JSONObject {
        return post(
            "/api/terminal/tap-to-pay/table-payment-intent",
            JSONObject()
                .put("tenantId", tenantId)
                .put("orderIds", orderIds)
                .put("tableNumber", tableNumber ?: JSONObject.NULL)
        )
    }

    fun completeTable(tenantId: String, orderIds: JSONArray, paymentIntentId: String): JSONObject {
        return post(
            "/api/terminal/tap-to-pay/complete-table",
            JSONObject()
                .put("tenantId", tenantId)
                .put("orderIds", orderIds)
                .put("paymentIntentId", paymentIntentId)
        )
    }

    private fun post(path: String, body: JSONObject): JSONObject {
        val url = URL(baseUrl.trimEnd('/') + path)
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            CookieManager.getInstance().getCookie(baseUrl)?.let { setRequestProperty("Cookie", it) }
        }

        OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
            writer.write(body.toString())
        }

        val responseCode = connection.responseCode
        val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
        val text = stream.bufferedReader().use(BufferedReader::readText)
        val json = if (text.isBlank()) JSONObject() else JSONObject(text)

        if (responseCode !in 200..299) {
            throw IllegalStateException(json.optString("error", "Error HTTP $responseCode"))
        }

        return json
    }
}
