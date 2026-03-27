# Android Widget Implementation Guide (v2.1)

> **Status:** Planned for v2.1. v2.0 includes the design spec, stub component, and
> AndroidManifest scaffold. This document is the complete implementation guide.

---

## Overview

The DungeonFit exercise widget is a **4×2 Android App Widget** that mirrors the active
workout session. The user can:
- See the current exercise, set progress, target reps, and weight
- Tap **Done / Half / Skip** to log the set directly from the notification shade
- See real-time rest timer countdown

---

## Architecture

```
Zustand useSessionStore (JS)
        │
        ▼ (via SharedPreferences bridge)
React Native Module: WidgetBridge.kt
        │
        ▼ (broadcasts update intent)
DungeonWidgetProvider.kt  ←──  AppWidgetManager
        │
        ▼
RemoteViews (widget XML layout)
        │
        ▼
PendingIntent (Done / Half / Skip taps → WidgetActionReceiver.kt)
        │
        ▼
WidgetActionReceiver.kt → SharedPreferences update → JS event
```

---

## Files to Create

### 1. Native Kotlin files

```
android/app/src/main/java/com/anonymous/dungeonfit/
├── widget/
│   ├── DungeonWidgetProvider.kt   # AppWidgetProvider (main entry point)
│   ├── WidgetBridge.kt            # ReactNativeModule — exposes updateWidget() to JS
│   ├── WidgetActionReceiver.kt    # BroadcastReceiver — handles tap intents
│   └── WidgetUpdateService.kt     # Foreground service for live rest timer
```

### 2. Layout XML

```
android/app/src/main/res/
├── layout/
│   └── widget_exercise.xml        # 4×2 widget layout (RemoteViews compatible)
└── xml/
    └── widget_info.xml            # AppWidgetProviderInfo metadata
```

### 3. React Native module registration

```
android/app/src/main/java/com/anonymous/dungeonfit/
└── MainApplication.kt             # Add WidgetBridgePackage to getPackages()
```

---

## Step-by-Step Implementation

### Step 1 — widget_info.xml

```xml
<!-- android/app/src/main/res/xml/widget_info.xml -->
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_exercise"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
```

### Step 2 — widget_exercise.xml (RemoteViews layout)

```xml
<!-- android/app/src/main/res/layout/widget_exercise.xml -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#1a1625"
    android:padding="12dp">

    <TextView android:id="@+id/widget_exercise_name"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textColor="#e8dcc8"
        android:textSize="16sp"
        android:textStyle="bold"
        android:text="No active session" />

    <TextView android:id="@+id/widget_set_progress"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textColor="#7a6d8a"
        android:textSize="12sp" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="8dp"
        android:gravity="center">

        <Button android:id="@+id/widget_btn_complete"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="✓ Done"
            android:backgroundTint="#1a3a2a" />

        <Button android:id="@+id/widget_btn_half"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="½"
            android:backgroundTint="#2a2510" />

        <Button android:id="@+id/widget_btn_skip"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="✕"
            android:backgroundTint="#2a1010" />

    </LinearLayout>
</LinearLayout>
```

### Step 3 — DungeonWidgetProvider.kt

```kotlin
package com.anonymous.dungeonfit.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.anonymous.dungeonfit.R

class DungeonWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, mgr, it) }
    }

    companion object {
        fun updateWidget(context: Context, mgr: AppWidgetManager, widgetId: Int) {
            val prefs = context.getSharedPreferences("dungeon_widget", Context.MODE_PRIVATE)
            val exerciseName = prefs.getString("exercise_name", "No active session") ?: "No active session"
            val setProgress  = prefs.getString("set_progress", "")  ?: ""

            val views = RemoteViews(context.packageName, R.layout.widget_exercise)
            views.setTextViewText(R.id.widget_exercise_name, exerciseName)
            views.setTextViewText(R.id.widget_set_progress,  setProgress)

            // Wire up tap intents
            listOf("complete", "half_complete", "skipped").forEachIndexed { i, action ->
                val intent = Intent(context, WidgetActionReceiver::class.java).apply {
                    this.action = "com.dungeonfit.WIDGET_ACTION"
                    putExtra("quest_action", action)
                }
                val pi = android.app.PendingIntent.getBroadcast(
                    context, i, intent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
                )
                val btnId = when (action) {
                    "complete"      -> R.id.widget_btn_complete
                    "half_complete" -> R.id.widget_btn_half
                    else            -> R.id.widget_btn_skip
                }
                views.setOnClickPendingIntent(btnId, pi)
            }

            mgr.updateAppWidget(widgetId, views)
        }
    }
}
```

