package com.anonymous.dungeonfit.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import com.anonymous.dungeonfit.R

class DungeonWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, mgr, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, DungeonWidgetProvider::class.java))
            ids.forEach { updateWidget(context, mgr, it) }
        }
    }

    companion object {
        const val ACTION_REFRESH = "com.dungeonfit.WIDGET_REFRESH"

        // SharedPreferences keys
        const val PREFS_NAME       = "dungeon_widget"
        const val KEY_EXERCISE     = "exercise_name"
        const val KEY_SETS         = "set_progress"
        const val KEY_TIMER_BASE   = "timer_base"
        const val KEY_IS_COUNTDOWN = "is_countdown"
        const val KEY_TIMER_RUNNING = "timer_running"

        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val prefs        = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val exerciseName = prefs.getString(KEY_EXERCISE, "No active session") ?: "No active session"
            val setProgress  = prefs.getString(KEY_SETS, "") ?: ""
            val timerRunning = prefs.getBoolean(KEY_TIMER_RUNNING, false)
            val timerBase    = prefs.getLong(KEY_TIMER_BASE, 0L)
            val isCountDown  = prefs.getBoolean(KEY_IS_COUNTDOWN, false)

            val views = RemoteViews(context.packageName, R.layout.widget_exercise)
            views.setTextViewText(R.id.widget_exercise_name, exerciseName)
            views.setTextViewText(R.id.widget_set_progress, setProgress)

            // Timer: show/start only during an active session
            if (timerRunning && timerBase != 0L) {
                views.setViewVisibility(R.id.widget_timer, View.VISIBLE)
                views.setChronometer(R.id.widget_timer, timerBase, null, true)
                // setChronometerCountDown requires API 24 — use reflection via RemoteViews
                views.setBoolean(R.id.widget_timer, "setCountDown", isCountDown)
            } else {
                views.setViewVisibility(R.id.widget_timer, View.GONE)
                views.setChronometer(R.id.widget_timer, 0L, null, false)
            }

            // Wire up tap intents for the action buttons
            val actions = listOf(
                Triple(R.id.widget_btn_complete, "complete",      0),
                Triple(R.id.widget_btn_half,     "half_complete", 1),
                Triple(R.id.widget_btn_skip,     "skipped",       2),
            )
            actions.forEach { (btnId, action, reqCode) ->
                val i = Intent(context, WidgetActionReceiver::class.java).apply {
                    this.action = WidgetActionReceiver.ACTION_WIDGET_TAP
                    putExtra(WidgetActionReceiver.EXTRA_QUEST_ACTION, action)
                }
                val pi = android.app.PendingIntent.getBroadcast(
                    context, reqCode, i,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(btnId, pi)
            }

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
