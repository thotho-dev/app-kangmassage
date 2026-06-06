const { withAndroidManifest } = require('expo/config-plugins');

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
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
      mainActivity.$['android:showOnLockScreen'] = 'true';
    }

    return config;
  });
};
