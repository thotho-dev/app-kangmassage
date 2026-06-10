const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Plugin ini mengonfigurasi MainActivity agar:
 * 1. Muncul di atas lock screen (showWhenLocked, turnScreenOn)
 * 2. Tidak membuat instance baru saat notif di-tap (singleTop)
 *    — tanpa ini, tap notif akan buka Activity baru di atas Activity yang sudah ada
 */
module.exports = function withLockScreenActivity(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    const activities = mainApplication.activity || [];
    const mainActivity = activities.find(
      (a) =>
        a.$['android:name'] === '.MainActivity' ||
        a.$['android:name']?.includes('MainActivity')
    );

    if (mainActivity) {
      mainActivity.$['android:exported'] = 'true';
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      mainActivity.$['android:showOnLockScreen'] = 'true';
      // Mencegah duplicate Activity saat notif di-tap (penting untuk Notifee fullScreenAction)
      mainActivity.$['android:launchMode'] = 'singleTop';
    }

    return config;
  });
};
