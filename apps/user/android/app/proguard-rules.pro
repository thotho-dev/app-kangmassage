# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo
-keep class expo.modules.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Notifee
-keep class app.notifee.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# SVG
-keep class com.horcrux.svg.** { *; }

# WebView
-keep class com.reactnativecommunity.webview.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# FastImage
-keep class com.dylanvann.fastimage.** { *; }

# Linear Gradient
-keep class com.BV.LinearGradient.** { *; }

# DatePicker
-keep class com.reactcommunity.rndatetimepicker.** { *; }

# Keep React Native native module methods
-keepclasseswithmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep native modules
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }

# Keep ViewManagers
-keep class * extends com.facebook.react.uimanager.ViewManager { *; }

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Remove debug logs in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
