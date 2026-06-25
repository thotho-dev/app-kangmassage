# React Native (Hermes)
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Notifee
-keep class app.notifee.** { *; }

# Expo
-keep class expo.** { *; }
-keep class host.exp.** { *; }

# Google Maps / Location
-keep class com.google.android.gms.** { *; }
-keep class com.google.android.gms.maps.** { *; }

# Google Services / Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.tasks.** { *; }

# Keep custom app package
-keep class com.kangmassage.mitra.** { *; }

# JavaScript interface annotations
-keepattributes *Annotation*, JavascriptInterface
-keepclassmembers class ** {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep R8 from stripping generic type info
-keepattributes Signature

# WebView
-keepclassmembers class * extends android.webkit.WebView {
    void onPageStarted(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    void onPageFinished(android.webkit.WebView, java.lang.String);
}

# Keep custom exceptions
-keep class * extends java.lang.Exception

# React Native OKHTTP
-dontwarn okhttp3.**
-dontwarn okio.**

# Suppress warnings for non-fatal missing references
-dontwarn com.facebook.redex.**
-dontwarn com.facebook.common.quicklogin.**
