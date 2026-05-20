package com.eccofood.taptopay

import android.app.Activity
import android.content.pm.ApplicationInfo
import com.stripe.stripeterminal.Terminal
import com.stripe.stripeterminal.external.callable.Callback
import com.stripe.stripeterminal.external.callable.DiscoveryListener
import com.stripe.stripeterminal.external.callable.PaymentIntentCallback
import com.stripe.stripeterminal.external.callable.ReaderCallback
import com.stripe.stripeterminal.external.callable.TapToPayReaderListener
import com.stripe.stripeterminal.external.callable.TerminalListener
import com.stripe.stripeterminal.external.models.ConnectionStatus
import com.stripe.stripeterminal.external.models.ConnectionConfiguration.TapToPayConnectionConfiguration
import com.stripe.stripeterminal.external.models.DiscoveryConfiguration
import com.stripe.stripeterminal.external.models.PaymentIntent
import com.stripe.stripeterminal.external.models.PaymentStatus
import com.stripe.stripeterminal.external.models.Reader
import com.stripe.stripeterminal.external.models.TerminalException
import com.stripe.stripeterminal.log.LogLevel
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

class TapToPayController(
    private val activity: Activity,
    private val api: EccofoodApi,
    private val onStatus: (String) -> Unit,
    private val onResult: (Boolean, String?) -> Unit
) {
    private var tenantId: String? = null
    private val tokenProvider = TerminalTokenProvider(api) { tenantId }

    private val terminalListener = object : TerminalListener {
        override fun onConnectionStatusChange(status: ConnectionStatus) {
            onStatus("Terminal: $status")
        }

        override fun onPaymentStatusChange(status: PaymentStatus) {
            onStatus("Pago: $status")
        }
    }

    private val tapToPayReaderListener = object : TapToPayReaderListener {
        override fun onReaderReconnectSucceeded(reader: Reader) {
            onStatus("Tap to Pay conectado")
        }
    }

    fun payTable(payload: JSONObject) {
        thread {
            try {
                val tenant = payload.getString("tenantId")
                val orderIds = payload.getJSONArray("orderIds")
                val tableNumber = payload.optInt("tableNumber").takeIf { payload.has("tableNumber") }
                tenantId = tenant

                activity.runOnUiThread { initializeTerminalIfNeeded() }
                val bootstrap = api.connectionToken(tenant)
                val locationId = bootstrap.getString("locationId")
                val intentPayload = api.tablePaymentIntent(tenant, orderIds, tableNumber)
                val clientSecret = intentPayload.getString("clientSecret")
                val paymentIntentId = intentPayload.getString("paymentIntentId")

                activity.runOnUiThread {
                    connectAndCollect(
                        locationId = locationId,
                        clientSecret = clientSecret,
                        onSucceeded = {
                            thread {
                                try {
                                    api.completeTable(tenant, orderIds, paymentIntentId)
                                    activity.runOnUiThread { onResult(true, null) }
                                } catch (error: Exception) {
                                    activity.runOnUiThread { onResult(false, error.message) }
                                }
                            }
                        }
                    )
                }
            } catch (error: Exception) {
                activity.runOnUiThread { onResult(false, error.message) }
            }
        }
    }

    private fun initializeTerminalIfNeeded() {
        if (Terminal.isInitialized()) return
        Terminal.init(activity.applicationContext, LogLevel.VERBOSE, tokenProvider, terminalListener, null)
    }

    private fun connectAndCollect(locationId: String, clientSecret: String, onSucceeded: () -> Unit) {
        onStatus("Buscando lector Tap to Pay")
        val isDebuggable = activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
        val config = DiscoveryConfiguration.TapToPayDiscoveryConfiguration(isSimulated = isDebuggable)

        Terminal.getInstance().discoverReaders(
            config,
            object : DiscoveryListener {
                override fun onUpdateDiscoveredReaders(readers: List<Reader>) {
                    val reader = readers.firstOrNull() ?: return
                    connectReader(reader, locationId, clientSecret, onSucceeded)
                }
            },
            object : Callback {
                override fun onSuccess() = Unit
                override fun onFailure(e: TerminalException) {
                    onResult(false, e.errorMessage)
                }
            }
        )
    }

    private fun connectReader(reader: Reader, locationId: String, clientSecret: String, onSucceeded: () -> Unit) {
        val config = TapToPayConnectionConfiguration(
            locationId,
            true,
            tapToPayReaderListener
        )

        Terminal.getInstance().connectReader(
            reader,
            config,
            object : ReaderCallback {
                override fun onSuccess(reader: Reader) {
                    retrievePaymentIntent(clientSecret, onSucceeded)
                }

                override fun onFailure(e: TerminalException) {
                    onResult(false, e.errorMessage)
                }
            }
        )
    }

    private fun retrievePaymentIntent(clientSecret: String, onSucceeded: () -> Unit) {
        Terminal.getInstance().retrievePaymentIntent(
            clientSecret,
            object : PaymentIntentCallback {
                override fun onSuccess(paymentIntent: PaymentIntent) {
                    collectPayment(paymentIntent, onSucceeded)
                }

                override fun onFailure(e: TerminalException) {
                    onResult(false, e.errorMessage)
                }
            }
        )
    }

    private fun collectPayment(paymentIntent: PaymentIntent, onSucceeded: () -> Unit) {
        Terminal.getInstance().collectPaymentMethod(
            paymentIntent,
            object : PaymentIntentCallback {
                override fun onSuccess(paymentIntent: PaymentIntent) {
                    confirmPayment(paymentIntent, onSucceeded)
                }

                override fun onFailure(e: TerminalException) {
                    onResult(false, e.errorMessage)
                }
            }
        )
    }

    private fun confirmPayment(paymentIntent: PaymentIntent, onSucceeded: () -> Unit) {
        Terminal.getInstance().confirmPaymentIntent(
            paymentIntent,
            object : PaymentIntentCallback {
                override fun onSuccess(paymentIntent: PaymentIntent) {
                    onSucceeded()
                }

                override fun onFailure(e: TerminalException) {
                    onResult(false, e.errorMessage)
                }
            }
        )
    }
}
