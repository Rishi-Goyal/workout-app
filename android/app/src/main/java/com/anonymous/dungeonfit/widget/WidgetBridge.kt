package com.anonymous.dungeonfit.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
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
     * Update the widget's live timer without changing exercise name / set progress.
     *
     * Called from WorkoutTimer.tsx on phase transitions:
     *  - active set  → timerOffsetMs = 0,        isCountDown = false  (count up from now)
     *  - rest phase  → timerOffsetMs = restMs,    isCountDown = true   (count down)
     *  - done/clear  → timerOffsetMs = 0,         isCountDown = false, stopTimer = true
     *
     * The Chronometer base is expressed in SystemClock.elapsedRealtime() terms:
     *  - count-up:   base = elapsedRealtime()
     *  - countdown:  base = elapsedRealtime() + offsetMs
     */
    @ReactMethod
    fun updateWidgetTimer(timerOffsetMs: Double, isCountDown: Boolean) {
        val ctx  = reactApplicationContext
        val base = SystemClock.elapsedRealtime() + if (isCountDown) timerOffsetMs.toLong() else 0L

        ctx.getSharedPreferences(DungeonWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putLong(DungeonWidgetProvider.KEY_TIMER_BASE, base)
            .putBoolean(DungeonWidgetProvider.KEY_IS_COUNTDOWN, isCountDown)
            .putBoolean(DungeonWidgetProvider.KEY_TIMER_RUNNING, true)
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
        val ctx = reactApplicationContext
        ctx.getSharedPreferences(DungeonWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(DungeonWidgetProvider.KEY_TIMER_RUNNING, false)
            .apply()
        updateWidget("No active session", "")
    }
}
