package com.anonymous.dungeonfit.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.RemoteInput
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * RepLogReceiver — handles the "Log reps" inline-reply action on the persistent
 * Active Workout notification.
 *
 * Flow:
 *  1. User types a rep count in the notification shade and taps Save.
 *  2. Android delivers the result to this receiver.
 *  3. We store the data in SharedPreferences (so WorkoutTimer can pick it up
 *     even if the app was backgrounded / killed).
 *  4. If the React Native layer is alive we also emit a "repLogged" JS event
 *     so the rep counter pre-fills immediately without needing a re-open.
 */
class RepLogReceiver : BroadcastReceiver() {

    companion object {
        const val KEY_PENDING_REPS     = "pending_rep_count"
        const val KEY_PENDING_QUEST_ID = "pending_rep_quest_id"
        const val KEY_PENDING_SET_NUM  = "pending_rep_set_number"
        const val JS_EVENT             = "repLogged"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != SessionNotifBridge.ACTION_REP_LOG) return

        val bundle    = RemoteInput.getResultsFromIntent(intent) ?: return
        val repsStr   = bundle.getString(SessionNotifBridge.KEY_REPS_INPUT) ?: return
        val reps      = repsStr.trim().toIntOrNull() ?: return
        val questId   = intent.getStringExtra(SessionNotifBridge.KEY_QUEST_ID) ?: return
        val setNumber = intent.getIntExtra(SessionNotifBridge.KEY_SET_NUMBER, -1)
        if (setNumber < 0) return

        // Persist so the app can pick it up on next foreground if it was killed
        context.getSharedPreferences(DungeonWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PENDING_QUEST_ID, questId)
            .putInt(KEY_PENDING_SET_NUM, setNumber)
            .putInt(KEY_PENDING_REPS, reps)
            .apply()

        // Emit to JS immediately if React Native is running
        try {
            val reactContext = context.applicationContext
                .javaClass
                .getDeclaredField("reactHost")
                .apply { isAccessible = true }
                .get(context.applicationContext)
                ?.let { host ->
                    host.javaClass.getMethod("getCurrentReactContext").invoke(host) as? ReactContext
                }

            reactContext?.let { rc ->
                val params = Arguments.createMap().apply {
                    putString("questId", questId)
                    putInt("setNumber", setNumber)
                    putInt("reps", reps)
                }
                rc.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(JS_EVENT, params)
            }
        } catch (_: Exception) {
            // App not running — JS will hydrate from SharedPreferences on next launch
        }
    }
}
