package com.eccofood.taptopay

import android.webkit.CookieManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

data class TenantSession(
    val tenantId: String,
    val tenantSlug: String,
)

data class PosOrder(
    val id: String,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String,
    val total: Double,
    val paymentStatus: String,
    val status: String,
    val deliveryType: String,
    val tableNumber: Int?,
    val itemsSummary: String,
)

class EccofoodApi(initialBaseUrl: String) {
    @Volatile
    private var baseUrl: String = normalizeBaseUrl(initialBaseUrl)

    fun setBaseUrl(value: String) {
        baseUrl = normalizeBaseUrl(value)
    }

    fun getBaseUrl(): String = baseUrl

    fun loginOwner(email: String, password: String): TenantSession {
        val response = post(
            "/api/auth/login",
            JSONObject()
                .put("email", email)
                .put("password", password)
        )
        val tenant = response.optJSONObject("tenant")
            ?: throw IllegalStateException("No se encontro el restaurante de esa cuenta.")
        return TenantSession(
            tenantId = tenant.getString("id"),
            tenantSlug = tenant.optString("slug").ifBlank { tenant.getString("id") },
        )
    }

    fun todayOrders(tenantId: String): List<PosOrder> {
        val domain = encode(tenantId)
        val response = get("/api/orders/search?domain=$domain&today=1&limit=200")
        val orders = response.optJSONArray("orders") ?: JSONArray()
        return (0 until orders.length())
            .mapNotNull { index -> orders.optJSONObject(index)?.let(::parseOrder) }
    }

    fun connectionToken(tenantId: String): JSONObject {
        return post("/api/terminal/tap-to-pay/connection-token", JSONObject().put("tenantId", tenantId))
    }

    fun paymentIntent(tenantId: String, orderId: String): JSONObject {
        return post(
            "/api/terminal/tap-to-pay/payment-intent",
            JSONObject()
                .put("tenantId", tenantId)
                .put("orderId", orderId)
        )
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

    fun completeOrder(tenantId: String, orderId: String, paymentIntentId: String): JSONObject {
        return post(
            "/api/terminal/tap-to-pay/complete",
            JSONObject()
                .put("tenantId", tenantId)
                .put("orderId", orderId)
                .put("paymentIntentId", paymentIntentId)
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

    fun clearCookies() {
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
    }

    private fun parseOrder(json: JSONObject): PosOrder {
        return PosOrder(
            id = json.getString("id"),
            orderNumber = json.optString("order_number").ifBlank { json.getString("id").take(8) },
            customerName = json.optString("customer_name"),
            customerPhone = json.optString("customer_phone"),
            total = json.optDouble("total", 0.0),
            paymentStatus = json.optString("payment_status"),
            status = json.optString("status"),
            deliveryType = json.optString("delivery_type"),
            tableNumber = json.optInt("table_number").takeIf { json.has("table_number") && !json.isNull("table_number") },
            itemsSummary = summarizeItems(json.optJSONArray("items")),
        )
    }

    private fun summarizeItems(items: JSONArray?): String {
        if (items == null || items.length() == 0) return "Sin detalle"
        val names = mutableListOf<String>()
        val maxItems = minOf(items.length(), 3)
        for (index in 0 until maxItems) {
            val item = items.optJSONObject(index) ?: continue
            val quantity = item.optInt("quantity", item.optInt("qty", 1))
            val name = item.optString("name", item.optString("product_name", "Producto"))
            names.add("${quantity}x $name")
        }
        val extra = items.length() - maxItems
        return if (extra > 0) "${names.joinToString(", ")} +$extra mas" else names.joinToString(", ")
    }

    private fun get(path: String): JSONObject {
        return request("GET", path, null)
    }

    private fun post(path: String, body: JSONObject): JSONObject {
        return request("POST", path, body)
    }

    private fun request(method: String, path: String, body: JSONObject?): JSONObject {
        val origin = cookieOrigin()
        val url = URL(baseUrl.trimEnd('/') + path)
        val connection = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 12000
            readTimeout = 20000
            setRequestProperty("Accept", "application/json")
            CookieManager.getInstance().getCookie(origin)?.let { setRequestProperty("Cookie", it) }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }

        if (body != null) {
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(body.toString())
            }
        }

        val responseCode = connection.responseCode
        storeCookies(origin, connection.headerFields)
        val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
        val json = if (text.isBlank()) JSONObject() else JSONObject(text)

        if (responseCode !in 200..299) {
            throw IllegalStateException(json.optString("error", "Error HTTP $responseCode"))
        }

        return json
    }

    private fun storeCookies(origin: String, headers: Map<String?, List<String>>) {
        headers.entries
            .filter { entry -> entry.key?.equals("Set-Cookie", ignoreCase = true) == true }
            .flatMap { entry -> entry.value }
            .forEach { cookie -> CookieManager.getInstance().setCookie(origin, cookie) }
        CookieManager.getInstance().flush()
    }

    private fun cookieOrigin(): String {
        val url = URL(baseUrl)
        return "${url.protocol}://${url.authority}"
    }

    private fun encode(value: String): String {
        return URLEncoder.encode(value, Charsets.UTF_8.name())
    }

    private fun normalizeBaseUrl(value: String): String {
        val trimmed = value.trim().trimEnd('/')
        if (trimmed.isBlank()) return ""
        return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "http://$trimmed"
    }
}
