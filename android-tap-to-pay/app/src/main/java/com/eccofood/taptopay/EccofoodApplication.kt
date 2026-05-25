package com.eccofood.taptopay

import android.app.Application
import com.stripe.stripeterminal.TerminalApplicationDelegate
import com.stripe.stripeterminal.taptopay.TapToPay

class EccofoodApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (TapToPay.isInTapToPayProcess()) return
        TerminalApplicationDelegate.onCreate(this)
    }
}
