package com.eccofood.taptopay

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.ViewGroup
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

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
        webView.settings.cacheMode = WebSettings.LOAD_NO_CACHE
        webView.settings.userAgentString = "${webView.settings.userAgentString} EccofoodTapToPayAndroid"
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                dispatchAndroidReady()
                view.postDelayed({ dispatchAndroidReady() }, 500)
                view.postDelayed({ dispatchAndroidReady() }, 1500)
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
        val configuredWithOwnerLogin = prefs.getBoolean("configured_with_owner_login", false)
        val savedBaseUrl = prefs.getString("base_url", "") ?: ""
        val savedRestaurant = prefs.getString("restaurant", "") ?: ""
        if (!configuredWithOwnerLogin || savedBaseUrl.isBlank() || savedRestaurant.isBlank()) {
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
            text = message ?: "Inicia con la cuenta del restaurante. La app encontrara el restaurante y abrira solo el acceso de camarero."
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

        val emailInput = EditText(this).apply {
            hint = "correo del restaurante"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setSingleLine(true)
            textSize = 16f
        }

        val passwordInput = EditText(this).apply {
            hint = "contrasena"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setSingleLine(true)
            textSize = 16f
        }

        val openButton = Button(this).apply {
            text = "Entrar al restaurante"
            setOnClickListener {
                val baseUrl = normalizeBaseUrl(serverInput.text.toString())
                val email = emailInput.text.toString().trim()
                val password = passwordInput.text.toString()

                if (baseUrl.isBlank() || email.isBlank() || password.isBlank()) {
                    Toast.makeText(this@MainActivity, "Completa servidor, correo y contrasena", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                configureWaiterAccess(baseUrl, email, password, this)
            }
        }

        container.addView(title)
        container.addView(detail)
        container.addView(serverInput, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        container.addView(emailInput, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = 18 })
        container.addView(passwordInput, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = 18 })
        container.addView(openButton, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = 24 })
        setContentView(ScrollView(this).apply { addView(container) })
    }

    private fun configureWaiterAccess(baseUrl: String, email: String, password: String, button: Button) {
        button.isEnabled = false
        button.text = "Buscando restaurante..."

        Thread {
            try {
                val loginUrl = URL("${normalizeBaseUrl(baseUrl).trimEnd('/')}/api/auth/login")
                val connection = (loginUrl.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 12000
                    readTimeout = 12000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Accept", "application/json")
                }
                val payload = JSONObject()
                    .put("email", email)
                    .put("password", password)
                    .toString()
                    .toByteArray(StandardCharsets.UTF_8)

                connection.outputStream.use { it.write(payload) }

                val responseCode = connection.responseCode
                val stream = if (responseCode in 200..299) connection.inputStream else connection.errorStream
                val responseBody = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                val responseJson = if (responseBody.isBlank()) JSONObject() else JSONObject(responseBody)

                if (responseCode !in 200..299) {
                    throw IllegalStateException(responseJson.optString("error", "No se pudo validar la cuenta del restaurante."))
                }

                val restaurant = extractRestaurantSlug(responseJson)
                if (restaurant.isBlank()) {
                    throw IllegalStateException("Ese correo no tiene restaurante asociado.")
                }

                prefs.edit()
                    .putString("base_url", normalizeBaseUrl(baseUrl))
                    .putString("restaurant", restaurant)
                    .putBoolean("configured_with_owner_login", true)
                    .apply()

                runOnUiThread {
                    setContentView(webView)
                    webView.loadUrl(waiterLoginUrl(baseUrl, restaurant))
                }
            } catch (error: Exception) {
                runOnUiThread {
                    Toast.makeText(this, error.message ?: "No se pudo encontrar el restaurante.", Toast.LENGTH_LONG).show()
                    button.isEnabled = true
                    button.text = "Entrar al restaurante"
                }
            }
        }.start()
    }

    private fun extractRestaurantSlug(response: JSONObject): String {
        val tenantSlug = response.optJSONObject("tenant")?.optString("slug").orEmpty()
        if (tenantSlug.isNotBlank()) return cleanRestaurant(tenantSlug)

        val redirectUrl = response.optString("redirectUrl")
        val match = Regex("^/([^/]+)/").find(redirectUrl)
        return cleanRestaurant(match?.groupValues?.getOrNull(1).orEmpty())
    }

    private fun waiterLoginUrl(baseUrl: String, restaurant: String): String {
        return "${normalizeBaseUrl(baseUrl).trimEnd('/')}/${cleanRestaurant(restaurant)}/acceso/apk/camarero"
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
            "try { window.localStorage.setItem('eccofood_android_ttp', '1'); } catch(e) {} window.dispatchEvent(new Event('eccofood-android-ready'));",
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
