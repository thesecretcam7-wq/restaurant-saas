package com.eccofood.taptopay

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private lateinit var api: EccofoodApi
    private lateinit var controller: TapToPayController
    private val prefs by lazy { getSharedPreferences("eccofood_native_tap_to_pay", MODE_PRIVATE) }
    private val moneyFormat = NumberFormat.getCurrencyInstance(Locale("es", "CO")).apply {
        maximumFractionDigits = 0
    }

    private var statusText: TextView? = null
    private var ordersContainer: LinearLayout? = null
    private var activePayButton: Button? = null
    private var currentTenantId: String = ""
    private var currentTenantSlug: String = ""
    private var loadingOrders = false

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!locationGranted) {
            Toast.makeText(this, getString(R.string.location_permission_message), Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestTerminalPermissions()
        CookieManager.getInstance().setAcceptCookie(true)

        val savedBaseUrl = prefs.getString("base_url", BuildConfig.ECCOFOOD_BASE_URL) ?: BuildConfig.ECCOFOOD_BASE_URL
        api = EccofoodApi(savedBaseUrl)
        controller = TapToPayController(
            activity = this,
            api = api,
            onStatus = { message -> updateStatus(message) },
            onResult = { success, error -> handlePaymentResult(success, error) }
        )

        if (hasSavedAccess()) {
            showDashboard()
        } else {
            showSetupScreen()
        }
    }

    private fun requestTerminalPermissions() {
        val permissions = mutableListOf(Manifest.permission.ACCESS_FINE_LOCATION)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permissions.add(Manifest.permission.BLUETOOTH_CONNECT)
            permissions.add(Manifest.permission.BLUETOOTH_SCAN)
        }

        val missing = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isNotEmpty()) {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun hasSavedAccess(): Boolean {
        return !prefs.getString("base_url", "").isNullOrBlank() &&
            !prefs.getString("tenant_id", "").isNullOrBlank()
    }

    private fun showSetupScreen(message: String? = null) {
        statusText = null
        ordersContainer = null

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(18), dp(24), dp(18), dp(24))
            setBackgroundColor(color("#0B0E14"))
        }

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(20), dp(18), dp(20))
            background = rounded(color("#151A23"), color("#2A3241"), dp(1))
        }

        val title = TextView(this).apply {
            text = "Eccofood Tap to Pay"
            textSize = 25f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
        }

        val detail = TextView(this).apply {
            text = message ?: "Entra con la cuenta del restaurante para cargar los pedidos pendientes."
            textSize = 15f
            setTextColor(color("#9AA6B8"))
            gravity = Gravity.CENTER
            setPadding(0, dp(12), 0, dp(22))
        }

        val serverInput = field("Servidor").apply {
            setText(prefs.getString("base_url", BuildConfig.ECCOFOOD_BASE_URL) ?: BuildConfig.ECCOFOOD_BASE_URL)
        }

        val emailInput = field("Correo del restaurante").apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        }

        val passwordInput = field("Contrasena").apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }

        val openButton = primaryButton("Entrar").apply {
            setOnClickListener {
                val baseUrl = normalizeBaseUrl(serverInput.text.toString())
                val email = emailInput.text.toString().trim()
                val password = passwordInput.text.toString()

                if (baseUrl.isBlank() || email.isBlank() || password.isBlank()) {
                    Toast.makeText(this@MainActivity, "Completa servidor, correo y contrasena", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                configureNativeAccess(baseUrl, email, password, this)
            }
        }

        panel.addView(title)
        panel.addView(detail)
        panel.addView(serverInput, matchWrap())
        panel.addView(emailInput, matchWrap(top = 14))
        panel.addView(passwordInput, matchWrap(top = 14))
        panel.addView(openButton, matchWrap(top = 18))
        container.addView(panel, matchWrap())
        setContentView(ScrollView(this).apply { addView(container) })
    }

    private fun configureNativeAccess(baseUrl: String, email: String, password: String, button: Button) {
        button.isEnabled = false
        button.text = "Entrando..."
        api.setBaseUrl(baseUrl)

        thread {
            try {
                val session = api.loginOwner(email, password)
                prefs.edit()
                    .putString("base_url", baseUrl)
                    .putString("tenant_id", session.tenantId)
                    .putString("tenant_slug", session.tenantSlug)
                    .apply()

                runOnUiThread { showDashboard() }
            } catch (error: Exception) {
                runOnUiThread {
                    Toast.makeText(this, error.message ?: "No se pudo entrar.", Toast.LENGTH_LONG).show()
                    button.isEnabled = true
                    button.text = "Entrar"
                }
            }
        }
    }

    private fun showDashboard() {
        val baseUrl = prefs.getString("base_url", BuildConfig.ECCOFOOD_BASE_URL) ?: BuildConfig.ECCOFOOD_BASE_URL
        currentTenantId = prefs.getString("tenant_id", "") ?: ""
        currentTenantSlug = prefs.getString("tenant_slug", currentTenantId) ?: currentTenantId

        if (baseUrl.isBlank() || currentTenantId.isBlank()) {
            showSetupScreen()
            return
        }

        api.setBaseUrl(baseUrl)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(16), dp(14), dp(12))
            setBackgroundColor(color("#0B0E14"))
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(12))
        }

        val title = TextView(this).apply {
            text = "Tap to Pay"
            textSize = 26f
            setTextColor(Color.WHITE)
            setTypeface(typeface, Typeface.BOLD)
        }

        val subtitle = TextView(this).apply {
            text = currentTenantSlug
            textSize = 14f
            setTextColor(color("#9AA6B8"))
            setPadding(0, dp(2), 0, dp(10))
        }

        val actions = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val refreshButton = secondaryButton("Actualizar").apply {
            setOnClickListener { loadOrders() }
        }
        val changeButton = secondaryButton("Cambiar").apply {
            setOnClickListener { clearAccess() }
        }

        actions.addView(refreshButton, rowButtonWeight())
        actions.addView(space(dp(10), 1))
        actions.addView(changeButton, rowButtonWeight())

        statusText = TextView(this).apply {
            text = "Cargando pedidos..."
            textSize = 14f
            setTextColor(color("#C9D3E3"))
            setPadding(0, dp(10), 0, dp(10))
        }

        ordersContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(4), 0, dp(20))
        }

        header.addView(title)
        header.addView(subtitle)
        header.addView(actions)
        root.addView(header)
        root.addView(statusText, matchWrap())
        root.addView(ScrollView(this).apply {
            addView(ordersContainer)
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)
        loadOrders()
    }

    private fun loadOrders() {
        if (loadingOrders || currentTenantId.isBlank()) return
        loadingOrders = true
        updateStatus("Cargando pedidos...")
        ordersContainer?.removeAllViews()

        thread {
            try {
                val orders = api.todayOrders(currentTenantId)
                val groups = buildPaymentGroups(orders)
                runOnUiThread {
                    loadingOrders = false
                    renderGroups(groups, orders.size)
                }
            } catch (error: Exception) {
                runOnUiThread {
                    loadingOrders = false
                    val message = error.message ?: "No se pudieron cargar los pedidos."
                    updateStatus(message)
                    if (message.contains("Unauthorized", true) || message.contains("Forbidden", true)) {
                        prefs.edit().clear().apply()
                        showSetupScreen("La sesion vencio. Entra de nuevo.")
                    }
                }
            }
        }
    }

    private fun buildPaymentGroups(orders: List<PosOrder>): List<PaymentGroup> {
        val unpaidOrders = orders.filter { order ->
            !order.paymentStatus.equals("paid", ignoreCase = true) &&
                !order.status.equals("cancelled", ignoreCase = true)
        }

        val groups = mutableListOf<PaymentGroup>()
        unpaidOrders
            .filter { (it.tableNumber ?: 0) > 0 }
            .groupBy { it.tableNumber ?: 0 }
            .toSortedMap()
            .forEach { (tableNumber, tableOrders) ->
                val tickets = tableOrders.joinToString(" / ") { "#${it.orderNumber}" }
                groups.add(
                    PaymentGroup(
                        title = "Mesa $tableNumber",
                        subtitle = "${tableOrders.size} ticket(s): $tickets",
                        detail = tableOrders.joinToString("\n") { it.itemsSummary },
                        total = tableOrders.sumOf { it.total },
                        orderIds = tableOrders.map { it.id },
                        tableNumber = tableNumber
                    )
                )
            }

        unpaidOrders
            .filter { (it.tableNumber ?: 0) <= 0 }
            .forEach { order ->
                val customer = order.customerName.ifBlank { order.customerPhone }.ifBlank { order.deliveryType.ifBlank { "Pedido" } }
                groups.add(
                    PaymentGroup(
                        title = "Ticket #${order.orderNumber}",
                        subtitle = customer,
                        detail = order.itemsSummary,
                        total = order.total,
                        orderIds = listOf(order.id),
                        tableNumber = null
                    )
                )
            }

        return groups
    }

    private fun renderGroups(groups: List<PaymentGroup>, totalOrders: Int) {
        val container = ordersContainer ?: return
        container.removeAllViews()

        if (groups.isEmpty()) {
            updateStatus("Pendientes: 0 | Pedidos hoy: $totalOrders")
            val empty = TextView(this).apply {
                text = "No hay pedidos pendientes de pago."
                textSize = 16f
                setTextColor(color("#9AA6B8"))
                gravity = Gravity.CENTER
                setPadding(dp(12), dp(34), dp(12), dp(34))
            }
            container.addView(empty, matchWrap())
            return
        }

        val pendingCount = groups.sumOf { it.orderIds.size }
        updateStatus("Pendientes: $pendingCount | Pedidos hoy: $totalOrders")
        groups.forEach { group ->
            container.addView(groupView(group), matchWrap(bottom = 12))
        }
    }

    private fun groupView(group: PaymentGroup): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(14), dp(14), dp(14))
            background = rounded(color("#151A23"), color("#2A3241"), dp(1))
        }

        val titleRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        val titleBlock = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        val title = TextView(this).apply {
            text = group.title
            textSize = 18f
            setTextColor(Color.WHITE)
            setTypeface(typeface, Typeface.BOLD)
        }

        val subtitle = TextView(this).apply {
            text = group.subtitle
            textSize = 13f
            setTextColor(color("#9AA6B8"))
            setPadding(0, dp(2), dp(8), 0)
        }

        val amount = TextView(this).apply {
            text = formatMoney(group.total)
            textSize = 20f
            setTextColor(color("#39D98A"))
            setTypeface(typeface, Typeface.BOLD)
            gravity = Gravity.END
        }

        val detail = TextView(this).apply {
            text = group.detail
            textSize = 14f
            setTextColor(color("#C9D3E3"))
            setPadding(0, dp(12), 0, dp(12))
        }

        val payButton = primaryButton("Cobrar con Tap to Pay").apply {
            setOnClickListener { startPayment(group, this) }
        }

        titleBlock.addView(title)
        titleBlock.addView(subtitle)
        titleRow.addView(titleBlock, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        titleRow.addView(amount, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        card.addView(titleRow)
        card.addView(detail, matchWrap())
        card.addView(payButton, matchWrap())
        return card
    }

    private fun startPayment(group: PaymentGroup, button: Button) {
        if (activePayButton != null) return
        activePayButton = button
        button.isEnabled = false
        button.text = "Cobrando..."
        updateStatus("Preparando Tap to Pay...")

        val payload = JSONObject().put("tenantId", currentTenantId)
        if (group.tableNumber != null) {
            payload
                .put("orderIds", JSONArray(group.orderIds))
                .put("tableNumber", group.tableNumber)
            controller.payTable(payload)
        } else {
            payload.put("orderId", group.orderIds.first())
            controller.payOrder(payload)
        }
    }

    private fun handlePaymentResult(success: Boolean, error: String?) {
        runOnUiThread {
            activePayButton?.isEnabled = true
            activePayButton?.text = "Cobrar con Tap to Pay"
            activePayButton = null

            if (success) {
                Toast.makeText(this, "Pago completado", Toast.LENGTH_LONG).show()
                loadOrders()
            } else {
                val message = error ?: "No se pudo completar el pago."
                updateStatus(message)
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun clearAccess() {
        prefs.edit().clear().apply()
        api.clearCookies()
        showSetupScreen()
    }

    private fun updateStatus(message: String) {
        runOnUiThread {
            statusText?.text = message
        }
    }

    private fun field(hintText: String): EditText {
        return EditText(this).apply {
            hint = hintText
            setSingleLine(true)
            textSize = 16f
            setTextColor(Color.WHITE)
            setHintTextColor(color("#6F7B8D"))
            setPadding(dp(12), 0, dp(12), 0)
            minHeight = dp(50)
            background = rounded(color("#0F131B"), color("#30394A"), dp(1))
        }
    }

    @SuppressLint("SetTextI18n")
    private fun primaryButton(label: String): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 15f
            setTextColor(Color.WHITE)
            minHeight = dp(50)
            background = rounded(color("#0E9F6E"), color("#0E9F6E"), 0)
        }
    }

    private fun secondaryButton(label: String): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 14f
            setTextColor(Color.WHITE)
            minHeight = dp(46)
            background = rounded(color("#222A36"), color("#344052"), dp(1))
        }
    }

    private fun space(width: Int, height: Int): View {
        return View(this).apply {
            layoutParams = LinearLayout.LayoutParams(width, height)
        }
    }

    private fun matchWrap(top: Int = 0, bottom: Int = 0): LinearLayout.LayoutParams {
        return LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        ).apply {
            topMargin = dp(top)
            bottomMargin = dp(bottom)
        }
    }

    private fun rowButtonWeight(): LinearLayout.LayoutParams {
        return LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
    }

    private fun rounded(fill: Int, stroke: Int, strokeWidth: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(8).toFloat()
            setColor(fill)
            if (strokeWidth > 0) setStroke(strokeWidth, stroke)
        }
    }

    private fun color(hex: String): Int = Color.parseColor(hex)

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()
    }

    private fun formatMoney(value: Double): String {
        return moneyFormat.format(value)
    }

    private fun normalizeBaseUrl(value: String): String {
        val trimmed = value.trim().trimEnd('/')
        if (trimmed.isBlank()) return ""
        return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "http://$trimmed"
    }

    private data class PaymentGroup(
        val title: String,
        val subtitle: String,
        val detail: String,
        val total: Double,
        val orderIds: List<String>,
        val tableNumber: Int?,
    )
}
