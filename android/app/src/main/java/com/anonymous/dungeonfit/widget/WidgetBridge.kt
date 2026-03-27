package com.anonymous.dungeonfit.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WidgetBridge(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetBridge"

    /**
     * Called from JS (useSessionStore) to push the current session state into
     * the Android App Widget via SharedPreferences, then trigger a widget redraw.
     */
    @ReactMethod
    fun updateWidget(exerciseName: String, setProgress: String) {
        val ctx = reactApplicationContext
        ctx.getSharedPreferences(DungeonWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(DungeonWidgetProvider.KEY_EXERCISE, exerciseName)
            .putString(DungeonWidgetProvider.KEY_SETS, setProgress)
            .apply()

        val mgr = AppWidgetManager.getInstance(ctx)
        val ids = mgr.getAppWidgetIds(ComponentName(ctx, DungeonWidgetProvider::class.java))
        ids.forEach { DungeonWidgetProvider.updateWidget(ctx, mgr, it) }
    }

    /**
     * Clears the widget when the session ends.
     */
    @ReactMethod
    fun clearWidget() {
        updateWidget("No active session", "")
    }
}
