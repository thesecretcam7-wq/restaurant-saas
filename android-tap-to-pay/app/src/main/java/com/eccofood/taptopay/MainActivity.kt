package com.eccofood.taptopay

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var controller: TapToPayController

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
        }
        webView.webChromeClient = WebChromeClient()
        webView.addJavascriptInterface(AndroidTapToPayBridge(controller), "EccofoodAndroidTapToPay")
        val startPath = if (BuildConfig.ECCOFOOD_START_PATH.startsWith("/")) {
            BuildConfig.ECCOFOOD_START_PATH
        } else {
            "/${BuildConfig.ECCOFOOD_START_PATH}"
        }
        webView.loadUrl("${BuildConfig.ECCOFOOD_BASE_URL.trimEnd('/')}$startPath")
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
