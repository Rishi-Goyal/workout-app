package com.anonymous.dungeonfit.widget

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.RemoteInput
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * SessionNotifBridge — native module that owns the persistent "Active Workout"
 * notification shown throughout a dungeon session.
 *
 * Using NotificationCompat directly (instead of expo-notifications) lets us:
 *  - Call setUsesChronometer / setChronometerCountDown so Android renders a
 *    live elapsed or countdown timer without any JS polling.
 *  - Attach a RemoteInput "Log reps" action on the ongoing tile, not just on
 *    the post-rest alert.
 *
 * The high-priority rest-complete vibrating alert is still handled by
 * expo-notifications (workoutNotification.ts) — it is a separate notification
 * on a separate channel and does not need to be replaced.
 */
class SessionNotifBridge(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NOTIF_ID        = 1001
        const val CHANNEL_ID      = "dungeon-active-session"
        const val KEY_REPS_INPUT  = "reps_input"
        const val KEY_QUEST_ID    = "notif_quest_id"
        const val KEY_SET_NUMBER  = "notif_set_number"
        const val ACTION_REP_LOG  = "com.dungeonfit.REP_LOG"
    }

    override fun getName() = "SessionNotifBridge"

    /**
     * Show (or replace) the persistent tile for an active set.
     * The chronometer counts UP from the moment this is called.
     *
     * @param exerciseName  Displayed in the notification body.
     * @param setProgress   e.g. "Set 2 of 4 · 8 reps"
     * @param questId       Passed through to RepLogReceiver so JS can route reps.
     * @param setNumber     Current set number (used as PendingIntent request code).
     */
    @ReactMethod
    fun showActiveSet(exerciseName: String, setProgress: String, questId: String, setNumber: Int) {
        val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(
            NOTIF_ID,
            NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(notifIcon())
                .setContentTitle("⚔️ Active Workout")
                .setContentText("$exerciseName  ·  $setProgress")
                .setOngoing(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(false)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setColor(0x6366f1)
                .addAction(buildRepLogAction(questId, setNumber))
                .setContentIntent(launchAppIntent())
                .build()
        )
    }

    /**
     * Replace the persistent tile with a rest-phase tile.
     * The chronometer counts DOWN from restMs milliseconds.
     *
     * @param restMs    Rest duration in milliseconds — chronometer counts down to zero.
     * @param questId   Next set's questId for the Log-reps action.
     * @param nextSet   The set number the user is about to start.
     */
    @ReactMethod
    fun showResting(
        exerciseName: String,
        setProgress: String,
        restMs: Double,
        questId: String,
        nextSet: Int,
    ) {
        val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(
            NOTIF_ID,
            NotificationCompat.Builder(reactContext, CHANNEL_ID)
                .setSmallIcon(notifIcon())
                .setContentTitle("⏳ Resting")
                .setContentText("$exerciseName  ·  $setProgress")
                .setOngoing(true)
                .setUsesChronometer(true)
                .setChronometerCountDown(true)
                .setWhen(System.currentTimeMillis() + restMs.toLong())
                .setShowWhen(true)
                .setColor(0xf59e0b)
                .addAction(buildRepLogAction(questId, nextSet))
                .setContentIntent(launchAppIntent())
                .build()
        )
    }

    /** Remove the persistent tile (call when the session ends or is discarded). */
    @ReactMethod
    fun dismiss() {
        val nm = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.cancel(NOTIF_ID)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun buildRepLogAction(questId: String, setNumber: Int): NotificationCompat.Action {
        val remoteInput = RemoteInput.Builder(KEY_REPS_INPUT)
            .setLabel("Reps done (e.g. 8)")
            .build()

        val intent = Intent(reactContext, RepLogReceiver::class.java).apply {
            action = ACTION_REP_LOG
            putExtra(KEY_QUEST_ID, questId)
            putExtra(KEY_SET_NUMBER, setNumber)
        }
        val pi = PendingIntent.getBroadcast(
            reactContext,
            setNumber,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
        return NotificationCompat.Action.Builder(0, "📝 Log reps", pi)
            .addRemoteInput(remoteInput)
            .build()
    }

    private fun launchAppIntent(): PendingIntent {
        val intent = reactContext.packageManager
            .getLaunchIntentForPackage(reactContext.packageName) ?: Intent()
        return PendingIntent.getActivity(
            reactContext, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun notifIcon(): Int {
        val res = reactContext.resources
            .getIdentifier("ic_notification", "drawable", reactContext.packageName)
        return if (res != 0) res else android.R.drawable.ic_dialog_info
    }
}
