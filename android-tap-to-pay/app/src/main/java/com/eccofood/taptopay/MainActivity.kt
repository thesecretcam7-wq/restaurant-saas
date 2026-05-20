package com.eccofood.taptopay

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var controller: TapToPayController
    private val prefs by lazy { getSharedPreferences("eccofood_waiter_tap_to_pay", MODE_PRIVATE) }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locationGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!locationGranted) {
            Toast.makeText(this, getString(R.string.location_permission_message), Toast.LENGTH_LONG).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestTerminalPermissions()

        webView = WebView(this)
        setContentView(webView)

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        val api = EccofoodApi(BuildConfig.ECCOFOOD_BASE_URL)
        controller = TapToPayController(
            activity = this,
            api = api,
            onStatus = { message -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show() },
            onResult = { success, error -> dispatchTapToPayResult(success, error) }
        )

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                dispatchAndroidReady()
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                super.onReceivedError(view, request, error)
                if (request.isForMainFrame) {
                    showSetupScreen("No se pudo abrir el servidor. Revisa la IP y que el computador este encendido.")
                }
            }
        }
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(AndroidTapToPayBridge(controller), "EccofoodAndroidTapToPay")
        loadSavedWaiterAccess()
    }

    override fun onResume() {
        super.onResume()
        webView.postDelayed({ dispatchAndroidReady() }, 700)
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

    private fun loadSavedWaiterAccess() {
        val savedBaseUrl = prefs.getString("base_url", "") ?: ""
        val savedRestaurant = prefs.getString("restaurant", "") ?: ""
        if (savedBaseUrl.isBlank() || savedRestaurant.isBlank()) {
            showSetupScreen()
            return
        }

        setContentView(webView)
        webView.loadUrl(waiterLoginUrl(savedBaseUrl, savedRestaurant))
    }

    private fun showSetupScreen(message: String? = null) {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(42, 42, 42, 42)
            setBackgroundColor(Color.rgb(11, 14, 20))
        }

        val title = TextView(this).apply {
            text = "Eccofood Camarero"
            textSize = 27f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setTypeface(typeface, Typeface.BOLD)
        }

        val detail = TextView(this).apply {
            text = message ?: "Configura el restaurante para abrir el comandero y cobrar mesas con Tap to Pay."
            textSize = 15f
            setTextColor(Color.rgb(139, 151, 168))
            gravity = Gravity.CENTER
            setPadding(0, 18, 0, 28)
        }

        val serverInput = EditText(this).apply {
            hint = "http://192.168.0.13:3000"
            setText(prefs.getString("base_url", BuildConfig.ECCOFOOD_BASE_URL) ?: BuildConfig.ECCOFOOD_BASE_URL)
            setSingleLine(true)
            textSize = 16f
        }

        val restaurantInput = EditText(this).apply {
            hint = "parrillaburgers"
            setText(prefs.getString("restaurant", "") ?: "")
            setSingleLine(true)
            textSize = 16f
        }

        val openButton = Button(this).apply {
            text = "Abrir comandero"
            setOnClickListener {
                val baseUrl = normalizeBaseUrl(serverInput.text.toString())
                val restaurant = cleanRestaurant(restaurantInput.text.toString())

                if (baseUrl.isBlank() || restaurant.isBlank()) {
                    Toast.makeText(this@MainActivity, "Completa servidor y restaurante", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                prefs.edit()
                    .putString("base_url", baseUrl)
                    .putString("restaurant", restaurant)
                    .apply()

                setContentView(webView)
                webView.loadUrl(waiterLoginUrl(baseUrl, restaurant))
            }
        }

        container.addView(title)
        container.addView(detail)
        container.addView(serverInput, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        container.addView(restaurantInput, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = 18 })
        container.addView(openButton, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = 24 })
        setContentView(container)
    }

    private fun waiterLoginUrl(baseUrl: String, restaurant: String): String {
        return "${normalizeBaseUrl(baseUrl).trimEnd('/')}/${cleanRestaurant(restaurant)}/acceso/login/camarero"
    }

    private fun normalizeBaseUrl(value: String): String {
        val trimmed = value.trim().trimEnd('/')
        if (trimmed.isBlank()) return ""
        val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else "http://$trimmed"
        return try {
            val uri = Uri.parse(withScheme)
            if (uri.host.isNullOrBlank()) "" else withScheme
        } catch (_: Exception) {
            ""
        }
    }

    private fun cleanRestaurant(value: String): String {
        return value
            .trim()
            .lowercase()
            .replace(Regex("^https?://"), "")
            .replace(Regex("/.*$"), "")
            .replace(".eccofoodapp.com", "")
            .replace(Regex("[^a-z0-9-]"), "")
    }

    private fun dispatchAndroidReady() {
        webView.evaluateJavascript(
            "window.dispatchEvent(new Event('eccofood-android-ready'));",
            null
        )
    }

    private fun dispatchTapToPayResult(success: Boolean, error: String?) {
        val payload = JSONObject()
            .put("success", success)
            .put("error", error ?: JSONObject.NULL)
            .toString()

        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('eccofood-tap-to-pay-result', { detail: $payload }));",
            null
        )
    }
}