### Step 4 — WidgetBridge.kt (React Native Module)

```kotlin
package com.anonymous.dungeonfit.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.facebook.react.bridge.*

class WidgetBridge(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetBridge"

    /** Called from JS (useSessionStore) to push session state into the widget. */
    @ReactMethod
    fun updateWidget(exerciseName: String, setProgress: String) {
        val ctx = reactApplicationContext
        val prefs = ctx.getSharedPreferences("dungeon_widget", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("exercise_name", exerciseName)
            .putString("set_progress",  setProgress)
            .apply()

        // Trigger widget redraw
        val mgr = AppWidgetManager.getInstance(ctx)
        val ids = mgr.getAppWidgetIds(ComponentName(ctx, DungeonWidgetProvider::class.java))
        ids.forEach { DungeonWidgetProvider.updateWidget(ctx, mgr, it) }
    }
}
```

### Step 5 — WidgetActionReceiver.kt

```kotlin
package com.anonymous.dungeonfit.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext

class WidgetActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.getStringExtra("quest_action") ?: return
        // Emit event to React Native JS layer
        // (use DeviceEventManagerModule or RCTDeviceEventEmitter)
        // JS listens with: NativeEventEmitter(NativeModules.WidgetBridge).addListener('widgetAction', cb)
        val prefs = context.getSharedPreferences("dungeon_widget", Context.MODE_PRIVATE)
        prefs.edit().putString("pending_action", action).apply()
    }
}
```

### Step 6 — AndroidManifest.xml additions

Add inside `<application>`:

```xml
<!-- Widget provider -->
<receiver
    android:name=".widget.DungeonWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>

<!-- Widget action receiver -->
<receiver
    android:name=".widget.WidgetActionReceiver"
    android:exported="false">
    <intent-filter>
        <action android:name="com.dungeonfit.WIDGET_ACTION" />
    </intent-filter>
</receiver>
```

### Step 7 — Register the module in MainApplication.kt

```kotlin
// In getPackages():
packages.add(WidgetBridgePackage())
```

---

## JS Integration (v2.1)

Once the native module is built, add to `useSessionStore.ts`:

```typescript
import { NativeModules } from 'react-native';
const { WidgetBridge } = NativeModules;

// After startSession / markQuest / finalizeSession, call:
WidgetBridge?.updateWidget(
  activeQuest.exerciseName,
  `Set ${currentSet} of ${quest.sets} · ${quest.reps} reps`
);
```

---

## Testing

1. Build the debug APK with `APP_ENV=development`
2. Install on physical Android device or emulator with API 26+
3. Long-press home screen → Widgets → DungeonFit → place widget
4. Start a workout session in the app
5. Verify widget updates with exercise name and set progress
6. Tap "Done" in the widget → verify quest status updates in the app

---

## Known Limitations

- **iOS:** App widgets on iOS require WidgetKit (Swift). Not planned for v2.1.
- **React Native Expo managed workflow:** Custom native modules require a development build
  (`expo-dev-client`) or bare workflow ejection.
- **Widget update rate:** Android limits background updates to 30-minute intervals.
  The workaround is to use `AppWidgetManager.updateAppWidget()` from the RN bridge
  (triggered by JS whenever the session state changes) rather than relying on periodic updates.
