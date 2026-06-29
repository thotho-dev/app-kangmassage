const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withRemoveBarcodeActivity(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    const activities = mainApplication.activity || [];

    mainApplication.activity = activities.filter(
      (a) =>
        !a.$['android:name']?.includes(
          'GmsBarcodeScanningDelegateActivity'
        )
    );

    return config;
  });
};
