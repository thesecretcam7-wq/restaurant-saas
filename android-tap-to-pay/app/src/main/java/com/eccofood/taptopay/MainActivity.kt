package com.eccofood.taptopay

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Editable
import android.text.InputType
import android.text.TextUtils
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.widget.Button
import android.widget.EditText
import android.widget.HorizontalScrollView
import android.widget.ImageButton
import android.widget.ImageView
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
import java.net.URL
import kotlin.concurrent.thread
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {
    private lateinit var api: EccofoodApi
    private lateinit var controller: TapToPayController
    private val prefs by lazy { getSharedPreferences("eccofood_native_tap_to_pay", MODE_PRIVATE) }

    private var statusText: TextView? = null
    private var cartContainer: LinearLayout? = null
    private var productsContainer: LinearLayout? = null
    private var activePayButton: Button? = null

    private var currentTenantId: String = ""
    private var currentTenantSlug: String = ""
    private var currentCountry: String = "CO"
    private var currentTaxRate: Double = 0.0
    private var currentTenantName: String = ""
    private var currentLogoUrl: String = ""
    private var currentTheme = BrandTheme()
    private var selectedStaffName = "Comandero Android"

    private var categories: List<MenuCategory> = emptyList()
    private var products: List<MenuProduct> = emptyList()
    private var tables: List<RestaurantTable> = emptyList()
    private var cart: MutableList<CartLine> = mutableListOf()
    private var tableOrders: List<TableOrder> = emptyList()

    private var selectedCategoryId: String? = null
    private var selectedTableNumber: Int? = null
    private var accountTableNumber: Int? = null
    private var loadedAccountTable: Int? = null
    private var searchText: String = ""
    private var searchOpen = false
    private var loadingCommandData = false
    private var loadingAccount = false
    private var sendingOrder = false
    private var paymentInProgress = false
    private var screenMode = ScreenMode.ORDERING

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
            loadSavedTenant()
            showOrderingScreen()
            loadCommandData()
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

    private fun loadSavedTenant() {
        val baseUrl = prefs.getString("base_url", BuildConfig.ECCOFOOD_BASE_URL) ?: BuildConfig.ECCOFOOD_BASE_URL
        currentTenantId = prefs.getString("tenant_id", "") ?: ""
        currentTenantSlug = prefs.getString("tenant_slug", currentTenantId) ?: currentTenantId
        currentTenantName = prefs.getString("tenant_name", currentTenantSlug) ?: currentTenantSlug
        currentLogoUrl = prefs.getString("tenant_logo_url", "") ?: ""
        api.setBaseUrl(baseUrl)
    }

    private fun showSetupScreen(message: String? = null) {
        statusText = null
        cartContainer = null
        productsContainer = null

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(18), dp(24), dp(18), dp(24))
            setBackgroundColor(color("#0B0E14"))
        }

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(20), dp(18), dp(20))
            background = rounded(color("#151A23"), color("#2A3241"), dp(1), dp(8))
        }

        val title = TextView(this).apply {
            text = "Eccofood Comandero"
            textSize = 25f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
        }

        val detail = TextView(this).apply {
            text = message ?: "Entra con la cuenta del restaurante para cargar mesas, productos y cobrar con Tap to Pay."
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

                currentTenantId = session.tenantId
                currentTenantSlug = session.tenantSlug
                runOnUiThread {
                    showOrderingScreen()
                    loadCommandData()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    Toast.makeText(this, error.message ?: "No se pudo entrar.", Toast.LENGTH_LONG).show()
                    button.isEnabled = true
                    button.text = "Entrar"
                }
            }
        }
    }

    private fun showOrderingScreen() {
        screenMode = ScreenMode.ORDERING
        statusText = null
        productsContainer = null

        val root = baseRoot(
            title = "Comandero",
            actions = listOf(
                HeaderAction(if (searchOpen) "Cerrar busqueda" else "Buscar producto", R.drawable.ic_search_24) {
                    searchOpen = !searchOpen
                    if (!searchOpen) {
                        searchText = ""
                        if (selectedCategoryId == null && categories.isNotEmpty()) {
                            selectedCategoryId = categories.first().id
                        }
                    }
                    showOrderingScreen()
                },
                HeaderAction("Ver cuenta", R.drawable.ic_receipt_24) { openAccountForSelectedTable() },
            )
        )

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(8), dp(8), dp(8), dp(10))
        }

        val selectorPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(8), dp(8), dp(8), dp(8))
            setBackgroundColor(uiSurface())
        }

        selectorPanel.addView(categorySelector(), matchWrap(bottom = if (searchOpen) 10 else 2))

        if (searchOpen) {
            val searchInput = field("Buscar producto").apply {
                setText(searchText)
                addTextChangedListener(object : TextWatcher {
                    override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
                    override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                        searchText = s?.toString().orEmpty()
                        if (searchText.isNotBlank()) selectedCategoryId = null
                        renderProducts()
                    }
                    override fun afterTextChanged(s: Editable?) = Unit
                })
            }
            selectorPanel.addView(searchInput, matchWrap(bottom = 2))
        }

        content.addView(selectorPanel, matchWrap(bottom = 8))

        productsContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        content.addView(productsContainer, matchWrap())
        renderProducts()

        root.addView(ScrollView(this).apply { addView(content) }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        cartContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(cartContainer, matchWrap())
        setContentView(root)
        renderCart()
    }

    private fun showAccountScreen() {
        screenMode = ScreenMode.ACCOUNT
        statusText = null
        productsContainer = null
        cartContainer = null

        val root = baseRoot(
            title = "Cuenta de mesa",
            actions = listOf(
                HeaderAction("Volver al pedido", R.drawable.ic_cart_24) { showOrderingScreen() },
                HeaderAction("Actualizar", android.R.drawable.ic_popup_sync) { accountTableNumber?.let { loadTableAccount(it, force = true) } },
            )
        )

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(18))
        }

        content.addView(sectionTitle("Mesa para cobrar"))
        content.addView(tableSelector { tableNumber ->
            accountTableNumber = tableNumber
            loadedAccountTable = null
            tableOrders = emptyList()
            showAccountScreen()
        }, matchWrap(bottom = 12))

        val selectedAccountTable = accountTableNumber
        if (selectedAccountTable == null) {
            content.addView(emptyMessage("Elige una mesa para ver la cuenta abierta."))
        } else if (loadingAccount) {
            content.addView(emptyMessage("Cargando cuenta de Mesa $selectedAccountTable..."))
        } else if (tableOrders.isEmpty()) {
            content.addView(emptyMessage("Mesa $selectedAccountTable no tiene pedidos abiertos."))
        } else {
            content.addView(accountOrdersView(selectedAccountTable), matchWrap())
        }

        root.addView(ScrollView(this).apply { addView(content) }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))
        setContentView(root)

        if (selectedAccountTable != null && loadedAccountTable != selectedAccountTable && !loadingAccount) {
            loadTableAccount(selectedAccountTable)
        }
    }

    private fun baseRoot(title: String, actions: List<HeaderAction>): LinearLayout {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, 0)
            setBackgroundColor(uiBackground())
            addView(header(title, actions), matchWrap())
            statusText = TextView(this@MainActivity).apply {
                text = if (loadingCommandData) "Cargando comandero..." else "Listo"
                textSize = 12f
                setTextColor(uiMuted())
                setPadding(dp(12), dp(6), dp(12), dp(4))
                visibility = if (loadingCommandData || loadingAccount || sendingOrder || paymentInProgress) View.VISIBLE else View.GONE
            }
            addView(statusText, matchWrap())
        }
    }

    private fun header(title: String, actions: List<HeaderAction>): View {
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(12), dp(12), dp(10))
            setBackgroundColor(if (currentTheme.isLightTheme) Color.WHITE else uiSecondary())
        }

        val brandRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, 0, 0, dp(8))
        }

        val logoView = ImageView(this).apply {
            setBackgroundColor(if (currentTheme.isLightTheme) uiSoft() else Color.WHITE)
            scaleType = ImageView.ScaleType.CENTER_INSIDE
            setPadding(dp(4), dp(4), dp(4), dp(4))
            background = rounded(if (currentTheme.isLightTheme) uiSoft() else Color.WHITE, uiBorder(), dp(1), dp(12))
        }
        loadLogoInto(logoView, currentLogoUrl)

        val titleBlock = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), 0, 0, 0)
        }

        titleBlock.addView(TextView(this).apply {
            text = "Comandero"
            textSize = 20f
            setTextColor(if (currentTheme.isLightTheme) uiText() else readableText(uiSecondary()))
            setTypeface(typeface, Typeface.BOLD)
        })
        titleBlock.addView(TextView(this).apply {
            text = currentTenantName.ifBlank { currentTenantSlug }
            textSize = 13f
            setTextColor(if (currentTheme.isLightTheme) uiMuted() else uiMuted())
            setPadding(0, dp(2), 0, 0)
        })
        if (title != "Comandero") {
            titleBlock.addView(TextView(this).apply {
                text = title
                textSize = 12f
                setTextColor(uiPrimary())
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(2), 0, 0)
            })
        }

        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }

        actions.forEachIndexed { index, action ->
            if (index > 0) actionRow.addView(space(dp(6), 1))
            actionRow.addView(iconButton(action), LinearLayout.LayoutParams(dp(44), dp(44)))
        }
        if (screenMode == ScreenMode.ORDERING) {
            if (actions.isNotEmpty()) actionRow.addView(space(dp(6), 1))
            actionRow.addView(languageChip(), LinearLayout.LayoutParams(dp(84), dp(44)))
            actionRow.addView(space(dp(8), 1))
            actionRow.addView(cartHeaderButton(), LinearLayout.LayoutParams(dp(44), dp(44)))
        }

        brandRow.addView(logoView, LinearLayout.LayoutParams(dp(52), dp(52)))
        brandRow.addView(titleBlock, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        brandRow.addView(actionRow, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        header.addView(brandRow)
        return header
    }

    private fun tableSelector(onSelect: (Int) -> Unit): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(2), 0, dp(2))
        }

        if (tables.isEmpty()) {
            row.addView(emptyMessage("No hay mesas configuradas."), matchWrap())
        } else {
            tables.forEach { table ->
                val active = if (screenMode == ScreenMode.ACCOUNT) {
                    accountTableNumber == table.tableNumber
                } else {
                    selectedTableNumber == table.tableNumber
                }
                row.addView(tableButton(table.tableNumber.toString(), active) {
                    onSelect(table.tableNumber)
                }, LinearLayout.LayoutParams(dp(58), dp(44)).apply {
                    rightMargin = dp(8)
                })
            }
        }

        return HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            addView(row)
        }
    }

    private fun categorySelector(): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, dp(2), 0, dp(2))
        }

        categories.forEach { category ->
            row.addView(tableButton(category.name, selectedCategoryId == category.id) {
                selectedCategoryId = category.id
                showOrderingScreen()
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(40)).apply {
                rightMargin = dp(8)
            })
        }

        return HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            addView(row)
        }
    }

    private fun renderProducts() {
        val container = productsContainer ?: return
        container.removeAllViews()

        if (loadingCommandData) {
            container.addView(emptyMessage("Cargando productos..."))
            return
        }

        val term = searchText.trim().lowercase()
        val visibleProducts = products.filter { product ->
            (selectedCategoryId == null || product.categoryId == selectedCategoryId) &&
                (term.isBlank() || product.name.lowercase().contains(term))
        }

        if (visibleProducts.isEmpty()) {
            container.addView(emptyMessage("No hay productos para mostrar."))
            return
        }

        visibleProducts.chunked(2).forEach { rowProducts ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
            }
            rowProducts.forEachIndexed { index, product ->
                row.addView(productCard(product), LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply {
                    leftMargin = if (index == 0) 0 else dp(4)
                    rightMargin = if (index == 0) dp(4) else 0
                    bottomMargin = dp(8)
                })
            }
            if (rowProducts.size == 1) {
                row.addView(space(1, 1), LinearLayout.LayoutParams(0, 1, 1f).apply {
                    leftMargin = dp(4)
                })
            }
            container.addView(row, matchWrap())
        }
    }

    private fun productCard(product: MenuProduct): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            minimumHeight = dp(212)
            setPadding(0, 0, 0, dp(8))
            background = rounded(uiSurface(), uiBorder(), dp(1), dp(14))
        }

        val imageView = ImageView(this).apply {
            scaleType = ImageView.ScaleType.CENTER_CROP
            setBackgroundColor(uiSoft())
        }
        loadLogoInto(imageView, product.imageUrl)
        card.addView(imageView, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(96)))

        val info = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(9), dp(8), dp(9), 0)
        }
        info.addView(TextView(this).apply {
            text = product.name
            textSize = 13f
            setTextColor(uiText())
            setTypeface(typeface, Typeface.BOLD)
            maxLines = 2
            ellipsize = TextUtils.TruncateAt.END
        })
        if (product.description.isNotBlank()) {
            info.addView(TextView(this).apply {
                text = product.description
                textSize = 11f
                setTextColor(uiMuted())
                setPadding(0, dp(2), 0, 0)
                maxLines = 1
                ellipsize = TextUtils.TruncateAt.END
            })
        }
        info.addView(TextView(this).apply {
            text = formatMoney(product.price)
            textSize = 14f
            setTextColor(uiAccent())
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(4), 0, 0)
        })
        card.addView(info, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))

        val qty = cart.find { it.productId == product.id }?.quantity ?: 0
        val controls = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(8), dp(8), dp(8), 0)
        }

        if (qty > 0) {
            controls.addView(squareButton("-", primary = false) { changeCartQty(product.id, -1) }, LinearLayout.LayoutParams(dp(38), dp(38)))
            controls.addView(TextView(this).apply {
                text = qty.toString()
                textSize = 16f
                gravity = Gravity.CENTER
                setTextColor(uiText())
                setTypeface(typeface, Typeface.BOLD)
            }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            controls.addView(squareButton("+", primary = true) { addToCart(product) }, LinearLayout.LayoutParams(dp(38), dp(38)))
        } else {
            controls.addView(primaryButton("+ Agregar").apply {
                minHeight = dp(40)
                textSize = 13f
                setOnClickListener { addToCart(product) }
            }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40)))
        }

        card.addView(controls, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        return card
    }

    private fun renderCart() {
        val container = cartContainer ?: return
        container.removeAllViews()
        if (cart.isEmpty()) {
            container.visibility = View.GONE
            return
        }
        container.visibility = View.VISIBLE

        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(12))
            background = rounded(uiSurface(), uiBorder(), dp(1), dp(18))
        }

        val table = selectedTableNumber
        val subtotal = cartSubtotal()
        val tax = cartTax()
        val total = subtotal + tax
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val titleBlock = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        titleBlock.addView(TextView(this).apply {
            text = "Pedido actual"
            textSize = 11f
            setTextColor(uiPrimary())
            setTypeface(typeface, Typeface.BOLD)
        })
        titleBlock.addView(TextView(this).apply {
            text = if (table != null) "Mesa $table" else "Selecciona una mesa"
            textSize = 18f
            setTextColor(uiText())
            setTypeface(typeface, Typeface.BOLD)
        })
        headerRow.addView(titleBlock, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        headerRow.addView(TextView(this).apply {
            text = "${cart.sumOf { it.quantity }} productos"
            textSize = 12f
            setTextColor(uiMuted())
            setTypeface(typeface, Typeface.BOLD)
            setPadding(dp(10), dp(6), dp(10), dp(6))
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(16))
        })
        panel.addView(headerRow)

        panel.addView(sectionTitle("Mesas"), matchWrap(top = 8))
        panel.addView(tableSelector { tableNumber ->
            selectedTableNumber = tableNumber
            renderCart()
        }, matchWrap(bottom = 6))

        panel.addView(secondaryButton("Limpiar pedido").apply {
            setOnClickListener {
                cart.clear()
                renderCart()
                renderProducts()
            }
        }, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(42)).apply {
            topMargin = dp(10)
            bottomMargin = dp(4)
        })
        cart.forEach { line ->
            panel.addView(cartLineView(line), matchWrap(top = 8))
        }
        val summary = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(8), dp(10), dp(8))
            background = rounded(uiSoft(), uiBorder(), dp(1), dp(12))
        }
        summary.addView(totalRow("Subtotal", subtotal))
        summary.addView(totalRow("Impuesto ${if (currentTaxRate > 0) "${currentTaxRate.toInt()}%" else "0%"}", tax))
        summary.addView(totalRow("Total", total))
        panel.addView(summary, matchWrap(top = 10, bottom = 8))

        panel.addView(primaryButton(if (sendingOrder) "Enviando..." else "Enviar a cocina").apply {
            isEnabled = cart.isNotEmpty() && table != null && !sendingOrder
            setOnClickListener { sendOrderToTable() }
        }, matchWrap(top = 8))
        if (table == null && cart.isNotEmpty()) {
            panel.addView(TextView(this).apply {
                text = "Selecciona una mesa para enviar."
                textSize = 12f
                gravity = Gravity.CENTER
                setTextColor(uiPrimary())
                setTypeface(typeface, Typeface.BOLD)
                setPadding(0, dp(6), 0, 0)
            })
        }
        container.addView(panel, matchWrap())
    }

    private fun cartLineView(line: CartLine): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(10), dp(8), dp(10), dp(8))
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(12))
        }
        val label = TextView(this).apply {
            text = "${line.quantity} x ${line.name}\n${formatMoney(line.price * line.quantity)}"
            textSize = 13f
            setTextColor(uiText())
            setTypeface(typeface, Typeface.BOLD)
        }
        row.addView(label, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(squareButton("-", primary = false) { changeCartQty(line.productId, -1) }, LinearLayout.LayoutParams(dp(42), dp(38)))
        row.addView(space(dp(6), 1))
        row.addView(squareButton("+", primary = true) { changeCartQty(line.productId, 1) }, LinearLayout.LayoutParams(dp(42), dp(38)))
        return row
    }

    private fun accountOrdersView(tableNumber: Int): View {
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = rounded(uiSurface(), uiBorder(), dp(1), dp(18))
        }

        panel.addView(TextView(this).apply {
            text = "Cuenta completa"
            textSize = 12f
            setTextColor(uiPrimary())
            setTypeface(typeface, Typeface.BOLD)
        })
        panel.addView(TextView(this).apply {
            text = "Mesa $tableNumber"
            textSize = 22f
            setTextColor(uiText())
            setTypeface(typeface, Typeface.BOLD)
        })

        tableOrders.forEach { order ->
            panel.addView(orderView(order), matchWrap(top = 10))
        }

        panel.addView(totalRow("Total a cobrar", tableOrders.sumOf { it.total }), matchWrap(top = 14, bottom = 10))
        panel.addView(primaryButton(if (paymentInProgress) "Cobrando..." else "Cobrar mesa completa").apply {
            isEnabled = !paymentInProgress && tableOrders.isNotEmpty()
            setOnClickListener { payOpenTable(this) }
        }, matchWrap())
        return panel
    }

    private fun orderView(order: TableOrder): View {
        val panel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(10), dp(10), dp(10), dp(10))
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(12))
        }
        panel.addView(TextView(this).apply {
            text = order.orderNumber
            textSize = 14f
            setTextColor(uiText())
            setTypeface(typeface, Typeface.BOLD)
        })
        order.items.forEach { item ->
            panel.addView(TextView(this).apply {
                text = "${item.quantity} x ${item.name}  ${formatMoney(item.price * item.quantity)}"
                textSize = 13f
                setTextColor(uiMuted())
                setPadding(0, dp(4), 0, 0)
            })
        }
        panel.addView(TextView(this).apply {
            text = formatMoney(order.total)
            textSize = 14f
            setTextColor(uiAccent())
            gravity = Gravity.END
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(8), 0, 0)
        })
        return panel
    }

    private fun loadCommandData() {
        if (loadingCommandData || currentTenantId.isBlank()) return
        loadingCommandData = true
        updateStatus("Cargando comandero...")

        thread {
            try {
                val bootstrap = api.posBootstrap(currentTenantId)
                runOnUiThread {
                    currentCountry = bootstrap.country
                    currentTaxRate = bootstrap.taxRate
                    currentTenantName = bootstrap.tenantName.ifBlank { currentTenantSlug }
                    currentLogoUrl = bootstrap.logoUrl
                    currentTheme = bootstrap.branding
                    prefs.edit()
                        .putString("tenant_name", currentTenantName)
                        .putString("tenant_logo_url", currentLogoUrl)
                        .apply()
                    categories = bootstrap.categories
                    products = bootstrap.products
                    tables = bootstrap.tables.ifEmpty { defaultTables() }
                    if (categories.isEmpty()) {
                        selectedCategoryId = null
                    } else if (selectedCategoryId == null || categories.none { it.id == selectedCategoryId }) {
                        selectedCategoryId = categories.first().id
                    }
                    if (selectedTableNumber == null && tables.isNotEmpty()) {
                        selectedTableNumber = tables.first().tableNumber
                    }
                    loadingCommandData = false
                    if (screenMode == ScreenMode.ORDERING) showOrderingScreen() else showAccountScreen()
                    updateStatus("Listo")
                }
            } catch (error: Exception) {
                runOnUiThread {
                    loadingCommandData = false
                    val message = error.message ?: "No se pudo cargar el comandero."
                    updateStatus(message)
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun loadTableAccount(tableNumber: Int, force: Boolean = false) {
        if (loadingAccount) return
        if (!force && loadedAccountTable == tableNumber) return
        loadingAccount = true
        loadedAccountTable = tableNumber
        updateStatus("Cargando cuenta...")

        thread {
            try {
                val orders = api.tableAccount(currentTenantId, tableNumber)
                runOnUiThread {
                    tableOrders = orders
                    loadingAccount = false
                    if (screenMode == ScreenMode.ACCOUNT) showAccountScreen()
                    updateStatus("Cuenta actualizada")
                }
            } catch (error: Exception) {
                runOnUiThread {
                    tableOrders = emptyList()
                    loadingAccount = false
                    val message = error.message ?: "No se pudo cargar la cuenta."
                    updateStatus(message)
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                    if (screenMode == ScreenMode.ACCOUNT) showAccountScreen()
                }
            }
        }
    }

    private fun sendOrderToTable() {
        val tableNumber = selectedTableNumber
        if (tableNumber == null || cart.isEmpty() || sendingOrder) return

        sendingOrder = true
        renderCart()
        updateStatus("Enviando comanda...")

        val items = JSONArray()
        cart.forEach { line ->
            items.put(
                JSONObject()
                    .put("menu_item_id", line.productId)
                    .put("name", line.name)
                    .put("price", line.price)
                    .put("qty", line.quantity)
                    .put("notes", JSONObject.NULL)
            )
        }

        thread {
            try {
                val csrf = api.csrfToken()
                api.createDineInOrder(
                    tenantId = currentTenantId,
                    tenantSlug = currentTenantSlug,
                    tableNumber = tableNumber,
                    waiterName = selectedStaffName,
                    items = items,
                    csrfToken = csrf,
                )
                runOnUiThread {
                    cart.clear()
                    sendingOrder = false
                    accountTableNumber = tableNumber
                    loadedAccountTable = null
                    tableOrders = emptyList()
                    updateStatus("Comanda enviada a Mesa $tableNumber")
                    Toast.makeText(this, "Comanda enviada a Mesa $tableNumber", Toast.LENGTH_LONG).show()
                    showOrderingScreen()
                }
            } catch (error: Exception) {
                runOnUiThread {
                    sendingOrder = false
                    renderCart()
                    val message = error.message ?: "No se pudo enviar la comanda."
                    updateStatus(message)
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun payOpenTable(button: Button) {
        val tableNumber = accountTableNumber ?: return
        if (tableOrders.isEmpty() || paymentInProgress) return

        paymentInProgress = true
        activePayButton = button
        button.isEnabled = false
        button.text = "Cobrando..."
        updateStatus("Preparando Tap to Pay...")

        val payload = JSONObject()
            .put("tenantId", currentTenantId)
            .put("orderIds", JSONArray(tableOrders.map { it.id }))
            .put("tableNumber", tableNumber)
        controller.payTable(payload)
    }

    private fun handlePaymentResult(success: Boolean, error: String?) {
        runOnUiThread {
            paymentInProgress = false
            activePayButton?.isEnabled = true
            activePayButton?.text = "Cobrar mesa completa"
            activePayButton = null

            if (success) {
                Toast.makeText(this, "Mesa pagada", Toast.LENGTH_LONG).show()
                val table = accountTableNumber
                loadedAccountTable = null
                tableOrders = emptyList()
                if (table != null) loadTableAccount(table, force = true)
            } else {
                val message = error ?: "No se pudo completar el pago."
                updateStatus(message)
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                if (screenMode == ScreenMode.ACCOUNT) showAccountScreen()
            }
        }
    }

    private fun openAccountForSelectedTable() {
        accountTableNumber = selectedTableNumber ?: tables.firstOrNull()?.tableNumber
        loadedAccountTable = null
        tableOrders = emptyList()
        showAccountScreen()
    }

    private fun addToCart(product: MenuProduct) {
        val existing = cart.find { it.productId == product.id }
        if (existing != null) {
            existing.quantity += 1
        } else {
            cart.add(CartLine(product.id, product.name, product.price, 1))
        }
        renderCart()
        renderProducts()
    }

    private fun changeCartQty(productId: String, delta: Int) {
        val line = cart.find { it.productId == productId } ?: return
        line.quantity += delta
        if (line.quantity <= 0) cart.remove(line)
        renderCart()
        renderProducts()
    }

    private fun cartSubtotal(): Double {
        return cart.sumOf { it.price * it.quantity }
    }

    private fun cartTax(): Double {
        val subtotal = cartSubtotal()
        return if (currentTaxRate > 0) subtotal * (currentTaxRate / 100.0) else 0.0
    }

    private fun clearAccess() {
        prefs.edit().clear().apply()
        api.clearCookies()
        categories = emptyList()
        products = emptyList()
        tables = emptyList()
        cart.clear()
        tableOrders = emptyList()
        selectedCategoryId = null
        selectedTableNumber = null
        accountTableNumber = null
        loadedAccountTable = null
        searchText = ""
        searchOpen = false
        showSetupScreen()
    }

    private fun updateStatus(message: String) {
        runOnUiThread {
            statusText?.text = message
            statusText?.visibility = if (message == "Listo") View.GONE else View.VISIBLE
        }
    }

    private fun sectionTitle(textValue: String): TextView {
        return TextView(this).apply {
            text = textValue
            textSize = 12f
            setTextColor(uiMuted())
            setTypeface(typeface, Typeface.BOLD)
            setPadding(0, dp(6), 0, dp(6))
        }
    }

    private fun emptyMessage(textValue: String): TextView {
        return TextView(this).apply {
            text = textValue
            textSize = 14f
            setTextColor(uiMuted())
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(18), dp(12), dp(18))
        }
    }

    private fun totalRow(label: String, amount: Double): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(4), 0, dp(4))
        }
        row.addView(TextView(this).apply {
            text = label
            textSize = 14f
            setTextColor(uiText())
            setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
        row.addView(TextView(this).apply {
            text = formatMoney(amount)
            textSize = if (label == "Total" || label == "Total a cobrar") 20f else 14f
            setTextColor(if (label == "Total" || label == "Total a cobrar") uiPrimary() else uiAccent())
            setTypeface(typeface, Typeface.BOLD)
        })
        return row
    }

    private fun field(hintText: String): EditText {
        return EditText(this).apply {
            hint = hintText
            setSingleLine(true)
            textSize = 16f
            setTextColor(uiText())
            setHintTextColor(uiMuted())
            setPadding(dp(12), 0, dp(12), 0)
            minHeight = dp(50)
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(12))
        }
    }

    @SuppressLint("SetTextI18n")
    private fun primaryButton(label: String): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 15f
            setTextColor(readableText(uiButton()))
            minHeight = dp(50)
            background = rounded(uiButton(), uiButton(), 0, dp(14))
        }
    }

    private fun secondaryButton(label: String): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 13f
            setTextColor(uiText())
            minHeight = dp(44)
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(12))
        }
    }

    private fun squareButton(label: String, primary: Boolean, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(if (primary) readableText(uiButton()) else uiText())
            minHeight = 0
            minWidth = 0
            background = if (primary) {
                rounded(uiButton(), uiButton(), 0, dp(12))
            } else {
                rounded(uiSubtle(), uiBorder(), dp(1), dp(12))
            }
            setOnClickListener { onClick() }
        }
    }

    private fun tableButton(label: String, active: Boolean, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            isAllCaps = false
            textSize = 13f
            setTextColor(if (active) readableText(uiPrimary()) else uiMuted())
            background = if (active) {
                rounded(uiPrimary(), uiPrimary(), 0, dp(18))
            } else {
                rounded(uiSurface(), uiBorder(), dp(1), dp(18))
            }
            setOnClickListener { onClick() }
        }
    }

    private fun iconButton(action: HeaderAction): ImageButton {
        return ImageButton(this).apply {
            contentDescription = action.label
            setImageResource(action.iconRes)
            scaleType = ImageView.ScaleType.CENTER
            setColorFilter(if (currentTheme.isLightTheme) uiText() else readableText(uiSecondary()))
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(12))
            setPadding(dp(11), dp(11), dp(11), dp(11))
            setOnClickListener { action.onClick() }
        }
    }

    private fun languageChip(): Button {
        return Button(this).apply {
            text = "ES v"
            isAllCaps = false
            textSize = 13f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(if (currentTheme.isLightTheme) uiText() else readableText(uiSecondary()))
            minHeight = 0
            minWidth = 0
            background = rounded(uiSubtle(), uiBorder(), dp(1), dp(18))
        }
    }

    private fun cartHeaderButton(): ImageButton {
        return ImageButton(this).apply {
            contentDescription = "Pedido actual"
            setImageResource(R.drawable.ic_cart_24)
            scaleType = ImageView.ScaleType.CENTER
            setColorFilter(readableText(uiButton()))
            background = rounded(uiButton(), uiButton(), 0, dp(12))
            setPadding(dp(10), dp(10), dp(10), dp(10))
            setOnClickListener {
                if (cart.isEmpty()) {
                    Toast.makeText(this@MainActivity, "Agrega productos para ver el pedido.", Toast.LENGTH_SHORT).show()
                } else {
                    renderCart()
                }
            }
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

    private fun rounded(fill: Int, stroke: Int, strokeWidth: Int, radius: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = radius.toFloat()
            setColor(fill)
            if (strokeWidth > 0) setStroke(strokeWidth, stroke)
        }
    }

    private fun color(hex: String): Int = Color.parseColor(hex)

    private fun uiBackground(): Int = themeColor(currentTheme.backgroundColor, "#0B0E14")
    private fun uiSurface(): Int = themeColor(currentTheme.surfaceColor, "#1A1F2C")
    private fun uiSecondary(): Int = themeColor(currentTheme.secondaryColor, "#111827")
    private fun uiPrimary(): Int = themeColor(currentTheme.primaryColor, "#D4AF37")
    private fun uiAccent(): Int = themeColor(currentTheme.accentColor, "#D35A37")
    private fun uiButton(): Int = themeColor(currentTheme.buttonPrimaryColor, "#D35A37")
    private fun uiText(): Int = themeColor(currentTheme.textPrimaryColor, "#FFFFFF")
    private fun uiMuted(): Int = themeColor(currentTheme.textSecondaryColor, "#8B97A8")
    private fun uiBorder(): Int = themeColor(currentTheme.borderColor, "#2A3241")
    private fun uiSoft(): Int = if (currentTheme.isLightTheme) color("#FFF3E8") else withAlpha(uiPrimary(), 26)
    private fun uiSubtle(): Int = if (currentTheme.isLightTheme) color("#F8FAFC") else withAlpha(Color.WHITE, 18)

    private fun themeColor(value: String?, fallback: String): Int {
        val trimmed = value?.trim().orEmpty()
        if (trimmed.startsWith("rgba", ignoreCase = true)) {
            val numbers = Regex("""[\d.]+""").findAll(trimmed).map { it.value.toDouble() }.toList()
            if (numbers.size >= 4) {
                return Color.argb(
                    (numbers[3].coerceIn(0.0, 1.0) * 255).roundToInt(),
                    numbers[0].roundToInt().coerceIn(0, 255),
                    numbers[1].roundToInt().coerceIn(0, 255),
                    numbers[2].roundToInt().coerceIn(0, 255)
                )
            }
        }
        if (trimmed.startsWith("#") && trimmed.length == 9) {
            val rgb = trimmed.substring(1, 7)
            val alpha = trimmed.substring(7, 9)
            return Color.parseColor("#$alpha$rgb")
        }
        return try {
            Color.parseColor(trimmed.ifBlank { fallback })
        } catch (_: Exception) {
            Color.parseColor(fallback)
        }
    }

    private fun withAlpha(base: Int, alpha: Int): Int {
        return Color.argb(alpha.coerceIn(0, 255), Color.red(base), Color.green(base), Color.blue(base))
    }

    private fun readableText(background: Int): Int {
        val luminance = (0.299 * Color.red(background) + 0.587 * Color.green(background) + 0.114 * Color.blue(background)) / 255.0
        return if (luminance < 0.55) Color.WHITE else color("#15130F")
    }

    private fun dp(value: Int): Int {
        return TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()
    }

    private fun formatMoney(value: Double): String {
        val country = currentCountry.uppercase(Locale.ROOT)
        val locale = when (country) {
            "US" -> Locale.US
            "ES" -> Locale("es", "ES")
            "CO" -> Locale("es", "CO")
            else -> Locale("es", country)
        }
        val fractionDigits = if (country in setOf("CO", "CL", "JPY", "KRW", "VND", "PYG")) 0 else 2
        return NumberFormat.getCurrencyInstance(locale).apply {
            minimumFractionDigits = fractionDigits
            maximumFractionDigits = fractionDigits
        }.format(value)
    }

    private fun normalizeBaseUrl(value: String): String {
        val trimmed = value.trim().trimEnd('/')
        if (trimmed.isBlank()) return ""
        return if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "http://$trimmed"
    }

    private fun loadLogoInto(imageView: ImageView, rawUrl: String) {
        val resolvedUrl = resolveLogoUrl(rawUrl)
        if (resolvedUrl.isBlank()) {
            imageView.setImageDrawable(null)
            return
        }

        thread {
            try {
                val bitmap = URL(resolvedUrl).openStream().use { BitmapFactory.decodeStream(it) }
                runOnUiThread { imageView.setImageBitmap(bitmap) }
            } catch (_: Exception) {
                runOnUiThread { imageView.setImageDrawable(null) }
            }
        }
    }

    private fun resolveLogoUrl(rawUrl: String): String {
        val trimmed = rawUrl.trim()
        if (trimmed.isBlank()) return ""
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
        return "${api.getBaseUrl().trimEnd('/')}/${trimmed.trimStart('/')}"
    }

    private fun defaultTables(): List<RestaurantTable> {
        return (1..5).map { tableNumber ->
            RestaurantTable(
                id = "default-$tableNumber",
                tableNumber = tableNumber,
                seats = 4,
                location = "",
            )
        }
    }

    private enum class ScreenMode {
        ORDERING,
        ACCOUNT,
    }

    private data class CartLine(
        val productId: String,
        val name: String,
        val price: Double,
        var quantity: Int,
    )

    private data class HeaderAction(
        val label: String,
        val iconRes: Int,
        val onClick: () -> Unit,
    )
}
