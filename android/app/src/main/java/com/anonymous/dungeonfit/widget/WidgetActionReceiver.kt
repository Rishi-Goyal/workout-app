package com.anonymous.dungeonfit.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

class WidgetActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_WIDGET_TAP) return
        val action = intent.getStringExtra(EXTRA_QUEST_ACTION) ?: return

        // Store pending action so JS can pick it up on next foreground
        context.getSharedPreferences(DungeonWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PENDING_ACTION, action)
            .apply()

        // Emit event to the React Native JS layer if the app is running
        try {
            val reactContext = context.applicationContext
                .javaClass
                .getDeclaredField("reactHost")
                .apply { isAccessible = true }
                .get(context.applicationContext)
                ?.let { host ->
                    host.javaClass.getMethod("getCurrentReactContext").invoke(host) as? ReactContext
                }

            reactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(JS_EVENT_WIDGET_ACTION, action)
        } catch (_: Exception) {
            // App not running — JS will poll SharedPreferences on next launch via WidgetBridge
        }
    }

    companion object {
        const val ACTION_WIDGET_TAP     = "com.dungeonfit.WIDGET_ACTION"
        const val EXTRA_QUEST_ACTION    = "quest_action"
        const val KEY_PENDING_ACTION    = "pending_widget_action"
        const val JS_EVENT_WIDGET_ACTION = "widgetAction"
    }
}
