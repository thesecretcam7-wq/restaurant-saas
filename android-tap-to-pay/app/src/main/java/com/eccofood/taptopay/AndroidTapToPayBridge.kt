package com.eccofood.taptopay

import android.webkit.JavascriptInterface
import org.json.JSONObject

class AndroidTapToPayBridge(private val controller: TapToPayController) {
    @JavascriptInterface
    fun payTable(payload: String) {
        controller.payTable(JSONObject(payload))
    }
}
